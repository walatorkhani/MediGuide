const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define("Product", {
  facilityId: { type: DataTypes.INTEGER, allowNull: false },
  nom: { type: DataTypes.STRING, allowNull: false },
  categorie: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  quantite: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  seuilAlerte: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  dateExpiration: { type: DataTypes.DATEONLY, allowNull: true },
  prix: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  disponible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: "Products", indexes: [{ fields: ["facilityId"] }, { fields: ["nom"] }, { fields: ["categorie"] }] });

module.exports = Product;
