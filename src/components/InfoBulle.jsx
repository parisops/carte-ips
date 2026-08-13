import { useState, useRef, useEffect, useId } from "react";
import { HelpCircle } from "lucide-react";

/**
 * Bouton d'aide contextuelle accessible : un "?" qui ouvre un petit panneau
 * explicatif au clic (souris ET tactile — contrairement à l'attribut `title`
 * natif, invisible sur mobile), se ferme au clic extérieur ou à Échap, et
 * expose les attributs ARIA recommandés pour les infobulles.
 *
 * `taille` : "petite" (badge rond 16px, dans le flux du texte) ou "normale"
 * (bouton rond 22px, pour un usage isolé).
 */
export default function InfoBulle({ texte, taille = "petite", position = "bas" }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!ouvert) return;
    const fermerSiExterieur = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false);
    };
    const fermerSiEchap = (e) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", fermerSiExterieur);
    document.addEventListener("touchstart", fermerSiExterieur);
    document.addEventListener("keydown", fermerSiEchap);
    return () => {
      document.removeEventListener("mousedown", fermerSiExterieur);
      document.removeEventListener("touchstart", fermerSiExterieur);
      document.removeEventListener("keydown", fermerSiEchap);
    };
  }, [ouvert]);

  const tailleBouton = taille === "petite" ? "h-4 w-4" : "h-[22px] w-[22px]";
  const positionClasses =
    position === "haut"
      ? "bottom-full mb-1.5"
      : position === "droite"
      ? "left-full ml-1.5 top-1/2 -translate-y-1/2"
      : "top-full mt-1.5";

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-expanded={ouvert}
        aria-describedby={ouvert ? id : undefined}
        onClick={() => setOuvert((v) => !v)}
        className={`${tailleBouton} inline-flex shrink-0 items-center justify-center rounded-full bg-sable-200 text-encre-600 hover:bg-sable-200/80 focus:outline-none focus:ring-2 focus:ring-encre-600`}
      >
        {taille === "petite" ? (
          <span className="font-mono text-[9px] font-bold leading-none">?</span>
        ) : (
          <HelpCircle size={13} />
        )}
      </button>

      {ouvert && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-[2000] w-56 rounded-xl border border-sable-200 bg-white p-3 font-body text-xs leading-relaxed text-encre-800 shadow-panel ${positionClasses}`}
          style={{ left: position === "droite" ? undefined : "50%", transform: position === "droite" ? undefined : "translateX(-50%)" }}
        >
          {texte}
        </span>
      )}
    </span>
  );
}
