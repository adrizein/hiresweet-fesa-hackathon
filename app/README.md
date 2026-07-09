# Account Intelligence Tool, V1 mockée (Blocs B+C)

Hackathon Agentic GTM (Anthropic x FullEnrich x Sillage), 09/07/2026.

## Quoi

Un parcours en 4 écrans, sur data 100% mockée :

1. **Liste des comptes** : nom + `verdict.why` (pourquoi ce compte est prioritaire ou pas), avec compteurs par tier et investisseurs en chips.
2. **Vue compte** : organigramme des personnes (`people[]`) avec surbrillance des interlocuteurs pertinents (`highlighted: true`), investisseurs, graphe des nœuds de connexion (fonds, client, écosystème), et bouton "Compte suivant" (file de travail).
3. **Brief personne** : au clic sur une personne, pitch 30 secondes call-ready + panneau `why / limits / angle / social_proof`, l'analyse qui justifie (ou pas) de la contacter.
4. **Draft** : bouton qui affiche le mail pré-écrit pour cette personne.

S'y ajoutent deux onglets :

- **Agent** : la surcouche d'orchestration end-to-end (du signal à l'envoi). Barre de commande en langage naturel, entrée de leads bruts (noms, entreprises) qui déclenche le pipeline complet (Sillage → FullEnrich → mapping → brief, simulé), stratégie d'outreach par compte (séquence multi-canal email + LinkedIn dérivée des règles du moteur d'activation) et lancement en autonomie (email uniquement, exécution simulée avec journal). Le gate y est un checkpoint, pas un mur : sur un compte à avertissements (HUMAN, EXPLORE, contact récent), l'agent refuse de partir seul mais l'humain peut lancer explicitement, avec override consigné au journal.
- **Intégrations** : les sources que l'agent croise (HubSpot, Sillage, FullEnrich, Claude, Gmail, Slack, Granola, Notion), avec connexion simulée en V1 (toggle localStorage, OAuth réel en couche suivante).

Chaque contact a aussi une **page stratégie dédiée** (`#/account/:id/person/:idx/sequence`) : workflow multi-canal éditable façon n8n (nœuds, branches conditionnelles, édition des étapes, exécution simulée).

Le moment clé de la démo : le compte **Quarnelis** est en `verdict.tier = "HUMAN"` (deal ouvert dans le CRM, guard anti-collision). Sur ce compte, le bouton Draft est **bloqué** et affiche la raison du blocage au lieu du mail. C'est le gate fail-closed du moteur d'activation, rendu visible. Le compte **Ostrevia** montre le tier intermédiaire `EXPLORE` : pain non confirmé, pas de draft tant que l'évidence manque.

## Lancer

Cette V1 n'a pas de backend : c'est un front statique qui fetch un fichier JSON. Le `fetch` refuse le protocole `file://`, il faut donc un serveur HTTP local, même minimal :

```
cd app
python3 -m http.server 8642
```

Puis ouvrir http://127.0.0.1:8642/ dans le navigateur.

## Structure

- `index.html` : structure de la page + CSS (single-file, pas de build step).
- `app.js` : routing par hash (liste, compte, brief, draft, intégrations) et rendu à partir de `data/*.json`.
- `agent.js` : l'onglet Agent (commande NL, pipeline leads, planification de séquence, autopilot simulé).
- `sequence.js` + `sequence.css` : la page stratégie par contact (workflow n8n-like éditable).
- `data/accounts.json` : la data mockée, contrat partagé avec le Bloc A (Sillage → comptes). Schéma complet champ par champ : `data/CLAUDE.md`.
- `data/integrations.json` : les intégrations affichées dans l'onglet dédié (mock).
- `CLAUDE.md` (ici et dans `data/`) : doc agent, à copier dans le repo de soumission avec le code.

## Le contrat data (`data/accounts.json`)

Array de Compte. Champs top-level, remplis par le **Bloc A** (Kubilay + Léo, Sillage) :

- `id`, `name`, `domain`, `url`, `size`, `location`, `stage`
- `signals[]` : `{ type, detail, detected_at, source }`
- `verdict` : `{ tier, why }` (tier = GO / EXPLORE / SKIP / HUMAN)

Champs remplis par les **Blocs B+C** (Mathieu + Valériane + Adrien, moteur d'activation) :

- `people[]` : `{ name, role, email, phone, linkedin_url, highlighted, contact_status: "never|contacted|client", pitch }`
- `people[].brief` : `{ why, limits, angle, social_proof[] }`
- `people[].draft` : le mail pré-écrit (string), ou `null`. Règle dure : `null` sur tout compte dont le tier n'est pas GO.
- `investors[]` : `{ name, type, round, is_client_portfolio, note }`
- `connections[]` : `{ entity, kind: "fund|client|person|community", relation, strength, detail }` (le graphe de nœuds)

Détail complet et sémantique : `data/CLAUDE.md`.

En V1, tout ce fichier est écrit à la main. En couche suivante, `people[]` sera rempli par un appel FullEnrich réel et `draft` par un appel Claude réel sur le `brief`.

## Frontière du mock (assumée, dite au pitch)

Cette V1 n'appelle aucune API et n'a aucun backend : la data est 100% fictive, écrite à la main dans `data/accounts.json`. C'est le squelette du parcours, pas le livrable final (la submission finale doit montrer les 3 sponsors réels). Couches suivantes prévues, dans l'ordre :

1. Backend proxy minimal (Express) pour porter les clés côté serveur.
2. Draft réel : appel Claude sur le `brief`, passé par le gate.
3. FullEnrich réel : enrichissement `people[]` en live.
4. Sillage réel : au moins un compte réel injecté par le Bloc A.

## Garde-fous

- **Public-safe** : aucun nom réel, aucune donnée personnelle réelle, aucune clé. Tous les noms, emails, téléphones et URLs LinkedIn de `accounts.json` sont fictifs.
- **Draft-only** : jamais d'envoi automatique. Le bouton affiche un mail à relire, un humain approuve avant tout envoi réel.
- **Gate fail-closed** : sur un compte en `verdict.tier = "HUMAN"`, le draft est bloqué par défaut, pas l'inverse. Voir le compte Quarnelis.
