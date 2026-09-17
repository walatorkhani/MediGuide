import { ChevronLeft, ChevronRight } from "lucide-react";

// Composant de pagination générique, piloté par le serveur (page/limit/total
// viennent de l'API — jamais calculés côté client à partir d'une liste
// complète). Utilisé par les listes paginées du dashboard professionnel.
export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages = [];
  const window = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - window && p <= page + window)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Résultats {start}–{end} sur {total}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 px-2 py-1.5 rounded-lg"
        >
          <ChevronLeft size={14} /> Précédent
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-slate-300">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={`min-w-[28px] h-7 text-xs font-medium rounded-lg ${
                  p === page ? "bg-medical-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 px-2 py-1.5 rounded-lg"
        >
          Suivant <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
