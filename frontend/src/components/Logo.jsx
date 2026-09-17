// Logo MédiGuide : combine un repère de géolocalisation (le cœur du produit :
// "trouver un professionnel de santé près de soi") et une croix médicale.
// SVG pur (pas d'image externe) pour rester net à toute taille et sans
// dépendance de chargement.
export default function Logo({ size = 32, withWordmark = true, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mg-pin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3fa2f7" />
            <stop offset="100%" stopColor="#0d5aa0" />
          </linearGradient>
        </defs>
        <path
          d="M24 4C14.6 4 7 11.6 7 21c0 12.6 15 22.3 16.1 23a1.7 1.7 0 0 0 1.8 0C26 43.3 41 33.6 41 21c0-9.4-7.6-17-17-17Z"
          fill="url(#mg-pin)"
        />
        <path
          d="M24 13.5c1 0 1.8.8 1.8 1.8v5h5a1.8 1.8 0 0 1 0 3.6h-5v5a1.8 1.8 0 0 1-3.6 0v-5h-5a1.8 1.8 0 0 1 0-3.6h5v-5c0-1 .8-1.8 1.8-1.8Z"
          fill="white"
        />
      </svg>
      {withWordmark && (
        <span className="font-bold tracking-tight leading-none">
          Médi<span className="text-medical-300">Guide</span>
        </span>
      )}
    </span>
  );
}
