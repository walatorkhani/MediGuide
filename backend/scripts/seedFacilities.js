require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const sequelize = require("../config/database");
const Facility = require("../models/Facility");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

// -------- Utilitaires de parsing des CSV existants (formats FR, séparateur ;) --------

function readCsv(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""); // retire le BOM
  return parse(raw, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    trim: true,
  });
}

// "5,0/5" -> 5.0 ; "" -> null
function parseNote(avis) {
  if (!avis) return null;
  const match = String(avis).replace(",", ".").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function toNumber(value) {
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function buildRow({
  category,
  nom,
  specialite = null,
  telephone = null,
  adresse = null,
  delegation = null,
  latitude,
  longitude,
  googleMapsUrl = null,
  horaires = null,
  secteur = null,
  typeGarde = null,
  noteAvis = null,
}) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (lat === null || lng === null) return null; // sans coordonnées, inutilisable pour la recherche géo

  return {
    category,
    nom: nom?.trim(),
    specialite: specialite?.trim() || null,
    telephone: telephone?.trim() || null,
    adresse: adresse?.trim() || null,
    delegation: delegation?.trim() || null,
    horaires: horaires?.trim() || null,
    secteur: secteur?.trim() || null,
    typeGarde: typeGarde?.trim() || null,
    googleMapsUrl: googleMapsUrl?.trim() || null,
    noteAvis: parseNote(noteAvis),
    latitude: lat,
    longitude: lng,
    location: { type: "Point", coordinates: [lng, lat] }, // GeoJSON: [longitude, latitude]
  };
}

function loadMedecins() {
  return readCsv("medecins_jendouba.csv")
    .map((r) =>
      buildRow({
        category: "medecin",
        nom: r["Nom et prénom"],
        specialite: r["Spécialité"],
        telephone: r["Téléphone"],
        adresse: r["Adresse "] || r["Adresse"],
        delegation: r["Délégation"],
        latitude: r["Latitude"],
        longitude: r["Longitude"],
        googleMapsUrl: r["Lien Google Maps"],
        horaires: r["Horaires de travail"],
        secteur: r["Secteur"],
        noteAvis: r["Avis"],
      })
    )
    .filter(Boolean);
}

function loadPharmacies() {
  return readCsv("pharmacies_jendouba (2).csv")
    .map((r) =>
      buildRow({
        category: "pharmacie",
        nom: r["Nom"],
        telephone: r["Téléphone"],
        adresse: r["Adresse"],
        delegation: r["Délégation"],
        latitude: r["Latitude"],
        longitude: r["Longitude"],
        googleMapsUrl: r["Google Maps URL"],
        horaires: r["Horaires"],
        typeGarde: r["Type (jour/nuit)"],
        noteAvis: r["Avis"],
      })
    )
    .filter(Boolean);
}

function loadParapharmacies() {
  return readCsv("parapharmacies_jendouba.csv")
    .map((r) =>
      buildRow({
        category: "parapharmacie",
        nom: r["Nom"],
        telephone: r["Téléphone"],
        adresse: r["Adresse"],
        delegation: r["Délégation"],
        latitude: r["Latitude"],
        longitude: r["Longitude"],
        googleMapsUrl: r["Google Maps URL"],
        horaires: r["Horaires"],
        noteAvis: r["Avis"],
      })
    )
    .filter(Boolean);
}

async function seed() {
  try {
    // 1. Extension PostGIS (idempotent)
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    console.log("Extension PostGIS activée.");

    // 2. Table Facility (ne touche pas aux autres tables/modèles existants)
    await Facility.sync({ alter: true });

    // 3. Index GiST sur la colonne géographique pour les requêtes ST_DWithin/ST_Distance
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS facilities_location_gist ON "Facilities" USING GIST (location);'
    );
    console.log("Index GiST créé/vérifié sur Facilities.location.");

    // 4. Rechargement des données (idempotent : on vide puis on réinsère)
    const rows = [
      ...loadMedecins(),
      ...loadPharmacies(),
      ...loadParapharmacies(),
    ];

    await Facility.destroy({ where: {}, truncate: true, cascade: true });
    await Facility.bulkCreate(rows);

    console.log(`${rows.length} établissements importés avec succès.`);
    process.exit(0);
  } catch (err) {
    console.error("Erreur lors du seed :", err);
    process.exit(1);
  }
}

seed();
