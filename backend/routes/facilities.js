const router = require("express").Router();
const { Op, literal } = require("sequelize");
const sequelize = require("../config/database");
const Facility = require("../models/Facility");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const uploadPhoto = require("../middleware/uploadPhoto");
const crypto = require("crypto");
const { redis, isRedisReady } = require("../config/redis");

const CATEGORIES = ["medecin", "pharmacie", "parapharmacie"];

// ================= RECHERCHE =================
// GET /api/facilities
// Filtres supportés :
//   category   -> medecin | pharmacie | parapharmacie
//   q          -> recherche texte sur le nom
//   specialite -> filtre spécialité (médecins)
//   ville      -> filtre par délégation/ville
//   lat, lng   -> position de référence ("Autour de moi" ou ville géocodée)
//   radius     -> rayon de recherche en mètres (défaut 5000)
//   limit      -> nombre max de résultats (défaut 30)
router.get("/", async (req, res) => {
  try {
    const {
      category,
      q,
      specialite,
      ville,
      typeGarde,
      lat,
      lng,
      radius = 5000,
      limit = 300,
    } = req.query;

    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Catégorie invalide." });
    }

    const where = {};
    if (category) where.category = category;
    if (specialite) where.specialite = { [Op.iLike]: `%${specialite}%` };
    if (ville) where.delegation = { [Op.iLike]: `%${ville}%` };
    // Recherche full-text PostgreSQL : nom + spécialité, avec repli
    // insensible à la casse pour les requêtes très courtes.
    if (q) {
      const safeQ = String(q).replace(/'/g, "''");
      where[Op.or] = [
        literal(`to_tsvector('simple', coalesce("Facility"."nom",'') || ' ' || coalesce("Facility"."specialite",'')) @@ plainto_tsquery('simple', '${safeQ}')`),
        { nom: { [Op.iLike]: `%${q}%` } },
        { specialite: { [Op.iLike]: `%${q}%` } },
      ];
    }
    if (typeGarde) where.typeGarde = typeGarde;

    const hasGeo = lat !== undefined && lng !== undefined;
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const radiusN = Math.min(parseInt(radius, 10) || 5000, 50000); // plafond 50 km
    const limitN = Math.min(parseInt(limit, 10) || 300, 1000);

    let attributes = { include: [] };
    let order = [["nom", "ASC"]];

    if (hasGeo && Number.isFinite(latN) && Number.isFinite(lngN)) {
      // Recherche géographique via PostGIS : ST_DWithin filtre par rayon,
      // ST_Distance calcule la distance exacte utilisée pour le tri.
      const point = `ST_SetSRID(ST_MakePoint(${lngN}, ${latN}), 4326)::geography`;

      where[Op.and] = [
        ...(where[Op.and] || []),
        literal(`ST_DWithin(location, ${point}, ${radiusN})`),
      ];

      attributes.include.push([
        literal(`ST_Distance(location, ${point})`),
        "distanceM",
      ]);

      order = [[literal('"distanceM"'), "ASC"]];
    }

    const cacheKey = `facilities:search:${crypto.createHash("sha256").update(JSON.stringify({ category, q, specialite, ville, typeGarde, lat: latN, lng: lngN, radius: radiusN, limit: limitN })).digest("hex")}`;

    if (isRedisReady()) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.set("X-Cache", "HIT");
        return res.json(JSON.parse(cached));
      }
    }

    const results = await Facility.findAll({
      where,
      attributes,
      order,
      limit: limitN,
    });

    const payload = { count: results.length, results };
    if (isRedisReady()) {
      await redis.set(cacheKey, JSON.stringify(payload), { EX: 60 });
      res.set("X-Cache", "MISS");
    }

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recherche." });
  }
});

// ================= CRÉATION (admin) =================
// POST /api/facilities
// body: { category, nom, latitude, longitude, specialite?, telephone?, adresse?, delegation?, horaires?, secteur?, typeGarde? }
router.post("/", authMiddleware, roleMiddleware("administrateur"), async (req, res) => {
  try {
    const {
      category,
      nom,
      latitude,
      longitude,
      specialite,
      telephone,
      adresse,
      delegation,
      horaires,
      secteur,
      typeGarde,
    } = req.body;

    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Catégorie invalide." });
    }
    if (!nom) {
      return res.status(400).json({ message: "Le nom est obligatoire." });
    }
    const latN = parseFloat(latitude);
    const lngN = parseFloat(longitude);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      return res.status(400).json({ message: "latitude et longitude sont obligatoires et doivent être numériques." });
    }

    const facility = await Facility.create({
      category,
      nom,
      specialite: specialite || null,
      telephone: telephone || null,
      adresse: adresse || null,
      delegation: delegation || null,
      horaires: horaires || null,
      secteur: secteur || null,
      typeGarde: typeGarde || null,
      latitude: latN,
      longitude: lngN,
      location: { type: "Point", coordinates: [lngN, latN] },
    });

    res.status(201).json({ message: "Fiche créée.", facility });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création." });
  }
});

