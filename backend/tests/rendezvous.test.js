// SMTP désactivé avant tout require : la réservation déclenche un envoi
// d'e-mail de confirmation en arrière-plan (utils/mailer). On force ici le
// mode "simulé" (voir mailer.test.js) pour ne jamais tenter une vraie
// connexion réseau vers le SMTP renseigné dans .env pendant les tests.
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";

const { creerUtilisateurConnecte, bearer } = require("./helpers");
const Facility = require("../models/Facility");
const Availability = require("../models/Availability");

function dansNJours(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function creerCreneau(facilityId, date, heureDebut = "09:00", heureFin = "09:20") {
  return Availability.create({ facilityId, date, heureDebut, heureFin });
}

describe("Rendez-vous - réservation, annulation, tableau de bord pro", () => {
  let pro;
  let patient1;
  let patient2;
  let facility;

  beforeAll(async () => {
    pro = await creerUtilisateurConnecte({ role: "professionnel" });
    patient1 = await creerUtilisateurConnecte({ role: "patient" });
    patient2 = await creerUtilisateurConnecte({ role: "patient" });

    facility = await Facility.create({
      category: "medecin",
      nom: "Dr RDV Test",
      latitude: 36.5,
      longitude: 8.78,
      ownerId: pro.user.id,
    });
  });

  test("POST refuse sans disponibiliteId et si le créneau n'existe pas", async () => {
    const sansId = await patient1.agent
      .post("/api/rendezvous")
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken)
      .send({});
    expect(sansId.status).toBe(400);

    const introuvable = await patient1.agent
      .post("/api/rendezvous")
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken)
      .send({ disponibiliteId: 999999999 });
    expect(introuvable.status).toBe(404);
  });

  test("POST confirme la réservation puis refuse un second patient sur le même créneau", async () => {
    const creneau = await creerCreneau(facility.id, dansNJours(3));

    const premiere = await patient1.agent
      .post("/api/rendezvous")
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken)
      .send({ disponibiliteId: creneau.id, motif: "Consultation de routine" });

    expect(premiere.status).toBe(201);
    expect(premiere.body.rendezVous.disponibilite.id).toBe(creneau.id);

    const conflit = await patient2.agent
      .post("/api/rendezvous")
      .set("Authorization", bearer(patient2.token))
      .set("X-CSRF-Token", patient2.csrfToken)
      .send({ disponibiliteId: creneau.id });

    expect(conflit.status).toBe(409);
  });

  test("GET /mes liste les rendez-vous du patient, refusé pour un professionnel", async () => {
    const res = await patient1.agent.get("/api/rendezvous/mes").set("Authorization", bearer(patient1.token));
    expect(res.status).toBe(200);
    expect(res.body.rendezVous.length).toBeGreaterThanOrEqual(1);

    const refus = await pro.agent.get("/api/rendezvous/mes").set("Authorization", bearer(pro.token));
    expect(refus.status).toBe(403);
  });

  test("PATCH /:id/annuler refuse un non-propriétaire, annule pour le patient, refuse une double annulation", async () => {
    const creneau = await creerCreneau(facility.id, dansNJours(4));
    const rdv = await patient1.agent
      .post("/api/rendezvous")
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken)
      .send({ disponibiliteId: creneau.id });
    const rdvId = rdv.body.rendezVous.id;

    const refus = await patient2.agent
      .patch(`/api/rendezvous/${rdvId}/annuler`)
      .set("Authorization", bearer(patient2.token))
      .set("X-CSRF-Token", patient2.csrfToken);
    expect(refus.status).toBe(403);

    const ok = await patient1.agent
      .patch(`/api/rendezvous/${rdvId}/annuler`)
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken);
    expect(ok.status).toBe(200);
    expect(ok.body.rendezVous.statut).toBe("annule");

    await creneau.reload();
    expect(creneau.estReserve).toBe(false);

    const dejaAnnule = await patient1.agent
      .patch(`/api/rendezvous/${rdvId}/annuler`)
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken);
    expect(dejaAnnule.status).toBe(400);
  });

  test("GET /aujourdhui renvoie les RDV confirmés du jour pour le professionnel propriétaire", async () => {
    const aujourdHui = dansNJours(0);
    const creneau = await creerCreneau(facility.id, aujourdHui, "14:00", "14:20");

    await patient2.agent
      .post("/api/rendezvous")
      .set("Authorization", bearer(patient2.token))
      .set("X-CSRF-Token", patient2.csrfToken)
      .send({ disponibiliteId: creneau.id });

    const res = await pro.agent.get("/api/rendezvous/aujourdhui").set("Authorization", bearer(pro.token));
    expect(res.status).toBe(200);
    expect(res.body.date).toBe(aujourdHui);
    expect(res.body.rendezVous.some((r) => r.disponibiliteId === creneau.id)).toBe(true);
  });
});
