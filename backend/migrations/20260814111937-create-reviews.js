'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reviews', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      facilityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Facilities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      patientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      note: { type: Sequelize.INTEGER, allowNull: false },
      commentaire: { type: Sequelize.TEXT, allowNull: true },
      statut: {
        type: Sequelize.ENUM('en_attente', 'approuve', 'rejete'),
        allowNull: false,
        defaultValue: 'approuve',
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('Reviews', ['facilityId']);
    await queryInterface.addIndex('Reviews', ['statut']);
    await queryInterface.addIndex('Reviews', ['facilityId', 'patientId'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Reviews');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Reviews_statut";');
  },
};
