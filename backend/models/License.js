const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const License = sequelize.define(
  "License",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    licenseKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    product: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "MediGuide",
    },

    status: {
      type: DataTypes.ENUM(
        "active",
        "inactive",
        "expired",
        "revoked"
      ),
      allowNull: false,
      defaultValue: "active",
    },

    issuedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    activationCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    maxActivations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "Licenses",
  }
);

module.exports = License;