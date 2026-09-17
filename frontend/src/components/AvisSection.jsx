import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { getAvis, creerAvis, supprimerAvis } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";

function Etoiles({ note, taille = 15 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={taille} className={n <= note ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
      ))}
    </div>
  );
}

// Sélecteur d'étoiles interactif pour le formulaire d'avis.
function SelecteurEtoiles({ valeur, onChange }) {
  const { t } = useI18n();
  const [survol, setSurvol] = useState(0);
  return (
    <div className="flex gap-1" aria-label={t("avisStarsLabel")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setSurvol(n)}
          onMouseLeave={() => setSurvol(0)}
          className="p-0.5"
          aria-pressed={valeur === n}
          aria-label={`${n} ${n > 1 ? t("avisStarsLabelPlural") : t("avisStarLabel")}`}
        >
          <Star size={24} className={n <= (survol || valeur) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
        </button>
      ))}
    </div>
  );
}

// Section avis d'une fiche établissement : moyenne dynamique, formulaire,
// liste paginée. `facilityId` requis ; affichée sous la fiche.
export default function AvisSection({ facilityId }) {
  const { t } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["avis", facilityId, page],
    queryFn: () => getAvis(facilityId, page).then((res) => res.data),
    placeholderData: (prev) => prev,
  });

  const publication = useMutation({
    mutationFn: () => creerAvis(facilityId, note, commentaire),
    onSuccess: () => {
      setNote(0);
      setCommentaire("");
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["avis", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["facility", String(facilityId)] });
    },
  });

  const suppression = useMutation({
    mutationFn: (id) => supprimerAvis(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avis", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["facility", String(facilityId)] });
    },
  });

  const avis = data?.avis || [];
  const dejaPublie = isAuthenticated && avis.some((a) => a.patientId === user?.id);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-900">{t("avisTitle")}</h2>
        {data?.moyenne != null && (
          <div className="flex items-center gap-2">
            <Etoiles note={Math.round(data.moyenne)} />
            <span className="text-sm font-semibold text-slate-700">{data.moyenne.toFixed(1)}/5</span>
            <span className="text-xs text-slate-400">({data.total})</span>
          </div>
        )}
      </div>

      {isAuthenticated && user?.role === "patient" && !dejaPublie && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (note > 0) publication.mutate();
          }}
          className="bg-slate-50 rounded-xl p-4 mb-5 space-y-3"
        >
          <SelecteurEtoiles valeur={note} onChange={setNote} />
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder={t("avisCommentPlaceholder")}
            rows={2}
            maxLength={1000}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-medical-500"
          />
          {publication.isError && (
            <p className="text-xs text-status-alert">
              {publication.error?.response?.data?.message || t("avisGenericError")}
            </p>
          )}
          <button
            type="submit"
            disabled={note === 0 || publication.isPending}
            className="bg-medical-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-medical-700 disabled:opacity-50"
          >
            {publication.isPending ? t("avisSubmitting") : t("avisSubmit")}
          </button>
        </form>
      )}

      {isLoading && <p className="text-sm text-slate-400">{t("avisLoadingReviews")}</p>}

      {!isLoading && avis.length === 0 && (
        <p className="text-sm text-slate-400">{t("avisNone")}</p>
      )}

      <div className="space-y-4">
        {avis.map((a) => (
          <div key={a.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Etoiles note={a.note} />
                <span className="text-sm font-medium text-slate-700">{a.patient?.nom}</span>
              </div>
              {user?.id === a.patientId && (
                <button
                  onClick={() => suppression.mutate(a.id)}
                  disabled={suppression.isPending}
                  className="text-slate-300 hover:text-status-alert"
                  title={t("avisDeleteTitle")}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {a.commentaire && <p className="text-sm text-slate-600 mt-1.5">{a.commentaire}</p>}
          </div>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
            className="text-medical-600 disabled:text-slate-300"
            aria-label={t("avisPrevPage")}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-slate-500">{t("avisPage")} {page} / {data.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, data.totalPages))}
            disabled={page >= data.totalPages}
            className="text-medical-600 disabled:text-slate-300"
            aria-label={t("avisNextPage")}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
