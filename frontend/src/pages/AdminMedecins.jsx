import { useEffect, useState } from "react";
import { adminGetMedecins, adminValidateMedecin, adminCreateMedecin, adminUpdateMedecin, adminDeleteMedecin } from "../services/api";

const CHAMPS_EDITABLES = [
  { cle: "nom", label: "Nom" },
  { cle: "specialite", label: "Spécialité" },
  { cle: "adresse", label: "Adresse" },
  { cle: "delegation", label: "Délégation" },
  { cle: "telephone", label: "Téléphone" },
  { cle: "latitude", label: "Latitude", type: "number" },
  { cle: "longitude", label: "Longitude", type: "number" },
];

export default function AdminMedecins() {
  const [medecins, setMedecins] = useState([]);
  const [q, setQ] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [validation, setValidation] = useState("tous");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nom: "", specialite: "", adresse: "", delegation: "", telephone: "", latitude: "", longitude: "" });
  const [editionId, setEditionId] = useState(null);
  const [editionForm, setEditionForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (specialite) params.specialite = specialite;
      if (validation !== "tous") params.estVerifie = validation === "valides";
      setMedecins((await adminGetMedecins(params)).data.medecins);
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement volontaire au montage uniquement
  useEffect(() => { load(); }, []);

  const toggle = async (m) => {
    await adminValidateMedecin(m.id, !m.estVerifie);
    load();
  };

  const creer = async (e) => {
    e.preventDefault();
    await adminCreateMedecin({ ...form, category: "medecin" });
    setForm({ nom: "", specialite: "", adresse: "", delegation: "", telephone: "", latitude: "", longitude: "" });
    load();
  };

  const supprimer = async (id) => {
    if (window.confirm("Supprimer définitivement cette fiche médecin ?")) {
      await adminDeleteMedecin(id);
      load();
    }
  };

  const commencerEdition = (m) => {
    setEditionId(m.id);
    setEditionForm({
      nom: m.nom || "",
      specialite: m.specialite || "",
      adresse: m.adresse || "",
      delegation: m.delegation || "",
      telephone: m.telephone || "",
      latitude: m.latitude ?? "",
      longitude: m.longitude ?? "",
    });
  };

  const annulerEdition = () => {
    setEditionId(null);
    setEditionForm({});
  };

  const enregistrerEdition = async (id) => {
    await adminUpdateMedecin(id, editionForm);
    setEditionId(null);
    load();
  };

  return <section className="space-y-4">
    <form onSubmit={creer} className="bg-white border rounded-xl p-4 grid md:grid-cols-4 gap-2">
      <input required placeholder="Nom" value={form.nom} onChange={e => setForm({...form, nom:e.target.value})} className="border rounded px-3 py-2" />
      <input placeholder="Spécialité" value={form.specialite} onChange={e => setForm({...form, specialite:e.target.value})} className="border rounded px-3 py-2" />
      <input placeholder="Adresse" value={form.adresse} onChange={e => setForm({...form, adresse:e.target.value})} className="border rounded px-3 py-2" />
      <input placeholder="Délégation" value={form.delegation} onChange={e => setForm({...form, delegation:e.target.value})} className="border rounded px-3 py-2" />
      <input placeholder="Téléphone" value={form.telephone} onChange={e => setForm({...form, telephone:e.target.value})} className="border rounded px-3 py-2" />
      <input required type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={e => setForm({...form, latitude:e.target.value})} className="border rounded px-3 py-2" />
      <input required type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={e => setForm({...form, longitude:e.target.value})} className="border rounded px-3 py-2" />
      <button className="bg-medical-600 text-white rounded px-3 py-2">Ajouter un médecin</button>
    </form>
    <div className="flex flex-wrap gap-2">
      <input className="border rounded-lg px-3 py-2 flex-1 min-w-[180px]" placeholder="Nom ou spécialité" value={q} onChange={e => setQ(e.target.value)} />
      <input className="border rounded-lg px-3 py-2 min-w-[160px]" placeholder="Filtrer par spécialité" value={specialite} onChange={e => setSpecialite(e.target.value)} />
      <select className="border rounded-lg px-3 py-2" value={validation} onChange={e => setValidation(e.target.value)}>
        <option value="tous">Tous</option>
        <option value="valides">Validés</option>
        <option value="non_valides">Non validés</option>
      </select>
      <button className="px-4 py-2 rounded-lg bg-medical-600 text-white" onClick={load}>Filtrer</button>
    </div>
    {loading ? <p>Chargement...</p> : <div className="space-y-2">
      {medecins.map(m => <div key={m.id} className="bg-white border rounded-xl p-4">
        {editionId === m.id ? (
          <div className="space-y-2">
            <div className="grid md:grid-cols-4 gap-2">
              {CHAMPS_EDITABLES.map(({ cle, label, type }) => (
                <input
                  key={cle}
                  type={type || "text"}
                  step={type === "number" ? "any" : undefined}
                  placeholder={label}
                  value={editionForm[cle] ?? ""}
                  onChange={e => setEditionForm({ ...editionForm, [cle]: e.target.value })}
                  className="border rounded px-3 py-2"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => enregistrerEdition(m.id)} className="px-3 py-2 rounded-lg text-sm bg-medical-600 text-white">Enregistrer</button>
              <button onClick={annulerEdition} className="px-3 py-2 rounded-lg text-sm bg-slate-100 text-slate-700">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div><b>{m.nom}</b><p className="text-sm text-slate-500">{m.specialite || "Spécialité non renseignée"} · {m.adresse || "Adresse non renseignée"}</p></div>
            <div className="flex gap-2">
              <button onClick={() => toggle(m)} className={`px-3 py-2 rounded-lg text-sm ${m.estVerifie ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {m.estVerifie ? "✓ Validé" : "Valider"}
              </button>
              <button onClick={() => commencerEdition(m)} className="px-3 py-2 rounded-lg text-sm bg-blue-50 text-blue-700">Modifier</button>
              <button onClick={() => supprimer(m.id)} className="px-3 py-2 rounded-lg text-sm bg-red-50 text-red-700">Supprimer</button>
            </div>
          </div>
        )}
      </div>)}
      {!medecins.length && <p className="text-slate-500">Aucun médecin trouvé.</p>}
    </div>}
  </section>;
}
