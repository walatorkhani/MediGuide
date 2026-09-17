'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Availabilities', {
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
      date: { type: Sequelize.DATEONLY, allowNull: false },
      heureDebut: { type: Sequelize.STRING, allowNull: false },
      heureFin: { type: Sequelize.STRING, allowNull: false },
      estReserve: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('Availabilities', ['facilityId', 'date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Availabilities');
  },
};
