'use strict';

// Ajouté suite à une exécution réelle de scripts/explain-analyze.sql (S10) :
// la requête de recherche full-text (to_tsvector(nom || specialite) @@
// plainto_tsquery(...)) faisait un Seq Scan complet sur "Facilities" faute
// d'index sur l'expression. Cet index GIN sur l'expression exacte utilisée
// par backend/routes/facilities.js permet à PostgreSQL d'utiliser un Bitmap
// Index Scan au lieu d'un Seq Scan, ce qui reste indispensable au fur et à
// mesure que la table grandit au-delà des ~260 lignes actuelles.

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS facilities_fulltext_gin
      ON "Facilities"
      USING GIN (
        to_tsvector('simple', coalesce(nom, '') || ' ' || coalesce(specialite, ''))
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS facilities_fulltext_gin;
    `);
  },
};
