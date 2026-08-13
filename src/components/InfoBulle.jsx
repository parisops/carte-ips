import { useState, useRef, useEffect, useId, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

export default function InfoBulle({ texte, taille = "petite", position = "bas" }) {
  const [ouvert, setOuvert] = useState(false);
  const [coords, setCoords] = useState(null);
  const boutonRef = useRef(null);
  const bulleRef = useRef(null);
  const id = useId();

  const calculerPosition = () => {
    const bouton = boutonRef.current;
    if (!bouton) return;
    const rect = bouton.getBoundingClientRect();
    const largeurBulle = 224;
    let left = rect.left + rect.width / 2 - largeurBulle / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - largeurBulle - 8));

    if (position === "droite") {
      setCoords({ top: rect.top + rect.height / 2, left: rect.right + 6, transform: "translateY(-50%)" });
    } else if (position === "haut") {
      setCoords({ top: rect.top - 6, left, transform: "translateY(-100%)" });
    } else {
      setCoords({ top: rect.bottom + 6, left, transform: "none" });
    }
  };

  useLayoutEffect(() => {
    if (ouvert) calculerPosition();
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    const fermerSiExterieur = (e) => {
      if (
        boutonRef.current && !boutonRef.current.contains(e.target) &&
        bulleRef.current && !bulleRef.current.contains(e.target)
      ) {
        setOuvert(false);
      }
    };
    const fermerSiEchap = (e) => {
      if (e.key === "Escape") setOuvert(false);
    };
    const repositionner = () => calculerPosition();

    document.addEventListener("mousedown", fermerSiExterieur);
    document.addEventListener("touchstart", fermerSiExterieur);
    document.addEventListener("keydown", fermerSiEchap);
    window.addEventListener("scroll", repositionner, true);
    window.addEventListener("resize", repositionner);
    return () => {
      document.removeEventListener("mousedown", fermerSiExterieur);
      document.removeEventListener("touchstart", fermerSiExterieur);
      document.removeEventListener("keydown", fermerSiEchap);
      window.removeEventListener("scroll", repositionner, true);
      window.removeEventListener("resize", repositionner);
    };
  }, [ouvert]);

  const tailleBouton = taille === "petite" ? "h-4 w-4" : "h-[22px] w-[22px]";

  return (
    <span className="relative inline-flex">
      <button
        ref={boutonRef}
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

      {ouvert && coords &&
        createPortal(
          <span
            ref={bulleRef}
            id={id}
            role="tooltip"
            className="fixed z-[3000] w-56 rounded-xl border border-sable-200 bg-white p-3 font-body text-xs leading-relaxed text-encre-800 shadow-panel"
            style={{ top: coords.top, left: coords.left, transform: coords.transform }}
          >
            {texte}
          </span>,
          document.body
        )}
    </span>
  );
}
