import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import RoleRoute from "./components/RoleRoute";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import ProfessionnelSpace from "./pages/ProfessionnelSpace";
import AdminDashboard from "./pages/AdminDashboard";
import Search from "./pages/Search";
import FacilityDetails from "./pages/FacilityDetails";
import MesRendezVous from "./pages/MesRendezVous";

import LicenseActivation from "./components/LicenseActivation";
import { validateLicense } from "./services/api";

import "./App.css";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        <LicenseGuard>

          <a
            className="skip-link"
            href="#main-content"
          >
            Aller au contenu
          </a>

          <Navbar />

          <div
            id="main-content"
            tabIndex="-1"
          >
            <Routes>

              {/* ================= PUBLIC PAGES ================= */}

              <Route
                path="/"
                element={<Home />}
              />

              <Route
                path="/bienvenue"
                element={<Welcome />}
              />

              <Route
                path="/recherche"
                element={<Search />}
              />

              <Route
                path="/etablissement/:id"
                element={<FacilityDetails />}
              />

              <Route
                path="/login"
                element={<Login />}
              />

              <Route
                path="/register"
                element={<Register />}
              />

              <Route
                path="/verify-email"
                element={<VerifyEmail />}
              />


              {/* ================= PATIENT ================= */}

              <Route
                path="/dashboard"
                element={
                  <RoleRoute roles={["patient"]}>
                    <Dashboard />
                  </RoleRoute>
                }
              />

              <Route
                path="/mes-rendez-vous"
                element={
                  <RoleRoute roles={["patient"]}>
                    <MesRendezVous />
                  </RoleRoute>
                }
              />


              {/* ================= PROFESSIONNEL ================= */}

              <Route
                path="/professionnel"
                element={
                  <RoleRoute roles={["professionnel"]}>
                    <ProfessionalEntry />
                  </RoleRoute>
                }
              />

              <Route
                path="/professionnel/:category"
                element={
                  <RoleRoute roles={["professionnel"]}>
                    <ProfessionalCategoryRoute />
                  </RoleRoute>
                }
              />


              {/* ================= ADMIN ================= */}

              <Route
                path="/admin"
                element={
                  <RoleRoute roles={["administrateur"]}>
                    <AdminDashboard />
                  </RoleRoute>
                }
              />


              {/* ================= FALLBACK ================= */}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />

            </Routes>
          </div>

        </LicenseGuard>

      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;


/* =========================================================
   PROFESSIONNEL - ENTRY
   ========================================================= */

function ProfessionalEntry() {
  const { user } = useAuth();

  const category =
    user?.categorieProfessionnelle;

  if (
    [
      "medecin",
      "pharmacie",
      "parapharmacie",
    ].includes(category)
  ) {
    return (
      <Navigate
        to={`/professionnel/${category}`}
        replace
      />
    );
  }

  return <ProfessionnelSpace />;
}


/* =========================================================
   PROFESSIONNEL - CATEGORY
   ========================================================= */

function ProfessionalCategoryRoute() {
  const { user } = useAuth();

  const { category } = useParams();

  const allowed = [
    "medecin",
    "pharmacie",
    "parapharmacie",
  ];

  if (!allowed.includes(category)) {
    return (
      <Navigate
        to="/professionnel"
        replace
      />
    );
  }

  if (
    user?.categorieProfessionnelle &&
    user.categorieProfessionnelle !== category
  ) {
    return (
      <Navigate
        to={`/professionnel/${user.categorieProfessionnelle}`}
        replace
      />
    );
  }

  return <ProfessionnelSpace />;
}


/* =========================================================
   LICENCE MEDIGUIDE
   ========================================================= */

function LicenseGuard({ children }) {

  const [checking, setChecking] =
    React.useState(true);

  const [licensed, setLicensed] =
    React.useState(false);


  React.useEffect(() => {

    async function checkLicense() {

      const licenseKey =
        localStorage.getItem(
          "mediguide_license_key"
        );


      /* ---------------------------------------------------
         Aucune licence enregistrée
         --------------------------------------------------- */

      if (!licenseKey) {

        setLicensed(false);
        setChecking(false);

        return;
      }


      /* ---------------------------------------------------
         Vérification auprès du serveur
         --------------------------------------------------- */

      try {

        const response =
          await validateLicense(
            licenseKey
          );


        /* -------------------------------------------------
           Licence valide
           ------------------------------------------------- */

        if (
          response.data?.success
        ) {

          setLicensed(true);

        } else {

          localStorage.removeItem(
            "mediguide_license_key"
          );

          localStorage.removeItem(
            "mediguide_license_activated"
          );

          setLicensed(false);
        }

      } catch (error) {

        console.error(
          "Erreur vérification licence :",
          error
        );


        localStorage.removeItem(
          "mediguide_license_key"
        );

        localStorage.removeItem(
          "mediguide_license_activated"
        );

        setLicensed(false);

      } finally {

        setChecking(false);

      }
    }


    checkLicense();

  }, []);


  /* =======================================================
     Vérification en cours
     ======================================================= */

  if (checking) {

    return (
      <div className="license-page">

        <div className="license-card">

          <h1>
            Vérification de la licence
          </h1>

          <p>
            Veuillez patienter...
          </p>

        </div>

      </div>
    );
  }


  /* =======================================================
     Licence absente ou invalide
     ======================================================= */

  if (!licensed) {

    return (
      <LicenseActivation
        onActivated={() => {

          setLicensed(true);

        }}
      />
    );
  }


  /* =======================================================
     Licence valide
     ======================================================= */

  return children;
}