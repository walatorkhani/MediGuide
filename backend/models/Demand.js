const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Demand = sequelize.define("Demand", {
  facilityId: { type: DataTypes.INTEGER, allowNull: false },
  patientId: { type: DataTypes.INTEGER, allowNull: true },
  productId: { type: DataTypes.INTEGER, allowNull: true },
  produitNom: { type: DataTypes.STRING, allowNull: false },
  quantite: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  statut: { type: DataTypes.ENUM("en_attente", "traitee", "refusee"), allowNull: false, defaultValue: "en_attente" },
  message: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: "Demands", indexes: [{ fields: ["facilityId", "statut"] }] });

module.exports = Demand;
