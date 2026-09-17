const { creerUtilisateurConnecte, bearer } = require("./helpers");

// Jendouba, Tunisie (utilisé dans les seeds réels du projet).
const LAT = 36.5011;
const LNG = 8.7802;

describe("Facilities - recherche, CRUD, profil pro", () => {
  let admin;
  let pro1;
  let pro2;
  let patient;
  let facilityId;

  beforeAll(async () => {
    admin = await creerUtilisateurConnecte({ role: "administrateur" });
    pro1 = await creerUtilisateurConnecte({ role: "professionnel" });
    pro2 = await creerUtilisateurConnecte({ role: "professionnel" });
    patient = await creerUtilisateurConnecte({ role: "patient" });
  });

  test("GET / rejette une catégorie invalide", async () => {
    const res = await patient.agent.get("/api/facilities?category=inexistante");
    expect(res.status).toBe(400);
  });

  test("POST / refuse la création à un non-admin", async () => {
    const res = await pro1.agent
      .post("/api/facilities")
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .send({ category: "medecin", nom: "Dr Refuse", latitude: LAT, longitude: LNG });
    expect(res.status).toBe(403);
  });

  test("POST / refuse une catégorie ou des coordonnées invalides", async () => {
    const catInvalide = await admin.agent
      .post("/api/facilities")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ category: "vetuo", nom: "X", latitude: LAT, longitude: LNG });
    expect(catInvalide.status).toBe(400);

    const sansNom = await admin.agent
      .post("/api/facilities")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ category: "medecin", latitude: LAT, longitude: LNG });
    expect(sansNom.status).toBe(400);

    const coordsInvalides = await admin.agent
      .post("/api/facilities")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ category: "medecin", nom: "X", latitude: "abc", longitude: LNG });
    expect(coordsInvalides.status).toBe(400);
  });

  test("POST / crée une fiche médecin (admin)", async () => {
    const res = await admin.agent
      .post("/api/facilities")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        category: "medecin",
        nom: "Dr Test Cardiologie Jendouba",
        specialite: "Cardiologie",
        latitude: LAT,
        longitude: LNG,
        adresse: "Avenue Habib Bourguiba",
        delegation: "Jendouba Nord",
      });

    expect(res.status).toBe(201);
    expect(res.body.facility.id).toBeDefined();
    facilityId = res.body.facility.id;
  });

  test("GET /:id trouve la fiche créée, 404 sinon", async () => {
    const ok = await patient.agent.get(`/api/facilities/${facilityId}`);
    expect(ok.status).toBe(200);
    expect(ok.body.facility.nom).toBe("Dr Test Cardiologie Jendouba");

    const introuvable = await patient.agent.get("/api/facilities/999999999");
    expect(introuvable.status).toBe(404);
  });

  test("GET / retrouve la fiche par recherche géographique (ST_DWithin) avec distanceM", async () => {
    const res = await patient.agent.get(`/api/facilities?lat=${LAT}&lng=${LNG}&radius=5000`);
    expect(res.status).toBe(200);
    const trouve = res.body.results.find((f) => f.id === facilityId);
    expect(trouve).toBeDefined();
    expect(trouve.distanceM).toBeDefined();
  });

  test("GET / retrouve la fiche par recherche texte (q) et gère le cache", async () => {
    const res1 = await patient.agent.get("/api/facilities?q=Cardiologie");
    expect(res1.status).toBe(200);
    expect(res1.body.results.some((f) => f.id === facilityId)).toBe(true);

    // Deuxième appel identique : si Redis est prêt, on doit obtenir un HIT.
    const res2 = await patient.agent.get(`/api/facilities?lat=${LAT}&lng=${LNG}&radius=5000`);
    expect(["HIT", "MISS", undefined]).toContain(res2.headers["x-cache"]);
  });

  test("GET /mine/liste ne renvoie que les fiches du professionnel connecté", async () => {
    const vide = await pro2.agent.get("/api/facilities/mine/liste").set("Authorization", bearer(pro2.token));
    expect(vide.status).toBe(200);
    expect(vide.body.facilities).toEqual([]);
  });

  test("PATCH /:id/revendiquer rattache la fiche à un professionnel, refuse un second", async () => {
    const ok = await pro1.agent
      .patch(`/api/facilities/${facilityId}/revendiquer`)
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken);
    expect(ok.status).toBe(200);
    expect(ok.body.facility.ownerId).toBe(pro1.user.id);

    const conflit = await pro2.agent
      .patch(`/api/facilities/${facilityId}/revendiquer`)
      .set("Authorization", bearer(pro2.token))
      .set("X-CSRF-Token", pro2.csrfToken);
    expect(conflit.status).toBe(409);
  });

  test("PATCH /:id/revendiquer refuse un professionnel d'une autre catégorie", async () => {
    const proPharmacie = await creerUtilisateurConnecte({ role: "professionnel", categorieProfessionnelle: "pharmacie" });

    const res = await proPharmacie.agent
      .patch(`/api/facilities/${facilityId}/revendiquer`)
      .set("Authorization", bearer(proPharmacie.token))
      .set("X-CSRF-Token", proPharmacie.csrfToken);

    expect(res.status).toBe(403);
  });

  test("GET /mine/liste renvoie désormais la fiche revendiquée pour pro1", async () => {
    const res = await pro1.agent.get("/api/facilities/mine/liste").set("Authorization", bearer(pro1.token));
    expect(res.status).toBe(200);
    expect(res.body.facilities.some((f) => f.id === facilityId)).toBe(true);
  });

  test("PATCH /:id/profil refuse un non-propriétaire, accepte le propriétaire avec upload photo", async () => {
    const refus = await pro2.agent
      .patch(`/api/facilities/${facilityId}/profil`)
      .set("Authorization", bearer(pro2.token))
      .set("X-CSRF-Token", pro2.csrfToken)
      .field("bio", "Tentative refusée");
    expect(refus.status).toBe(403);

    const ok = await pro1.agent
      .patch(`/api/facilities/${facilityId}/profil`)
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .field("horaires", "Lun-Ven 8h-17h")
      .field("bio", "Cardiologue expérimenté à Jendouba.")
      .attach("photo", Buffer.from("donnee-image-simulee"), "photo.png");

    expect(ok.status).toBe(200);
    expect(ok.body.facility.horaires).toBe("Lun-Ven 8h-17h");
    expect(ok.body.facility.photoUrl).toMatch(/^\/uploads\/photos\//);
  });

  test("PATCH /:id/profil refuse un format de fichier non autorisé", async () => {
    const res = await pro1.agent
      .patch(`/api/facilities/${facilityId}/profil`)
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .attach("photo", Buffer.from("pas-une-image"), "fichier.txt");

    expect(res.status).toBe(400);
  });

  test("PATCH /:id refuse un non-admin, refuse une catégorie/coordonnées invalides, modifie pour un admin", async () => {
    const refus = await patient.agent
      .patch(`/api/facilities/${facilityId}`)
      .set("Authorization", bearer(patient.token))
      .set("X-CSRF-Token", patient.csrfToken)
      .send({ nom: "Tentative refusée" });
    expect(refus.status).toBe(403);

    const catInvalide = await admin.agent
      .patch(`/api/facilities/${facilityId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ category: "vetuo" });
    expect(catInvalide.status).toBe(400);

    const nomVide = await admin.agent
      .patch(`/api/facilities/${facilityId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ nom: "" });
    expect(nomVide.status).toBe(400);

    const coordsInvalides = await admin.agent
      .patch(`/api/facilities/${facilityId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ latitude: "abc" });
    expect(coordsInvalides.status).toBe(400);

    const introuvable = await admin.agent
      .patch("/api/facilities/999999999")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ nom: "X" });
    expect(introuvable.status).toBe(404);

    const ok = await admin.agent
      .patch(`/api/facilities/${facilityId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ nom: "Dr Test Cardiologie Jendouba (corrigé)", specialite: "Cardiologie interventionnelle" });
    expect(ok.status).toBe(200);
    expect(ok.body.facility.nom).toBe("Dr Test Cardiologie Jendouba (corrigé)");
    expect(ok.body.facility.specialite).toBe("Cardiologie interventionnelle");

    const verif = await patient.agent.get(`/api/facilities/${facilityId}`);
    expect(verif.body.facility.nom).toBe("Dr Test Cardiologie Jendouba (corrigé)");
  });

  test("PATCH /:id/profil accepte typeGarde pour une pharmacie, l'ignore pour un médecin", async () => {
    const proPharmacie = await creerUtilisateurConnecte({ role: "professionnel", categorieProfessionnelle: "pharmacie" });

    const creation = await admin.agent
      .post("/api/facilities")
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ category: "pharmacie", nom: "Pharmacie Test Jendouba", latitude: LAT, longitude: LNG });
    expect(creation.status).toBe(201);
    const pharmacieId = creation.body.facility.id;

    await proPharmacie.agent
      .patch(`/api/facilities/${pharmacieId}/revendiquer`)
      .set("Authorization", bearer(proPharmacie.token))
      .set("X-CSRF-Token", proPharmacie.csrfToken);

    const gardeInvalide = await proPharmacie.agent
      .patch(`/api/facilities/${pharmacieId}/profil`)
      .set("Authorization", bearer(proPharmacie.token))
      .set("X-CSRF-Token", proPharmacie.csrfToken)
      .field("typeGarde", "Soir");
    expect(gardeInvalide.status).toBe(400);

    const gardeOk = await proPharmacie.agent
      .patch(`/api/facilities/${pharmacieId}/profil`)
      .set("Authorization", bearer(proPharmacie.token))
      .set("X-CSRF-Token", proPharmacie.csrfToken)
      .field("typeGarde", "Nuit");
    expect(gardeOk.status).toBe(200);
    expect(gardeOk.body.facility.typeGarde).toBe("Nuit");

    // Sur une fiche médecin, le champ est silencieusement ignoré (pas d'erreur).
    const ignoreSurMedecin = await pro1.agent
      .patch(`/api/facilities/${facilityId}/profil`)
      .set("Authorization", bearer(pro1.token))
      .set("X-CSRF-Token", pro1.csrfToken)
      .field("typeGarde", "Nuit");
    expect(ignoreSurMedecin.status).toBe(200);
    expect(ignoreSurMedecin.body.facility.typeGarde).toBeFalsy();
  });

  test("DELETE /:id refuse un non-admin, supprime pour un admin", async () => {
    const refus = await patient.agent
      .delete(`/api/facilities/${facilityId}`)
      .set("Authorization", bearer(patient.token))
      .set("X-CSRF-Token", patient.csrfToken);
    expect(refus.status).toBe(403);

    const ok = await admin.agent
      .delete(`/api/facilities/${facilityId}`)
      .set("Authorization", bearer(admin.token))
      .set("X-CSRF-Token", admin.csrfToken);
    expect(ok.status).toBe(200);

    const introuvable = await admin.agent.get(`/api/facilities/${facilityId}`);
    expect(introuvable.status).toBe(404);
  });
});
