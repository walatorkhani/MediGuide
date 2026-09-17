// Convertit une fiche MédiGuide (modèle interne Facility) vers le format
// générique {id, name, category, subSpecialty, address, phone, latitude,
// longitude, features, isVerified, distanceM} attendu par la plateforme
// modulaire partagée (mediEYE / craftEYE / cityEYE) décrite en section 7.4
// du cahier des charges. Toute nouvelle fiche MédiGuide reste ainsi
// consommable telle quelle par le shell commun de la plateforme, sans
// dupliquer la logique de recherche : cette fonction est purement une
// couche de traduction appliquée à un résultat déjà chargé.
function toGenericFacility(facility) {
  const f = facility.toJSON ? facility.toJSON() : facility;

  const features = [];
  if (f.typeGarde) features.push(`garde_${f.typeGarde.toLowerCase()}`);
  if (f.secteur) features.push(`secteur_${f.secteur.toLowerCase()}`);

  return {
    id: f.id,
    name: f.nom,
    category: f.category,
    subSpecialty: f.specialite || null,
    address: [f.adresse, f.delegation].filter(Boolean).join(", ") || null,
    phone: f.telephone || null,
    latitude: f.latitude,
    longitude: f.longitude,
    features,
    isVerified: !!f.estVerifie,
    distanceM: f.dataValues?.distanceM ?? f.distanceM ?? null,
  };
}

module.exports = { toGenericFacility };
