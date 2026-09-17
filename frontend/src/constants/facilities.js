export const CATEGORIES = [
  { value: "medecin", label: "Médecin", icon: "👨‍⚕️" },
  { value: "pharmacie", label: "Pharmacie", icon: "💊" },
  { value: "parapharmacie", label: "Parapharmacie", icon: "🧴" },
];

export const SPECIALITES = [
  "Généraliste",
  "Cardiologie",
  "Dentiste",
  "Dermatologie",
  "Gynécologie",
  "Pédiatrie",
  "Ophtalmologue",
  "ORL",
  "Neurologie",
];

export const CATEGORY_STYLES = {
  medecin: {
    icon: "👨‍⚕️",
    label: "Médecin",
    badge: "bg-medical-100 text-medical-700",
    marker: "#1e88e5",
  },
  pharmacie: {
    icon: "💊",
    label: "Pharmacie",
    badge: "bg-status-positive/10 text-status-positive",
    marker: "#16a34a",
  },
  parapharmacie: {
    icon: "🧴",
    label: "Parapharmacie",
    badge: "bg-medical-100 text-medical-900",
    marker: "#0d5aa0",
  },
};

// Contenu de l'en-tête (titre/sous-titre) affiché sur la page de recherche
// selon la catégorie sélectionnée. Permet un vrai changement d'affichage
// par catégorie tout en restant sur la même page/URL.
export const CATEGORY_META = {
  "": {
    icon: "🔍",
    title: "Trouver un professionnel de santé",
    subtitle: "Médecins, pharmacies et parapharmacies près de chez vous à Jendouba.",
  },
  medecin: {
    icon: "👨‍⚕️",
    title: "Médecins à Jendouba",
    subtitle: "Recherchez par spécialité, secteur (privé/public) et proximité.",
  },
  pharmacie: {
    icon: "💊",
    title: "Pharmacies à Jendouba",
    subtitle: "Localisez une pharmacie proche, avec ses horaires et gardes.",
  },
  parapharmacie: {
    icon: "🧴",
    title: "Parapharmacies à Jendouba",
    subtitle: "Produits de soin, hygiène et bien-être près de chez vous.",
  },
};

export function formatDistance(meters) {
  if (meters === undefined || meters === null) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
