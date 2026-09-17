require("dotenv").config();

const sequelize = require("../config/database");
const { activateLicense } = require("../utils/licenseManager");

const licenseKey = process.argv[2];

async function main() {
  try {
    if (!licenseKey) {
      console.log("Usage:");
      console.log('node scripts\\activateLicense.js "VOTRE_LICENCE_COMPLETE"');
      process.exit(1);
    }

    await sequelize.authenticate();

    const result = await activateLicense(licenseKey);

    console.log("\n========================================");
    console.log("       ACTIVATION MEDIGUIDE");
    console.log("========================================");

    console.log("Succès :", result.activated === true);

    if (result.activated) {
      console.log("Message :", result.message);
      console.log("Produit :", result.license.product);
      console.log("Activations :", result.license.activationCount);
      console.log("Max activations :", result.license.maxActivations);
      console.log("Activé le :", result.license.activatedAt);
    } else {
      console.log("Raison :", result.reason);
    }

    console.log("========================================\n");

    await sequelize.close();

    process.exit(result.activated ? 0 : 1);
  } catch (error) {
    console.error("Erreur :", error);

    await sequelize.close();

    process.exit(1);
  }
}

main();