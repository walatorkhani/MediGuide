import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, Bell, CalendarClock, Check, ChevronLeft, ChevronRight, ClipboardList,
  Clock3, FileText, Filter, LayoutDashboard, LogOut, Package, Pencil, Plus,
  RefreshCw, Search, Settings2, ShoppingBag, SlidersHorizontal, Stethoscope,
  Trash2, User as UserIcon, Users, X, AlertTriangle, BarChart3, Store, Tags,
  Megaphone, MapPin, Phone, Mail, Save, Eye, EyeOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getMesFacilities, revendiquerFacility, creerMaFacility, searchFacilities, getMesDisponibilites,
  creerDisponibilites, supprimerDisponibilite, getRendezVousAujourdhui,
  getRendezVousProfessionnel, mettreAJourProfilFacility, urlPhoto,
  getProfessionnelStats, getProfessionnelPatients, getProfessionnelProducts,
  createProfessionnelProduct, updateProfessionnelProduct, deleteProfessionnelProduct,
  getProfessionnelDemands, updateProfessionnelDemand, getProfessionnelConsultations,
  createProfessionnelConsultation, getProfessionnelNotifications,
  markProfessionnelNotificationRead, updateRendezVousProfessionnel
} from "../services/api";
import Pagination from "../components/Pagination";

const CATEGORY_LABELS = { medecin: "Médecin", pharmacie: "Pharmacie", parapharmacie: "Parapharmacie" };

const MENUS = {
  medecin: [
    ["overview", "Vue générale", LayoutDashboard],
    ["appointments", "Mes rendez-vous", CalendarClock],
    ["patients", "Mes patients", Users],
    ["consultations", "Consultations", FileText],
    ["availability", "Disponibilités", Clock3],
    ["stats", "Statistiques", BarChart3],
    ["notifications", "Notifications", Bell],
    ["profile", "Mon profil", UserIcon],
  ],
  pharmacie: [
    ["overview", "Vue générale", LayoutDashboard],
    ["products", "Médicaments / Produits", Package],
    ["demands", "Demandes", ClipboardList],
    ["horaires", "Horaires", Clock3],
    ["stats", "Statistiques", BarChart3],
    ["notifications", "Notifications", Bell],
    ["profile", "Mon profil", Store],
  ],
  parapharmacie: [
    ["overview", "Vue générale", LayoutDashboard],
    ["products", "Catalogue produits", ShoppingBag],
    ["categories", "Catégories", Tags],
    ["demands", "Demandes / commandes", ClipboardList],
    ["promotions", "Promotions", Megaphone],
    ["horaires", "Horaires", Clock3],
    ["stats", "Statistiques", BarChart3],
    ["notifications", "Notifications", Bell],
    ["profile", "Mon profil", Store],
  ],
};

