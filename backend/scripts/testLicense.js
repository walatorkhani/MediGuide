require("dotenv").config();

const { validateLicense } = require("../utils/licenseManager");

const licenseKey = process.argv[2];

async function main() {
  if (!licenseKey) {
    console.log("Usage:");
    console.log("node scripts\\testLicense.js VOTRE_LICENCE");
    process.exit(1);
  }

  const result = await validateLicense(licenseKey);

  console.log("\n==============================");
  console.log("      TEST LICENCE MEDIGUIDE");
  console.log("==============================");
  console.log("Valide :", result.valid);

  if (result.valid) {
    console.log("Produit :", result.license.product);
    console.log("Statut :", result.license.status);
    console.log("Activations :", result.license.activationCount);
    console.log("Max activations :", result.license.maxActivations);
    console.log("Expiration :", result.license.expiresAt || "Aucune");
  } else {
    console.log("Raison :", result.reason);
  }

  console.log("==============================\n");

  process.exit(result.valid ? 0 : 1);
}

main().catch((error) => {
  console.error("Erreur :", error);
  process.exit(1);
});