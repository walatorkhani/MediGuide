require("dotenv").config();

const sequelize = require("../config/database");
const { generateLicense } = require("../utils/licenseManager");

async function main() {
  try {
    await sequelize.authenticate();

    const expiresAt = new Date();
expiresAt.setFullYear(expiresAt.getFullYear() + 1);

const license = await generateLicense({
  expiresAt,
  maxActivations: 1,
});    console.log("\n========================================");
    console.log("       LICENCE MEDIGUIDE CREEE");
    console.log("========================================");
    console.log("ID              :", license.id);
    console.log("Produit         :", license.product);
    console.log("Licence Key     :", license.licenseKey);
    console.log("Statut          :", license.status);
    console.log("Activations max :", license.maxActivations);
    console.log("Expiration      :", license.expiresAt || "Aucune");
    console.log("========================================\n");

    await sequelize.close();
  } catch (error) {
    console.error("Erreur lors de la création de la licence :", error);
    process.exit(1);
  }
}

main();