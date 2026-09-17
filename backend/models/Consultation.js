const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Consultation = sequelize.define("Consultation", {
  facilityId: { type: DataTypes.INTEGER, allowNull: false },
  appointmentId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  patientId: { type: DataTypes.INTEGER, allowNull: false },
  diagnostic: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  ordonnance: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: "Consultations", indexes: [{ fields: ["facilityId"] }, { fields: ["patientId"] }] });

module.exports = Consultation;
