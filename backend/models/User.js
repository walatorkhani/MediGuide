const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  motDePasse: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM(
      "patient",
      "professionnel",
      "administrateur"
    ),
    defaultValue: "patient",
  },

  // Catégorie déclarée à l'inscription pour un compte "professionnel"
  // (medecin | pharmacie | parapharmacie). Sert à orienter le rattachement
  // de fiche (revendication) vers la bonne catégorie et à contrôler qu'un
  // professionnel ne revendique pas une fiche d'une autre catégorie.
  // Non pertinent pour les rôles patient/administrateur (reste null).
  categorieProfessionnelle: {
    type: DataTypes.ENUM("medecin", "pharmacie", "parapharmacie"),
    allowNull: true,
  },

  estValide: { type: DataTypes.BOOLEAN, defaultValue: true },
  emailVerifie: { type: DataTypes.BOOLEAN, defaultValue: true },
  codeVerificationEmail: { type: DataTypes.STRING, allowNull: true },
  codeVerificationExpireAt: { type: DataTypes.DATE, allowNull: true },
});

module.exports = User;