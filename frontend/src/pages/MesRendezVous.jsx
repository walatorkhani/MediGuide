import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, MapPin, XCircle } from "lucide-react";
import { getMesRendezVous, annulerRendezVous } from "../services/api";
import { useI18n } from "../i18n/I18nContext";

function formatDateLongue(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function MesRendezVous() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: rendezVous = [], isLoading } = useQuery({
    queryKey: ["mesRendezVous"],
    queryFn: () => getMesRendezVous().then((res) => res.data.rendezVous),
  });

  const annulation = useMutation({
    mutationFn: (id) => annulerRendezVous(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mesRendezVous"] }),
  });

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const avenir = rendezVous.filter((r) => r.disponibilite?.date >= aujourdHui && r.statut === "confirme");
  const passesOuAnnules = rendezVous.filter((r) => !(r.disponibilite?.date >= aujourdHui && r.statut === "confirme"));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">{t("mrvTitle")}</h1>
        <p className="text-sm text-slate-500 mb-6">{t("mrvSubtitle")}</p>

        {isLoading && <p className="text-sm text-slate-400">{t("mrvLoading")}</p>}

        {!isLoading && rendezVous.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500 text-sm mb-3">{t("mrvEmpty")}</p>
            <Link to="/recherche" className="text-medical-600 font-medium hover:underline text-sm">
              {t("mrvFindDoctor")}
            </Link>
          </div>
        )}

        {avenir.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">{t("mrvUpcoming")}</h2>
            <div className="space-y-3 mb-8">
              {avenir.map((r) => (
                <CarteRendezVous key={r.id} rdv={r} onAnnuler={() => annulation.mutate(r.id)} annulationEnCours={annulation.isPending} />
              ))}
            </div>
          </>
        )}

        {passesOuAnnules.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">{t("mrvPastCancelled")}</h2>
            <div className="space-y-3">
              {passesOuAnnules.map((r) => (
                <CarteRendezVous key={r.id} rdv={r} passe />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CarteRendezVous({ rdv, onAnnuler, annulationEnCours, passe }) {
  const { t } = useI18n();
  const dispo = rdv.disponibilite;
  const facility = dispo?.facility;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3 ${passe ? "opacity-60" : ""}`}>
      <div className="text-sm text-slate-700 space-y-1.5">
        <p className="font-semibold text-slate-900">{facility?.nom}</p>
        {facility?.specialite && <p className="text-xs text-medical-600">{facility.specialite}</p>}
        {dispo && (
          <p className="flex items-center gap-1.5 text-slate-500">
            <CalendarDays size={14} className="text-medical-500" />
            <span className="capitalize">{formatDateLongue(dispo.date)}</span>
          </p>
        )}
        {dispo && (
          <p className="flex items-center gap-1.5 text-slate-500">
            <Clock size={14} className="text-medical-500" /> {dispo.heureDebut} - {dispo.heureFin}
          </p>
        )}
        {facility?.adresse && (
          <p className="flex items-center gap-1.5 text-slate-500">
            <MapPin size={14} className="text-medical-500" /> {facility.adresse}
          </p>
        )}
        <span
          className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            rdv.statut === "annule" ? "bg-status-alert/10 text-status-alert" : "bg-status-positive/10 text-status-positive"
          }`}
        >
          {rdv.statut === "annule" ? t("mrvCancelled") : t("mrvConfirmed")}
        </span>
      </div>

      {!passe && rdv.statut === "confirme" && (
        <button
          onClick={onAnnuler}
          disabled={annulationEnCours}
          className="flex items-center gap-1 text-xs text-status-alert font-medium hover:underline shrink-0 disabled:opacity-50"
        >
          <XCircle size={14} /> {t("mrvCancel")}
        </button>
      )}
    </div>
  );
}
