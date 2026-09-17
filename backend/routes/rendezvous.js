const router = require("express").Router();
const { Op } = require("sequelize");

const sequelize = require("../config/database");
const { Availability, Appointment, Facility, User, Notification } = require("../models/associations");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { envoyerEmail, emailConfirmationRDV } = require("../utils/mailer");

// ================= PRISE DE RENDEZ-VOUS =================
// POST /api/rendezvous
// body: { disponibiliteId, motif? }
// Dernière étape du tunnel de réservation. Utilise une transaction avec
// verrou de ligne (SELECT ... FOR UPDATE) pour empêcher deux patients de
// réserver le même créneau en même temps (conflit de réservation).
router.post("/", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  const { disponibiliteId, motif } = req.body;

  if (!disponibiliteId) {
    return res.status(400).json({ message: "disponibiliteId est obligatoire." });
  }

  const t = await sequelize.transaction();

  try {
    const dispo = await Availability.findByPk(disponibiliteId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!dispo) {
      await t.rollback();
      return res.status(404).json({ message: "Créneau introuvable." });
    }

    if (dispo.estReserve) {
      await t.rollback();
      return res.status(409).json({ message: "Ce créneau vient d'être réservé, merci d'en choisir un autre." });
    }

    const rendezVous = await Appointment.create(
      {
        disponibiliteId,
        patientId: req.user.id,
        motif: motif || null,
        statut: "confirme",
      },
      { transaction: t }
    );

    dispo.estReserve = true;
    await dispo.save({ transaction: t });

    await t.commit();

    const [facility, patient] = await Promise.all([
      Facility.findByPk(dispo.facilityId, {
        attributes: ["id", "nom", "adresse", "delegation", "specialite", "ownerId"],
      }),
      User.findByPk(req.user.id, { attributes: ["nom", "email"] }),
    ]);

    if (facility?.ownerId) {
      await Notification.create({
        userId: facility.ownerId,
        type: "rendezvous",
        titre: "Nouveau rendez-vous",
        message: `${patient?.nom || "Un patient"} a réservé un créneau le ${dispo.date} à ${dispo.heureDebut}.`,
      }).catch(() => {});
    }

    // Envoi asynchrone, sans bloquer/faire échouer la réponse si le mail échoue.
    if (patient?.email) {
      envoyerEmail({
        to: patient.email,
        subject: "Confirmation de rendez-vous — MédiGuide",
        html: emailConfirmationRDV({
          patientNom: patient.nom || "",
          facilityNom: facility?.nom,
          date: dispo.date,
          heureDebut: dispo.heureDebut,
          heureFin: dispo.heureFin,
          adresse: facility?.adresse,
        }),
      }).catch(() => {});
    }

    res.status(201).json({
      message: "Rendez-vous confirmé.",
      rendezVous: { ...rendezVous.toJSON(), disponibilite: dispo, facility },
    });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la réservation." });
  }
});

