import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Calendar, Clock, CheckCircle2, ChevronLeft } from "lucide-react";
import { getDisponibilites, reserverCreneau } from "../services/api";
import { useI18n } from "../i18n/I18nContext";

// Génère les 14 prochains jours (aujourd'hui inclus) pour l'étape 1.
function prochainsJours(n = 14) {
  const jours = [];
  const aujourdHui = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(aujourdHui);
    d.setDate(d.getDate() + i);
    jours.push(d);
  }
  return jours;
}

function formatJour(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

// Tunnel de prise de rendez-vous en 3 étapes : date -> créneau -> confirmation.
// `facility` = fiche médecin ; `onClose` ferme la modale.
export default function BookingTunnel({ facility, onClose }) {
  const { t } = useI18n();
  const [etape, setEtape] = useState(1);
  const [date, setDate] = useState(null);
  const [creneau, setCreneau] = useState(null);
  const queryClient = useQueryClient();

  const jours = useMemo(() => prochainsJours(), []);

  const { data: disponibilites = [], isLoading } = useQuery({
    queryKey: ["disponibilites", facility.id, date],
    queryFn: () => getDisponibilites(facility.id, date).then((res) => res.data.disponibilites),
    enabled: !!date && etape === 2,
  });

  const reservation = useMutation({
    mutationFn: () => reserverCreneau(creneau.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disponibilites", facility.id, date] });
      queryClient.invalidateQueries({ queryKey: ["mesRendezVous"] });
      setEtape(4);
    },
  });

  const etapes = [t("btStepDate"), t("btStepSlot"), t("btStepConfirm")];

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="booking-tunnel-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900" id="booking-tunnel-title">{t("btTitle")}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label={t("btClose")}>
            <X size={20} />
          </button>
        </div>

        {etape <= 3 && (
          <div className="flex items-center gap-2 px-4 pt-4 text-xs text-slate-400">
            {etapes.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-medium ${
                    etape >= i + 1 ? "bg-medical-600 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={etape >= i + 1 ? "text-slate-700" : ""}>{label}</span>
                {i < etapes.length - 1 && <span className="flex-1 h-px bg-slate-100" />}
              </div>
            ))}
          </div>
        )}

        <div className="p-4">
          <p className="text-sm text-slate-500 mb-3">
            {facility.nom} {facility.specialite ? `· ${facility.specialite}` : ""}
          </p>

          {/* ===== Étape 1 : date ===== */}
          {etape === 1 && (
            <div className="grid grid-cols-3 gap-2">
              {jours.map((j) => {
                const iso = toISODate(j);
                return (
                  <button
                    key={iso}
                    onClick={() => {
                      setDate(iso);
                      setCreneau(null);
                      setEtape(2);
                    }}
                    className="border border-slate-200 rounded-xl py-2.5 text-xs font-medium text-slate-700 hover:border-medical-500 hover:bg-medical-50 capitalize"
                  >
                    <Calendar size={14} className="mx-auto mb-1 text-medical-500" />
                    {formatJour(j)}
                  </button>
                );
              })}
            </div>
          )}

          {/* ===== Étape 2 : créneau ===== */}
          {etape === 2 && (
            <div>
              <button
                onClick={() => setEtape(1)}
                className="flex items-center gap-1 text-xs text-medical-600 mb-3 hover:underline"
              >
                <ChevronLeft size={14} /> {t("btChangeDate")}
              </button>

              {isLoading && <p className="text-sm text-slate-400">{t("btLoadingSlots")}</p>}

              {!isLoading && disponibilites.length === 0 && (
                <p className="text-sm text-slate-400">{t("btNoSlots")}</p>
              )}

              <div className="grid grid-cols-3 gap-2">
                {disponibilites.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setCreneau(d);
                      setEtape(3);
                    }}
                    className="border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-700 hover:border-medical-500 hover:bg-medical-50"
                  >
                    <Clock size={13} className="inline mr-1 text-medical-500" />
                    {d.heureDebut}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== Étape 3 : confirmation ===== */}
          {etape === 3 && creneau && (
            <div>
              <button
                onClick={() => setEtape(2)}
                className="flex items-center gap-1 text-xs text-medical-600 mb-3 hover:underline"
              >
                <ChevronLeft size={14} /> {t("btChangeSlot")}
              </button>

              <div className="bg-medical-50 rounded-xl p-4 text-sm text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">{facility.nom}</p>
                <p className="capitalize">{new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
                <p>{t("btFrom")} {creneau.heureDebut} {t("btTo")} {creneau.heureFin}</p>
              </div>

              {reservation.isError && (
                <p className="mt-3 text-sm text-status-alert">
                  {reservation.error?.response?.data?.message || t("btSlotUnavailable")}
                </p>
              )}

              <button
                onClick={() => reservation.mutate()}
                disabled={reservation.isPending}
                className="mt-4 w-full bg-medical-600 text-white font-medium rounded-xl py-2.5 hover:bg-medical-700 disabled:opacity-60"
              >
                {reservation.isPending ? t("btConfirming") : t("btConfirm")}
              </button>
            </div>
          )}

          {/* ===== Étape 4 : succès ===== */}
          {etape === 4 && (
            <div className="text-center py-4">
              <CheckCircle2 size={40} className="mx-auto text-status-positive mb-3" />
              <p className="font-semibold text-slate-900">{t("btSuccessTitle")}</p>
              <p className="text-sm text-slate-500 mt-1">
                {t("btSuccessText")}
              </p>
              <button
                onClick={onClose}
                className="mt-4 w-full bg-medical-600 text-white font-medium rounded-xl py-2.5 hover:bg-medical-700"
              >
                {t("btClose")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