// ================= MODIFICATION (admin) =================
// PATCH /api/facilities/:id
// body (tous facultatifs) : { category, nom, specialite, telephone, adresse,
//   delegation, horaires, secteur, typeGarde, latitude, longitude }
// Permet à un administrateur de corriger/compléter une fiche existante
// (import CSV erroné, coordonnées à ajuster, etc.).
router.patch("/:id", authMiddleware, roleMiddleware("administrateur"), async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);
    if (!facility) {
      return res.status(404).json({ message: "Établissement introuvable." });
    }

    const {
      category,
      nom,
      specialite,
      telephone,
      adresse,
      delegation,
      horaires,
      secteur,
      typeGarde,
      latitude,
      longitude,
    } = req.body;

    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Catégorie invalide." });
      }
      facility.category = category;
    }
    if (nom !== undefined) {
      if (!nom) {
        return res.status(400).json({ message: "Le nom ne peut pas être vide." });
      }
      facility.nom = nom;
    }
    if (specialite !== undefined) facility.specialite = specialite || null;
    if (telephone !== undefined) facility.telephone = telephone || null;
    if (adresse !== undefined) facility.adresse = adresse || null;
    if (delegation !== undefined) facility.delegation = delegation || null;
    if (horaires !== undefined) facility.horaires = horaires || null;
    if (secteur !== undefined) facility.secteur = secteur || null;
    if (typeGarde !== undefined) facility.typeGarde = typeGarde || null;

    if (latitude !== undefined || longitude !== undefined) {
      const latN = latitude !== undefined ? parseFloat(latitude) : facility.latitude;
      const lngN = longitude !== undefined ? parseFloat(longitude) : facility.longitude;
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        return res.status(400).json({ message: "latitude et longitude doivent être numériques." });
      }
      facility.latitude = latN;
      facility.longitude = lngN;
      facility.location = { type: "Point", coordinates: [lngN, latN] };
    }

    await facility.save();

    res.json({ message: "Fiche mise à jour.", facility });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
});

