const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notification = sequelize.define("Notification", {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false, defaultValue: "info" },
  titre: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },
  lu: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: "Notifications", indexes: [{ fields: ["userId", "lu"] }] });

module.exports = Notification;
