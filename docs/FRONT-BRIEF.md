# Front build brief, Account Intelligence Tool

> Pour la session fraîche qui builde le front. Autoportant. Lis aussi `docs/SPECS.md` (produit) et `criteria/lead-criteria.md` (les critères). Le repo SERA PUBLIC : données fictives ou publiques uniquement, jamais de clé ni de donnée client réelle.

## Ce que tu construis (les 3 écrans)

Un single-page qui se démo en 10 secondes. **Le visuel EST le produit.**

1. **Liste de comptes** : ~10 cartes. Par carte : nom, badge signal, la phrase "pourquoi" (`verdict.why`), pastille de tier (GO vert / EXPLORE ambre / SKIP gris / HUMAN rouge). Clic → vue compte.
2. **Vue compte** : l'organigramme. **C'est la brique héros.** Chaque personne = un carré cliquable. Les personnes pertinentes (`highlighted: true`) sont mises en avant (couleur/halo). Une pastille de statut de contact par personne (`never` / `contacted` / `client`). Clic sur une personne → brief.
3. **Brief personne** (panneau latéral ou modal) : Pourquoi elle (`brief.why`), Ses limites (`brief.limits`), Coordonnées (email/phone/linkedin, avec badge "verified by FullEnrich" quand présent), Angle + social proof (`brief.angle`, `brief.social_proof[]`). Un bouton **"Draft sequence"** → affiche un mail (mock ou appel Claude plus tard).

Navigation fluide entre les 3, retour facile. Une flèche "compte suivant" est un bonus (couche 1 des specs).

## La donnée (le contrat, déjà figé)

Tu builds contre `fixtures/accounts.example.json` (5 comptes réalistes fictifs, déjà dans le repo). Charge-le par `fetch('./fixtures/accounts.example.json')` avec fallback inline si besoin. Quand le backend existera, il servira le même format sur `GET /api/accounts` : bascule juste l'URL.

Forme d'un compte :
```
{ id, name, domain, url, size, location, stage,
  signals: [{ type, detail, detected_at, source }],
  verdict: { tier: "GO|EXPLORE|SKIP|HUMAN", why },
  people: [{ name, role, email, phone, linkedin_url, highlighted, contact_status: "never|contacted|client",
             brief: { why, limits, angle, social_proof[] } }] }
```

Cas à bien rendre (ils sont dans la fixture, ce sont les moments de démo) :
- **Corvex Systems** = tier HUMAN + une personne `contact_status: "client"` : le brief affiche "router vers l'owner", PAS de bouton Draft. C'est le guard, un moment fort du pitch.
- **Northwind / Tom Weber** = `contact_status: "contacted"` : afficher "déjà contacté, relancer sur le fil" au lieu de proposer un cold.
- **Aperture Labs** = tier EXPLORE, personne sans email : afficher "enrichir via FullEnrich" là où les coordonnées manquent.

## Stack (reco, Adrien/Léo tranchent)

Single-page vanilla : HTML + CSS + JS, **pas de build step**, pas de framework. Cohérent avec le repo et l'impératif de vitesse. L'organigramme : cartes positionnées en CSS (grid/flex) reliées par des traits SVG, suffisant et joli. Pas de lib de graphe pour le MVP (le graphe de connexions = couche 2). Si Adrien préfère React/Vite, c'est son call, mais le vanilla se démo plus vite.

Sers-le en statique ou via un petit Express. Le repo a déjà `express` en dep.

## Design (la démo prime)

- Lisible projeté sur grand écran : contrastes forts, tailles généreuses.
- Loi de couleur fonctionnelle : GO/vert, HUMAN/rouge, contact déjà fait / ambre. La cohérence visuelle porte le sens.
- Micro-transitions discrètes entre écrans. Rien qui clignote.
- Layout simple d'ABORD (que le parcours marche), le beau à l'itération suivante. Ne pas passer 3h sur l'organigramme parfait avant que le clic marche.

## Definition of done

Parcours **liste → compte (organigramme + surbrillance) → personne (brief) → bouton draft**, sans friction, joli, contre la fixture. Le cas HUMAN (Corvex) rend visiblement le refus. Tout le reste (Sillage réel, FullEnrich réel, draft Claude réel, autopilote, graphe de connexions, multi-canaux) = branché après, aux points d'intégration marqués.

## Points d'intégration (stubs à laisser propres)

- `loadAccounts()` : fixture aujourd'hui, `GET /api/accounts` demain (Bloc A / Sillage).
- `enrichPerson(person)` : renvoie la personne telle quelle aujourd'hui, FullEnrich demain (Bloc B).
- `draftSequence(account, person)` : renvoie un mail template aujourd'hui, appel Claude demain (Bloc C). Respecter la kill-list copy de `criteria/lead-criteria.md` §6.

## Hors périmètre (ne PAS faire maintenant)

Autopilote, multi-signaux, graphe de connexions, Request intro, Gradium/Gamma, envoi réel, persistance HubSpot. Ce sont les couches d'expansion des specs §6.
