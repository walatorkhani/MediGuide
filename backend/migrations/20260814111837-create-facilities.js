'use strict';

// Table unifiée médecins / pharmacies / parapharmacies (voir models/Facility.js).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Facilities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      ownerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      category: {
        type: Sequelize.ENUM('medecin', 'pharmacie', 'parapharmacie'),
        allowNull: false,
      },
      nom: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      specialite: { type: Sequelize.STRING, allowNull: true },
      telephone: { type: Sequelize.STRING, allowNull: true },
      adresse: { type: Sequelize.STRING, allowNull: true },
      delegation: { type: Sequelize.STRING, allowNull: true },
      horaires: { type: Sequelize.STRING, allowNull: true },
      bio: { type: Sequelize.TEXT, allowNull: true },
      photoUrl: { type: Sequelize.STRING, allowNull: true },
      secteur: { type: Sequelize.STRING, allowNull: true },
      typeGarde: { type: Sequelize.STRING, allowNull: true },
      googleMapsUrl: { type: Sequelize.TEXT, allowNull: true },
      noteAvis: { type: Sequelize.FLOAT, allowNull: true },
      latitude: { type: Sequelize.DOUBLE, allowNull: false },
      longitude: { type: Sequelize.DOUBLE, allowNull: false },
      location: {
        type: Sequelize.GEOGRAPHY('POINT', 4326),
        allowNull: true,
      },
      estVerifie: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('Facilities', ['category']);
    await queryInterface.addIndex('Facilities', ['delegation']);
    await queryInterface.addIndex('Facilities', ['specialite']);
    // Index GiST requis par ST_DWithin / ST_Distance sur la colonne geography.
    await queryInterface.sequelize.query(
      'CREATE INDEX facilities_location_gist ON "Facilities" USING GIST (location);'
    );
    // Full-text search (to_tsvector/plainto_tsquery, voir S6).
    await queryInterface.sequelize.query(
      `CREATE INDEX facilities_fulltext_idx ON "Facilities" USING GIN (to_tsvector('french', coalesce(nom, '') || ' ' || coalesce(specialite, '')));`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Facilities');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Facilities_category";');
  },
};
