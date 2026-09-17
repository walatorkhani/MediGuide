'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Products', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      facilityId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Facilities', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      nom: { type: Sequelize.STRING, allowNull: false },
      categorie: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      quantite: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      seuilAlerte: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      dateExpiration: { type: Sequelize.DATEONLY, allowNull: true },
      prix: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      disponible: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('Products', ['facilityId']);
    await queryInterface.addIndex('Products', ['nom']);
    await queryInterface.addIndex('Products', ['categorie']);

    await queryInterface.createTable('Demands', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      facilityId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Facilities', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      patientId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      productId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Products', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      produitNom: { type: Sequelize.STRING, allowNull: false },
      quantite: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      statut: { type: Sequelize.ENUM('en_attente', 'traitee', 'refusee'), allowNull: false, defaultValue: 'en_attente' },
      message: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('Demands', ['facilityId', 'statut']);

    await queryInterface.createTable('Consultations', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      facilityId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Facilities', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      appointmentId: { type: Sequelize.INTEGER, allowNull: true, unique: true, references: { model: 'Appointments', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      patientId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      diagnostic: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      ordonnance: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('Consultations', ['facilityId']);
    await queryInterface.addIndex('Consultations', ['patientId']);

    await queryInterface.createTable('Notifications', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      type: { type: Sequelize.STRING, allowNull: false, defaultValue: 'info' },
      titre: { type: Sequelize.STRING, allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: true },
      lu: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('Notifications', ['userId', 'lu']);

    await queryInterface.sequelize.query(`ALTER TYPE "enum_Appointments_statut" ADD VALUE IF NOT EXISTS 'refuse';`);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Notifications');
    await queryInterface.dropTable('Consultations');
    await queryInterface.dropTable('Demands');
    await queryInterface.dropTable('Products');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Demands_statut";');
  },
};
