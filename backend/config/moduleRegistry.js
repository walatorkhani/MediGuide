// Registre des modules de la plateforme modulaire partagée (mediEYE /
// craftEYE / cityEYE, section 7.4 du cahier des charges). Chaque module
// s'enregistre ici avec un slug unique et l'ensemble des permissions
// RBAC qu'il expose ; le shell commun de la plateforme peut ainsi
// découvrir MédiGuide sans connaître ses détails internes.
//
// Ce registre est volontairement statique (un seul module, en mémoire) :
// l'objectif de cette étape est de fournir un point d'intégration réel et
// vérifiable, pas de construire un service de registre distribué qui
// n'aurait pas d'autre consommateur pour l'instant.

const MODULES = {
  medieye: {
    slug: "medieye",
    name: "MédiGuide",
    description:
      "Localisation de professionnels de santé, pharmacies et parapharmacies (Jendouba).",
    permissions: ["read", "write", "admin"],
    // Rôles internes MédiGuide -> permission RBAC exposée au shell commun.
    roleToPermission: {
      visiteur: "read",
      patient: "read",
      professionnel: "write",
      administrateur: "admin",
    },
    basePath: "/modules/medieye",
    apiBasePath: "/api/modules/medieye",
  },
};

function getModule(slug) {
  return MODULES[slug] || null;
}

function listModules() {
  return Object.values(MODULES);
}

// Traduit un rôle interne MédiGuide (patient/professionnel/administrateur)
// vers la permission RBAC du module telle qu'attendue par la plateforme
// partagée.
function permissionForRole(slug, role) {
  const mod = getModule(slug);
  if (!mod) return null;
  return mod.roleToPermission[role] || "read";
}

module.exports = { MODULES, getModule, listModules, permissionForRole };
