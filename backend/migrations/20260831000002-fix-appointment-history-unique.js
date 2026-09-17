'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "Appointments_disponibiliteId_key";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "appointments_active_dispo_unique";');
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX appointments_active_dispo_unique ON "Appointments" ("disponibiliteId") WHERE "statut" = 'confirme';`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "appointments_active_dispo_unique";');
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS "Appointments_disponibiliteId_key" ON "Appointments" ("disponibiliteId");');
  },
};
