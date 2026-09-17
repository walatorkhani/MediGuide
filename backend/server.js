require("dotenv").config();

const sequelize = require("./config/database");
const { connectRedis } = require("./config/redis");
const { demarrerRappels } = require("./jobs/rappels");
const { ensureAuthSchema } = require("./utils/ensureAuthSchema");
const app = require("./app");

async function start() {
  try {
    await connectRedis();

    await sequelize.authenticate();
    await ensureAuthSchema();
    console.log("PostgreSQL connecté et schéma d’authentification vérifié.");

    demarrerRappels();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;