// ================= MES RENDEZ-VOUS (patient) =================
// GET /api/rendezvous/mes
router.get("/mes", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  try {
    const rendezVous = await Appointment.findAll({
      where: { patientId: req.user.id },
      include: [
        {
          model: Availability,
          as: "disponibilite",
          include: [{ model: Facility, as: "facility", attributes: ["id", "nom", "adresse", "delegation", "specialite", "telephone"] }],
        },
      ],
      order: [[{ model: Availability, as: "disponibilite" }, "date", "ASC"], [{ model: Availability, as: "disponibilite" }, "heureDebut", "ASC"]],
    });

    res.json({ rendezVous });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= ANNULATION =================
// PATCH /api/rendezvous/:id/annuler
// Le patient doit être propriétaire du rendez-vous. Le créneau est libéré
// (redevient réservable) sauf s'il est déjà passé.
router.patch("/:id/annuler", authMiddleware, roleMiddleware("patient"), async (req, res) => {
  try {
    const rdv = await Appointment.findByPk(req.params.id, {
      include: [{ model: Availability, as: "disponibilite" }],
    });

    if (!rdv) {
      return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    if (rdv.patientId !== req.user.id) {
      return res.status(403).json({ message: "Ce rendez-vous ne vous appartient pas." });
    }

    if (rdv.statut === "annule") {
      return res.status(400).json({ message: "Ce rendez-vous est déjà annulé." });
    }

    rdv.statut = "annule";
    await rdv.save();

    if (rdv.disponibilite) {
      rdv.disponibilite.estReserve = false;
      await rdv.disponibilite.save();
    }

    const facility = rdv.disponibilite ? await Facility.findByPk(rdv.disponibilite.facilityId, { attributes: ["ownerId"] }) : null;
    if (facility?.ownerId) {
      await Notification.create({
        userId: facility.ownerId,
        type: "annulation",
        titre: "Rendez-vous annulé",
        message: `Le rendez-vous du ${rdv.disponibilite?.date || ""} à ${rdv.disponibilite?.heureDebut || ""} a été annulé par le patient.`,
      }).catch(() => {});
    }

    res.json({ message: "Rendez-vous annulé.", rendezVous: rdv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= TABLEAU DE BORD PROFESSIONNEL =================
// GET /api/rendezvous/aujourdhui
// Rendez-vous confirmés du jour pour les fiches du professionnel connecté,
// triés par heure — utilisé par le tableau de bord de l'espace professionnel.
router.get("/aujourdhui", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const facilities = await Facility.findAll({ where: { ownerId: req.user.id }, attributes: ["id"] });
    const facilityIds = facilities.map((f) => f.id);
    const aujourdHui = new Date().toISOString().slice(0, 10);

    const rendezVous = await Appointment.findAll({
      where: { statut: "confirme" },
      include: [
        {
          model: Availability,
          as: "disponibilite",
          required: true,
          where: { facilityId: facilityIds, date: aujourdHui },
        },
        { model: User, as: "patient", attributes: ["id", "nom", "email"] },
      ],
      order: [[{ model: Availability, as: "disponibilite" }, "heureDebut", "ASC"]],
    });

    res.json({ rendezVous, date: aujourdHui });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= ACTIONS PROFESSIONNELLES =================
// PATCH /api/rendezvous/:id/statut
router.patch("/:id/statut", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const { statut } = req.body;
    if (!["confirme", "annule", "refuse"].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide." });
    }
    const rdv = await Appointment.findByPk(req.params.id, {
      include: [{ model: Availability, as: "disponibilite", include: [{ model: Facility, as: "facility" }] }, { model: User, as: "patient", attributes: ["id", "nom", "email"] }],
    });
    if (!rdv) return res.status(404).json({ message: "Rendez-vous introuvable." });
    if (!rdv.disponibilite?.facility || rdv.disponibilite.facility.ownerId !== req.user.id) {
      return res.status(403).json({ message: "Vous ne gérez pas ce rendez-vous." });
    }
    rdv.statut = statut;
    await rdv.save();
    if (rdv.patientId) {
      await Notification.create({
        userId: rdv.patientId,
        type: "rendezvous",
        titre: "Mise à jour du rendez-vous",
        message: `Votre rendez-vous a été ${statut === "confirme" ? "confirmé" : statut === "refuse" ? "refusé" : "annulé"}.`,
      });
    }
    if (["annule", "refuse"].includes(statut) && rdv.disponibilite) {
      rdv.disponibilite.estReserve = false;
      await rdv.disponibilite.save();
    }
    res.json({ message: "Statut du rendez-vous mis à jour.", rendezVous: rdv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ================= LISTE PAGINÉE DES RENDEZ-VOUS (professionnel) =================
// GET /api/rendezvous/professionnel?page=1&limit=10&search=...&statut=confirme|annule&date=YYYY-MM-DD&sortBy=date|patient&order=ASC|DESC
// Utilisée par l'onglet "Tous mes rendez-vous" du dashboard professionnel.
// Le professionnel n'est jamais identifié via le frontend : on repart
// uniquement des fiches (Facility) appartenant à req.user.id (ownerId),
// donc un professionnel A ne peut jamais voir les RDV d'un professionnel B.
router.get("/professionnel", authMiddleware, roleMiddleware("professionnel"), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const { search, statut, date } = req.query;

    const facilities = await Facility.findAll({ where: { ownerId: req.user.id }, attributes: ["id"] });
    const facilityIds = facilities.map((f) => f.id);

    if (facilityIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
      });
    }

    const whereAppointment = {};
    if (statut && ["confirme", "annule"].includes(statut)) {
      whereAppointment.statut = statut;
    }

    const whereDisponibilite = { facilityId: facilityIds };
    if (date) whereDisponibilite.date = date;

    const wherePatient = {};
    if (search) {
      wherePatient[Op.or] = [
        { nom: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    let order = [[{ model: Availability, as: "disponibilite" }, "date", "DESC"], [{ model: Availability, as: "disponibilite" }, "heureDebut", "DESC"]];
    if (req.query.sortBy === "patient") {
      const dir = req.query.order === "ASC" ? "ASC" : "DESC";
      order = [[{ model: User, as: "patient" }, "nom", dir]];
    } else if (req.query.sortBy === "date") {
      const dir = req.query.order === "ASC" ? "ASC" : "DESC";
      order = [[{ model: Availability, as: "disponibilite" }, "date", dir], [{ model: Availability, as: "disponibilite" }, "heureDebut", dir]];
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where: whereAppointment,
      include: [
        {
          model: Availability,
          as: "disponibilite",
          required: true,
          where: whereDisponibilite,
          include: [{ model: Facility, as: "facility", attributes: ["id", "nom", "specialite"] }],
        },
        {
          model: User,
          as: "patient",
          attributes: ["id", "nom", "email"],
          where: Object.keys(wherePatient).length ? wherePatient : undefined,
          required: Object.keys(wherePatient).length > 0,
        },
      ],
      order,
      limit,
      offset,
      // Nécessaire car les include avec where sur des relations hasOne/belongsTo
      // via une table liée (disponibilite) peuvent dupliquer le count sans subQuery.
      subQuery: false,
      distinct: true,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(Math.ceil(count / limit), 1),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
