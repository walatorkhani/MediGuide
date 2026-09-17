import { useState } from "react";
import { Search, MapPin, Navigation, SlidersHorizontal } from "lucide-react";
import { CATEGORIES, SPECIALITES } from "../constants/facilities";

export default function SearchBar({ filters, onChange, onSearch, onSelectCategory, onNearMe, geoLoading }) {
  const [showFilters, setShowFilters] = useState(false);

  const set = (patch) => onChange({ ...filters, ...patch });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <p className="text-sm font-medium text-slate-500 mb-3">Que recherchez-vous ?</p>

      {/* Sélecteur de catégorie */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onSelectCategory(filters.category === cat.value ? "" : cat.value)}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
              filters.category === cat.value
                ? "bg-medical-600 text-white border-medical-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-medical-300"
            }`}
          >
            <span className="text-lg">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Champ de recherche principal */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-medical-400 focus-within:ring-2 focus-within:ring-medical-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Nom, cabinet, établissement..."
            aria-label="Nom, cabinet ou établissement"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            className="w-full outline-none text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-medical-400 focus-within:ring-2 focus-within:ring-medical-100">
          <MapPin size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Ville ou délégation (ex: Jendouba Sud)"
            aria-label="Ville ou délégation"
            value={filters.ville}
            onChange={(e) => set({ ville: e.target.value })}
            className="w-full outline-none text-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Filtres additionnels */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-medical-600 font-medium"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={15} />
          Filtres {showFilters ? "▲" : "▼"}
        </button>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3">
            {filters.category === "medecin" && (
              <div>
                <label htmlFor="filtre-specialite" className="text-xs font-medium text-slate-500 block mb-1">Spécialité</label>
                <select
                  id="filtre-specialite"
                  value={filters.specialite}
                  onChange={(e) => set({ specialite: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-medical-400 bg-white"
                >
                  <option value="">Toutes spécialités</option>
                  {SPECIALITES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {filters.category === "pharmacie" && (
              <div>
                <label htmlFor="filtre-garde" className="text-xs font-medium text-slate-500 block mb-1">Garde</label>
                <select
                  id="filtre-garde"
                  value={filters.typeGarde || ""}
                  onChange={(e) => set({ typeGarde: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-medical-400 bg-white"
                >
                  <option value="">Toutes les pharmacies</option>
                  <option value="Jour">De garde le jour</option>
                  <option value="Nuit">De garde la nuit</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="filtre-rayon" className="text-xs font-medium text-slate-500 block mb-1">
                Rayon de recherche : {(filters.radius / 1000).toFixed(0)} km
              </label>
              <input
                id="filtre-rayon"
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={filters.radius}
                onChange={(e) => set({ radius: Number(e.target.value) })}
                className="w-full accent-medical-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          className="flex-1 bg-medical-600 hover:bg-medical-700 text-white font-medium text-sm rounded-xl px-4 py-2.5 transition-colors"
        >
          Rechercher
        </button>
        <button
          type="button"
          onClick={onNearMe}
          disabled={geoLoading}
          className="flex items-center justify-center gap-2 border border-medical-200 text-medical-700 hover:bg-medical-50 font-medium text-sm rounded-xl px-4 py-2.5 transition-colors disabled:opacity-60"
        >
          <Navigation size={16} />
          {geoLoading ? "Localisation..." : "📍 Autour de moi"}
        </button>
      </div>
    </form>
  );
}
