"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Licenses", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      licenseKey: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },

      product: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "MediGuide",
      },

      status: {
        type: Sequelize.ENUM("active", "inactive", "expired", "revoked"),
        allowNull: false,
        defaultValue: "active",
      },

      issuedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },

      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      activatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      activationCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      maxActivations: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Licenses");
  },
};