export default function ProfessionnelSpace() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: facilities = [], isLoading: loadingFacilities } = useQuery({
    queryKey: ["mesFacilities"],
    queryFn: () => getMesFacilities().then(r => r.data.facilities),
  });
  const facility = facilities[0];
  const category = facility?.category || user?.categorieProfessionnelle || "medecin";
  const [section, setSection] = useState("overview");

  if (loadingFacilities) return <DashboardShell title="Espace professionnel"><Loading /></DashboardShell>;
  if (!facility) return <DashboardShell title="Espace professionnel" subtitle={`${CATEGORY_LABELS[category]} · ${user?.email || ""}`}><ClaimFacility category={category} /></DashboardShell>;

  const menus = MENUS[category] || MENUS.medecin;
  const current = menus.find(m => m[0] === section) || menus[0];

  const logoutAndGo = () => { logout(); navigate("/login"); };

  return (
    <DashboardShell
      title="Espace professionnel"
      subtitle={`${facility.nom} · ${CATEGORY_LABELS[category]} · ${user?.email || ""}`}
      onLogout={logoutAndGo}
    >
      <div className="flex flex-col lg:flex-row gap-5">
        <aside className="lg:w-60 shrink-0">
          <nav className="bg-white border border-slate-200 rounded-2xl p-2 lg:sticky lg:top-4 overflow-x-auto">
            <div className="flex lg:block gap-1 min-w-max">
              {menus.map(([id, label, Icon]) => (
                <button key={id} onClick={() => setSection(id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left ${section === id ? "bg-medical-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Icon size={17} /> <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mb-4">
            <p className="text-xs text-slate-400">Espace professionnel / {CATEGORY_LABELS[category]}</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{current[1]}</h1>
          </div>
          <SectionRenderer section={section} category={category} facility={facility} facilities={facilities} />
        </main>
      </div>
    </DashboardShell>
  );
}

function DashboardShell({ title, subtitle, onLogout, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-5">
        <header className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-medical-50 text-medical-700 flex items-center justify-center shrink-0"><Activity size={21} /></div>
            <div className="min-w-0"><p className="font-semibold text-slate-900">{title}</p><p className="text-xs text-slate-400 truncate">{subtitle}</p></div>
          </div>
          {onLogout && <button onClick={onLogout} className="text-sm text-slate-500 flex items-center gap-1.5 shrink-0"><LogOut size={16} /> Déconnexion</button>}
        </header>
        {children}
      </div>
    </div>
  );
}

function SectionRenderer({ section, category, facility, facilities }) {
  if (section === "overview") return <Overview category={category} facility={facility} />;
  if (section === "appointments") return <Appointments />;
  if (section === "patients") return <Patients />;
  if (section === "consultations") return <Consultations facility={facility} />;
  if (section === "availability") return <AvailabilityManager facility={facility} />;
  if (section === "horaires") return <Horaires facility={facility} />;
  if (section === "products") return <Products facility={facility} />;
  if (section === "categories") return <Categories facility={facility} />;
  if (section === "demands") return <Demands />;
  if (section === "promotions") return <Promotions facility={facility} />;
  if (section === "stats") return <Stats category={category} />;
  if (section === "notifications") return <Notifications />;
  if (section === "profile") return <Profile facility={facility} />;
  return null;
}

function Loading() { return <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">Chargement...</div>; }
function ErrorBox({ message, retry }) { return <div className="bg-white border border-red-100 rounded-2xl p-5 text-sm text-red-600 flex items-center justify-between gap-3"><span>{message}</span>{retry && <button onClick={retry} className="underline">Réessayer</button>}</div>; }
function Empty({ text }) { return <div className="py-10 text-center text-sm text-slate-400">{text}</div>; }
function Card({ children, className = "" }) { return <section className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>{children}</section>; }
function SectionTitle({ title, text, action }) { return <div className="flex items-start justify-between gap-3 mb-4"><div><h2 className="font-semibold text-slate-900">{title}</h2>{text && <p className="text-sm text-slate-500 mt-1">{text}</p>}</div>{action}</div>; }
function StatCard({ label, value, icon: Icon, tone = "blue" }) { return <div className="bg-white border border-slate-200 rounded-2xl p-4"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone === "red" ? "bg-red-50 text-red-600" : tone === "green" ? "bg-green-50 text-green-600" : "bg-medical-50 text-medical-700"}`}><Icon size={18} /></span></div><p className="text-2xl font-bold text-slate-900 mt-3">{value ?? 0}</p></div>; }

function Overview({ category, facility }) {
  const { data: statsData, isLoading: statsLoading } = useQuery({ queryKey: ["proStats"], queryFn: () => getProfessionnelStats().then(r => r.data.stats) });
  const { data: todayData, isLoading: todayLoading } = useQuery({ queryKey: ["rendezVousAujourdhui"], queryFn: () => getRendezVousAujourdhui().then(r => r.data), enabled: category === "medecin" });
  const stats = statsData || {};
  const appointments = todayData?.rendezVous || [];
  const isStore = category !== "medecin";

  return <div className="space-y-5">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {category === "medecin" ? <>
        <StatCard label="RDV aujourd'hui" value={stats.rendezVousAujourdhui} icon={CalendarClock} />
        <StatCard label="RDV à venir" value={stats.rendezVousAVenir} icon={Clock3} />
        <StatCard label="Patients" value={stats.patients} icon={Users} />
        <StatCard label="Consultations" value={stats.consultations} icon={FileText} />
      </> : <>
        <StatCard label="Produits référencés" value={stats.produits} icon={Package} />
        <StatCard label="Demandes en attente" value={stats.demandes} icon={ClipboardList} />
        <StatCard label="Produits disponibles" value={stats.disponibles} icon={Check} tone="green" />
      </>}
    </div>

    <div className="grid xl:grid-cols-3 gap-5">
      <Card className="xl:col-span-2">
        <SectionTitle
          title={isStore ? "Demandes de disponibilité" : "Rendez-vous du jour"}
          text={isStore ? "Répondez aux patients qui recherchent un produit." : "Les rendez-vous confirmés pour aujourd'hui."}
        />
        {category === "medecin"
          ? (todayLoading ? <Loading /> : appointments.length ? <div className="space-y-2">{appointments.slice(0, 6).map(r => <AppointmentRow key={r.id} rdv={r} compact />)}</div> : <Empty text="Aucun rendez-vous aujourd'hui." />)
          : <Demands />}
      </Card>
      <Card>
        <SectionTitle title="Fiche professionnelle" />
        <div className="space-y-3 text-sm text-slate-600">
          <Info icon={Store} text={facility.nom} />
          <Info icon={MapPin} text={facility.adresse || "Adresse non renseignée"} />
          <Info icon={Phone} text={facility.telephone || "Téléphone non renseigné"} />
          <Info icon={Clock3} text={facility.horaires || "Horaires non renseignés"} />
        </div>
      </Card>
    </div>
  </div>;
}

function Info({ icon: Icon, text }) { return <div className="flex items-start gap-2"><Icon size={16} className="text-medical-600 mt-0.5 shrink-0" /><span>{text}</span></div>; }

function Appointments() {
  const qc = useQueryClient(); const LIMIT = 10;
  const [page, setPage] = useState(1); const [search, setSearch] = useState(""); const [input, setInput] = useState(""); const [statut, setStatut] = useState(""); const [date, setDate] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["proAppointments", page, search, statut, date], queryFn: () => getRendezVousProfessionnel({ page, limit: LIMIT, search, statut, date, sortBy: "date", order: "ASC" }).then(r => r.data), placeholderData: p => p });
  const mutation = useMutation({ mutationFn: ({ id, statut }) => updateRendezVousProfessionnel(id, statut), onSuccess: () => { qc.invalidateQueries({ queryKey: ["proAppointments"] }); qc.invalidateQueries({ queryKey: ["proStats"] }); qc.invalidateQueries({ queryKey: ["rendezVousAujourdhui"] }); } });
  const rows = data?.data || []; const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0, limit: LIMIT };
  const apply = e => { e.preventDefault(); setPage(1); setSearch(input.trim()); };
  return <Card>
    <SectionTitle title="Mes rendez-vous" text={`${pagination.total} rendez-vous`} />
    <div className="grid md:grid-cols-[1fr_auto_auto] gap-2 mb-4">
      <form onSubmit={apply} className="flex gap-2"><div className="relative flex-1"><input value={input} onChange={e => setInput(e.target.value)} placeholder="Rechercher un patient" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />{input && <button type="button" onClick={() => { setInput(""); setSearch(""); setPage(1); }} className="absolute right-2 top-2.5 text-slate-400"><X size={15}/></button>}</div><button className="bg-medical-600 text-white rounded-xl px-4"><Search size={16}/></button></form>
      <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2 text-sm"><option value="">Tous les statuts</option><option value="confirme">Confirmé</option><option value="annule">Annulé</option><option value="refuse">Refusé</option></select>
      <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
    </div>
    {isLoading ? <Loading /> : isError ? <ErrorBox message="Impossible de charger les rendez-vous." retry={refetch} /> : rows.length ? <div className="space-y-2">{rows.map(r => <AppointmentRow key={r.id} rdv={r} action={mutation} />)}</div> : <Empty text="Aucun rendez-vous ne correspond aux filtres." />}
    <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage} />
  </Card>;
}

function AppointmentRow({ rdv, action, compact = false }) {
  const status = rdv.statut || "confirme";
  return (
    <div className="border border-slate-100 rounded-xl px-3 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-16 text-center shrink-0">
          <p className="text-xs font-semibold text-medical-700">
            {rdv.disponibilite?.date
              ? new Date(rdv.disponibilite.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
              : ""}
          </p>
          <p className="text-xs text-slate-500 flex justify-center items-center gap-1">
            <Clock3 size={11} />
            {rdv.disponibilite?.heureDebut || ""}
          </p>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm text-slate-800 truncate">{rdv.patient?.nom || "Patient"}</p>
          {!compact ? (
            <div>
              <p className="text-xs text-slate-400 truncate">{rdv.patient?.email}</p>
              {rdv.motif ? <p className="text-xs text-slate-400 mt-0.5">Motif {rdv.motif}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Status status={status} />
        {action && status === "confirme" ? (
          <div className="flex items-center gap-2">
            <button onClick={() => action.mutate({ id: rdv.id, statut: "confirme" })} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Accepter" aria-label="Accepter le rendez-vous"><Check size={16} /></button>
            <button onClick={() => action.mutate({ id: rdv.id, statut: "annule" })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Annuler" aria-label="Annuler le rendez-vous"><X size={16} /></button>
            <button onClick={() => action.mutate({ id: rdv.id, statut: "refuse" })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Refuser" aria-label="Refuser le rendez-vous"><EyeOff size={16} /></button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Status({ status }) { const map = { confirme: ["Confirmé", "bg-green-50 text-green-700"], annule: ["Annulé", "bg-slate-100 text-slate-500"], refuse: ["Refusé", "bg-red-50 text-red-600"], traitee: ["Disponible", "bg-green-50 text-green-700"], refusee: ["Indisponible", "bg-red-50 text-red-600"], en_attente: ["En attente", "bg-amber-50 text-amber-700"] }; const [label, cls] = map[status] || [status, "bg-slate-100 text-slate-500"]; return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls}`}>{label}</span>; }

function Patients() {
  const { data = [], isLoading } = useQuery({ queryKey: ["proPatients"], queryFn: () => getProfessionnelPatients().then(r => r.data.patients) });
  const [q, setQ] = useState("");
  const rows = data.filter(p => `${p.nom} ${p.email}`.toLowerCase().includes(q.toLowerCase()));
  if (isLoading) return <Loading />;
  return <Card><SectionTitle title="Mes patients" text={`${data.length} patient(s) ayant un rendez-vous`} /><div className="relative mb-4"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un patient" className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm"/></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-400 border-b"><th className="py-3">Patient</th><th>Rendez-vous</th><th>Dernier rendez-vous</th><th>Action</th></tr></thead><tbody>{rows.map(p => <tr key={p.id} className="border-b last:border-0"><td className="py-3"><p className="font-medium text-slate-800">{p.nom}</p><p className="text-xs text-slate-400">{p.email}</p></td><td>{p.rendezVous}</td><td>{p.dernierRendezVous ? new Date(p.dernierRendezVous).toLocaleDateString("fr-FR") : "-"}</td><td><span className="text-xs text-medical-700">Historique dans Consultations</span></td></tr>)}</tbody></table></div> : <Empty text="Aucun patient trouvé."/>}</Card>;
}

function Consultations({ facility }) {
  const qc = useQueryClient(); const { data = [], isLoading } = useQuery({ queryKey: ["proConsultations"], queryFn: () => getProfessionnelConsultations().then(r => r.data.consultations) });
  const { data: patients = [] } = useQuery({ queryKey: ["proPatients"], queryFn: () => getProfessionnelPatients().then(r => r.data.patients) });
  const [form, setForm] = useState({ patientId: "", diagnostic: "", notes: "", ordonnance: "" }); const [open, setOpen] = useState(false);
  const mutation = useMutation({ mutationFn: () => createProfessionnelConsultation({ facilityId: facility.id, patientId: Number(form.patientId), ...form }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["proConsultations"] }); qc.invalidateQueries({ queryKey: ["proStats"] }); setForm({ patientId: "", diagnostic: "", notes: "", ordonnance: "" }); setOpen(false); } });
  if (isLoading) return <Loading />;
  return <div className="space-y-5"><Card><SectionTitle title="Consultations" text="Créer et consulter les informations liées aux consultations." action={<button onClick={() => setOpen(v => !v)} className="bg-medical-600 text-white text-sm rounded-xl px-3 py-2 flex items-center gap-1.5"><Plus size={16}/> Nouvelle consultation</button>} />{open && <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="grid md:grid-cols-2 gap-3 border border-slate-100 rounded-xl p-4 mb-4"><select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} className="border rounded-xl px-3 py-2 text-sm"><option value="">Choisir un patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select><input placeholder="Diagnostic" value={form.diagnostic} onChange={e => setForm({...form, diagnostic:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"/><textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} className="border rounded-xl px-3 py-2 text-sm md:col-span-2" rows="3"/><textarea placeholder="Ordonnance" value={form.ordonnance} onChange={e => setForm({...form, ordonnance:e.target.value})} className="border rounded-xl px-3 py-2 text-sm md:col-span-2" rows="3"/><div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600">Annuler</button><button disabled={mutation.isPending} className="bg-medical-600 text-white rounded-xl px-4 py-2 text-sm">Enregistrer</button></div></form>}{data.length ? <div className="space-y-2">{data.map(c => <div key={c.id} className="border border-slate-100 rounded-xl p-4"><div className="flex justify-between gap-3"><div><p className="font-medium text-slate-800">{c.patient?.nom}</p><p className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</p></div>{c.rendezVous?.disponibilite && <span className="text-xs text-slate-400">RDV {new Date(c.rendezVous.disponibilite.date).toLocaleDateString("fr-FR")}</span>}</div><div className="grid md:grid-cols-3 gap-3 mt-3 text-sm"><Field label="Diagnostic" value={c.diagnostic}/><Field label="Notes" value={c.notes}/><Field label="Ordonnance" value={c.ordonnance}/></div></div>)}</div> : <Empty text="Aucune consultation enregistrée."/>}</Card></div>;
}
function Field({ label, value }) { return <div><p className="text-xs text-slate-400 mb-1">{label}</p><p className="text-slate-700 whitespace-pre-wrap">{value || "-"}</p></div>; }

function AvailabilityManager({ facility }) {
  const qc = useQueryClient(); const { data = [], isLoading } = useQuery({ queryKey: ["mesDisponibilites"], queryFn: () => getMesDisponibilites().then(r => r.data.disponibilites) });
  const [form, setForm] = useState({ date:"", heureDebut:"09:00", heureFin:"12:00", dureeCreneauMinutes:20 });
  const create = useMutation({ mutationFn: () => creerDisponibilites({ facilityId: facility.id, ...form }), onSuccess: () => { qc.invalidateQueries({ queryKey:["mesDisponibilites"] }); setForm(f => ({...f, date:""})); } });
  const remove = useMutation({ mutationFn: supprimerDisponibilite, onSuccess: () => qc.invalidateQueries({ queryKey:["mesDisponibilites"] }) });
  const grouped = data.reduce((a, d) => { (a[d.date] ||= []).push(d); return a; }, {});
  if (isLoading) return <Loading />;
  return <div className="space-y-5"><Card><SectionTitle title="Disponibilités" text="Définissez vos jours de travail puis générez les créneaux proposés aux patients."/><form onSubmit={e => {e.preventDefault(); create.mutate();}} className="grid sm:grid-cols-4 gap-3"><input required type="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"/><input required type="time" value={form.heureDebut} onChange={e=>setForm({...form,heureDebut:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"/><input required type="time" value={form.heureFin} onChange={e=>setForm({...form,heureFin:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"/><select value={form.dureeCreneauMinutes} onChange={e=>setForm({...form,dureeCreneauMinutes:Number(e.target.value)})} className="border rounded-xl px-3 py-2 text-sm">{[10,15,20,30,45,60].map(x=><option key={x} value={x}>{x} min</option>)}</select><button disabled={create.isPending} className="sm:col-span-4 bg-medical-600 text-white rounded-xl py-2.5 text-sm flex justify-center items-center gap-2"><Plus size={16}/>Générer les créneaux</button></form>{create.isError && <p className="text-sm text-red-600 mt-2">{create.error?.response?.data?.message || "Erreur"}</p>}{create.isSuccess && <p className="text-sm text-green-600 mt-2">Créneaux enregistrés.</p>}</Card><Card><SectionTitle title="Planning généré" />{Object.keys(grouped).length ? <div className="space-y-4">{Object.entries(grouped).map(([date, slots])=><div key={date}><p className="text-sm font-semibold text-slate-700 mb-2">{new Date(date).toLocaleDateString("fr-FR", {weekday:"long",day:"2-digit",month:"long"})}</p><div className="grid sm:grid-cols-3 gap-2">{slots.map(s=><div key={s.id} className={`border rounded-xl p-3 flex justify-between ${s.estReserve ? "border-medical-200 bg-medical-50" : "border-slate-100"}`}><div><p className="text-sm font-medium">{s.heureDebut} - {s.heureFin}</p><p className="text-xs text-slate-400">{s.estReserve ? `Réservé${s.rendezVous?.patient?.nom ? ` · ${s.rendezVous.patient.nom}` : ""}` : "Libre"}</p></div>{!s.estReserve && <button onClick={()=>remove.mutate(s.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15}/></button>}</div>)}</div></div>)}</div> : <Empty text="Aucun créneau généré."/>}</Card></div>;
}

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function parseHoraires(text) {
  const base = JOURS.map(jour => ({ jour, ferme: true, debut: "08:00", fin: "17:00" }));
  if (!text) return base;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  lines.forEach(line => {
    const jourMatch = JOURS.find(j => line.toLowerCase().startsWith(j.toLowerCase()));
    if (!jourMatch) return;
    const entry = base.find(d => d.jour === jourMatch);
    const range = line.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (range) { entry.ferme = false; entry.debut = range[1]; entry.fin = range[2]; }
    else entry.ferme = true;
  });
  return base;
}
function formatHoraires(days) {
  return days.map(d => d.ferme ? `${d.jour}: Fermé` : `${d.jour}: ${d.debut}-${d.fin}`).join("\n");
}

function Horaires({ facility }) {
  const qc = useQueryClient();
  const [days, setDays] = useState(() => parseHoraires(facility.horaires));
  const update = (i, patch) => setDays(ds => ds.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  const save = useMutation({
    mutationFn: () => mettreAJourProfilFacility(facility.id, { horaires: formatHoraires(days) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mesFacilities"] }),
  });
  return (
    <Card>
      <SectionTitle title="Horaires d'ouverture" text="Définissez vos jours et heures d'ouverture, visibles sur votre fiche." />
      <div className="space-y-2">
        {days.map((d, i) => (
          <div key={d.jour} className="flex flex-col sm:flex-row sm:items-center gap-2 border border-slate-100 rounded-xl p-3">
            <span className="w-28 shrink-0 font-medium text-sm text-slate-700">{d.jour}</span>
            <label className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
              <input type="checkbox" checked={!d.ferme} onChange={e => update(i, { ferme: !e.target.checked })} />
              Ouvert
            </label>
            {!d.ferme ? (
              <div className="flex items-center gap-2">
                <input type="time" value={d.debut} onChange={e => update(i, { debut: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-slate-400">à</span>
                <input type="time" value={d.fin} onChange={e => update(i, { fin: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
              </div>
            ) : <span className="text-xs text-slate-400">Fermé</span>}
          </div>
        ))}
      </div>
      {save.isSuccess && <p className="text-sm text-green-600 mt-3">Horaires mis à jour.</p>}
      {save.isError && <p className="text-sm text-red-600 mt-3">{save.error?.response?.data?.message || "Erreur lors de la mise à jour."}</p>}
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-4 bg-medical-600 text-white rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
        <Save size={16} />{save.isPending ? "Enregistrement..." : "Enregistrer les horaires"}
      </button>
    </Card>
  );
}

function Products({ facility }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["proProducts"],
    queryFn: () => getProfessionnelProducts().then(r => r.data.products)
  });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = { nom: "", categorie: "", description: "", prix: "", disponible: true };
  const [form, setForm] = useState(empty);

  const save = useMutation({
    mutationFn: () => editing
      ? updateProfessionnelProduct(editing.id, form)
      : createProfessionnelProduct({ facilityId: facility.id, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proProducts"] });
      qc.invalidateQueries({ queryKey: ["proStats"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
    }
  });
  const del = useMutation({
    mutationFn: deleteProfessionnelProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proProducts"] });
      qc.invalidateQueries({ queryKey: ["proStats"] });
    }
  });

  const rows = data.filter(p => `${p.nom} ${p.categorie || ""}`.toLowerCase().includes(q.toLowerCase()));
  const edit = p => {
    setEditing(p);
    setForm({
      nom: p.nom || "",
      categorie: p.categorie || "",
      description: p.description || "",
      prix: p.prix || "",
      disponible: p.disponible !== false
    });
    setOpen(true);
  };

  if (isLoading) return <Loading />;

  return (
    <Card>
      <SectionTitle
        title={facility.category === "pharmacie" ? "Médicaments / Produits" : "Catalogue produits"}
        text="Référencez les produits et indiquez uniquement s'ils sont disponibles. Aucun stock chiffré n'est demandé."
        action={
          <button
            onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}
            className="bg-medical-600 text-white rounded-xl px-3 py-2 text-sm flex items-center gap-1.5"
          >
            <Plus size={16} />Ajouter
          </button>
        }
      />

      {open && (
        <form
          onSubmit={e => { e.preventDefault(); save.mutate(); }}
          className="grid md:grid-cols-2 gap-3 border border-slate-100 rounded-xl p-4 mb-4"
        >
          <input required placeholder="Nom du produit" value={form.nom} onChange={e => setForm({...form, nom:e.target.value})} className="border rounded-xl px-3 py-2 text-sm" />
          <input placeholder="Catégorie" value={form.categorie} onChange={e => setForm({...form, categorie:e.target.value})} className="border rounded-xl px-3 py-2 text-sm" />
          <input type="number" min="0" step="0.01" placeholder="Prix (optionnel)" value={form.prix} onChange={e => setForm({...form, prix:e.target.value})} className="border rounded-xl px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm px-2">
            <input type="checkbox" checked={form.disponible} onChange={e => setForm({...form, disponible:e.target.checked})} />
            Produit actuellement disponible
          </label>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description:e.target.value})} className="border rounded-xl px-3 py-2 text-sm md:col-span-2" rows="3" />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm">Annuler</button>
            <button disabled={save.isPending} className="bg-medical-600 text-white rounded-xl px-4 py-2 text-sm flex gap-1.5 items-center">
              <Save size={15} />Enregistrer
            </button>
          </div>
          {save.isError && <p className="md:col-span-2 text-sm text-red-600">{save.error?.response?.data?.message || "Erreur lors de l'enregistrement."}</p>}
        </form>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un produit ou une catégorie" className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm" />
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400 border-b">
              <th className="py-3">Produit</th><th>Catégorie</th><th>Prix</th><th>Disponibilité</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 font-medium text-slate-800">{p.nom}</td>
                  <td>{p.categorie || "-"}</td>
                  <td>{p.prix != null ? `${p.prix} TND` : "-"}</td>
                  <td>
                    <button
                      onClick={() => updateProfessionnelProduct(p.id, { disponible: !p.disponible }).then(() => {
                        qc.invalidateQueries({ queryKey: ["proProducts"] });
                        qc.invalidateQueries({ queryKey: ["proStats"] });
                      })}
                      className={`text-xs px-2 py-1 rounded-full ${p.disponible ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {p.disponible ? "Disponible" : "Indisponible"}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => edit(p)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"><Pencil size={15} /></button>
                      <button onClick={() => del.mutate(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty text="Aucun produit trouvé." />}
    </Card>
  );
}

function Categories({ facility }) {
  const { data = [] } = useQuery({queryKey:["proProducts"],queryFn:()=>getProfessionnelProducts().then(r=>r.data.products)});
  const counts = useMemo(()=>data.reduce((a,p)=>{const c=p.categorie||"Sans catégorie";a[c]=(a[c]||0)+1;return a},{}),[data]);
  return <Card><SectionTitle title="Catégories" text="Les catégories sont liées au catalogue produits."/><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Object.entries(counts).map(([name,count])=><div key={name} className="border border-slate-100 rounded-xl p-4"><div className="w-9 h-9 rounded-xl bg-medical-50 text-medical-700 flex items-center justify-center mb-3"><Tags size={17}/></div><p className="font-medium text-slate-800">{name}</p><p className="text-sm text-slate-400 mt-1">{count} produit(s)</p></div>)}</div>{!Object.keys(counts).length&&<Empty text="Aucune catégorie. Ajoutez une catégorie depuis un produit."/>}</Card>;
}

function Demands() {
  const qc=useQueryClient(); const {data=[],isLoading}=useQuery({queryKey:["proDemands"],queryFn:()=>getProfessionnelDemands().then(r=>r.data.demands)}); const [status,setStatus]=useState("");
  const update=useMutation({mutationFn:({id,statut})=>updateProfessionnelDemand(id,statut),onSuccess:()=>{qc.invalidateQueries({queryKey:["proDemands"]});qc.invalidateQueries({queryKey:["proStats"]})}});
  const rows=data.filter(d=>!status||d.statut===status); if(isLoading)return <Loading/>;
  return <Card><SectionTitle title="Demandes de disponibilité" text={`${data.length} demande(s) de patients`}/><div className="flex gap-2 mb-4"><Filter size={16} className="text-slate-400 mt-2"/><select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 py-2 text-sm"><option value="">Toutes</option><option value="en_attente">En attente</option><option value="traitee">Disponible</option><option value="refusee">Indisponible</option></select></div>{rows.length?<div className="space-y-2">{rows.map(d=><div key={d.id} className="border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><p className="font-medium text-slate-800">{d.produitNom}</p><p className="text-xs text-slate-400">Patient : {d.patient?.nom||"Utilisateur"} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}</p>{d.message&&<p className="text-sm text-slate-600 mt-1">Message : {d.message}</p>}</div><div className="flex items-center gap-2 flex-wrap"><Status status={d.statut}/>{d.statut==="en_attente"&&<><button onClick={()=>update.mutate({id:d.id,statut:"traitee"})} className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs">Disponible</button><button onClick={()=>update.mutate({id:d.id,statut:"refusee"})} className="bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs">Indisponible</button></>}</div></div>)}</div>:<Empty text="Aucune demande de disponibilité."/>}</Card>;
}

function Promotions({ facility }) {
  const key=`mediguide_promotions_${facility.id}`; const [items,setItems]=useState(()=>{try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return[]}}); const [form,setForm]=useState({titre:"",produit:"",remise:""}); const [open,setOpen]=useState(false);
  const save=e=>{e.preventDefault();const next=[...items,{id:Date.now(),...form}];setItems(next);localStorage.setItem(key,JSON.stringify(next));setForm({titre:"",produit:"",remise:""});setOpen(false)};
  const remove=id=>{const next=items.filter(x=>x.id!==id);setItems(next);localStorage.setItem(key,JSON.stringify(next))};
  return <Card><SectionTitle title="Promotions" text="Gérez les promotions affichées dans votre espace professionnel." action={<button onClick={()=>setOpen(v=>!v)} className="bg-medical-600 text-white rounded-xl px-3 py-2 text-sm flex items-center gap-1.5"><Plus size={16}/>Ajouter</button>}/>{open&&<form onSubmit={save} className="grid md:grid-cols-3 gap-3 border border-slate-100 rounded-xl p-4 mb-4"><input required placeholder="Titre" value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"/><input required placeholder="Produit" value={form.produit} onChange={e=>setForm({...form,produit:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"/><input required placeholder="Remise, ex. 20%" value={form.remise} onChange={e=>setForm({...form,remise:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"/><div className="md:col-span-3 flex justify-end"><button className="bg-medical-600 text-white rounded-xl px-4 py-2 text-sm">Publier</button></div></form>}{items.length?<div className="space-y-2">{items.map(x=><div key={x.id} className="border border-slate-100 rounded-xl p-4 flex justify-between items-center"><div><p className="font-medium">{x.titre}</p><p className="text-sm text-slate-500">{x.produit} · {x.remise}</p></div><button onClick={()=>remove(x.id)} className="text-red-500 p-2"><Trash2 size={16}/></button></div>)}</div>:<Empty text="Aucune promotion enregistrée."/>}</Card>;
}

function Stats({ category }) {
  const {data:stats={},isLoading}=useQuery({queryKey:["proStats"],queryFn:()=>getProfessionnelStats().then(r=>r.data.stats)}); if(isLoading)return <Loading/>;
  return <div className="space-y-5"><div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{category==="medecin"?<><StatCard label="RDV aujourd'hui" value={stats.rendezVousAujourdhui} icon={CalendarClock}/><StatCard label="RDV à venir" value={stats.rendezVousAVenir} icon={Clock3}/><StatCard label="Patients" value={stats.patients} icon={Users}/><StatCard label="Taux d'annulation" value={`${stats.tauxAnnulation||0}%`} icon={AlertTriangle} tone="red"/></>:<><StatCard label="Produits référencés" value={stats.produits} icon={Package}/><StatCard label="Demandes" value={stats.demandes} icon={ClipboardList}/><StatCard label="Produits disponibles" value={stats.disponibles} icon={Check} tone="green"/></>}</div><Card><SectionTitle title="Évolution mensuelle" text="Nombre de rendez-vous confirmés sur les six derniers mois."/><div className="space-y-3">{(stats.evolution||[]).map(x=><div key={x.mois} className="flex items-center gap-3"><span className="w-20 text-xs text-slate-500">{x.mois}</span><div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-medical-600 rounded-full" style={{width:`${Math.min(100,(x.rendezVous||0)*10)}%`}}/></div><span className="w-10 text-right text-sm font-medium">{x.rendezVous||0}</span></div>)}</div></Card></div>;
}

function Notifications() {
  const qc=useQueryClient(); const {data=[],isLoading}=useQuery({queryKey:["proNotifications"],queryFn:()=>getProfessionnelNotifications().then(r=>r.data.notifications)}); const read=useMutation({mutationFn:markProfessionnelNotificationRead,onSuccess:()=>qc.invalidateQueries({queryKey:["proNotifications"]})}); if(isLoading)return <Loading/>;
  return <Card><SectionTitle title="Notifications" text="Nouveaux rendez-vous, annulations, demandes et alertes."/>{data.length?<div className="space-y-2">{data.map(n=><div key={n.id} className={`border rounded-xl p-4 flex gap-3 ${n.lu?"border-slate-100":"border-medical-200 bg-medical-50"}`}><Bell size={17} className="text-medical-600 mt-0.5 shrink-0"/><div className="flex-1"><p className="font-medium text-slate-800">{n.titre}</p><p className="text-sm text-slate-500 mt-1">{n.message}</p><p className="text-xs text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString("fr-FR")}</p></div>{!n.lu&&<button onClick={()=>read.mutate(n.id)} className="text-xs text-medical-700">Marquer comme lue</button>}</div>)}</div>:<Empty text="Aucune notification."/>}</Card>;
}

function Profile({ facility }) {
  const qc=useQueryClient(); const isMedecin=facility.category==="medecin"; const [bio,setBio]=useState(facility.bio||""); const [horaires,setHoraires]=useState(facility.horaires||""); const [photo,setPhoto]=useState(null); const [preview,setPreview]=useState(null); const [typeGarde,setTypeGarde]=useState(facility.typeGarde||""); const save=useMutation({mutationFn:()=>mettreAJourProfilFacility(facility.id,{bio,horaires:isMedecin?horaires:undefined,photo,typeGarde:facility.category==="pharmacie"?typeGarde:undefined}),onSuccess:()=>{qc.invalidateQueries({queryKey:["mesFacilities"]});setPhoto(null)}});
  return <Card><SectionTitle title="Mon profil" text="Les informations visibles sur votre fiche MédiGuide."/><form onSubmit={e=>{e.preventDefault();save.mutate()}} className="space-y-4"><div className="flex items-center gap-4"><div className="w-20 h-20 rounded-xl overflow-hidden bg-medical-50 flex items-center justify-center">{preview||facility.photoUrl?<img src={preview||urlPhoto(facility.photoUrl)} alt={`Photo de ${facility.nom}`} className="w-full h-full object-cover"/>:<Store size={28} className="text-medical-600"/>}</div><label className="text-sm text-medical-700 cursor-pointer">Changer la photo<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f){setPhoto(f);setPreview(URL.createObjectURL(f))}}}/></label></div><div className="grid md:grid-cols-2 gap-3"><div><label className="text-xs text-slate-500">Nom</label><div className="border rounded-xl px-3 py-2 text-sm bg-slate-50 mt-1">{facility.nom}</div></div><div><label className="text-xs text-slate-500">Spécialité / catégorie</label><div className="border rounded-xl px-3 py-2 text-sm bg-slate-50 mt-1">{facility.specialite||CATEGORY_LABELS[facility.category]}</div></div><div><label className="text-xs text-slate-500">Adresse</label><div className="border rounded-xl px-3 py-2 text-sm bg-slate-50 mt-1">{facility.adresse||"Non renseignée"}</div></div><div><label className="text-xs text-slate-500">Téléphone</label><div className="border rounded-xl px-3 py-2 text-sm bg-slate-50 mt-1">{facility.telephone||"Non renseigné"}</div></div></div><div><label className="text-xs text-slate-500">Bio / présentation</label><textarea rows="4" maxLength="2000" value={bio} onChange={e=>setBio(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"/></div>{isMedecin?<div><label className="text-xs text-slate-500">Horaires</label><textarea rows="3" value={horaires} onChange={e=>setHoraires(e.target.value)} placeholder="Lun-Ven 08:00-17:00\nSam 08:00-12:00" className="w-full border rounded-xl px-3 py-2 text-sm mt-1"/></div>:<p className="text-xs text-slate-400">Les horaires se gèrent désormais depuis le menu "Horaires".</p>}{facility.category==="pharmacie"&&<div><label className="text-xs text-slate-500">Garde</label><div className="flex gap-2 mt-1"><button type="button" onClick={()=>setTypeGarde("")} className={`px-3 py-2 rounded-xl border text-sm ${!typeGarde?"bg-medical-600 text-white":"border-slate-200"}`}>Pas de garde</button><button type="button" onClick={()=>setTypeGarde("Jour")} className={`px-3 py-2 rounded-xl border text-sm ${typeGarde==="Jour"?"bg-medical-600 text-white":"border-slate-200"}`}>Jour</button><button type="button" onClick={()=>setTypeGarde("Nuit")} className={`px-3 py-2 rounded-xl border text-sm ${typeGarde==="Nuit"?"bg-medical-600 text-white":"border-slate-200"}`}>Nuit</button></div></div>}{save.isSuccess&&<p className="text-sm text-green-600">Profil mis à jour.</p>}{save.isError&&<p className="text-sm text-red-600">{save.error?.response?.data?.message||"Erreur lors de la mise à jour."}</p>}<button disabled={save.isPending} className="bg-medical-600 text-white rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"><Save size={16}/>{save.isPending?"Enregistrement...":"Enregistrer"}</button></form></Card>;
}

function ClaimFacility({ category }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState("search");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [created, setCreated] = useState(false);
  const [form, setForm] = useState({
    nom: "", specialite: "", telephone: "", adresse: "", delegation: "",
    horaires: "", secteur: "", typeGarde: "", latitude: "36.5014", longitude: "8.7802", bio: "",
  });
  const { data = [], isFetching } = useQuery({
    queryKey: ["claimSearch", category, search],
    queryFn: () => searchFacilities({ category, q: search }).then(r => r.data.results),
    enabled: Boolean(search),
  });
  const claim = useMutation({
    mutationFn: revendiquerFacility,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mesFacilities"] }),
  });
  const create = useMutation({
    mutationFn: creerMaFacility,
    onSuccess: () => {
      setCreated(true);
      qc.invalidateQueries({ queryKey: ["mesFacilities"] });
      setTimeout(() => setCreated(false), 1200);
    },
  });
  const set = (key, value) => setForm(v => ({ ...v, [key]: value }));
  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setForm(v => ({ ...v, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })),
      () => {}
    );
  };
  const submitCreate = e => {
    e.preventDefault();
    create.mutate({
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    });
  };

  if (created) {
    return <Card>
      <div className="text-center py-8">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center"><Check size={28}/></div>
        <h2 className="font-bold text-lg text-slate-900 mt-4">Fiche créée avec succès</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">Votre fiche {CATEGORY_LABELS[category].toLowerCase()} a été enregistrée. Elle sera validée par l'administrateur avant publication.</p>
      </div>
    </Card>;
  }

  return <div className="space-y-5">
    <Card>
      <SectionTitle title={`Créer ou rattacher votre fiche ${CATEGORY_LABELS[category].toLowerCase()}`} text="Si votre établissement existe déjà, rattachez-le. Sinon, créez une nouvelle fiche." />
      <div className="flex flex-wrap gap-2 mb-5">
        <button type="button" onClick={() => setMode("search")} className={`px-4 py-2 rounded-xl text-sm font-medium ${mode === "search" ? "bg-medical-600 text-white" : "bg-slate-100 text-slate-600"}`}><Search size={15} className="inline mr-1.5"/>Fiche existante</button>
        <button type="button" onClick={() => setMode("create")} className={`px-4 py-2 rounded-xl text-sm font-medium ${mode === "create" ? "bg-medical-600 text-white" : "bg-slate-100 text-slate-600"}`}><Plus size={15} className="inline mr-1.5"/>Créer une nouvelle fiche</button>
      </div>

      {mode === "search" ? <>
        <form onSubmit={e => { e.preventDefault(); setSearch(q.trim()); }} className="flex gap-2 mb-4">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Nom de la ${CATEGORY_LABELS[category].toLowerCase()}`} className="flex-1 border rounded-xl px-3 py-2 text-sm"/>
          <button className="bg-medical-600 text-white rounded-xl px-4 flex items-center gap-1.5"><Search size={16}/>Chercher</button>
        </form>
        {isFetching && <p className="text-sm text-slate-400">Recherche...</p>}
        {!isFetching && search && !data.length && <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">Aucune fiche trouvée. Utilisez l'onglet <strong>Créer une nouvelle fiche</strong>.</div>}
        {data.map(f => <div key={f.id} className="border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 mb-2"><div><p className="font-medium text-sm">{f.nom}</p><p className="text-xs text-slate-400">{[f.specialite,f.delegation].filter(Boolean).join(" · ")}</p></div><button type="button" onClick={() => claim.mutate(f.id)} disabled={claim.isPending} className="text-sm text-medical-700 font-medium">{claim.isPending ? "Rattachement..." : "C'est ma fiche"}</button></div>)}
        {claim.isError && <p className="text-sm text-red-600 mt-3">{claim.error?.response?.data?.message || "Impossible de rattacher cette fiche."}</p>}
      </> : <form onSubmit={submitCreate} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <Input label={`Nom ${category === "medecin" ? "du médecin / cabinet" : "de l'établissement"}`} value={form.nom} onChange={v => set("nom", v)} required placeholder={category === "medecin" ? "Dr Ahmed Ben Ali" : category === "pharmacie" ? "Pharmacie ABC" : "Para Santé"}/>
          {category === "medecin" && <Input label="Spécialité" value={form.specialite} onChange={v => set("specialite", v)} required placeholder="Médecine générale, Cardiologie..."/>}
          <Input label="Téléphone" value={form.telephone} onChange={v => set("telephone", v)} placeholder="72 ..."/>
          <Input label="Adresse" value={form.adresse} onChange={v => set("adresse", v)} placeholder="Adresse complète"/>
          <Input label="Ville / délégation" value={form.delegation} onChange={v => set("delegation", v)} placeholder="Jendouba"/>
          {category === "medecin" && <label className="block"><span className="text-xs text-slate-500">Secteur</span><select value={form.secteur} onChange={e => set("secteur", e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">Non précisé</option><option value="Privé">Privé</option><option value="Public">Public</option></select></label>}
          {category === "pharmacie" && <label className="block"><span className="text-xs text-slate-500">Garde</span><select value={form.typeGarde} onChange={e => set("typeGarde", e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"><option value="">Pas de garde</option><option value="Jour">Jour</option><option value="Nuit">Nuit</option></select></label>}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Input label="Latitude" type="number" step="any" value={form.latitude} onChange={v => set("latitude", v)} required/>
          <Input label="Longitude" type="number" step="any" value={form.longitude} onChange={v => set("longitude", v)} required/>
        </div>
        <button type="button" onClick={locate} className="text-sm text-medical-700 font-medium flex items-center gap-1.5"><MapPin size={16}/>Utiliser ma position actuelle</button>
        {category !== "medecin" && <Input label="Horaires" value={form.horaires} onChange={v => set("horaires", v)} placeholder="Lun-Sam 08:00-18:00"/>}
        <label className="block"><span className="text-xs text-slate-500">Présentation</span><textarea rows="3" maxLength={2000} value={form.bio} onChange={e => set("bio", e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="Présentez votre activité..."/></label>
        {create.isError && <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">{create.error?.response?.data?.message || "Impossible de créer la fiche."}</div>}
        <div className="rounded-xl bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 text-sm">Votre fiche sera créée avec votre catégorie <strong>{CATEGORY_LABELS[category]}</strong>, puis soumise à validation.</div>
        <button disabled={create.isPending} className="bg-medical-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"><Plus size={16}/>{create.isPending ? "Création..." : "Créer ma fiche"}</button>
      </form>}
    </Card>
  </div>;
}

function Input({ label, value, onChange, required, placeholder, type = "text" }) {
  return <label className="block"><span className="text-xs text-slate-500">{label}{required && " *"}</span><input required={required} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border rounded-xl px-3 py-2 text-sm mt-1"/></label>;
}

