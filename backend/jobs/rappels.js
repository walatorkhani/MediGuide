const cron = require("node-cron");
const { Op } = require("sequelize");

const { Appointment, Availability, Facility, User } = require("../models/associations");
const { envoyerEmail, emailRappelRDV } = require("../utils/mailer");

// Toutes les 15 minutes, on cherche les RDV confirmés dont le créneau tombe
// dans les 23h-25h à venir (fenêtre large pour ne pas rater le rappel selon
// la fréquence du cron) et pour lesquels le rappel n'a pas encore été
// envoyé, puis on envoie l'e-mail et on marque rappelEnvoye=true.
async function envoyerRappels() {
  try {
    const maintenant = new Date();
    const dans23h = new Date(maintenant.getTime() + 23 * 60 * 60 * 1000);
    const dans25h = new Date(maintenant.getTime() + 25 * 60 * 60 * 1000);

    const dateMin = dans23h.toISOString().slice(0, 10);
    const dateMax = dans25h.toISOString().slice(0, 10);

    const rendezVous = await Appointment.findAll({
      where: { statut: "confirme", rappelEnvoye: false },
      include: [
        {
          model: Availability,
          as: "disponibilite",
          where: { date: { [Op.between]: [dateMin, dateMax] } },
          include: [{ model: Facility, as: "facility", attributes: ["nom"] }],
        },
        { model: User, as: "patient", attributes: ["nom", "email"] },
      ],
    });

    for (const rdv of rendezVous) {
      const dispo = rdv.disponibilite;
      const creneauDateHeure = new Date(`${dispo.date}T${dispo.heureDebut}:00`);

      // Filtre fin (précis à l'heure près) : le between ci-dessus ne filtre
      // que par jour, donc on vérifie ici que le créneau est bien dans la
      // fenêtre [23h, 25h] avant de considérer le rappel dû.
      const diffH = (creneauDateHeure - maintenant) / (1000 * 60 * 60);
      if (diffH < 23 || diffH > 25) continue;

      await envoyerEmail({
        to: rdv.patient.email,
        subject: "Rappel : rendez-vous demain — MédiGuide",
        html: emailRappelRDV({
          patientNom: rdv.patient.nom,
          facilityNom: dispo.facility?.nom,
          date: dispo.date,
          heureDebut: dispo.heureDebut,
          heureFin: dispo.heureFin,
        }),
      });

      rdv.rappelEnvoye = true;
      await rdv.save();
    }

    if (rendezVous.length) {
      console.log(`[rappels] ${rendezVous.length} rappel(s) de RDV envoyé(s).`);
    }
  } catch (err) {
    console.error("[rappels] erreur pendant l'envoi des rappels :", err);
  }
}

// Démarre la tâche planifiée (appelé une fois depuis server.js).
function demarrerRappels() {
  cron.schedule("*/15 * * * *", envoyerRappels);
  console.log("Job de rappels de RDV planifié (toutes les 15 min).");
}

module.exports = { demarrerRappels, envoyerRappels };
