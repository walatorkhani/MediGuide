'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Appointments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      disponibiliteId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // Une seule ligne active par créneau (voir models/Appointment.js) :
        // le créneau est libéré (Availability.estReserve=false) en cas
        // d'annulation plutôt que de supprimer la ligne, donc l'unicité
        // porte ici sur la relation, pas sur le statut.
        unique: true,
        references: { model: 'Availabilities', key: 'id' },
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
      statut: {
        type: Sequelize.ENUM('confirme', 'annule'),
        allowNull: false,
        defaultValue: 'confirme',
      },
      motif: { type: Sequelize.STRING, allowNull: true },
      rappelEnvoye: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Appointments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Appointments_statut";');
  },
};
