import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Map as MapIcon, X, Package, Send, CheckCircle2 } from "lucide-react";
import { searchFacilities, searchProducts, demanderDisponibiliteProduit } from "../services/api";
import SearchBar from "../components/SearchBar";
import FacilityCard from "../components/FacilityCard";
import FacilityCardSkeleton from "../components/FacilityCardSkeleton";
import MapView from "../components/MapView";
import { CATEGORY_META } from "../constants/facilities";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const DEFAULT_FILTERS = {
  category: "",
  q: "",
  ville: "",
  specialite: "",
  typeGarde: "",
  radius: 5000,
};

// Permet à la page d'accueil (et à tout lien externe) de préremplir la
// recherche via l'URL, ex. /recherche?category=medecin&q=cardiologie.
function filtersFromSearchParams(params) {
  const fromUrl = {};
  for (const key of ["category", "q", "ville", "specialite", "typeGarde"]) {
    const v = params.get(key);
    if (v) fromUrl[key] = v;
  }
  return { ...DEFAULT_FILTERS, ...fromUrl };
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const initialFilters = useMemo(() => filtersFromSearchParams(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [userPosition, setUserPosition] = useState(null);
  const [focused, setFocused] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productMessage, setProductMessage] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const buildParams = useCallback((f, position) => {
    const params = {};
    if (f.category) params.category = f.category;
    if (f.q) params.q = f.q;
    if (f.ville) params.ville = f.ville;
    if (f.specialite) params.specialite = f.specialite;
    if (f.typeGarde) params.typeGarde = f.typeGarde;
    if (position) {
      params.lat = position[0];
      params.lng = position[1];
      params.radius = f.radius;
    }
    return params;
  }, []);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["facilities", appliedFilters, userPosition],
    queryFn: () =>
      searchFacilities(buildParams(appliedFilters, userPosition)).then((res) => res.data),
    placeholderData: (prev) => prev,
  });

  const results = useMemo(() => data?.results || [], [data]);

  const productSearchEnabled = ["pharmacie", "parapharmacie"].includes(appliedFilters.category) && appliedFilters.q.trim().length >= 2;
  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ["products-public", appliedFilters.category, appliedFilters.q],
    queryFn: () => searchProducts({ q: appliedFilters.q.trim() }).then(r => r.data.products || []),
    enabled: productSearchEnabled,
  });
  const productResults = productData || [];

  const requestProduct = useMutation({
    mutationFn: ({ product, message }) => demanderDisponibiliteProduit({
      facilityId: product.facilityId,
      productId: product.id,
      produitNom: product.nom,
      message,
      quantite: 1,
    }),
    onSuccess: () => {
      setSelectedProduct(null);
      setProductMessage("");
      qc.invalidateQueries({ queryKey: ["products-public"] });
    },
  });

  const meta = CATEGORY_META[appliedFilters.category] || CATEGORY_META[""];

  // Statistiques rapides propres à chaque catégorie, calculées à partir
  // des résultats actuels — c'est ce qui fait varier réellement
  // l'affichage selon la catégorie, au-delà du simple filtrage de liste.
  const quickStats = useMemo(() => {
    if (results.length === 0) return [];

    if (appliedFilters.category === "medecin") {
      const specialites = new Set(results.map((r) => r.specialite).filter(Boolean));
      const notes = results.map((r) => r.noteAvis).filter((n) => n != null);
      const moyenne = notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
      return [
        `${results.length} médecin(s)`,
        `${specialites.size} spécialité(s)`,
        ...(moyenne ? [`Note moyenne ${moyenne}/5`] : []),
      ];
    }

    if (appliedFilters.category === "pharmacie") {
      const deGarde = results.filter((r) => r.typeGarde).length;
      return [
        `${results.length} pharmacie(s)`,
        ...(deGarde ? [`${deGarde} de garde`] : []),
      ];
    }

    if (appliedFilters.category === "parapharmacie") {
      return [`${results.length} parapharmacie(s)`];
    }

    return [`${results.length} résultat(s)`];
  }, [results, appliedFilters.category]);

  const runSearch = () => setAppliedFilters(filters);

  // Sélectionner Médecin / Pharmacie / Parapharmacie doit filtrer
  // immédiatement, sans attendre un clic sur "Rechercher".
  const handleSelectCategory = (category) => {
    const updated = { ...filters, category, specialite: "", typeGarde: "" };
    setFilters(updated);
    setAppliedFilters(updated);
  };

  const handleNearMe = () => {
    setGeoError("");

    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(coords);
        setFocused(coords);
        setAppliedFilters(filters);
        setGeoLoading(false);
      },
      () => {
        setGeoError("Impossible d'obtenir votre position. Vérifiez les autorisations de localisation.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-medical-50 border-b border-medical-100">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold text-medical-900 flex items-center gap-2">
            <span>{meta.icon}</span> {meta.title}
          </h1>
          <p className="text-medical-700 text-sm mt-1">{meta.subtitle}</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <SearchBar
          filters={filters}
          onChange={setFilters}
          onSearch={runSearch}
          onSelectCategory={handleSelectCategory}
          onNearMe={handleNearMe}
          geoLoading={geoLoading}
        />

        {quickStats.length > 0 && !isLoading && (
          <div className="mt-3 flex flex-wrap gap-2">
            {quickStats.map((stat) => (
              <span
                key={stat}
                className="text-xs font-medium bg-white border border-medical-200 text-medical-700 px-2.5 py-1 rounded-full"
              >
                {stat}
              </span>
            ))}
          </div>
        )}

        {["pharmacie", "parapharmacie"].includes(appliedFilters.category) && (
          <ProductAvailabilitySearch
            query={appliedFilters.q}
            products={productResults}
            loading={productsLoading}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            message={productMessage}
            setMessage={setProductMessage}
            user={user}
            navigate={navigate}
            requestProduct={requestProduct}
          />
        )}

        {geoError && (
          <p className="mt-3 text-sm text-status-alert bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {geoError}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne résultats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">
                {isLoading ? "Recherche en cours..." : `${results.length} résultat(s)`}
              </p>
              {userPosition && (
                <span className="flex items-center gap-1 text-xs text-medical-600">
                  <MapPin size={13} /> Trié par proximité
                </span>
              )}
            </div>

            {isError && (
              <p className="text-sm text-status-alert bg-red-50 border border-red-100 rounded-lg px-3 py-3">
                Une erreur est survenue pendant la recherche. Vérifiez que le serveur backend est démarré.
              </p>
            )}

            {isLoading && (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <FacilityCardSkeleton key={i} />
                ))}
              </div>
            )}

            {!isLoading && !isError && results.length === 0 && (
              <div className="text-center bg-white border border-slate-200 rounded-xl py-12 px-4">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-slate-600 font-medium">Aucun résultat trouvé</p>
                <p className="text-slate-400 text-sm mt-1">
                  Essayez d'élargir le rayon de recherche ou de modifier vos filtres.
                </p>
              </div>
            )}

            <div className={`space-y-3 ${isFetching && !isLoading ? "opacity-60" : ""}`}>
              {!isLoading &&
                results.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} onLocate={(f) => setFocused([f.latitude, f.longitude])} />
                ))}
            </div>
          </div>

          {/* Colonne carte */}
          <div className="hidden lg:block sticky top-6 self-start" style={{ height: "calc(100vh - 3rem)" }}>
            <MapView
              results={results}
              userPosition={userPosition}
              focused={focused}
              onLocateMe={handleNearMe}
              height="100%"
            />
          </div>
        </div>
      </main>

      {/* Bouton flottant carte (mobile uniquement) */}
      <button
        onClick={() => setMobileMapOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-[900] flex items-center gap-2 bg-medical-600 text-white shadow-lg rounded-full px-4 py-3 text-sm font-medium"
      >
        <MapIcon size={18} />
        Carte
      </button>

      {/* Carte plein écran (mobile) */}
      {mobileMapOpen && (
        <div className="lg:hidden fixed inset-0 z-[1000] bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <p className="font-medium text-slate-700">Carte des résultats</p>
            <button onClick={() => setMobileMapOpen(false)} className="p-2 text-slate-500">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1">
            <MapView
              results={results}
              userPosition={userPosition}
              focused={focused}
              onLocateMe={handleNearMe}
              height="100%"
            />
          </div>
        </div>
      )}
    </div>
  );
}


