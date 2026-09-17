'use strict';

/** Active l'extension PostGIS (nécessaire pour la colonne geography de
 * Facility et les requêtes de proximité ST_DWithin). Doit s'exécuter avant
 * la création de la table facilities.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS postgis;');
  },
};
