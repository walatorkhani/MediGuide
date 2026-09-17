const router = require("express").Router();
const { Op } = require("sequelize");
const { Facility, Product, Demand, Notification, User } = require("../models/associations");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Recherche publique des produits référencés par les pharmacies et parapharmacies.
router.get("/", async (req, res) => {
  try {
    const where = {};
    if (req.query.q) where.nom = { [Op.iLike]: `%${req.query.q}%` };
    if (req.query.categorie) where.categorie = req.query.categorie;

    const products = await Product.findAll({
      where,
      include: [{
        model: Facility,
        as: "facility",
        required: true,
        where: { category: { [Op.in]: ["pharmacie", "parapharmacie"] } },
        attributes: ["id", "nom", "category", "adresse", "telephone"],
      }],
      attributes: ["id", "facilityId", "nom", "categorie", "description", "prix", "disponible"],
      order: [["nom", "ASC"]],
      limit: 100,
    });

    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Impossible de rechercher les produits." });
  }
});

// Le patient demande à un établissement de confirmer la disponibilité.
router.post("/demandes", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  try {
    const { facilityId, productId, produitNom, message, quantite = 1 } = req.body;

    if (!facilityId || !produitNom) {
      return res.status(400).json({ message: "L'établissement et le produit sont obligatoires." });
    }

    const facility = await Facility.findByPk(facilityId, { attributes: ["id", "nom", "category", "ownerId"] });
    if (!facility || !["pharmacie", "parapharmacie"].includes(facility.category)) {
      return res.status(404).json({ message: "Pharmacie ou parapharmacie introuvable." });
    }

    let product = null;
    if (productId) {
      product = await Product.findOne({ where: { id: productId, facilityId } });
    }

    const demand = await Demand.create({
      facilityId,
      patientId: req.user.id,
      productId: product?.id || null,
      produitNom: String(produitNom).trim(),
      quantite: Math.max(1, Number(quantite) || 1),
      message: message ? String(message).trim() : null,
      statut: "en_attente",
    });

    if (facility.ownerId) {
      const patient = await User.findByPk(req.user.id, { attributes: ["nom"] });
      await Notification.create({
        userId: facility.ownerId,
        type: "demande_produit",
        titre: "Nouvelle demande de disponibilité",
        message: `${patient?.nom || "Un patient"} recherche « ${demand.produitNom} ». ${demand.message ? `Message : ${demand.message}` : ""}`.trim(),
        lu: false,
      });
    }

    res.status(201).json({ demand, message: "Votre demande a été envoyée. Vous serez informé de la réponse." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Impossible d'envoyer la demande." });
  }
});

// Historique des demandes du patient.
router.get("/mes-demandes", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  try {
    const demands = await Demand.findAll({
      where: { patientId: req.user.id },
      include: [{ model: Facility, as: "facility", attributes: ["id", "nom", "category"] }],
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    res.json({ demands });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Impossible de charger vos demandes." });
  }
});

// Notifications du patient.
router.get("/notifications", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Impossible de charger les notifications." });
  }
});

router.patch("/notifications/:id/lue", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!notification) return res.status(404).json({ message: "Notification introuvable." });
    notification.lu = true;
    await notification.save();
    res.json({ notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Impossible de mettre à jour la notification." });
  }
});

module.exports = router;
