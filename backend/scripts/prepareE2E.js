require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");
const { User, Facility, Availability } = require("../models/associations");

const EMAIL = process.env.E2E_PATIENT_EMAIL || "patient.e2e@mediguide.local";
const PASSWORD = process.env.E2E_PATIENT_PASSWORD || "MotDePasse123!";
const STATE_FILE = process.env.E2E_STATE_FILE || path.resolve(__dirname, "../../frontend/e2e/.e2e-state.json");

async function main() {
  await sequelize.authenticate();

  let patient = await User.findOne({ where: { email: EMAIL } });
  const hash = await bcrypt.hash(PASSWORD, 12);

  if (!patient) {
    patient = await User.create({
      nom: "Patient E2E",
      email: EMAIL,
      motDePasse: hash,
      role: "patient",
      estValide: true,
      emailVerifie: true,
    });
  } else {
    patient.motDePasse = hash;
    patient.role = "patient";
    patient.estValide = true;
    patient.emailVerifie = true;
    await patient.save();
  }

  // Si un facility ID est fourni, on le valide et on l'utilise.
  // Sinon, on prend le premier médecin disponible. Cela évite que le test
  // utilise silencieusement un ancien ID conservé dans .e2e-state.json.
  const configuredFacilityId = process.env.E2E_FACILITY_ID
    ? Number(process.env.E2E_FACILITY_ID)
    : null;

  // Si un ID explicite est fourni et correspond bien à un médecin, on le garde.
  // Si l'ID est absent, invalide ou obsolète, on retombe automatiquement sur
  // le premier médecin disponible afin que l'E2E reste exécutable après un
  // changement des données de seed.
  let facility = null;

  if (Number.isInteger(configuredFacilityId) && configuredFacilityId > 0) {
    facility = await Facility.findOne({
      where: { id: configuredFacilityId, category: "medecin" },
    });

    if (!facility) {
      console.warn(
        `[e2e] E2E_FACILITY_ID=${configuredFacilityId} est invalide ou n'est pas un médecin. ` +
        "Sélection automatique d'un médecin de test."
      );
    }
  }

  if (!facility) {
    facility = await Facility.findOne({
      where: { category: "medecin" },
      order: [["id", "ASC"]],
    });
  }

  if (!facility) {
    throw new Error("Aucun médecin trouvé. Lancez d'abord `npm run seed` dans backend.");
  }

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const date = tomorrow.toISOString().slice(0, 10);

  // Créneau E2E stable : on réutilise un créneau libre si possible,
  // sinon on en crée un pour le lendemain.
  let availability = await Availability.findOne({
    where: { facilityId: facility.id, date, estReserve: false },
    order: [["heureDebut", "ASC"]],
  });

  if (!availability) {
    availability = await Availability.create({
      facilityId: facility.id,
      date,
      heureDebut: "10:00",
      heureFin: "10:20",
      estReserve: false,
    });
  }

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(
      { facilityId: facility.id, date, availabilityId: availability.id, email: EMAIL },
      null,
      2
    )
  );

  console.log(`[e2e] patient=${EMAIL} facility=${facility.id} date=${date} availability=${availability.id}`);
}

main()
  .catch((err) => {
    console.error("[e2e] préparation impossible:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
