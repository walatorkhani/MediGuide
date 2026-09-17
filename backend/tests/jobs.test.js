require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

// SMTP désactivé avant tout require : le job envoie de vrais e-mails de
// rappel, on force le mode simulé pour ne jamais toucher le réseau pendant
// les tests (voir mailer.test.js pour le détail du mécanisme).
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";

const { envoyerRappels } = require("../jobs/rappels");
const { Facility, User, Availability, Appointment } = require("../models/associations");
const sequelize = require("../config/database");

function pad(n) {
  return String(n).padStart(2, "0");
}

// Construit { date: "YYYY-MM-DD", heure: "HH:MM" } pour un instant précis,
// dans le fuseau horaire local du process (cohérent avec la façon dont
// jobs/rappels.js reconstruit `new Date("${date}T${heure}:00")`).
function dateHeureLocale(instant) {
  const date = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
  const heure = `${pad(instant.getHours())}:${pad(instant.getMinutes())}`;
  return { date, heure };
}

describe("jobs/rappels - envoi des rappels 24h avant", () => {
  let facility;
  let patient;

  beforeAll(async () => {
    patient = await User.create({
      nom: "Patient Rappel Test",
      email: `patient_rappel_${Date.now()}@test.mediguide.local`,
      motDePasse: "hash-non-utilise",
      role: "patient",
    });

    facility = await Facility.create({
      category: "medecin",
      nom: "Dr Rappel Test",
      latitude: 36.5,
      longitude: 8.78,
    });
  });

  async function creerRdv(instantCreneau) {
    const { date, heure } = dateHeureLocale(instantCreneau);
    const heureFinInstant = new Date(instantCreneau.getTime() + 20 * 60 * 1000);
    const { heure: heureFin } = dateHeureLocale(heureFinInstant);

    const dispo = await Availability.create({
      facilityId: facility.id,
      date,
      heureDebut: heure,
      heureFin,
      estReserve: true,
    });

    const rdv = await Appointment.create({
      disponibiliteId: dispo.id,
      patientId: patient.id,
      statut: "confirme",
      rappelEnvoye: false,
    });

    return rdv;
  }

  test("envoie le rappel pour un RDV dans la fenêtre [23h, 25h] et marque rappelEnvoye", async () => {
    const dans24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const rdv = await creerRdv(dans24h);

    await envoyerRappels();

    await rdv.reload();
    expect(rdv.rappelEnvoye).toBe(true);
  });

  test("ne touche pas un RDV en dehors de la fenêtre de rappel", async () => {
    const dans5h = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const rdv = await creerRdv(dans5h);

    await envoyerRappels();

    await rdv.reload();
    expect(rdv.rappelEnvoye).toBe(false);
  });

  afterAll(async () => {
    // Ce fichier n'utilise pas app.js : ferme sa propre connexion Sequelize
    // pour ne pas laisser de handle ouvert après la suite.
    await sequelize.close();
  });
});
