const router = require("express").Router();
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Facility = require("../models/Facility");
const Review = require("../models/Review");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware, roleMiddleware("administrateur"));

// Utilisateurs : liste + CRUD
router.get("/users", async (req, res) => {
  try {
    const { q } = req.query;
    const where = q
      ? { [Op.or]: [{ nom: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }] }
      : {};
    const users = await User.findAll({
      where,
      attributes: { exclude: ["motDePasse"] },
      order: [["createdAt", "DESC"]],
    });
    res.json({ users });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur utilisateurs." }); }
});

router.post("/users", async (req, res) => {
  try {
    const { nom, email, motDePasse, role = "patient", estValide = true, categorieProfessionnelle } = req.body;
    if (!nom || !email || !motDePasse) return res.status(400).json({ message: "nom, email et motDePasse sont requis." });
    if (!["patient", "professionnel", "administrateur"].includes(role)) return res.status(400).json({ message: "Rôle invalide." });
    if (role === "professionnel" && !["medecin", "pharmacie", "parapharmacie"].includes(categorieProfessionnelle)) return res.status(400).json({ message: "Catégorie professionnelle requise." });
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ message: "Email déjà utilisé." });
    const user = await User.create({ nom, email, motDePasse: await bcrypt.hash(motDePasse, 10), role, estValide, categorieProfessionnelle: role === "professionnel" ? categorieProfessionnelle : null });
    const safe = user.toJSON(); delete safe.motDePasse;
    res.status(201).json({ user: safe });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur création utilisateur." }); }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    const { nom, email, role, estValide, motDePasse, categorieProfessionnelle } = req.body;
    if (role && !["patient", "professionnel", "administrateur"].includes(role)) return res.status(400).json({ message: "Rôle invalide." });
    if (email !== undefined && email !== user.email) {
      const exists = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
      if (exists) return res.status(409).json({ message: "Email déjà utilisé." });
      user.email = email;
    }
    if (nom !== undefined) user.nom = nom;
    if (role !== undefined) user.role = role;
    if (categorieProfessionnelle !== undefined) {
      if (user.role === "professionnel" && !["medecin", "pharmacie", "parapharmacie"].includes(categorieProfessionnelle)) return res.status(400).json({ message: "Catégorie professionnelle invalide." });
      user.categorieProfessionnelle = user.role === "professionnel" ? categorieProfessionnelle : null;
    }
    if (estValide !== undefined) user.estValide = !!estValide;
    if (motDePasse) {
      user.motDePasse = await bcrypt.hash(motDePasse, 10);
    }
    await user.save();
    const safe = user.toJSON(); delete safe.motDePasse;
    res.json({ user: safe });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur modification utilisateur." }); }
});

router.delete("/users/:id", async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) return res.status(400).json({ message: "Impossible de supprimer votre propre compte administrateur." });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    await user.destroy();
    res.json({ message: "Utilisateur supprimé." });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur suppression utilisateur." }); }
});

// Établissements : liste et validation des fiches créées par les professionnels
router.get("/facilities", async (req, res) => {
  try {
    const { category, q, estVerifie } = req.query;
    const where = {};
    if (category && ["medecin", "pharmacie", "parapharmacie"].includes(category)) where.category = category;
    if (estVerifie !== undefined) where.estVerifie = estVerifie === "true";
    if (q) where.nom = { [Op.iLike]: `%${q}%` };
    const facilities = await Facility.findAll({ where, order: [["createdAt", "DESC"]], limit: 500 });
    res.json({ facilities });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur établissements." }); }
});

router.patch("/facilities/:id/validation", async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id);
    if (!facility) return res.status(404).json({ message: "Établissement introuvable." });
    facility.estVerifie = req.body.estVerifie !== false;
    await facility.save();
    res.json({ message: facility.estVerifie ? "Fiche validée." : "Validation retirée.", facility });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur validation établissement." }); }
});

// Profils médecins : liste et validation
router.get("/medecins", async (req, res) => {
  try {
    const { q, specialite, estVerifie } = req.query;
    const where = { category: "medecin" };
    if (specialite) where.specialite = { [Op.iLike]: `%${specialite}%` };
    if (estVerifie !== undefined) where.estVerifie = estVerifie === "true";
    if (q) where[Op.or] = [
      { nom: { [Op.iLike]: `%${q}%` } },
      { specialite: { [Op.iLike]: `%${q}%` } },
    ];
    const medecins = await Facility.findAll({ where, order: [["nom", "ASC"]] });
    res.json({ medecins });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur médecins." }); }
});

router.patch("/medecins/:id/validation", async (req, res) => {
  try {
    const medecin = await Facility.findOne({ where: { id: req.params.id, category: "medecin" } });
    if (!medecin) return res.status(404).json({ message: "Médecin introuvable." });
    medecin.estVerifie = req.body.estVerifie !== false;
    await medecin.save();
    res.json({ message: medecin.estVerifie ? "Profil médecin validé." : "Validation retirée.", medecin });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur validation." }); }
});

// Modération des avis
router.get("/avis", async (req, res) => {
  try {
    const { statut = "tous" } = req.query;
    const where = statut === "tous" ? {} : { statut };
    const avis = await Review.findAll({
      where,
      include: [
        { model: User, as: "patient", attributes: ["id", "nom", "email"] },
        { model: Facility, as: "facility", attributes: ["id", "nom", "category"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ avis });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur avis." }); }
});

router.patch("/avis/:id/moderation", async (req, res) => {
  try {
    const { statut } = req.body;
    if (!["en_attente", "approuve", "rejete"].includes(statut)) return res.status(400).json({ message: "Statut invalide." });
    const avis = await Review.findByPk(req.params.id);
    if (!avis) return res.status(404).json({ message: "Avis introuvable." });
    avis.statut = statut;
    await avis.save();

    const approved = await Review.findOne({
      where: { facilityId: avis.facilityId, statut: "approuve" },
      attributes: [[require("sequelize").fn("AVG", require("sequelize").col("note")), "moyenne"]],
      raw: true,
    });
    const moyenne = approved?.moyenne != null
      ? Math.round(parseFloat(approved.moyenne) * 10) / 10
      : null;
    await Facility.update({ noteAvis: moyenne }, { where: { id: avis.facilityId } });

    res.json({ message: "Avis modéré.", avis, moyenne });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur modération." }); }
});

// Statistiques admin
router.get("/stats", async (req, res) => {
  try {
    const [users, medecins, pharmacies, parapharmacies, avis, avisEnAttente, medecinsValides] = await Promise.all([
      User.count(),
      Facility.count({ where: { category: "medecin" } }),
      Facility.count({ where: { category: "pharmacie" } }),
      Facility.count({ where: { category: "parapharmacie" } }),
      Review.count(),
      Review.count({ where: { statut: "en_attente" } }),
      Facility.count({ where: { category: "medecin", estVerifie: true } }),
    ]);
    res.json({ stats: { users, medecins, pharmacies, parapharmacies, avis, avisEnAttente, medecinsValides } });
  } catch (e) { console.error(e); res.status(500).json({ message: "Erreur statistiques." }); }
});

module.exports = router;
