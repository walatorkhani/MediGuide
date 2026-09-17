const router = require("express").Router();
const { Op, fn, col, literal } = require("sequelize");
const { Facility, Product, Demand, Consultation, Notification, Appointment, Availability, User } = require("../models/associations");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware, roleMiddleware("professionnel"));

async function getFacilities(req) {
  return Facility.findAll({ where: { ownerId: req.user.id } });
}
async function getFacilityOwned(req, id) {
  const facility = await Facility.findOne({ where: { id, ownerId: req.user.id } });
  if (!facility) {
    const err = new Error("Établissement introuvable ou non géré par votre compte.");
    err.status = 404;
    throw err;
  }
  return facility;
}

router.get("/stats", async (req, res) => {
  try {
    const facilities = await getFacilities(req);
    const ids = facilities.map(f => f.id);
    if (!ids.length) return res.json({ stats: { rendezVousAujourdhui: 0, rendezVousAVenir: 0, consultations: 0, patients: 0, tauxAnnulation: 0, produits: 0, stockFaible: 0, disponibles: 0, demandes: 0, evolution: [] } });

    const today = new Date().toISOString().slice(0, 10);
    const appointments = await Appointment.findAll({
      include: [{ model: Availability, as: "disponibilite", required: true, where: { facilityId: ids }, attributes: ["date"] }],
      attributes: ["id", "patientId", "statut"],
    });
    const confirmed = appointments.filter(a => a.statut === "confirme");
    const cancelled = appointments.filter(a => a.statut === "annule");
    const todayCount = confirmed.filter(a => a.disponibilite?.date === today).length;
    const futureCount = confirmed.filter(a => a.disponibilite?.date >= today).length;
    const patients = new Set(appointments.map(a => a.patientId)).size;
    const consultations = await Consultation.count({ where: { facilityId: ids } });
    const products = await Product.findAll({ where: { facilityId: ids }, attributes: ["id", "disponible"] });
    const demands = await Demand.count({ where: { facilityId: ids, statut: "en_attente" } });
    const evolution = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = appointments.filter(a => {
        const date = a.disponibilite?.date;
        return date && String(date).startsWith(key) && a.statut === "confirme";
      }).length;
      return { mois: key, rendezVous: count };
    });

    res.json({ stats: {
      rendezVousAujourdhui: todayCount,
      rendezVousAVenir: futureCount,
      consultations,
      patients,
      tauxAnnulation: appointments.length ? Math.round((cancelled.length / appointments.length) * 100) : 0,
      produits: products.length,
      // Le stock chiffré n'est plus utilisé dans les espaces pharmacie/parapharmacie.
      stockFaible: 0,
      disponibles: products.filter(p => p.disponible).length,
      demandes,
      evolution,
    }});
  } catch (err) {
    console.error(err); res.status(err.status || 500).json({ message: err.message || "Erreur serveur." });
  }
});

router.get("/patients", async (req, res) => {
  try {
    const facilities = await getFacilities(req); const ids = facilities.map(f => f.id);
    const rows = await Appointment.findAll({
      include: [
        { model: Availability, as: "disponibilite", required: true, where: { facilityId: ids }, attributes: ["date", "heureDebut"] },
        { model: User, as: "patient", attributes: ["id", "nom", "email"] },
      ], order: [[{ model: Availability, as: "disponibilite" }, "date", "DESC"]],
    });
    const map = new Map();
    for (const row of rows) {
      if (!row.patient) continue;
      const p = map.get(row.patient.id) || { ...row.patient.toJSON(), rendezVous: 0, dernierRendezVous: null };
      p.rendezVous += 1;
      if (!p.dernierRendezVous || row.disponibilite?.date > p.dernierRendezVous) p.dernierRendezVous = row.disponibilite?.date;
      map.set(row.patient.id, p);
    }
    res.json({ patients: [...map.values()] });
  } catch (err) { console.error(err); res.status(500).json({ message: "Erreur serveur." }); }
});

router.get("/products", async (req, res) => {
  try {
    const facilities = await getFacilities(req); const ids = facilities.map(f => f.id);
    const where = { facilityId: ids };
    if (req.query.q) where.nom = { [Op.iLike]: `%${req.query.q}%` };
    if (req.query.categorie) where.categorie = req.query.categorie;
    const products = await Product.findAll({ where, order: [["nom", "ASC"]], limit: 500 });
    res.json({ products });
  } catch (err) { console.error(err); res.status(500).json({ message: "Erreur serveur." }); }
});

