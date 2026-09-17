const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Un rendez-vous = la réservation d'une Disponibilite par un patient.
// Une seule ligne active par créneau (voir contrainte unique sur
// disponibiliteId ci-dessous) : le créneau est libéré (estReserve=false)
// quand le RDV est annulé, ce qui permet de le réserver à nouveau.
const Appointment = sequelize.define(
  "Appointment",
  {
    statut: {
      type: DataTypes.ENUM("confirme", "annule"),
      defaultValue: "confirme",
    },

    motif: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Passe à true une fois l'e-mail de rappel (24h avant) envoyé, pour
    // que le job planifié (voir jobs/rappels.js) ne le renvoie pas deux fois.
    rappelEnvoye: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "Appointments",
  }
);

module.exports = Appointment;
