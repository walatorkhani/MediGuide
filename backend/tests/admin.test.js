const { creerUtilisateurConnecte, emailUnique, bearer } = require("./helpers");
const Facility = require("../models/Facility");

describe("Admin - utilisateurs, médecins, avis, statistiques", () => {
  let admin;
  let patient;

  beforeAll(async () => {
    admin = await creerUtilisateurConnecte({ role: "administrateur" });
    patient = await creerUtilisateurConnecte({ role: "patient" });
  });

  test("les routes admin sont protégées : refusées sans token et pour un rôle non-admin", async () => {
    const sansToken = await patient.agent.get("/api/admin/users");
    expect(sansToken.status).toBe(401);

    const nonAdmin = await patient.agent.get("/api/admin/users").set("Authorization", bearer(patient.token));
    expect(nonAdmin.status).toBe(403);
  });

  test("CRUD utilisateurs : création, doublon, rôle invalide, modification, conflit email, suppression", async () => {
    const email = emailUnique("admincru");
    const creation = await admin.agent
      .post("/api/admin/users")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ nom: "Créé par admin", email, motDePasse: "MotDePasse123!", role: "patient" });
    expect(creation.status).toBe(201);
    const userId = creation.body.user.id;
    expect(creation.body.user.motDePasse).toBeUndefined();

    const champsManquants = await admin.agent
      .post("/api/admin/users")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ email: emailUnique("x") });
    expect(champsManquants.status).toBe(400);

    const roleInvalide = await admin.agent
      .post("/api/admin/users")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ nom: "X", email: emailUnique("x"), motDePasse: "MotDePasse123!", role: "superadmin" });
    expect(roleInvalide.status).toBe(400);

    const doublon = await admin.agent
      .post("/api/admin/users")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ nom: "Doublon", email, motDePasse: "MotDePasse123!" });
    expect(doublon.status).toBe(409);

    const liste = await admin.agent
      .get(`/api/admin/users?q=${encodeURIComponent(email)}`)
      .set("Authorization", bearer(admin.token));
    expect(liste.status).toBe(200);
    expect(liste.body.users.some((u) => u.id === userId)).toBe(true);

    const modifOk = await admin.agent
      .patch(`/api/admin/users/${userId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ nom: "Nom modifié", estValide: false, motDePasse: "NouveauMotDePasse123!" });
    expect(modifOk.status).toBe(200);
    expect(modifOk.body.user.nom).toBe("Nom modifié");

    const modifEmailConflit = await admin.agent
      .patch(`/api/admin/users/${userId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ email: admin.email });
    expect(modifEmailConflit.status).toBe(409);

    const modifRoleInvalide = await admin.agent
      .patch(`/api/admin/users/${userId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ role: "superadmin" });
    expect(modifRoleInvalide.status).toBe(400);

    const modifIntrouvable = await admin.agent
      .patch("/api/admin/users/999999999")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ nom: "X" });
    expect(modifIntrouvable.status).toBe(404);

    const autoSuppression = await admin.agent
      .delete(`/api/admin/users/${admin.user.id}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken);
    expect(autoSuppression.status).toBe(400);

    const suppressionOk = await admin.agent
      .delete(`/api/admin/users/${userId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken);
    expect(suppressionOk.status).toBe(200);

    const suppressionIntrouvable = await admin.agent
      .delete(`/api/admin/users/${userId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken);
    expect(suppressionIntrouvable.status).toBe(404);
  });

  test("médecins : liste filtrée et validation d'un profil", async () => {
    const medecin = await Facility.create({
      category: "medecin",
      nom: "Dr Validation Test",
      specialite: "Dermatologie",
      latitude: 36.5,
      longitude: 8.78,
      estVerifie: false,
    });

    const liste = await admin.agent
      .get("/api/admin/medecins?specialite=Dermatologie&estVerifie=false")
      .set("Authorization", bearer(admin.token));
    expect(liste.status).toBe(200);
    expect(liste.body.medecins.some((m) => m.id === medecin.id)).toBe(true);

    const validation = await admin.agent
      .patch(`/api/admin/medecins/${medecin.id}/validation`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ estVerifie: true });
    expect(validation.status).toBe(200);
    expect(validation.body.medecin.estVerifie).toBe(true);

    const introuvable = await admin.agent
      .patch("/api/admin/medecins/999999999/validation")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ estVerifie: true });
    expect(introuvable.status).toBe(404);
  });

  test("modération avis : statut invalide, avis introuvable", async () => {
    const statutInvalide = await admin.agent
      .patch("/api/admin/avis/1/moderation")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ statut: "n_importe_quoi" });
    expect(statutInvalide.status).toBe(400);

    const introuvable = await admin.agent
      .patch("/api/admin/avis/999999999/moderation")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ statut: "approuve" });
    expect(introuvable.status).toBe(404);
  });

  test("stats renvoie les compteurs globaux", async () => {
    const res = await admin.agent.get("/api/admin/stats").set("Authorization", bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual(
      expect.objectContaining({
        users: expect.any(Number),
        medecins: expect.any(Number),
        pharmacies: expect.any(Number),
        parapharmacies: expect.any(Number),
        avis: expect.any(Number),
        avisEnAttente: expect.any(Number),
        medecinsValides: expect.any(Number),
      })
    );
  });
});
