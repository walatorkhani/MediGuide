const router = require("express").Router();
const { fn, col } = require("sequelize");

const { Review, Facility, User } = require("../models/associations");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Recalcule la moyenne (et le nombre d'avis) côté SQL via AVG()/COUNT(),
// puis la persiste sur Facility.noteAvis pour que la recherche/la carte
// affichent une moyenne toujours à jour sans recalcul côté JS.
async function recalculerMoyenne(facilityId) {
  const stats = await Review.findOne({
    where: { facilityId, statut: "approuve" },
    attributes: [
      [fn("AVG", col("note")), "moyenne"],
      [fn("COUNT", col("id")), "total"],
    ],
    raw: true,
  });

  const moyenne = stats?.moyenne ? Math.round(parseFloat(stats.moyenne) * 10) / 10 : null;
  await Facility.update({ noteAvis: moyenne }, { where: { id: facilityId } });
  return { moyenne, total: parseInt(stats?.total || 0, 10) };
}

// ================= LISTE PAGINÉE + MOYENNE =================
// GET /api/facilities/:facilityId/avis?page=1&limit=5
router.get("/facilities/:facilityId/avis", async (req, res) => {
  try {
    const { facilityId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
    const offset = (page - 1) * limit;

    const [{ count, rows }, stats] = await Promise.all([
      Review.findAndCountAll({
        where: { facilityId, statut: "approuve" },
        include: [{ model: User, as: "patient", attributes: ["id", "nom"] }],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      }),
      Review.findOne({
        where: { facilityId, statut: "approuve" },
        attributes: [
          [fn("AVG", col("note")), "moyenne"],
          [fn("COUNT", col("id")), "total"],
        ],
        raw: true,
      }),
    ]);

    res.json({
      avis: rows,
      page,
      totalPages: Math.max(Math.ceil(count / limit), 1),
      total: count,
      moyenne: stats?.moyenne ? Math.round(parseFloat(stats.moyenne) * 10) / 10 : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des avis." });
  }
});

// ================= CRÉATION =================
// POST /api/facilities/:facilityId/avis  (patient connecté)
// body: { note: 1-5, commentaire? }
router.post("/facilities/:facilityId/avis", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { note, commentaire } = req.body;

    const noteN = parseInt(note, 10);
    if (!Number.isInteger(noteN) || noteN < 1 || noteN > 5) {
      return res.status(400).json({ message: "La note doit être un entier entre 1 et 5." });
    }

    const facility = await Facility.findByPk(facilityId);
    if (!facility) {
      return res.status(404).json({ message: "Établissement introuvable." });
    }

    const dejaPublie = await Review.findOne({ where: { facilityId, patientId: req.user.id } });
    if (dejaPublie) {
      return res.status(409).json({ message: "Vous avez déjà publié un avis pour cet établissement." });
    }

    const avis = await Review.create({
      facilityId,
      patientId: req.user.id,
      note: noteN,
      commentaire: commentaire?.slice(0, 1000) || null,
      statut: "en_attente",
    });

    const { moyenne, total } = await recalculerMoyenne(facilityId);

    res.status(201).json({ message: "Avis publié.", avis, moyenne, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la publication de l'avis." });
  }
});

// ================= MES AVIS (patient) =================
// GET /api/avis/mes — derniers avis publiés par le patient connecté,
// avec l'établissement concerné (pour affichage sur le dashboard patient).
router.get("/avis/mes", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  try {
    const avis = await Review.findAll({
      where: { patientId: req.user.id },
      include: [{ model: Facility, as: "facility", attributes: ["id", "nom", "specialite", "category"] }],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    res.json({ avis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= SUPPRESSION =================
// DELETE /api/avis/:id  (l'auteur uniquement)
router.delete("/avis/:id", authMiddleware, async (req, res) => {
  try {
    const avis = await Review.findByPk(req.params.id);
    if (!avis) {
      return res.status(404).json({ message: "Avis introuvable." });
    }

    if (avis.patientId !== req.user.id) {
      return res.status(403).json({ message: "Vous ne pouvez supprimer que vos propres avis." });
    }

    const { facilityId } = avis;
    await avis.destroy();
    const { moyenne, total } = await recalculerMoyenne(facilityId);

    res.json({ message: "Avis supprimé.", moyenne, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
