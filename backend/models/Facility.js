const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Table unifiée pour les 3 catégories de résultats recherchés dans MédiGuide :
// médecins, pharmacies, parapharmacies. Un seul modèle "Facility" simplifie
// la recherche/le filtrage combinés et prépare l'intégration future à la
// plateforme modulaire partagée (mediEYE/craftEYE/cityEYE) mentionnée dans
// le cahier des charges, dont le format générique attendu est proche de
// { id, name, category, subSpecialty, address, phone, latitude, longitude }.
const Facility = sequelize.define(
  "Facility",
  {
    // Compte "professionnel" propriétaire de cette fiche (permet de gérer
    // ses disponibilités). Nullable : la majorité des fiches sont importées
    // du CSV et non encore revendiquées par un compte (voir POST
    // /api/facilities/:id/revendiquer).
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    category: {
      type: DataTypes.ENUM("medecin", "pharmacie", "parapharmacie"),
      allowNull: false,
    },

    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Spécialité (médecins uniquement, ex: "Cardiologie")
    specialite: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    adresse: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    delegation: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    horaires: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ----- Profil professionnel (gestion par le titulaire de la fiche) -----
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    secteur: {
      type: DataTypes.STRING, // "Privé" / "Public" (médecins)
      allowNull: true,
    },

    typeGarde: {
      type: DataTypes.STRING, // "Jour" / "Nuit" (pharmacies)
      allowNull: true,
    },

   googleMapsUrl: {
  type: DataTypes.TEXT,   // était DataTypes.STRING
  allowNull: true,
    },
    noteAvis: {
      type: DataTypes.FLOAT, // ex: 4.5 sur 5, parsé depuis le CSV "5,0/5"
      allowNull: true,
    },

    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    // Colonne géographique PostGIS utilisée pour les requêtes de proximité
    // (ST_DWithin / ST_Distance). Indexée par un index GiST (voir seed script).
    location: {
      type: DataTypes.GEOGRAPHY("POINT", 4326),
      allowNull: true,
    },

    estVerifie: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    indexes: [
      { fields: ["category"] },
      { fields: ["delegation"] },
      { fields: ["specialite"] },
    ],
  }
);

module.exports = Facility;
