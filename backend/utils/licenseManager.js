const crypto = require("crypto");
const License = require("../models/License");

const LICENSE_SECRET = process.env.LICENSE_SECRET;

if (!LICENSE_SECRET) {
  throw new Error("LICENSE_SECRET n'est pas défini dans .env");
}

function createLicenseKey() {
  const part1 = crypto.randomBytes(4).toString("hex").toUpperCase();
  const part2 = crypto.randomBytes(4).toString("hex").toUpperCase();
  const part3 = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `MEDIGUIDE-${part1}-${part2}-${part3}`;
}

function createSignature(data) {
  return crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(data)
    .digest("hex");
}

async function generateLicense({
  expiresAt = null,
  maxActivations = 1,
} = {}) {
  const licenseKey = createLicenseKey();

  const signature = createSignature(licenseKey);

  const finalKey = `${licenseKey}.${signature}`;

  const license = await License.create({
    licenseKey: finalKey,
    product: "MediGuide",
    status: "active",
    expiresAt,
    maxActivations,
  });

  return license;
}

function verifyLicenseSignature(licenseKey) {
  if (!licenseKey) return false;

  const separatorIndex = licenseKey.lastIndexOf(".");

  if (separatorIndex === -1) return false;

  const key = licenseKey.substring(0, separatorIndex);
  const signature = licenseKey.substring(separatorIndex + 1);

  const expectedSignature = createSignature(key);

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

async function validateLicense(licenseKey) {
  if (!verifyLicenseSignature(licenseKey)) {
    return {
      valid: false,
      reason: "Signature de licence invalide",
    };
  }

  const license = await License.findOne({
    where: { licenseKey },
  });

  if (!license) {
    return {
      valid: false,
      reason: "Licence introuvable",
    };
  }

  if (license.product !== "MediGuide") {
    return {
      valid: false,
      reason: "Produit de licence invalide",
    };
  }

  if (license.status !== "active") {
    return {
      valid: false,
      reason: `Licence ${license.status}`,
    };
  }

  if (
    license.expiresAt &&
    new Date(license.expiresAt).getTime() < Date.now()
  ) {
    await license.update({
      status: "expired",
    });

    return {
      valid: false,
      reason: "Licence expirée",
    };
  }

  return {
    valid: true,
    license,
  };
}

/**
 * Active une licence.
 *
 * Règles :
 * - la licence doit être valide
 * - le produit doit être MediGuide
 * - le statut doit être active
 * - la licence ne doit pas être expirée
 * - activationCount doit être inférieur à maxActivations
 */
async function activateLicense(licenseKey) {
  const validation = await validateLicense(licenseKey);

  if (!validation.valid) {
    return {
      activated: false,
      reason: validation.reason,
    };
  }

  const license = validation.license;

  if (license.activationCount >= license.maxActivations) {
    return {
      activated: false,
      reason: "Nombre maximum d'activations atteint",
    };
  }

  const now = new Date();

  await license.update({
    activationCount: license.activationCount + 1,
    activatedAt: license.activatedAt || now,
  });

  return {
    activated: true,
    message: "Licence activée avec succès",
    license,
  };
}

module.exports = {
  generateLicense,
  verifyLicenseSignature,
  validateLicense,
  activateLicense,
};