import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Filter, Search } from "lucide-react";
import { adminGetFacilities, adminValidateFacility } from "../services/api";

const labels = { medecin: "Médecin", pharmacie: "Pharmacie", parapharmacie: "Parapharmacie" };

export default function AdminFacilities() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("false");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await adminGetFacilities({ q: q || undefined, category: category || undefined, estVerifie: status || undefined });
      setRows(data.facilities || []);
    } catch (e) { setError(e.response?.data?.message || "Impossible de charger les fiches."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [category, status]);
  const validate = async (row) => { await adminValidateFacility(row.id, !row.estVerifie); load(); };

  return <div className="card-pro">
    <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-5">
      <div className="flex-1"><label className="text-xs text-slate-500">Recherche</label><div className="relative mt-1"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} placeholder="Nom de médecin, pharmacie..." className="input-pro pl-9"/></div></div>
      <div><label className="text-xs text-slate-500">Catégorie</label><select value={category} onChange={e => setCategory(e.target.value)} className="input-pro mt-1"><option value="">Toutes</option><option value="medecin">Médecins</option><option value="pharmacie">Pharmacies</option><option value="parapharmacie">Parapharmacies</option></select></div>
      <div><label className="text-xs text-slate-500">Validation</label><select value={status} onChange={e => setStatus(e.target.value)} className="input-pro mt-1"><option value="false">À valider</option><option value="true">Validées</option><option value="">Toutes</option></select></div>
      <button onClick={load} className="btn-outline flex items-center gap-2"><Filter size={16}/>Actualiser</button>
    </div>
    {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
    {loading ? <p className="text-sm text-slate-400">Chargement...</p> : rows.length ? <div className="space-y-2">{rows.map(r => <div key={r.id} className="border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-medical-50 text-medical-700 flex items-center justify-center"><Building2 size={18}/></div><div><p className="font-semibold text-slate-900">{r.nom}</p><p className="text-sm text-slate-500">{labels[r.category]}{r.specialite ? ` · ${r.specialite}` : ""}{r.delegation ? ` · ${r.delegation}` : ""}</p><p className="text-xs text-slate-400 mt-1">{r.adresse || "Adresse non renseignée"} · {r.telephone || "Téléphone non renseigné"}</p></div></div><button onClick={() => validate(r)} className={`px-3 py-2 rounded-lg text-sm font-medium ${r.estVerifie ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700"}`}>{r.estVerifie ? "Retirer validation" : "✓ Valider la fiche"}</button></div>)}</div> : <p className="text-sm text-slate-400">Aucune fiche dans ce filtre.</p>}
  </div>;
}
