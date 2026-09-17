import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Phone, Clock, Star, ExternalLink, CalendarPlus } from "lucide-react";
import { getFacility, urlPhoto } from "../services/api";
import { CATEGORY_STYLES } from "../constants/facilities";
import MapView from "../components/MapView";
import BookingTunnel from "../components/BookingTunnel";
import AvisSection from "../components/AvisSection";
import { useAuth } from "../context/AuthContext";

export default function FacilityDetails() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [tunnelOuvert, setTunnelOuvert] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["facility", id],
    queryFn: () => getFacility(id).then((res) => res.data.facility),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Chargement...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <p className="text-status-alert">Établissement introuvable.</p>
        <Link to="/recherche" className="text-medical-600 underline text-sm">Retour à la recherche</Link>
      </div>
    );
  }

  const style = CATEGORY_STYLES[data.category];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-medical-50 border-b border-medical-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/recherche" className="inline-flex items-center gap-1.5 text-medical-700 text-sm hover:text-medical-900 font-medium">
            <ArrowLeft size={16} /> Retour aux résultats
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-xl bg-medical-50 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
              {data.photoUrl ? (
                <img src={urlPhoto(data.photoUrl)} alt={data.nom} className="w-full h-full object-cover" />
              ) : (
                style.icon
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{data.nom}</h1>
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                {data.specialite || style.label}
              </span>
            </div>
          </div>

          {data.bio && <p className="mt-4 text-sm text-slate-600 leading-relaxed">{data.bio}</p>}

          <div className="mt-5 space-y-3 text-sm text-slate-700">
            {data.adresse && (
              <p className="flex items-start gap-2.5">
                <MapPin size={17} className="text-medical-500 shrink-0 mt-0.5" />
                <span>{data.adresse}{data.delegation ? `, ${data.delegation}` : ""}</span>
              </p>
            )}
            {data.telephone && (
              <p className="flex items-center gap-2.5">
                <Phone size={17} className="text-medical-500 shrink-0" />
                <a href={`tel:${data.telephone}`} className="hover:text-medical-600">{data.telephone}</a>
              </p>
            )}
            {data.horaires && (
              <p className="flex items-center gap-2.5">
                <Clock size={17} className="text-medical-500 shrink-0" />
                {data.horaires}
              </p>
            )}
            {data.noteAvis && (
              <p className="flex items-center gap-2.5">
                <Star size={17} className="text-amber-400 fill-amber-400 shrink-0" />
                {data.noteAvis.toFixed(1)} / 5
              </p>
            )}
            {data.secteur && (
              <p className="text-xs text-slate-400">Secteur : {data.secteur}</p>
            )}
            {data.typeGarde && (
              <p className="text-xs text-slate-400">Garde : {data.typeGarde}</p>
            )}
          </div>

          {data.googleMapsUrl && (
            <a
              href={data.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-medical-600 font-medium hover:underline"
            >
              Ouvrir dans Google Maps <ExternalLink size={14} />
            </a>
          )}

          {data.category === "medecin" && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-medical-600 text-white font-medium rounded-xl px-4 py-2.5 hover:bg-medical-700"
                >
                  <CalendarPlus size={17} /> Se connecter pour prendre RDV
                </Link>
              ) : user?.role === "patient" ? (
                <button
                  onClick={() => setTunnelOuvert(true)}
                  className="inline-flex items-center gap-2 bg-medical-600 text-white font-medium rounded-xl px-4 py-2.5 hover:bg-medical-700"
                >
                  <CalendarPlus size={17} /> Prendre rendez-vous
                </button>
              ) : (
                <p className="text-xs text-slate-400">Seuls les comptes patients peuvent prendre rendez-vous.</p>
              )}
            </div>
          )}
        </div>

        <div className="h-72 md:h-full">
          <MapView results={[data]} center={[data.latitude, data.longitude]} height="100%" />
        </div>

        <div className="md:col-span-2">
          <AvisSection facilityId={data.id} />
        </div>
      </main>

      {tunnelOuvert && <BookingTunnel facility={data} onClose={() => setTunnelOuvert(false)} />}
    </div>
  );
}