// GET /api/facilities/mine/liste
// Fiches gérées par le professionnel connecté.
router.get("/mine/liste", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const facilities = await Facility.findAll({ where: { ownerId: req.user.id } });
    res.json({ facilities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= CRÉATION PAR LE PROFESSIONNEL =================
// POST /api/facilities/mine/creer
// Un nouveau professionnel peut créer sa propre fiche lorsqu'aucune fiche
// existante ne correspond à son activité. La catégorie est toujours prise
// depuis le compte connecté pour empêcher un changement de catégorie côté
// client.
router.post("/mine/creer", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const utilisateur = await User.findByPk(req.user.id, {
      attributes: ["id", "categorieProfessionnelle"],
    });
    const category = utilisateur?.categorieProfessionnelle;

    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Votre compte professionnel n'a pas de catégorie valide." });
    }

    const deja = await Facility.findOne({ where: { ownerId: req.user.id } });
    if (deja) {
      return res.status(409).json({ message: "Votre compte possède déjà une fiche professionnelle." });
    }

    const {
      nom, specialite, telephone, adresse, delegation, horaires,
      secteur, typeGarde, latitude, longitude, bio,
    } = req.body || {};

    if (!String(nom || "").trim()) {
      return res.status(400).json({ message: "Le nom de la fiche est obligatoire." });
    }
    if (category === "medecin" && !String(specialite || "").trim()) {
      return res.status(400).json({ message: "La spécialité est obligatoire pour un médecin." });
    }

    const latN = Number(latitude);
    const lngN = Number(longitude);
    if (!Number.isFinite(latN) || latN < -90 || latN > 90 || !Number.isFinite(lngN) || lngN < -180 || lngN > 180) {
      return res.status(400).json({ message: "Veuillez renseigner une latitude et une longitude valides." });
    }

    if (category !== "pharmacie" && typeGarde) {
      return res.status(400).json({ message: "Le statut de garde est réservé aux pharmacies." });
    }

    const facility = await Facility.create({
      ownerId: req.user.id,
      category,
      nom: String(nom).trim(),
      specialite: category === "medecin" ? (String(specialite || "").trim() || null) : null,
      telephone: String(telephone || "").trim() || null,
      adresse: String(adresse || "").trim() || null,
      delegation: String(delegation || "").trim() || null,
      horaires: String(horaires || "").trim() || null,
      secteur: category === "medecin" ? (String(secteur || "").trim() || null) : null,
      typeGarde: category === "pharmacie" ? (String(typeGarde || "").trim() || null) : null,
      bio: String(bio || "").trim() || null,
      latitude: latN,
      longitude: lngN,
      location: { type: "Point", coordinates: [lngN, latN] },
      // La fiche nouvellement créée reste à valider par l'administrateur.
      estVerifie: false,
    });

    res.status(201).json({
      message: "Votre fiche a été créée et envoyée à l'administrateur pour validation.",
      facility,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création de votre fiche." });
  }
});

// ================= DÉTAILS =================
// GET /api/facilities/:id
router.get("/:id", async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);

    if (!facility) {
      return res.status(404).json({ message: "Établissement introuvable." });
    }

    res.json({ facility });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= REVENDICATION (professionnel) =================
// PATCH /api/facilities/:id/revendiquer
// Permet à un compte "professionnel" (médecin, pharmacie ou parapharmacie,
// selon la catégorie choisie à l'inscription) de se rattacher à une fiche
// existante de la même catégorie afin d'en gérer les disponibilités. Une
// fiche déjà revendiquée par quelqu'un d'autre ne peut pas être reprise.
router.patch("/:id/revendiquer", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);

    if (!facility) {
      return res.status(404).json({ message: "Établissement introuvable." });
    }

    const utilisateur = await User.findByPk(req.user.id, { attributes: ["categorieProfessionnelle"] });
    if (utilisateur?.categorieProfessionnelle && utilisateur.categorieProfessionnelle !== facility.category) {
      return res.status(403).json({
        message: `Vous êtes inscrit(e) en tant que ${utilisateur.categorieProfessionnelle}, vous ne pouvez rattacher qu'une fiche de cette catégorie.`,
      });
    }

    if (facility.ownerId && facility.ownerId !== req.user.id) {
      return res.status(409).json({ message: "Cette fiche est déjà gérée par un autre compte." });
    }

    facility.ownerId = req.user.id;
    await facility.save();

    res.json({ message: "Fiche rattachée à votre compte.", facility });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= PROFIL PROFESSIONNEL =================
// PATCH /api/facilities/:id/profil
// multipart/form-data : { horaires?, bio?, photo? (fichier), typeGarde? }
// typeGarde ("Jour"/"Nuit"/"" pour retirer) n'a de sens que pour les
// pharmacies (statut de garde affiché aux patients) ; accepté uniquement
// dans ce cas pour éviter un champ orphelin sur les autres catégories.
// Le professionnel doit être propriétaire de la fiche.
router.patch("/:id/profil", authMiddleware, roleMiddleware("professionnel"), (req, res, next) => {
  uploadPhoto.single("photo")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);

    if (!facility) {
      return res.status(404).json({ message: "Établissement introuvable." });
    }

    if (facility.ownerId !== req.user.id) {
      return res.status(403).json({ message: "Vous ne gérez pas cet établissement." });
    }

    const { horaires, bio, typeGarde } = req.body;

    if (horaires !== undefined) facility.horaires = horaires;
    if (bio !== undefined) facility.bio = bio?.slice(0, 2000) || null;
    if (req.file) facility.photoUrl = `/uploads/photos/${req.file.filename}`;

    if (typeGarde !== undefined && facility.category === "pharmacie") {
      if (!["Jour", "Nuit", ""].includes(typeGarde)) {
        return res.status(400).json({ message: "typeGarde doit être 'Jour', 'Nuit' ou vide." });
      }
      facility.typeGarde = typeGarde || null;
    }

    await facility.save();

    res.json({ message: "Profil mis à jour.", facility });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= SUPPRESSION (admin) =================
// DELETE /api/facilities/:id
router.delete("/:id", authMiddleware, roleMiddleware("administrateur"), async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);
    if (!facility) {
      return res.status(404).json({ message: "Établissement introuvable." });
    }
    await facility.destroy();
    res.json({ message: "Fiche supprimée." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
});

module.exports = router;