function ProductAvailabilitySearch({
  query, products, loading, selectedProduct, setSelectedProduct,
  message, setMessage, user, navigate, requestProduct
}) {
  if (query.trim().length < 2) {
    return (
      <section className="mt-5 bg-white border border-medical-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-medical-800 font-semibold">
          <Package size={18} /> Rechercher un produit
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Saisissez le nom d'un médicament ou produit pour demander sa disponibilité aux pharmacies et parapharmacies.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5 bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Package size={18} className="text-medical-600" /> Disponibilité des produits</h2>
          <p className="text-sm text-slate-500 mt-1">Demandez directement à l'établissement si le produit est disponible.</p>
        </div>
        {loading && <span className="text-xs text-slate-400">Recherche...</span>}
      </div>

      {!loading && !products.length && (
        <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center">
          <p className="text-sm font-medium text-slate-600">Aucun produit référencé pour « {query} ».</p>
          <p className="text-xs text-slate-400 mt-1">Essayez un autre nom de produit.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {products.map(product => (
          <div key={`${product.id}-${product.facilityId}`} className="border border-slate-100 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{product.nom}</p>
                <p className="text-sm text-slate-500 mt-1">{product.facility?.nom}</p>
                {product.facility?.adresse && <p className="text-xs text-slate-400 mt-1">{product.facility.adresse}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${product.disponible ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {product.disponible ? "Indiqué disponible" : "Indiqué indisponible"}
              </span>
            </div>
            {product.description && <p className="text-sm text-slate-600 mt-3">{product.description}</p>}
            {product.prix != null && <p className="text-sm font-medium text-medical-700 mt-2">{product.prix} TND</p>}

            <button
              onClick={() => {
                if (user?.role !== "patient") {
                  navigate("/login");
                  return;
                }
                setSelectedProduct(product);
                setMessage("");
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-medical-600 text-white rounded-xl px-3 py-2.5 text-sm font-medium"
            >
              <Send size={15} /> Demander confirmation
            </button>
          </div>
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              requestProduct.mutate({ product: selectedProduct, message: message.trim() });
            }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5"
          >
            <h3 className="font-bold text-lg text-slate-900">Demander la disponibilité</h3>
            <p className="text-sm text-slate-500 mt-1">
              {selectedProduct.nom} · {selectedProduct.facility?.nom}
            </p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows="4"
              maxLength="500"
              placeholder="Message facultatif : quantité souhaitée, précision..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm mt-4"
            />
            {requestProduct.isError && (
              <p className="text-sm text-red-600 mt-2">{requestProduct.error?.response?.data?.message || "Impossible d'envoyer la demande."}</p>
            )}
            {requestProduct.isSuccess && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1"><CheckCircle2 size={15}/> Demande envoyée.</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setSelectedProduct(null)} className="px-4 py-2 text-sm text-slate-600">Annuler</button>
              <button disabled={requestProduct.isPending} className="bg-medical-600 text-white rounded-xl px-4 py-2 text-sm">
                {requestProduct.isPending ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
