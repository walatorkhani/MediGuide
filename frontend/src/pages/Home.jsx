import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, MapPin, CalendarCheck, Star, ShieldCheck, Stethoscope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import { CATEGORIES } from "../constants/facilities";

const AVANTAGES = [
  {
    icon: MapPin,
    titre: "Trouvez près de chez vous",
    texte: "Recherchez par ville, spécialité ou géolocalisation \"Autour de moi\" pour voir les résultats les plus proches en premier.",
  },
  {
    icon: CalendarCheck,
    titre: "Prenez rendez-vous en ligne",
    texte: "Choisissez un créneau disponible et recevez une confirmation par e-mail, sans avoir à téléphoner.",
  },
  {
    icon: Star,
    titre: "Consultez les avis",
    texte: "Chaque fiche affiche la note moyenne et les avis laissés par d'autres patients après leur consultation.",
  },
  {
    icon: ShieldCheck,
    titre: "Professionnels vérifiés",
    texte: "Les fiches des professionnels de santé sont validées par un administrateur avant publication.",
  },
];

const ETAPES = [
  { n: "1", titre: "Recherchez", texte: "Choisissez une catégorie et filtrez par ville, spécialité ou distance." },
  { n: "2", titre: "Comparez", texte: "Consultez les fiches détaillées, horaires, avis et note moyenne." },
  { n: "3", titre: "Réservez", texte: "Prenez rendez-vous en ligne et recevez une confirmation par e-mail." },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goToCategory = (value) => {
    navigate(value ? `/recherche?category=${value}` : "/recherche");
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-medical-900 via-medical-700 to-medical-500 text-white">
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-20 sm:pt-20 sm:pb-28 text-center">
          <div className="flex justify-center mb-6">
            <Logo size={56} withWordmark={false} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Médi<span className="text-medical-200">Guide</span>
          </h1>
          <p className="mt-4 text-medical-100 text-base sm:text-lg max-w-2xl mx-auto">
            Trouvez un médecin, une pharmacie ou une parapharmacie près de chez vous
            à Jendouba, consultez les avis et prenez rendez-vous en ligne.
          </p>

          <button
            type="button"
            onClick={() => goToCategory("")}
            className="mt-8 inline-flex items-center gap-2 bg-white text-medical-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:bg-medical-50 transition"
          >
            <SearchIcon size={18} />
            Rechercher un professionnel de santé
          </button>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => goToCategory(c.value)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium transition"
              >
                <span aria-hidden="true">{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        <svg
          className="absolute bottom-0 left-0 w-full text-white"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,32 C360,64 1080,0 1440,32 L1440,60 L0,60 Z" />
        </svg>
      </section>

      {/* Avantages */}
      <section className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Pourquoi MédiGuide ?</h2>
          <p className="mt-2 text-slate-500 max-w-xl mx-auto">
            Une plateforme unique pour centraliser l'information santé du gouvernorat de Jendouba.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {AVANTAGES.map(({ icon: Icon, titre, texte }) => (
            <div key={titre} className="rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-medical-50 text-medical-600 flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-slate-900">{titre}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">
            Comment ça marche ?
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {ETAPES.map((e) => (
              <div key={e.n} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-medical-600 text-white font-bold flex items-center justify-center">
                  {e.n}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{e.titre}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{e.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA professionnels */}
      {!isAuthenticated && (
        <section className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
          <div className="rounded-3xl bg-medical-900 text-white px-6 py-10 sm:px-14 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                <Stethoscope size={24} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold">Vous êtes un professionnel de santé ?</h3>
                <p className="text-medical-100 text-sm mt-1">
                  Créez votre fiche, gérez vos disponibilités et vos rendez-vous en ligne.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="bg-white text-medical-700 font-semibold px-6 py-3 rounded-xl hover:bg-medical-50 transition shrink-0"
            >
              Créer un compte professionnel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
