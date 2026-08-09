import { X } from "lucide-react";

/**
 * Mentions légales + politique de confidentialité, dans une modale plutôt
 * qu'une route dédiée (l'app n'a pas de routeur — pas la peine d'en ajouter
 * un pour une seule page statique).
 *
 * Éditeur non professionnel (LCEN art. 6-III-1 et 6-III-2) : pour un site
 * personnel/non commercial, la loi autorise à ne PAS publier son identité
 * civile, à condition qu'elle reste accessible aux autorités judiciaires
 * via l'hébergeur — ce qui est automatiquement le cas ici, GitHub disposant
 * déjà des informations du titulaire du compte/repo. Rien à compléter avant
 * mise en ligne : aucune donnée personnelle n'apparaît dans ce composant.
 */
export default function MentionsLegales({ onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-encre-950/40 p-4">
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-sable-50 p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-encre-950">
            Mentions légales & confidentialité
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-encre-600 hover:bg-sable-200"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 font-body text-sm leading-relaxed text-encre-800">
          <section>
            <h3 className="mb-1 font-semibold text-encre-950">Éditeur du site</h3>
            <p>
              Ce site est édité à titre non professionnel par un particulier.
              Conformément à l'article 6-III-1 de la loi n°2004-575 du 21
              juin 2004 pour la confiance dans l'économie numérique (LCEN),
              les éditeurs à titre non professionnel sont autorisés à ne pas
              rendre publiques leurs coordonnées personnelles, sous réserve
              de les avoir communiquées à leur hébergeur — ce qui est le cas
              ici via le compte GitHub associé au dépôt.
            </p>
            <p className="mt-1 text-xs text-encre-400">
              Directeur de la publication : le titulaire du compte GitHub
              hébergeant ce dépôt.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-encre-950">Hébergement</h3>
            <p>
              GitHub Pages — GitHub, Inc., 88 Colin P. Kelly Jr. Street, San
              Francisco, CA 94107, États-Unis.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-encre-950">Contact</h3>
            <p>
              Pour toute question sur ce site, ouvrir une "issue" sur le
              dépôt GitHub du projet — ce canal ne nécessite de communiquer
              aucune information personnelle au-delà d'un pseudonyme GitHub.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-encre-950">Données affichées</h3>
            <p>
              Les données d'établissements scolaires (identité, IPS,
              effectifs, résultats) proviennent de data.education.gouv.fr
              (Ministère de l'Éducation nationale), en Licence Ouverte /
              Open Licence 2.0. Elles sont publiées à titre informatif ; se
              référer aux sources officielles pour tout usage réglementaire.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-encre-950">Mesure d'audience</h3>
            <p>
              Ce site utilise GoatCounter pour compter les visites (pages
              vues, provenance, pays, type d'appareil). Cet outil ne dépose
              aucun cookie et ne stocke pas votre adresse IP complète : il
              n'entre pas dans le champ du consentement préalable exigé par
              la CNIL pour les traceurs, et n'est donc pas soumis à un
              bandeau de consentement.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-encre-950">Vos droits</h3>
            <p>
              Ce site ne collecte aucune donnée personnelle identifiable :
              pas de compte, pas de formulaire, pas de cookie de suivi. La
              mesure d'audience (ci-dessus) est agrégée et anonymisée à la
              source. En l'absence de traitement de données personnelles, il
              n'y a pas de droit d'accès/rectification/suppression à exercer
              au sens du RGPD.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

