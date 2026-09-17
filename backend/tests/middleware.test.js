const jwt = require("jsonwebtoken");
const express = require("express");
const request = require("supertest");
const { creerUtilisateurConnecte, bearer } = require("./helpers");
const { authLimiter } = require("../middleware/rateLimiter");

describe("Middlewares - authMiddleware / roleMiddleware", () => {
  test("authMiddleware refuse une requête sans en-tête Authorization", async () => {
    const { agent } = await creerUtilisateurConnecte({ role: "professionnel" });
    const res = await agent.get("/api/facilities/mine/liste");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/aucun token/i);
  });

  test("authMiddleware refuse un en-tête Authorization mal formé", async () => {
    const { agent } = await creerUtilisateurConnecte({ role: "professionnel" });
    const res = await agent.get("/api/facilities/mine/liste").set("Authorization", "PasBearer abc");
    expect(res.status).toBe(401);
  });

  test("authMiddleware refuse un token signé avec un mauvais secret", async () => {
    const { agent } = await creerUtilisateurConnecte({ role: "professionnel" });
    const fauxToken = jwt.sign({ id: 1, role: "professionnel" }, "mauvais-secret", { expiresIn: "1h" });
    const res = await agent.get("/api/facilities/mine/liste").set("Authorization", bearer(fauxToken));
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalide/i);
  });

  test("roleMiddleware refuse un rôle non autorisé sur une route à accès restreint", async () => {
    const { agent, token } = await creerUtilisateurConnecte({ role: "professionnel" });
    // /api/rendezvous/mes est réservé aux patients.
    const res = await agent.get("/api/rendezvous/mes").set("Authorization", bearer(token));
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/interdit/i);
  });

  test("authLimiter bloque après le nombre de requêtes autorisé (hors environnement de test)", async () => {
    // Le rate limiting est désactivé pendant les tests (voir
    // middleware/rateLimiter.js) pour ne pas gêner les autres suites : on
    // force ici temporairement un environnement non-test pour vérifier que
    // le blocage fonctionne réellement au-delà de la limite.
    const environnementOriginal = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const appDeTest = express();
      appDeTest.use(authLimiter);
      appDeTest.get("/ping", (req, res) => res.json({ ok: true }));

      let dernierStatut;
      for (let i = 0; i < 11; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await request(appDeTest).get("/ping");
        dernierStatut = res.status;
      }
      expect(dernierStatut).toBe(429);
    } finally {
      process.env.NODE_ENV = environnementOriginal;
    }
  });
});
