import { X } from "lucide-react";

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
              Pour toute question, utilisez le bouton de contact de Trajectoires. Le nom et l’adresse email sont facultatifs ; une adresse email permet de vous répondre.
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
              Ce site utilise GoatCounter et Umami, en parallèle, pour
              compter les visites (pages vues, provenance, pays, type
              d'appareil) et suivre quelques événements d'usage anonymes
              (ex : filtre utilisé, établissement consulté). Ces deux outils
              ne déposent aucun cookie et ne stockent pas votre adresse IP
              complète selon leur fonctionnement annoncé. La mesure d’audience est distincte des messages envoyés volontairement via le formulaire de contact.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-encre-950">Formulaire de contact</h3>
            <p>
              Lorsque vous envoyez un message, son contenu et les nom et adresse email que vous renseignez sont transmis à FormSubmit, puis à l’éditeur du site, pour traiter votre demande et vous répondre. Évitez d’inclure des informations sensibles ou des informations personnelles sur votre enfant.
            </p>
            <p className="mt-2">
              Pour demander l’accès, la rectification ou la suppression des informations transmises, contactez l’éditeur via ce même formulaire en précisant votre demande.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-encre-950">Liste d’attente Premium</h3>
            <p>Avec votre accord, votre adresse email et la date de votre inscription sont transmises via FormSubmit à l’éditeur pour vous prévenir du lancement de Trajectoires Premium, dédié à la comparaison de lycées et à l’export de dossiers PDF. L’inscription est gratuite et ne constitue pas un achat. Vous pouvez retirer votre accord et demander la suppression de votre inscription via le bouton de contact du site.</p>
            <p className="mt-2">La visibilité de la présentation, son ouverture et les inscriptions confirmées font l’objet d’événements de mesure d’audience génériques. Votre email n’est pas transmis aux outils de mesure d’audience.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
