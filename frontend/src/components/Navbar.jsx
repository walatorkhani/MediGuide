import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Globe } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import Logo from "./Logo";

const ESPACE_PAR_ROLE = {
  patient: "/dashboard",
  professionnel: "/professionnel",
  administrateur: "/admin",
};

function LanguageSwitcher() {
  const { lang, setLang, languages, t } = useI18n();
  return (
    <label dir={lang === "ar" ? "rtl" : "ltr"} className="flex items-center gap-1 text-medical-100">
      <Globe size={15} aria-hidden="true" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t("language")}
        className="bg-medical-900 text-medical-100 text-sm border border-medical-700 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-white"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} className="text-slate-900">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-medical-900 text-white sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" aria-label={t("appName")}>
          <Logo size={28} />
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link to="/recherche" className="text-medical-100 hover:text-white hidden sm:inline">
            {t("navSearch")}
          </Link>
          {isAuthenticated ? (
            <>
              {user?.role === "patient" && (
                <Link to="/mes-rendez-vous" className="text-medical-100 hover:text-white">
                  {t("navMyAppointments")}
                </Link>
              )}
              <Link to={ESPACE_PAR_ROLE[user?.role] || "/dashboard"} className="text-medical-100 hover:text-white">
                {user?.nom}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-medical-100 hover:text-white"
              >
                <LogOut size={15} /> {t("navLogout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-medical-100 hover:text-white">{t("navLogin")}</Link>
              <Link
                to="/register"
                className="bg-white text-medical-700 font-medium px-3 py-1.5 rounded-lg hover:bg-medical-50"
              >
                {t("navRegister")}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
