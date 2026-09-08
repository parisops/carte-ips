import { useEffect, useId, useRef, useState } from "react";
import { Search, MapPin, School, X } from "lucide-react";
import { useEtablissementsStore, useSuggestionsRecherche, useEtablissementsFiltres } from "../hooks/useEtablissementsStore";

export default function RechercheEtablissements() {
  const filtres = useEtablissementsStore(s => s.filtres);
  const setFiltre = useEtablissementsStore(s => s.setFiltre);
  const choisir = useEtablissementsStore(s => s.selectionnerSuggestion);
  const selectionner = useEtablissementsStore(s => s.selectionnerEtablissement);
  const selection = useEtablissementsStore(s => s.etablissementSelectionneId);
  const suggestions = useSuggestionsRecherche();
  const resultats = useEtablissementsFiltres();
  const [texte, setTexte] = useState(filtres.recherche);
  const [ouvert, setOuvert] = useState(false);
  const [listeCommune, setListeCommune] = useState(true);
  const [actif, setActif] = useState(-1);
  const timer = useRef();
  const racine = useRef();
  const input = useRef();
  const id = useId();
  useEffect(() => {
    setTexte(filtres.recherche);
    return () => clearTimeout(timer.current);
  }, [filtres.recherche]);
  useEffect(() => {
    const fermer = e => { if (!racine.current?.contains(e.target)) setOuvert(false); };
    document.addEventListener("pointerdown", fermer);
    return () => { document.removeEventListener("pointerdown", fermer); clearTimeout(timer.current); };
  }, []);
  useEffect(() => setActif(-1), [filtres.recherche]);
  const selectionnerSuggestion = s => {
    clearTimeout(timer.current);
    choisir(s);
    setTexte(s.label);
    setOuvert(false);
    setListeCommune(true);
    input.current?.blur();
  };
  const menu = ouvert && texte.trim() && texte === filtres.recherche;
  return (
    <div ref={racine} className="relative">
      <div className="relative rounded-xl bg-sable-50 shadow-panel">
        <Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-encre-600" />
        <input
          ref={input} role="combobox" aria-label="Rechercher une commune ou un établissement"
          aria-autocomplete="list" aria-expanded={Boolean(menu)} aria-controls={id}
          aria-activedescendant={menu && actif >= 0 ? `${id}-${actif}` : undefined}
          placeholder="Ville, code postal, établissement…"
          value={texte}
          onFocus={() => setOuvert(true)}
          onChange={e => {
            const valeur = e.target.value;
            setTexte(valeur); setOuvert(true); setActif(-1);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setFiltre("recherche", valeur), 200);
          }}
          onKeyDown={e => {
            if (e.key === "Escape") { setOuvert(false); input.current?.blur(); }
            if (menu && suggestions.length && ["ArrowDown", "ArrowUp"].includes(e.key)) {
              e.preventDefault();
              const prochain = e.key === "ArrowDown" ? Math.min(actif + 1, suggestions.length - 1) : Math.max(actif - 1, 0);
              setActif(prochain);
              document.getElementById(`${id}-${prochain}`)?.scrollIntoView({ block: "nearest" });
            }
            if (e.key === "Enter") {
              e.preventDefault(); clearTimeout(timer.current);
              if (menu && actif >= 0) selectionnerSuggestion(suggestions[actif]);
              else { setFiltre("recherche", texte); setOuvert(true); }
            }
          }}
          className="h-12 w-full rounded-xl border border-sable-200 bg-transparent pl-10 pr-11 text-base text-encre-950 placeholder:text-encre-600 focus:outline-none focus:ring-2 focus:ring-encre-600"
        />
        {texte && <button aria-label="Effacer la recherche" onClick={() => { clearTimeout(timer.current); setTexte(""); setFiltre("recherche", ""); setOuvert(false); }} className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-encre-600"><X size={18} /></button>}
      </div>
      {menu && (
        <ul id={id} role="listbox" aria-label="Suggestions de recherche" className="absolute inset-x-0 top-full z-10 mt-2 max-h-[40dvh] overflow-y-auto overscroll-contain rounded-xl border border-sable-200 bg-sable-50 p-1 shadow-panel">
          {suggestions.length ? suggestions.map((s, i) => (
            <li key={s.cle} role="presentation">
              <button id={`${id}-${i}`} role="option" aria-selected={i === actif} onClick={() => selectionnerSuggestion(s)} className={`flex min-h-12 w-full items-center gap-2 rounded-lg p-3 text-left text-sm text-encre-950 hover:bg-sable-200 ${i === actif ? "bg-sable-200" : ""}`}>
                {s.type === "commune" ? <MapPin size={18} className="shrink-0" /> : <School size={18} className="shrink-0" />}
                <span>{s.label}<span className="block text-xs text-encre-600">{s.type === "commune" ? s.departement : s.commune}</span></span>
              </button>
            </li>
          )) : <li className="p-3 text-sm text-encre-600">Aucun résultat. Essayez une autre commune ou un code postal.</li>}
        </ul>
      )}
      {filtres.commune && !selection && !menu && (
        <div className="mt-2 rounded-xl border border-sable-200 bg-sable-50 shadow-panel">
          <button onClick={() => setListeCommune(v => !v)} aria-expanded={listeCommune} className="w-full px-3 py-3 text-left text-sm font-semibold text-encre-950">
            {resultats.length} établissement{resultats.length > 1 ? "s" : ""} à {filtres.commune.nom} · {listeCommune ? "Masquer" : "Voir"}
          </button>
          {listeCommune && <ul className="max-h-[28dvh] overflow-y-auto overscroll-contain border-t border-sable-200">
            {resultats.length === 0 && <li className="p-3 text-sm text-encre-600">Aucun établissement avec ces filtres. Modifiez-les ou réinitialisez-les.</li>}
            {resultats.map(e => <li key={e.code_uai}><button onClick={() => selectionner(e.code_uai)} className="w-full px-3 py-3 text-left text-sm text-encre-950 hover:bg-sable-200">{e.nom_etablissement}<span className="block text-xs text-encre-600">{e.type_etablissement} · {e.statut}</span></button></li>)}
          </ul>}
        </div>
      )}
    </div>
  );
}
