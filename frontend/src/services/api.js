import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Origine du serveur (sans le /api), pour construire l'URL complète des
// fichiers statiques (photos de profil uploadées, voir /uploads).
export const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

export function urlPhoto(photoUrl) {
  if (!photoUrl) return null;
  return photoUrl.startsWith("http") ? photoUrl : `${API_ORIGIN}${photoUrl}`;
}

// Ajoute automatiquement le token JWT (s'il existe) à chaque requête,
// afin que les routes protégées du backend (authMiddleware) fonctionnent.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1];

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (csrf && !["get", "head", "options"].includes((config.method || "get").toLowerCase())) {
    config.headers["X-CSRF-Token"] = decodeURIComponent(csrf);
  }

  return config;
});

let refreshPromise = null;
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry || original?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refreshToken");
    const sessionId = localStorage.getItem("sessionId");
    if (!refreshToken || !sessionId) return Promise.reject(error);

    original._retry = true;
    try {
      refreshPromise ||= API.post("/auth/refresh", { refreshToken, sessionId });
      const { data } = await refreshPromise;
      refreshPromise = null;
      localStorage.setItem("token", data.token);
      localStorage.setItem("refreshToken", data.refreshToken);
      original.headers.Authorization = `Bearer ${data.token}`;
      return API(original);
    } catch (refreshError) {
      refreshPromise = null;
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("sessionId");
      localStorage.removeItem("user");
      return Promise.reject(refreshError);
    }
  }
);

// Inscription
export const registerUser = async (userData) => {
  await API.get("/auth/csrf");
  return API.post("/auth/register", userData);
};

// Vérification e-mail
export const verifyEmail = (email, code) => API.post("/auth/verify-email", { email, code });
export const resendVerification = (email) => API.post("/auth/resend-verification", { email });

// Connexion
export const loginUser = async (userData) => {
  await API.get("/auth/csrf");
  return API.post("/auth/login", userData);
};

// Récupère le profil de l'utilisateur connecté (route protégée)
export const getMe = () => {
  return API.get("/auth/me");
};

// Recherche d'établissements (médecins, pharmacies, parapharmacies)
// params: { category, q, specialite, ville, lat, lng, radius }
export const searchFacilities = (params) => {
  return API.get("/facilities", { params });
};

// Détails d'un établissement
export const getFacility = (id) => {
  return API.get(`/facilities/${id}`);
};

// ================= DISPONIBILITÉS / RENDEZ-VOUS =================

// Créneaux disponibles (publics) pour un établissement, optionnellement filtrés par date (YYYY-MM-DD)
export const getDisponibilites = (facilityId, date) => {
  return API.get(`/facilities/${facilityId}/disponibilites`, { params: date ? { date } : {} });
};

// Réserve un créneau (patient connecté) — dernière étape du tunnel de RDV
export const reserverCreneau = (disponibiliteId, motif) => {
  return API.post("/rendezvous", { disponibiliteId, motif });
};

// Liste des rendez-vous du patient connecté
export const getMesRendezVous = () => {
  return API.get("/rendezvous/mes");
};

// Annule un rendez-vous (patient propriétaire uniquement)
export const annulerRendezVous = (id) => {
  return API.patch(`/rendezvous/${id}/annuler`);
};

// ------- Gestion professionnel -------

// Fiches gérées par le professionnel connecté
export const getMesFacilities = () => {
  return API.get("/facilities/mine/liste");
};

// Rattache une fiche existante au compte professionnel connecté
export const revendiquerFacility = (facilityId) => {
  return API.patch(`/facilities/${facilityId}/revendiquer`);
};

// Crée une nouvelle fiche lorsque le professionnel n'existe pas encore dans la base.
export const creerMaFacility = (payload) => API.post("/facilities/mine/creer", payload);

// Tous les créneaux (réservés ou non) des fiches du professionnel connecté
export const getMesDisponibilites = () => {
  return API.get("/disponibilites/mine");
};

// Génère un lot de créneaux à partir d'une plage horaire
export const creerDisponibilites = (payload) => {
  return API.post("/disponibilites", payload);
};

// Supprime un créneau non réservé
export const supprimerDisponibilite = (id) => {
  return API.delete(`/disponibilites/${id}`);
};

// ================= AVIS =================

// Avis paginés + moyenne dynamique pour un établissement
export const getAvis = (facilityId, page = 1) => {
  return API.get(`/facilities/${facilityId}/avis`, { params: { page } });
};

// Publie un avis (patient connecté)
export const creerAvis = (facilityId, note, commentaire) => {
  return API.post(`/facilities/${facilityId}/avis`, { note, commentaire });
};

// Supprime son propre avis
export const supprimerAvis = (id) => {
  return API.delete(`/avis/${id}`);
};

// Derniers avis publiés par le patient connecté (dashboard patient)
export const getMesAvis = () => {
  return API.get("/avis/mes");
};

// ================= TABLEAU DE BORD PROFESSIONNEL =================

