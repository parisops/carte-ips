import { MapPin, TrendingUp, GraduationCap, ArrowRight } from "lucide-react";

/**
 * Écran d'onboarding plein écran — affiché UNE FOIS à la première visite
 * (géré par App.jsx via localStorage), avant que la carte ne soit affichée.
 * Contrairement à une modale flottante, cet écran remplace entièrement
 * l'interface le temps de la présentation : il n'alourdit jamais l'usage
 * courant de la carte, et reste accessible ensuite via le bouton "?" du
 * bandeau (qui rouvre ce même composant).
 *
 * Le chargement des données (useEtablissementsStore.init) est déclenché en
 * parallèle dès le montage de <App/>, donc la carte est déjà prête au clic
 * sur "Découvrir la carte" — le temps de lecture de cet écran masque une
 * bonne partie du temps de chargement réel des ~7 Mo de données.
 */
export default function EcranOnboarding({ onFermer }) {
  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center overflow-y-auto bg-sable-100 p-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoTrajectoires taille={56} />
          <h1 className="mt-4 font-display text-3xl font-semibold text-encre-950">
            Trajectoires
          </h1>
          <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-encre-600">
            Explorez la mixité sociale et la réussite scolaire de près de
            9&nbsp;000 écoles, collèges et lycées d'Île-de-France, à partir
            des données officielles du Ministère de l'Éducation nationale.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <CarteIndicateur
            icone={<MapPin size={18} />}
            sigle="IPS"
            titre="Indice de Position Sociale"
            description="Le profil social et scolaire moyen des élèves d'un établissement, comparé au département, à l'académie et au national."
          />
          <CarteIndicateur
            icone={<TrendingUp size={18} />}
            sigle="IVAC"
            titre="Valeur ajoutée des collèges"
            description="La performance d'un collège une fois neutralisé l'effet du profil social de ses élèves à l'entrée."
          />
          <CarteIndicateur
            icone={<GraduationCap size={18} />}
            sigle="IVAL"
            titre="Valeur ajoutée des lycées"
            description="Le même principe pour les lycées : taux de réussite et de mentions au-delà de ce que prédirait le seul profil des élèves."
          />
        </div>

        <button
          onClick={onFermer}
          className="mx-auto mt-8 flex items-center gap-2 rounded-xl bg-encre-950 px-6 py-3 font-body text-sm font-semibold text-sable-50 hover:bg-encre-800"
        >
          Découvrir la carte
          <ArrowRight size={16} />
        </button>

        <p className="mt-4 text-center font-body text-[11px] text-encre-400">
          Données en Licence Ouverte / Open Licence 2.0 — aucune donnée personnelle collectée sur ce site.
        </p>
      </div>
    </div>
  );
}

function CarteIndicateur({ icone, sigle, titre, description }) {
  return (
    <div className="rounded-2xl border border-sable-200 bg-white p-4">
      <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-tableau-100 text-tableau-700">
        {icone}
      </span>
      <p className="font-mono text-xs font-bold uppercase tracking-wide text-encre-400">{sigle}</p>
      <p className="mt-0.5 font-body text-sm font-semibold text-encre-950">{titre}</p>
      <p className="mt-1.5 font-body text-xs leading-relaxed text-encre-600">{description}</p>
    </div>
  );
}

/**
 * Logo "Trajectoires" — marqueur de carte en forme de jauge : dégradé à 3
 * bandes (corail → ambre → vert, identique à l'échelle IPS de la carte) et
 * une ligne de repère horizontale, pour évoquer un indicateur de position
 * plutôt qu'un simple point géographique. Réutilisé tel quel dans le
 * bandeau principal de l'app (cf. App.jsx).
 */
export function LogoTrajectoires({ taille = 32 }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="degradeJaugeLogo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      <path
        d="M16 2C9.4 2 4 7.4 4 14c0 8.5 10.5 15.5 11.3 16 .4.3 1 .3 1.4 0C17.5 29.5 28 22.5 28 14c0-6.6-5.4-12-12-12z"
        fill="url(#degradeJaugeLogo)"
        stroke="#12203A"
        strokeWidth="1.6"
      />
      <line x1="7.5" y1="14" x2="24.5" y2="14" stroke="#FAF7F0" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
