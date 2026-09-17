const request = require("supertest");
const app = require("../app");
const Facility = require("../models/Facility");
const { creerUtilisateurConnecte } = require("./helpers");

describe("Module medieye (section 7.4 — plateforme partagée)", () => {
  test("GET /api/modules/medieye/manifest renvoie le slug et les permissions RBAC", async () => {
    const res = await request(app).get("/api/modules/medieye/manifest");
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("medieye");
    expect(res.body.permissions).toEqual(expect.arrayContaining(["read", "write", "admin"]));
  });

  test("GET /api/modules/medieye/facilities renvoie le format Facility générique", async () => {
    const facility = await Facility.create({
      category: "medecin",
      nom: "Dr Test Medieye",
      specialite: "Cardiologie",
      adresse: "Rue de test",
      delegation: "Jendouba Nord",
      telephone: "12345678",
      latitude: 36.5,
      longitude: 8.78,
      estVerifie: true,
    });

    const res = await request(app).get("/api/modules/medieye/facilities").query({ q: "Medieye" });
    expect(res.status).toBe(200);
    expect(res.body.module).toBe("medieye");
    expect(res.body.results.length).toBeGreaterThan(0);

    const mapped = res.body.results.find((r) => r.id === facility.id);
    expect(mapped).toMatchObject({
      id: facility.id,
      name: "Dr Test Medieye",
      category: "medecin",
      subSpecialty: "Cardiologie",
      phone: "12345678",
      isVerified: true,
    });
    expect(mapped.address).toContain("Jendouba Nord");
    expect(mapped).toHaveProperty("latitude");
    expect(mapped).toHaveProperty("longitude");
    expect(mapped).toHaveProperty("features");
  });

  test("GET /api/modules/medieye/facilities/:id renvoie 404 si introuvable", async () => {
    const res = await request(app).get("/api/modules/medieye/facilities/999999999");
    expect(res.status).toBe(404);
  });

  test("GET /api/modules/medieye/permission traduit le rôle en permission RBAC", async () => {
    const { token } = await creerUtilisateurConnecte({ role: "patient" });
    const res = await request(app)
      .get("/api/modules/medieye/permission")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.permission).toBe("read");
  });

  test("GET /api/modules/medieye/permission sans token renvoie 401", async () => {
    const res = await request(app).get("/api/modules/medieye/permission");
    expect(res.status).toBe(401);
  });
});
