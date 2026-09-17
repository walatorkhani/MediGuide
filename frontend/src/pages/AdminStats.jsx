import { useEffect, useState } from "react";
import { adminGetStats } from "../services/api";

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => { adminGetStats().then(r => setStats(r.data.stats)); }, []);
  if (!stats) return <p>Chargement des statistiques...</p>;
  const cards = [
    ["Utilisateurs", stats.users], ["Médecins", stats.medecins], ["Médecins validés", stats.medecinsValides],
    ["Pharmacies", stats.pharmacies], ["Parapharmacies", stats.parapharmacies],
    ["Avis", stats.avis], ["Avis en attente", stats.avisEnAttente],
  ];
  return <section className="grid grid-cols-2 md:grid-cols-4 gap-4">{cards.map(([label, value]) =>
    <div key={label} className="bg-white border rounded-xl p-5"><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{value}</strong></div>
  )}</section>;
}
