import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { Locate } from "lucide-react";
import { CATEGORY_STYLES, formatDistance } from "../constants/facilities";
import "leaflet/dist/leaflet.css";

function markerIcon(category) {
  const color = CATEGORY_STYLES[category]?.marker || "#1e88e5";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      border:2px solid white;
    "><span style="transform:rotate(45deg);font-size:13px;">${CATEGORY_STYLES[category]?.icon || ""}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

// Recentre la carte quand la cible (résultat sélectionné ou position user) change
function FlyTo({ center, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

function LocateControl({ onLocate }) {
  return (
    <button
      onClick={onLocate}
      title="Ma position"
      aria-label="Centrer la carte sur ma position"
      className="absolute z-[1000] top-3 right-3 bg-white shadow-md rounded-lg p-2.5 text-medical-600 hover:bg-medical-50 border border-slate-200"
    >
      <Locate size={18} />
    </button>
  );
}

export default function MapView({
  results = [],
  center,
  userPosition,
  focused,
  onLocateMe,
  height = "100%",
}) {
  const defaultCenter = center || [36.5011, 8.7803]; // Jendouba

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200" style={{ height }}>
      <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userPosition && (
          <Marker
            position={userPosition}
            icon={L.divIcon({
              className: "",
              html: `<div style="width:16px;height:16px;border-radius:50%;background:#1e88e5;border:3px solid white;box-shadow:0 0 0 3px rgba(30,136,229,0.35)"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>Vous êtes ici</Popup>
          </Marker>
        )}

        {results
          .filter((f) => f.latitude && f.longitude)
          .map((f) => (
            <Marker key={f.id} position={[f.latitude, f.longitude]} icon={markerIcon(f.category)}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{f.nom}</p>
                  {f.specialite && <p className="text-slate-500">{f.specialite}</p>}
                  {f.adresse && <p className="text-slate-500">{f.adresse}</p>}
                  {f.distanceM !== undefined && (
                    <p className="text-medical-600 font-medium mt-1">{formatDistance(f.distanceM)}</p>
                  )}
                  <Link to={`/etablissement/${f.id}`} className="text-medical-600 underline block mt-1">
                    Voir les détails
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

        <FlyTo center={focused || userPosition} />
      </MapContainer>

      {onLocateMe && <LocateControl onLocate={onLocateMe} />}
    </div>
  );
}
