const express = require("express");
const router = express.Router();

const {
  activateLicense,
  validateLicense,
} = require("../utils/licenseManager");

/**
 * POST /api/license/activate
 *
 * Active une licence et consomme une activation.
 */
router.post("/activate", async (req, res) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: "Licence requise",
      });
    }

    const result = await activateLicense(licenseKey);

    if (!result.activated) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }

    return res.json({
      success: true,
      message: result.message,
      product: result.license.product,
      activationCount: result.license.activationCount,
      maxActivations: result.license.maxActivations,
      activatedAt: result.license.activatedAt,
    });
  } catch (error) {
    console.error("Erreur activation licence :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
});

/**
 * POST /api/license/validate
 *
 * Vérifie une licence sans consommer d'activation.
 */
router.post("/validate", async (req, res) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: "Licence requise",
      });
    }

    const result = await validateLicense(licenseKey);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }

    return res.json({
      success: true,
      message: "Licence valide",
      product: result.license.product,
      status: result.license.status,
      activationCount: result.license.activationCount,
      maxActivations: result.license.maxActivations,
      expiresAt: result.license.expiresAt,
    });
  } catch (error) {
    console.error("Erreur validation licence :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
});

module.exports = router;