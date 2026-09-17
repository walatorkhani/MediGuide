'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'categorieProfessionnelle', {
      type: Sequelize.ENUM('medecin', 'pharmacie', 'parapharmacie'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'categorieProfessionnelle');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Users_categorieProfessionnelle";'
    );
  },
};
