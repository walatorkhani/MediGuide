const router = require("express").Router();
const { Op } = require("sequelize");

const { Availability, Facility, Appointment, User } = require("../models/associations");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Convertit "HH:MM" en minutes depuis minuit, pour comparer/générer des créneaux.
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Deux créneaux [aDebut,aFin) et [bDebut,bFin) se chevauchent si l'un
// commence avant que l'autre ne finisse, dans les deux sens.
function seChevauchent(aDebut, aFin, bDebut, bFin) {
  return aDebut < bFin && bDebut < aFin;
}

// Vérifie que l'utilisateur connecté est bien propriétaire de la fiche.
async function assertProprietaire(facilityId, userId) {
  const facility = await Facility.findByPk(facilityId);
  if (!facility) {
    const err = new Error("Établissement introuvable.");
    err.status = 404;
    throw err;
  }
  if (facility.ownerId !== userId) {
    const err = new Error("Vous ne gérez pas cet établissement.");
    err.status = 403;
    throw err;
  }
  return facility;
}

// ================= LISTE DES CRÉNEAUX D'UN ÉTABLISSEMENT (public) =================
// GET /api/facilities/:facilityId/disponibilites?date=YYYY-MM-DD
// Utilisé par le tunnel de prise de RDV patient : ne renvoie que les
// créneaux futurs et non réservés.
router.get("/facilities/:facilityId/disponibilites", async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { date } = req.query;

    const where = {
      facilityId,
      estReserve: false,
      date: date ? date : { [Op.gte]: new Date().toISOString().slice(0, 10) },
    };

    const disponibilites = await Availability.findAll({
      where,
      order: [["date", "ASC"], ["heureDebut", "ASC"]],
      limit: 200,
    });

    res.json({ disponibilites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la récupération des disponibilités." });
  }
});

// ================= GESTION PAR LE PROFESSIONNEL =================
// GET /api/disponibilites/mine
// Renvoie les créneaux de(s) établissement(s) que possède le professionnel
// connecté, avec le patient ayant réservé si applicable.
router.get("/disponibilites/mine", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const facilities = await Facility.findAll({ where: { ownerId: req.user.id }, attributes: ["id"] });
    const facilityIds = facilities.map((f) => f.id);

    const disponibilites = await Availability.findAll({
      where: { facilityId: facilityIds },
      include: [
        {
          model: Appointment,
          as: "rendezVous",
          required: false,
          where: { statut: "confirme" },
          include: [{ model: User, as: "patient", attributes: ["id", "nom", "email"] }],
        },
      ],
      order: [["date", "ASC"], ["heureDebut", "ASC"]],
    });

    res.json({ disponibilites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /api/disponibilites
// Génère un lot de créneaux à partir d'une plage horaire + une durée.
// body: { facilityId, date, heureDebut, heureFin, dureeCreneauMinutes }
router.post("/disponibilites", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const { facilityId, date, heureDebut, heureFin, dureeCreneauMinutes = 20 } = req.body;

    if (!facilityId || !date || !heureDebut || !heureFin) {
      return res.status(400).json({ message: "facilityId, date, heureDebut et heureFin sont obligatoires." });
    }

    const duree = parseInt(dureeCreneauMinutes, 10);
    if (!Number.isFinite(duree) || duree < 5 || duree > 240) {
      return res.status(400).json({ message: "Durée de créneau invalide (5 à 240 minutes)." });
    }

    await assertProprietaire(facilityId, req.user.id);

    const debutMin = toMinutes(heureDebut);
    const finMin = toMinutes(heureFin);
    if (!(debutMin < finMin)) {
      return res.status(400).json({ message: "heureDebut doit précéder heureFin." });
    }

    // Créneaux existants ce jour-là, pour détecter les chevauchements.
    const existants = await Availability.findAll({ where: { facilityId, date } });

    const candidats = [];
    for (let t = debutMin; t + duree <= finMin; t += duree) {
      candidats.push({ debut: t, fin: t + duree });
    }

    const crees = [];
    const ignores = [];
    for (const c of candidats) {
      const enConflit =
        existants.some((e) => seChevauchent(c.debut, c.fin, toMinutes(e.heureDebut), toMinutes(e.heureFin))) ||
        crees.some((e) => seChevauchent(c.debut, c.fin, toMinutes(e.heureDebut), toMinutes(e.heureFin)));

      if (enConflit) {
        ignores.push(`${toHHMM(c.debut)}-${toHHMM(c.fin)}`);
        continue;
      }
      crees.push({ facilityId, date, heureDebut: toHHMM(c.debut), heureFin: toHHMM(c.fin) });
    }

    const disponibilites = crees.length ? await Availability.bulkCreate(crees) : [];

    res.status(201).json({
      message: `${disponibilites.length} créneau(x) créé(s).${
        ignores.length ? ` ${ignores.length} ignoré(s) pour chevauchement (${ignores.join(", ")}).` : ""
      }`,
      disponibilites,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Erreur serveur." });
  }
});

// DELETE /api/disponibilites/:id
// Supprime un créneau non réservé (le professionnel doit être propriétaire
// de l'établissement concerné).
router.delete("/disponibilites/:id", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const dispo = await Availability.findByPk(req.params.id);
    if (!dispo) {
      return res.status(404).json({ message: "Créneau introuvable." });
    }

    await assertProprietaire(dispo.facilityId, req.user.id);

    if (dispo.estReserve) {
      return res.status(409).json({ message: "Ce créneau est réservé, il ne peut pas être supprimé directement." });
    }

    await dispo.destroy();
    res.json({ message: "Créneau supprimé." });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Erreur serveur." });
  }
});

module.exports = router;
