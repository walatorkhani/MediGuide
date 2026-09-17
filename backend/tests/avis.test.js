const { creerUtilisateurConnecte, bearer } = require("./helpers");
const Facility = require("../models/Facility");

describe("Avis - publication, modération implicite, pagination, moyenne", () => {
  let admin;
  let patient1;
  let patient2;
  let facility;

  beforeAll(async () => {
    admin = await creerUtilisateurConnecte({ role: "administrateur" });
    patient1 = await creerUtilisateurConnecte({ role: "patient" });
    patient2 = await creerUtilisateurConnecte({ role: "patient" });

    facility = await Facility.create({
      category: "medecin",
      nom: "Dr Avis Test",
      latitude: 36.5,
      longitude: 8.78,
    });
  });

  test("POST refuse une note invalide", async () => {
    const res = await patient1.agent
      .post(`/api/facilities/${facility.id}/avis`)
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken)
      .send({ note: 8, commentaire: "Note hors limites" });
    expect(res.status).toBe(400);
  });

  test("POST refuse un établissement introuvable", async () => {
    const res = await patient1.agent
      .post("/api/facilities/999999999/avis")
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken)
      .send({ note: 5 });
    expect(res.status).toBe(404);
  });

  test("POST publie un avis (en attente de modération) et refuse un doublon du même patient", async () => {
    const res = await patient1.agent
      .post(`/api/facilities/${facility.id}/avis`)
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken)
      .send({ note: 5, commentaire: "Excellent accueil" });

    expect(res.status).toBe(201);
    expect(res.body.avis.statut).toBe("en_attente");

    const doublon = await patient1.agent
      .post(`/api/facilities/${facility.id}/avis`)
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken)
      .send({ note: 4 });
    expect(doublon.status).toBe(409);
  });

  test("GET liste paginée : un avis en attente n'apparaît pas encore et ne compte pas dans la moyenne", async () => {
    const res = await patient1.agent.get(`/api/facilities/${facility.id}/avis`);
    expect(res.status).toBe(200);
    expect(res.body.avis).toHaveLength(0);
    expect(res.body.moyenne).toBeNull();
  });

  test("l'admin approuve l'avis : il apparaît ensuite et la moyenne est recalculée", async () => {
    const listeAdmin = await admin.agent.get("/api/admin/avis?statut=en_attente").set("Authorization", bearer(admin.token));
    expect(listeAdmin.status).toBe(200);
    const avisAModerer = listeAdmin.body.avis.find((a) => a.facilityId === facility.id);
    expect(avisAModerer).toBeDefined();

    const moderation = await admin.agent
      .patch(`/api/admin/avis/${avisAModerer.id}/moderation`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ statut: "approuve" });
    expect(moderation.status).toBe(200);
    expect(moderation.body.moyenne).toBe(5);

    const res = await patient1.agent.get(`/api/facilities/${facility.id}/avis?page=1&limit=5`);
    expect(res.status).toBe(200);
    expect(res.body.avis).toHaveLength(1);
    expect(res.body.moyenne).toBe(5);
    expect(res.body.total).toBe(1);

    await facility.reload();
    expect(facility.noteAvis).toBe(5);
  });

  test("DELETE refuse un non-auteur, refuse un avis introuvable, supprime pour l'auteur et recalcule la moyenne", async () => {
    const liste = await patient1.agent.get(`/api/facilities/${facility.id}/avis`);
    const avisId = liste.body.avis[0].id;

    const introuvable = await patient1.agent
      .delete("/api/avis/999999999")
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken);
    expect(introuvable.status).toBe(404);

    const refus = await patient2.agent
      .delete(`/api/avis/${avisId}`)
      .set("Authorization", bearer(patient2.token))
      .set("X-CSRF-Token", patient2.csrfToken);
    expect(refus.status).toBe(403);

    const ok = await patient1.agent
      .delete(`/api/avis/${avisId}`)
      .set("Authorization", bearer(patient1.token))
      .set("X-CSRF-Token", patient1.csrfToken);
    expect(ok.status).toBe(200);
    expect(ok.body.moyenne).toBeNull();

    const res = await patient1.agent.get(`/api/facilities/${facility.id}/avis`);
    expect(res.body.avis).toHaveLength(0);
  });
});
