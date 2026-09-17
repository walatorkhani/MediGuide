import { Link } from "react-router-dom";
import { MapPin, Phone, Clock, Star, ChevronRight, Locate } from "lucide-react";
import { CATEGORY_STYLES, formatDistance } from "../constants/facilities";

export default function FacilityCard({ facility, onLocate }) {
  const style = CATEGORY_STYLES[facility.category];
  const distance = formatDistance(facility.distanceM);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-medical-200 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-11 h-11 rounded-lg bg-medical-50 flex items-center justify-center text-xl">
            {style.icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{facility.nom}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                {facility.specialite || style.label}
              </span>
              {facility.category === "medecin" && facility.secteur && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Secteur {facility.secteur}
                </span>
              )}
              {facility.category === "pharmacie" && facility.typeGarde && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Garde {facility.typeGarde}
                </span>
              )}
            </div>
          </div>
        </div>

        {distance && (
          <span className="shrink-0 text-xs font-semibold text-medical-600 bg-medical-50 px-2 py-1 rounded-full">
            {distance}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
        {facility.adresse && (
          <p className="flex items-start gap-2">
            <MapPin size={15} className="shrink-0 mt-0.5 text-slate-400" />
            <span className="truncate">{facility.adresse}</span>
          </p>
        )}
        {facility.telephone && (
          <p className="flex items-center gap-2">
            <Phone size={15} className="shrink-0 text-slate-400" />
            {facility.telephone}
          </p>
        )}
        {facility.horaires && (
          <p className="flex items-center gap-2">
            <Clock size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">{facility.horaires}</span>
          </p>
        )}
        {facility.noteAvis && (
          <p className="flex items-center gap-2">
            <Star size={15} className="shrink-0 text-amber-400 fill-amber-400" />
            {facility.noteAvis.toFixed(1)} / 5
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          to={`/etablissement/${facility.id}`}
          className="flex-1 flex items-center justify-center gap-1 text-sm font-medium text-white bg-medical-600 hover:bg-medical-700 rounded-lg px-3 py-2 transition-colors"
        >
          Voir les détails
          <ChevronRight size={16} />
        </Link>
        {onLocate && (
          <button
            onClick={() => onLocate(facility)}
            title="Voir sur la carte"
            className="flex items-center justify-center text-medical-600 border border-medical-200 hover:bg-medical-50 rounded-lg p-2 transition-colors"
          >
            <Locate size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
