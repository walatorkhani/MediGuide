// Exécuté avant les tests de chaque fichier (voir jest.config "setupFilesAfterEnv").
// Connecte réellement Redis pendant les tests (server.js le fait normalement au
// démarrage, mais les tests importent app.js directement, sans passer par
// server.js) afin que les branches liées au cache recherche et aux sessions
// Redis (S7) soient effectivement exercées, puis ferme proprement les
// connexions pour éviter que Jest ne reste bloqué en fin de suite.
const { redis, connectRedis } = require("../config/redis");
const sequelize = require("../config/database");

beforeAll(async () => {
  await connectRedis();
  // Vide le cache recherche avant chaque fichier de test : les tests
  // facilities.js utilisent des coordonnées fixes, et le cache recherche a
  // un TTL de 60s (S7) — sans ce flush, deux exécutions rapprochées de la
  // suite peuvent se voir répondre un résultat périmé (mis en cache par la
  // précédente exécution, potentiellement avant la création de la fiche).
  if (redis.isOpen) {
    await redis.flushAll();
  }
});

afterAll(async () => {
  try {
    if (redis.isOpen) await redis.quit();
  } catch (_) {}
  try {
    await sequelize.close();
  } catch (_) {}
});
