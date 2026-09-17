import { useEffect, useState } from "react";
import { adminGetAvis, adminModerateAvis } from "../services/api";

export default function AdminAvis() {
  const [avis, setAvis] = useState([]);
  const load = async () => setAvis((await adminGetAvis("tous")).data.avis);
  useEffect(() => { load(); }, []);
  const moderate = async (id, statut) => { await adminModerateAvis(id, statut); load(); };

  return <section className="space-y-3">
    {avis.map(a => <article key={a.id} className="bg-white border rounded-xl p-4">
      <div className="flex justify-between gap-3">
        <div><b>{a.facility?.nom}</b><p className="text-sm text-slate-500">{a.patient?.nom} · {"★".repeat(a.note)}</p></div>
        <span className="text-xs px-2 py-1 rounded bg-slate-100">{a.statut}</span>
      </div>
      <p className="my-3 text-slate-700">{a.commentaire || "Sans commentaire"}</p>
      <div className="flex gap-2">
        <button onClick={() => moderate(a.id, "approuve")} className="px-3 py-2 rounded-lg bg-green-100 text-green-700">Approuver</button>
        <button onClick={() => moderate(a.id, "rejete")} className="px-3 py-2 rounded-lg bg-red-100 text-red-700">Rejeter</button>
        <button onClick={() => moderate(a.id, "en_attente")} className="px-3 py-2 rounded-lg bg-amber-100 text-amber-700">En attente</button>
      </div>
    </article>)}
    {!avis.length && <p className="text-slate-500">Aucun avis.</p>}
  </section>;
}
