import { useEffect, useState } from "react";
import { MapPin, TrendingUp, GraduationCap, ArrowRight } from "lucide-react";

export default function EcranOnboarding({ onFermer }) {
  const [monte, setMonte] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMonte(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[2100] flex items-center justify-center overflow-y-auto
                  bg-sable-100 md:bg-encre-950/35 md:backdrop-blur-sm
                  transition-opacity duration-300 ${monte ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className="flex min-h-full w-full items-center justify-center px-4"
        style={{
          paddingTop: "max(2rem, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className={`w-full max-w-2xl rounded-3xl transition-all duration-500 ease-out
                      md:bg-sable-50 md:p-8 md:shadow-panel
                      ${monte ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.96] opacity-0"}`}
        >
          <div className="mb-6 flex flex-col items-center text-center md:mb-8">
            <LogoTrajectoires taille={48} animer={monte} />
            <h1 className="mt-3 font-display text-2xl font-semibold leading-tight text-encre-950 md:mt-4 md:text-3xl">
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
              delai={0}
              monte={monte}
            />
            <CarteIndicateur
              icone={<TrendingUp size={18} />}
              sigle="IVAC"
              titre="Valeur ajoutée des collèges"
              description="La performance d'un collège une fois neutralisé l'effet du profil social de ses élèves à l'entrée."
              delai={80}
              monte={monte}
            />
            <CarteIndicateur
              icone={<GraduationCap size={18} />}
              sigle="IVAL"
              titre="Valeur ajoutée des lycées"
              description="Le même principe pour les lycées : taux de réussite et de mentions au-delà de ce que prédirait le seul profil des élèves."
              delai={160}
              monte={monte}
            />
          </div>

          <button
            onClick={onFermer}
            className="mx-auto mt-8 flex items-center gap-2 rounded-xl bg-encre-950 px-6 py-3 font-body text-sm font-semibold text-sable-50 transition-transform hover:scale-[1.02] hover:bg-encre-800 active:scale-[0.98]"
          >
            Découvrir la carte
            <ArrowRight size={16} />
          </button>

          <p className="mt-4 text-center font-body text-[11px] text-encre-400 md:text-encre-400/80">
            Données en Licence Ouverte / Open Licence 2.0 — aucune donnée personnelle collectée sur ce site.
          </p>
        </div>
      </div>
    </div>
  );
}

function CarteIndicateur({ icone, sigle, titre, description, delai, monte }) {
  return (
    <div
      className="rounded-2xl border border-sable-200 bg-white p-4 transition-all duration-500 ease-out"
      style={{
        transitionDelay: `${delai}ms`,
        opacity: monte ? 1 : 0,
        transform: monte ? "translateY(0)" : "translateY(8px)",
      }}
    >
      <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-tableau-100 text-tableau-700">
        {icone}
      </span>
      <p className="font-mono text-xs font-bold uppercase tracking-wide text-encre-400">{sigle}</p>
      <p className="mt-0.5 font-body text-sm font-semibold text-encre-950">{titre}</p>
      <p className="mt-1.5 font-body text-xs leading-relaxed text-encre-600">{description}</p>
    </div>
  );
}

export function LogoTrajectoires({ taille = 32, animer = false }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animer ? "animate-[atterrissage_0.6s_ease-out]" : ""}
    >
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
