const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Review = sequelize.define(
  "Review",
  {
    note: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM("en_attente", "approuve", "rejete"),
      allowNull: false,
      defaultValue: "approuve",
    },
  },
  {
    tableName: "Reviews",
    indexes: [{ fields: ["facilityId"] }, { fields: ["statut"] }, { unique: true, fields: ["facilityId", "patientId"] }],
  }
);

module.exports = Review;
