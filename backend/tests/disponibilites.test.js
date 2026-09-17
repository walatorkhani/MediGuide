const { creerUtilisateurConnecte, bearer } = require("./helpers");
const Facility = require("../models/Facility");
const Availability = require("../models/Availability");

function dansNJours(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe("Disponibilites - créneaux et conflits", () => {
  let pro1;
  let pro2;
  let facility;
  const date = dansNJours(5);

  beforeAll(async () => {
    pro1 = await creerUtilisateurConnecte({ role: "professionnel" });
    pro2 = await creerUtilisateurConnecte({ role: "professionnel" });

    facility = await Facility.create({
      category: "medecin",
      nom: "Dr Dispo Test",
      latitude: 36.5,
      longitude: 8.78,
      ownerId: pro1.user.id,
    });
  });

  test("GET public : liste vide au départ", async () => {
    const res = await pro1.agent.get(`/api/facilities/${facility.id}/disponibilites?date=${date}`);
    expect(res.status).toBe(200);
    expect(res.body.disponibilites).toEqual([]);
  });

  test("POST refuse les champs manquants et une durée invalide", async () => {
    const sansChamps = await pro1.agent
      .post("/api/disponibilites")
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .send({ facilityId: facility.id });
    expect(sansChamps.status).toBe(400);

    const dureeInvalide = await pro1.agent
      .post("/api/disponibilites")
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .send({ facilityId: facility.id, date, heureDebut: "09:00", heureFin: "10:00", dureeCreneauMinutes: 1000 });
    expect(dureeInvalide.status).toBe(400);

    const plageInvalide = await pro1.agent
      .post("/api/disponibilites")
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .send({ facilityId: facility.id, date, heureDebut: "11:00", heureFin: "09:00" });
    expect(plageInvalide.status).toBe(400);
  });

  test("POST refuse un professionnel non propriétaire de la fiche", async () => {
    const res = await pro2.agent
      .post("/api/disponibilites")
      .set("Authorization", bearer(pro2.token))
      .set("X-CSRF-Token", pro2.csrfToken)
      .send({ facilityId: facility.id, date, heureDebut: "09:00", heureFin: "10:00" });
    expect(res.status).toBe(403);
  });

  test("POST génère les créneaux d'une plage horaire", async () => {
    const res = await pro1.agent
      .post("/api/disponibilites")
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .send({ facilityId: facility.id, date, heureDebut: "09:00", heureFin: "10:00", dureeCreneauMinutes: 20 });

    expect(res.status).toBe(201);
    expect(res.body.disponibilites).toHaveLength(3);
    expect(res.body.disponibilites[0].heureDebut).toBe("09:00");
  });

  test("POST ignore les créneaux qui chevauchent ceux déjà créés", async () => {
    const res = await pro1.agent
      .post("/api/disponibilites")
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .send({ facilityId: facility.id, date, heureDebut: "09:00", heureFin: "10:00", dureeCreneauMinutes: 20 });

    expect(res.status).toBe(201);
    expect(res.body.disponibilites).toHaveLength(0);
    expect(res.body.message).toMatch(/ignoré/i);
  });

  test("GET public : la liste contient désormais les créneaux futurs non réservés", async () => {
    const res = await pro1.agent.get(`/api/facilities/${facility.id}/disponibilites?date=${date}`);
    expect(res.status).toBe(200);
    expect(res.body.disponibilites).toHaveLength(3);
  });

  test("GET /disponibilites/mine renvoie les créneaux du professionnel propriétaire", async () => {
    const res = await pro1.agent.get("/api/disponibilites/mine").set("Authorization", bearer(pro1.token));
    expect(res.status).toBe(200);
    expect(res.body.disponibilites.length).toBeGreaterThanOrEqual(3);

    const vide = await pro2.agent.get("/api/disponibilites/mine").set("Authorization", bearer(pro2.token));
    expect(vide.status).toBe(200);
    expect(vide.body.disponibilites).toEqual([]);
  });

  test("DELETE refuse un non-propriétaire, refuse un créneau réservé, supprime sinon", async () => {
    const creneaux = await Availability.findAll({ where: { facilityId: facility.id } });
    const [libre, reserve] = creneaux;

    const refusProprio = await pro2.agent
      .delete(`/api/disponibilites/${libre.id}`)
      .set("Authorization", bearer(pro2.token))
      .set("X-CSRF-Token", pro2.csrfToken);
    expect(refusProprio.status).toBe(403);

    reserve.estReserve = true;
    await reserve.save();
    const refusReserve = await pro1.agent
      .delete(`/api/disponibilites/${reserve.id}`)
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken);
    expect(refusReserve.status).toBe(409);

    const ok = await pro1.agent
      .delete(`/api/disponibilites/${libre.id}`)
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken);
    expect(ok.status).toBe(200);

    const introuvable = await pro1.agent
      .delete("/api/disponibilites/999999999")
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken);
    expect(introuvable.status).toBe(404);
  });
});
