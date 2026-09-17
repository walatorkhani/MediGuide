const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Un créneau de disponibilité proposé par un professionnel (médecin) pour
// un établissement donné. Les créneaux sont générés en lot (voir routes/
// disponibilites.js) à partir d'une plage horaire + une durée, puis réservés
// individuellement par les patients via le tunnel de prise de RDV.
const Availability = sequelize.define(
  "Availability",
  {
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Stockées en "HH:MM" pour rester simples côté frontend (comparaisons
    // lexicographiques suffisantes puisque le format est fixe).
    heureDebut: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    heureFin: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    estReserve: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "Availabilities",
    indexes: [{ fields: ["facilityId", "date"] }],
  }
);

module.exports = Availability;