router.post("/products", async (req, res) => {
  try {
    const { facilityId, nom, categorie, description, prix, disponible = true } = req.body;
    const facility = await getFacilityOwned(req, facilityId);
    if (facility.category === "medecin") return res.status(400).json({ message: "Les produits sont réservés aux pharmacies et parapharmacies." });
    if (!nom) return res.status(400).json({ message: "Le nom du produit est obligatoire." });
    const product = await Product.create({ facilityId, nom, categorie: categorie || null, description: description || null, prix: prix || null, disponible: Boolean(disponible) });
    res.status(201).json({ product });
  } catch (err) { console.error(err); res.status(err.status || 500).json({ message: err.message || "Erreur serveur." }); }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: "Produit introuvable." });
    await getFacilityOwned(req, product.facilityId);
    const allowed = ["nom", "categorie", "description", "prix", "disponible"];
    for (const key of allowed) if (req.body[key] !== undefined) product[key] = req.body[key];
    await product.save();
    res.json({ product });
  } catch (err) { console.error(err); res.status(err.status || 500).json({ message: err.message || "Erreur serveur." }); }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: "Produit introuvable." });
    await getFacilityOwned(req, product.facilityId); await product.destroy();
    res.json({ message: "Produit supprimé." });
  } catch (err) { console.error(err); res.status(err.status || 500).json({ message: err.message || "Erreur serveur." }); }
});

router.get("/demands", async (req, res) => {
  try {
    const facilities = await getFacilities(req); const ids = facilities.map(f => f.id);
    const where = { facilityId: ids }; if (req.query.statut) where.statut = req.query.statut;
    const demands = await Demand.findAll({ where, include: [{ model: User, as: "patient", attributes: ["id", "nom", "email"] }, { model: Product, as: "produit", attributes: ["id", "nom", "quantite", "disponible"] }], order: [["createdAt", "DESC"]], limit: 500 });
    res.json({ demands });
  } catch (err) { console.error(err); res.status(500).json({ message: "Erreur serveur." }); }
});

router.patch("/demands/:id", async (req, res) => {
  try {
    const demand = await Demand.findByPk(req.params.id); if (!demand) return res.status(404).json({ message: "Demande introuvable." });
    await getFacilityOwned(req, demand.facilityId);
    if (!["traitee", "refusee"].includes(req.body.statut)) return res.status(400).json({ message: "Réponse invalide." });
    if (demand.statut !== "en_attente") return res.status(409).json({ message: "Cette demande a déjà reçu une réponse." });
    demand.statut = req.body.statut; await demand.save();

    // Le patient reçoit immédiatement la réponse de la pharmacie/parapharmacie.
    if (demand.patientId) {
      const facility = await Facility.findByPk(demand.facilityId, { attributes: ["nom", "category"] });
      const disponible = demand.statut === "traitee";
      await Notification.create({
        userId: demand.patientId,
        type: "demande_produit",
        titre: disponible ? "Produit disponible" : "Produit indisponible",
        message: `${facility?.nom || "L'établissement"} vous informe que « ${demand.produitNom} » est ${disponible ? "disponible" : "indisponible"}.`,
        lu: false,
      });
    }

    res.json({ demand });
  } catch (err) { console.error(err); res.status(err.status || 500).json({ message: err.message || "Erreur serveur." }); }
});

router.get("/consultations", async (req, res) => {
  try {
    const facilities = await getFacilities(req); const ids = facilities.map(f => f.id);
    const consultations = await Consultation.findAll({ where: { facilityId: ids }, include: [{ model: User, as: "patient", attributes: ["id", "nom", "email"] }, { model: Appointment, as: "rendezVous", include: [{ model: Availability, as: "disponibilite", attributes: ["date", "heureDebut"] }] }], order: [["createdAt", "DESC"]], limit: 500 });
    res.json({ consultations });
  } catch (err) { console.error(err); res.status(500).json({ message: "Erreur serveur." }); }
});

router.post("/consultations", async (req, res) => {
  try {
    const { facilityId, appointmentId, patientId, diagnostic, notes, ordonnance } = req.body;
    await getFacilityOwned(req, facilityId);
    if (!patientId) return res.status(400).json({ message: "Le patient est obligatoire." });
    const consultation = await Consultation.create({ facilityId, appointmentId: appointmentId || null, patientId, diagnostic: diagnostic || null, notes: notes || null, ordonnance: ordonnance || null });
    res.status(201).json({ consultation });
  } catch (err) { console.error(err); res.status(err.status || 500).json({ message: err.message || "Erreur serveur." }); }
});

router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]], limit: 100 });
    res.json({ notifications });
  } catch (err) { console.error(err); res.status(500).json({ message: "Erreur serveur." }); }
});
router.patch("/notifications/:id/lue", async (req, res) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!notification) return res.status(404).json({ message: "Notification introuvable." });
    notification.lu = true; await notification.save(); res.json({ notification });
  } catch (err) { console.error(err); res.status(500).json({ message: "Erreur serveur." }); }
});

module.exports = router;