// Rendez-vous confirmés du jour pour le professionnel connecté
export const getRendezVousAujourdhui = () => {
  return API.get("/rendezvous/aujourdhui");
};

// Tous les rendez-vous du professionnel connecté, paginés côté serveur
// (historique + à venir), avec recherche patient, filtre statut/date et tri.
export const getRendezVousProfessionnel = ({ page = 1, limit = 10, search, statut, date, sortBy, order } = {}) => {
  return API.get("/rendezvous/professionnel", {
    params: { page, limit, search: search || undefined, statut: statut || undefined, date: date || undefined, sortBy: sortBy || undefined, order: order || undefined },
  });
};

// Met à jour le profil professionnel (horaires, bio, photo, typeGarde) — multipart
// typeGarde ("Jour"/"Nuit"/"" ) n'est pris en compte côté backend que pour
// les fiches de catégorie "pharmacie".
export const mettreAJourProfilFacility = (facilityId, { horaires, bio, photo, typeGarde }) => {
  const form = new FormData();
  if (horaires !== undefined) form.append("horaires", horaires);
  if (bio !== undefined) form.append("bio", bio);
  if (photo) form.append("photo", photo);
  if (typeGarde !== undefined) form.append("typeGarde", typeGarde);
  return API.patch(`/facilities/${facilityId}/profil`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ================= ESPACE PROFESSIONNEL =================
export const getProfessionnelStats = () => API.get("/professionnel/stats");
export const getProfessionnelPatients = () => API.get("/professionnel/patients");
export const getProfessionnelProducts = (params = {}) => API.get("/professionnel/products", { params });
export const createProfessionnelProduct = (payload) => API.post("/professionnel/products", payload);
export const updateProfessionnelProduct = (id, payload) => API.patch(`/professionnel/products/${id}`, payload);
export const deleteProfessionnelProduct = (id) => API.delete(`/professionnel/products/${id}`);
export const getProfessionnelDemands = (statut) => API.get("/professionnel/demands", { params: statut ? { statut } : {} });
export const updateProfessionnelDemand = (id, statut) => API.patch(`/professionnel/demands/${id}`, { statut });
export const getProfessionnelConsultations = () => API.get("/professionnel/consultations");
export const createProfessionnelConsultation = (payload) => API.post("/professionnel/consultations", payload);
export const getProfessionnelNotifications = () => API.get("/professionnel/notifications");
export const markProfessionnelNotificationRead = (id) => API.patch(`/professionnel/notifications/${id}/lue`);
export const updateRendezVousProfessionnel = (id, statut) => API.patch(`/rendezvous/${id}/statut`, { statut });


// ================= PRODUITS / DISPONIBILITÉ PATIENT =================
export const searchProducts = (params = {}) => API.get("/produits", { params });
export const demanderDisponibiliteProduit = (payload) => API.post("/produits/demandes", payload);
export const getMesDemandesProduits = () => API.get("/produits/mes-demandes");
export const getMesNotifications = () => API.get("/produits/notifications");
export const markMyNotificationRead = (id) => API.patch(`/produits/notifications/${id}/lue`);

export default API;
// ================= ADMIN =================
export const adminGetUsers = (q = "") => API.get("/admin/users", { params: q ? { q } : {} });
export const adminCreateUser = (payload) => API.post("/admin/users", payload);
export const adminUpdateUser = (id, payload) => API.patch(`/admin/users/${id}`, payload);
export const adminDeleteUser = (id) => API.delete(`/admin/users/${id}`);

export const adminGetFacilities = (params = {}) => API.get("/admin/facilities", { params });
export const adminValidateFacility = (id, estVerifie) => API.patch(`/admin/facilities/${id}/validation`, { estVerifie });

export const adminGetMedecins = (params = {}) => API.get("/admin/medecins", { params });
export const adminValidateMedecin = (id, estVerifie) =>
  API.patch(`/admin/medecins/${id}/validation`, { estVerifie });
export const adminCreateMedecin = (payload) => API.post("/facilities", payload);
export const adminUpdateMedecin = (id, payload) => API.patch(`/facilities/${id}`, payload);
export const adminDeleteMedecin = (id) => API.delete(`/facilities/${id}`);

export const adminGetAvis = (statut = "tous") => API.get("/admin/avis", { params: { statut } });
export const adminModerateAvis = (id, statut) =>
  API.patch(`/admin/avis/${id}/moderation`, { statut });

export const adminGetStats = () => API.get("/admin/stats");
// ================= LICENCE MEDIGUIDE =================

export const activateLicense = async (licenseKey) => {
  // الحصول على CSRF token قبل طلب POST
  await API.get("/auth/csrf");

  return API.post("/license/activate", {
    licenseKey: licenseKey.trim(),
  });
};

export const validateLicense = async (licenseKey) => {
  // الحصول على CSRF token قبل طلب POST
  await API.get("/auth/csrf");

  return API.post("/license/validate", {
    licenseKey: licenseKey.trim(),
  });
};