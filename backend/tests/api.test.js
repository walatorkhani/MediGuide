const request = require("supertest");

const app = require("../app");

describe("API - smoke et validation", () => {
  test("GET /health retourne 200 et status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("GET / retourne le message API", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Bienvenue sur l'API de MédiGuide/i);
  });

  test("GET route inconnue retourne 404 JSON", async () => {
    const res = await request(app).get("/api/route-inexistante");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Route introuvable." });
  });

  test("GET /api/auth/csrf délivre un jeton CSRF", async () => {
    const res = await request(app).get("/api/auth/csrf");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("csrf_token=")])
    );
  });

  test("POST /api/auth/register rejette les données invalides", async () => {
    const agent = request.agent(app);
    const csrf = await agent.get("/api/auth/csrf");
    const cookie = csrf.headers["set-cookie"][0].match(/csrf_token=([^;]+)/)[1];

    const res = await agent
      .post("/api/auth/register")
      .set("X-CSRF-Token", cookie)
      .send({ nom: "A", email: "email-invalide", motDePasse: "123" });

    expect(res.status).toBe(400);
  });

  test("POST /api/auth/login rejette les données invalides", async () => {
    const agent = request.agent(app);
    const csrf = await agent.get("/api/auth/csrf");
    const cookie = csrf.headers["set-cookie"][0].match(/csrf_token=([^;]+)/)[1];

    const res = await agent
      .post("/api/auth/login")
      .set("X-CSRF-Token", cookie)
      .send({ email: "email-invalide", motDePasse: "" });

    expect(res.status).toBe(400);
  });

  test("POST sans CSRF est bloqué", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", motDePasse: "password" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/CSRF/i);
  });
});
