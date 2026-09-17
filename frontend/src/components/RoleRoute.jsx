import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Comme PrivateRoute, mais vérifie en plus que le rôle de l'utilisateur
// connecté fait partie des rôles autorisés pour cette route.
// Un utilisateur connecté mais avec le mauvais rôle est renvoyé vers
// son propre espace (au lieu d'un simple accès refusé).
const ESPACE_PAR_ROLE = {
  patient: "/dashboard",
  professionnel: "/professionnel",
  administrateur: "/admin",
};

export default function RoleRoute({ roles, children }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={ESPACE_PAR_ROLE[user.role] || "/"} replace />;
  }

  return children;
}
