// Centralise les associations Sequelize entre modèles. Chargé une seule
// fois depuis server.js, après que tous les modèles ont été require()-és,
// pour éviter les dépendances circulaires entre fichiers de modèles.
const User = require("./User");
const Facility = require("./Facility");
const Availability = require("./Availability");
const Appointment = require("./Appointment");
const Review = require("./Review");
const Product = require("./Product");
const Demand = require("./Demand");
const Consultation = require("./Consultation");
const Notification = require("./Notification");

// Un professionnel possède (éventuellement) une ou plusieurs fiches.
User.hasMany(Facility, { foreignKey: "ownerId", as: "facilities" });
Facility.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

// Une fiche (médecin) propose plusieurs créneaux de disponibilité.
Facility.hasMany(Availability, { foreignKey: "facilityId", as: "disponibilites", onDelete: "CASCADE" });
Availability.belongsTo(Facility, { foreignKey: "facilityId", as: "facility" });

// Un créneau donne lieu à au plus un rendez-vous actif.
Availability.hasOne(Appointment, { foreignKey: "disponibiliteId", as: "rendezVous" });
Appointment.belongsTo(Availability, { foreignKey: "disponibiliteId", as: "disponibilite" });

// Un patient a plusieurs rendez-vous.
User.hasMany(Appointment, { foreignKey: "patientId", as: "rendezVous" });
Appointment.belongsTo(User, { foreignKey: "patientId", as: "patient" });

// Produits et demandes pour pharmacies/parapharmacies.
Facility.hasMany(Product, { foreignKey: "facilityId", as: "produits", onDelete: "CASCADE" });
Product.belongsTo(Facility, { foreignKey: "facilityId", as: "facility" });
Facility.hasMany(Demand, { foreignKey: "facilityId", as: "demandes", onDelete: "CASCADE" });
Demand.belongsTo(Facility, { foreignKey: "facilityId", as: "facility" });
Demand.belongsTo(User, { foreignKey: "patientId", as: "patient" });
Demand.belongsTo(Product, { foreignKey: "productId", as: "produit" });

// Consultations médicales.
Facility.hasMany(Consultation, { foreignKey: "facilityId", as: "consultations", onDelete: "CASCADE" });
Consultation.belongsTo(Facility, { foreignKey: "facilityId", as: "facility" });
Consultation.belongsTo(Appointment, { foreignKey: "appointmentId", as: "rendezVous" });
Consultation.belongsTo(User, { foreignKey: "patientId", as: "patient" });
User.hasMany(Consultation, { foreignKey: "patientId", as: "consultations" });

User.hasMany(Notification, { foreignKey: "userId", as: "notifications", onDelete: "CASCADE" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

// Avis : une fiche a plusieurs avis, un patient a plusieurs avis.
Facility.hasMany(Review, { foreignKey: "facilityId", as: "avis", onDelete: "CASCADE" });
Review.belongsTo(Facility, { foreignKey: "facilityId", as: "facility" });
User.hasMany(Review, { foreignKey: "patientId", as: "avis" });
Review.belongsTo(User, { foreignKey: "patientId", as: "patient" });

module.exports = { User, Facility, Availability, Appointment, Review, Product, Demand, Consultation, Notification };
