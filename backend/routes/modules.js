// Routes exposées à la plateforme modulaire partagée (mediEYE / craftEYE /
// cityEYE, section 7.4 du cahier des charges), montées sous
// /api/modules/medieye/*. Elles réutilisent le même modèle Facility que le
// reste de l'application ; seule la couche de sortie change de format,
// via toGenericFacility (backend/utils/facilityMapper.js).
const router = require("express").Router();
const { Op, literal } = require("sequelize");
const Facility = require("../models/Facility");
const { toGenericFacility } = require("../utils/facilityMapper");
const { getModule, permissionForRole } = require("../config/moduleRegistry");
const authMiddleware = require("../middleware/authMiddleware");

const CATEGORIES = ["medecin", "pharmacie", "parapharmacie"];

// GET /api/modules/medieye/manifest
// Décrit le module (slug, permissions RBAC) pour que le shell commun de la
// plateforme puisse le découvrir sans connaître ses détails internes.
router.get("/manifest", (req, res) => {
  const mod = getModule("medieye");
  res.json(mod);
});

// GET /api/modules/medieye/facilities
// Même recherche que GET /api/facilities (catégorie, texte, géo), mais la
// réponse est mappée vers le format Facility générique partagé plutôt que
// le modèle interne MédiGuide.
router.get("/facilities", async (req, res) => {
  try {
    const { category, q, lat, lng, radius = 5000, limit = 50 } = req.query;

    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Catégorie invalide." });
    }

    const where = {};
    if (category) where.category = category;
    if (q) {
      const safeQ = String(q).replace(/'/g, "''");
      where[Op.or] = [
        literal(`to_tsvector('simple', coalesce("Facility"."nom",'') || ' ' || coalesce("Facility"."specialite",'')) @@ plainto_tsquery('simple', '${safeQ}')`),
        { nom: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const radiusN = Math.min(parseInt(radius, 10) || 5000, 50000);
    const limitN = Math.min(parseInt(limit, 10) || 50, 200);

    let attributes = { include: [] };
    let order = [["nom", "ASC"]];

    if (Number.isFinite(latN) && Number.isFinite(lngN)) {
      const point = `ST_SetSRID(ST_MakePoint(${lngN}, ${latN}), 4326)::geography`;
      where[Op.and] = [
        ...(where[Op.and] || []),
        literal(`ST_DWithin(location, ${point}, ${radiusN})`),
      ];
      attributes.include.push([literal(`ST_Distance(location, ${point})`), "distanceM"]);
      order = [[literal('"distanceM"'), "ASC"]];
    }

    const results = await Facility.findAll({ where, attributes, order, limit: limitN });

    res.json({
      module: "medieye",
      count: results.length,
      results: results.map(toGenericFacility),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recherche (module medieye)." });
  }
});

// GET /api/modules/medieye/facilities/:id
router.get("/facilities/:id", async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);
    if (!facility) return res.status(404).json({ message: "Introuvable." });
    res.json({ module: "medieye", result: toGenericFacility(facility) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur." });
  }
});

// GET /api/modules/medieye/permission
// Traduit le rôle MédiGuide de l'utilisateur connecté vers la permission
// RBAC exposée au shell commun de la plateforme (read/write/admin).
router.get("/permission", authMiddleware, (req, res) => {
  res.json({ module: "medieye", role: req.user.role, permission: permissionForRole("medieye", req.user.role) });
});

module.exports = router;
