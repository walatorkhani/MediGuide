const request = require("supertest");
const app = require("../app");
const User = require("../models/User");

// Compteur pour garantir des emails uniques même si plusieurs utilisateurs
// sont créés dans la même milliseconde au sein d'un même fichier de test.
let compteur = 0;
function emailUnique(prefixe = "user") {
  compteur += 1;
  return `${prefixe}_${Date.now()}_${compteur}@test.mediguide.local`;
}

// Récupère un agent supertest (qui conserve les cookies, dont le cookie
// csrf_token) ainsi que la valeur du jeton CSRF à renvoyer dans l'en-tête
// X-CSRF-Token pour toute requête mutative (POST/PATCH/DELETE), la
// protection CSRF étant appliquée globalement dans app.js.
async function csrfAgent() {
  const agent = request.agent(app);
  const res = await agent.get("/api/auth/csrf");
  const csrfToken = res.headers["set-cookie"][0].match(/csrf_token=([^;]+)/)[1];
  return { agent, csrfToken };
}

// Inscrit puis connecte un utilisateur avec le rôle demandé et renvoie tout
// ce dont un test a besoin (agent, jeton CSRF, token JWT, refreshToken...).
// Pour "administrateur" (non inscriptible via /register), on inscrit un
// patient puis on élève son rôle directement en base, comme le ferait un
// admin via /api/admin/users.
async function creerUtilisateurConnecte({ role = "patient", nom = "Utilisateur Test", categorieProfessionnelle = "medecin" } = {}) {
  const { agent, csrfToken } = await csrfAgent();
  const email = emailUnique(role);
  const motDePasse = "MotDePasse123!";

  await agent
    .post("/api/auth/register")
    .set("X-CSRF-Token", csrfToken)
    .send({
      nom,
      email,
      motDePasse,
      role: role === "administrateur" ? "patient" : role,
      ...(role === "professionnel" ? { categorieProfessionnelle } : {}),
    });

  if (role === "professionnel" || role === "administrateur") {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error(`Utilisateur de test introuvable après inscription : ${email}`);
    }
    user.estValide = true;
    if (role === "administrateur") user.role = "administrateur";
    await user.save();
  }

  const loginRes = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email, motDePasse });

  return {
    agent,
    csrfToken,
    token: loginRes.body.token,
    refreshToken: loginRes.body.refreshToken,
    sessionId: loginRes.body.sessionId,
    user: loginRes.body.user,
    email,
    motDePasse,
  };
}

function bearer(token) {
  return `Bearer ${token}`;
}

module.exports = { app, csrfAgent, creerUtilisateurConnecte, emailUnique, bearer };
