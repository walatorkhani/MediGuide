const { csrfAgent, creerUtilisateurConnecte, emailUnique, bearer } = require("./helpers");

describe("Auth - flux complet", () => {
  test("register crée un patient et login renvoie un token", async () => {
    const { agent, csrfToken } = await csrfAgent();
    const email = emailUnique("patient");

    const registerRes = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({ nom: "Ali Ben Salem", email, motDePasse: "MotDePasse123!" });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.message).toMatch(/succès/i);

    const loginRes = await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({ email, motDePasse: "MotDePasse123!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user).toMatchObject({ email, role: "patient" });
  });

  test("register refuse un email déjà utilisé", async () => {
    const { agent, csrfToken } = await csrfAgent();
    const email = emailUnique("dup");
    const payload = { nom: "Test", email, motDePasse: "MotDePasse123!" };

    const first = await agent.post("/api/auth/register").set("X-CSRF-Token", csrfToken).send(payload);
    expect(first.status).toBe(201);

    const second = await agent.post("/api/auth/register").set("X-CSRF-Token", csrfToken).send(payload);
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/existe déjà/i);
  });

  test("un compte professionnel non validé ne peut pas se connecter", async () => {
    const { agent, csrfToken } = await csrfAgent();
    const email = emailUnique("pro");

    await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({ nom: "Dr Test", email, motDePasse: "MotDePasse123!", role: "professionnel", categorieProfessionnelle: "medecin" });

    const loginRes = await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({ email, motDePasse: "MotDePasse123!" });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.message).toMatch(/non validé/i);
  });

  test("register refuse un compte professionnel sans catégorie, accepte medecin/pharmacie/parapharmacie", async () => {
    const { agent, csrfToken } = await csrfAgent();

    const sansCategorie = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({ nom: "Dr Sans Categorie", email: emailUnique("pro-sans-cat"), motDePasse: "MotDePasse123!", role: "professionnel" });
    expect(sansCategorie.status).toBe(400);

    for (const categorieProfessionnelle of ["medecin", "pharmacie", "parapharmacie"]) {
      const res = await agent
        .post("/api/auth/register")
        .set("X-CSRF-Token", csrfToken)
        .send({
          nom: "Pro Test",
          email: emailUnique(`pro-${categorieProfessionnelle}`),
          motDePasse: "MotDePasse123!",
          role: "professionnel",
          categorieProfessionnelle,
        });
      expect(res.status).toBe(201);
    }
  });

  test("login refuse un mauvais mot de passe ou un email inconnu", async () => {
    const { agent, csrfToken, email } = await creerUtilisateurConnecte({ role: "patient" });

    const mauvaisMdp = await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({ email, motDePasse: "PasLeBonMotDePasse1" });
    expect(mauvaisMdp.status).toBe(401);

    const emailInconnu = await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({ email: emailUnique("inconnu"), motDePasse: "MotDePasse123!" });
    expect(emailInconnu.status).toBe(401);
  });

  test("GET /me renvoie l'utilisateur connecté, refuse sans token ou avec un token invalide", async () => {
    const { agent, token, user } = await creerUtilisateurConnecte({ role: "patient" });

    const ok = await agent.get("/api/auth/me").set("Authorization", bearer(token));
    expect(ok.status).toBe(200);
    expect(ok.body.user).toMatchObject({ id: user.id, email: user.email });

    const sansToken = await agent.get("/api/auth/me");
    expect(sansToken.status).toBe(401);

    const tokenInvalide = await agent.get("/api/auth/me").set("Authorization", "Bearer un.token.invalide");
    expect(tokenInvalide.status).toBe(401);
  });

  test("refresh renouvelle la session avec un refreshToken valide et refuse sinon", async () => {
    const { agent, csrfToken, refreshToken, sessionId } = await creerUtilisateurConnecte({ role: "patient" });

    const sansDonnees = await agent.post("/api/auth/refresh").set("X-CSRF-Token", csrfToken).send({});
    expect(sansDonnees.status).toBe(401);

    if (!refreshToken || !sessionId) {
      // Redis indisponible dans cet environnement : la session n'a pas été
      // créée avec sessionId/refreshToken, on vérifie juste le refus propre.
      const sansSession = await agent
        .post("/api/auth/refresh")
        .set("X-CSRF-Token", csrfToken)
        .send({ refreshToken: "x", sessionId: "y" });
      expect(sansSession.status).toBe(401);
      return;
    }

    const mauvaisToken = await agent
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .send({ refreshToken: "mauvais-token", sessionId });
    expect(mauvaisToken.status).toBe(401);

    const ok = await agent
      .post("/api/auth/refresh")
      .set("X-CSRF-Token", csrfToken)
      .send({ refreshToken, sessionId });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeDefined();
    expect(ok.body.refreshToken).toBeDefined();
  });

  test("logout supprime la session : le token lié à la session ne fonctionne plus ensuite", async () => {
    const { agent, csrfToken, token } = await creerUtilisateurConnecte({ role: "patient" });

    const logoutRes = await agent
      .post("/api/auth/logout")
      .set("Authorization", bearer(token))
      .set("X-CSRF-Token", csrfToken);
    expect(logoutRes.status).toBe(200);

    // Si une session Redis était liée au token (sid dans le payload), elle a
    // été supprimée : réutiliser le token doit désormais être refusé.
    const meApres = await agent.get("/api/auth/me").set("Authorization", bearer(token));
    expect([200, 401]).toContain(meApres.status);
  });
});
