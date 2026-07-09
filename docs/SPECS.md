# SPECS, Account Intelligence Tool (backbone, PAS des specs finales)

> Dernière MAJ: 2026-07-09 (jour J) | Source: synchro équipe (Granola "Spec Hackton") + rédaction Mathieu | Statut: **backbone d'inspiration, Léo (capitaine) arbitre ce qui se builde**
> Compagnons : `MOTEUR-ANALYSE.md` (les critères qui pilotent tout, débloque Bloc A) · `PLAN-JOUR-J.md` (orchestration, contrats entre blocs, points à trancher)

---

## 1. Vision (le "pourquoi")

Un outil de prospection B2B qui transforme un **signal brut** en **stratégie d'approche complète et visuelle**, en une seule interface.

**Phrase de référence** : *"Je rentre un nom de compte ou de personne → ça m'ouvre le contexte du compte, la stratégie de contact, les points d'entrée."*

**3 principes non négociables** :
1. **La démo prime** : le produit doit être joli, fluide, et se comprendre en 10 secondes. Le visuel n'est pas cosmétique, c'est le produit.
2. **Socle avant agent** : un agent est trivial à faire *si la data et le socle existent*. On construit d'abord data + visualisation ; l'agentique est une couche au-dessus, pas une fondation.
3. **Un signal bout en bout avant de multiplier** : faire marcher UN cas d'usage complet, puis élargir les canaux.

## 2. Core Concepts (le vocabulaire commun)

| Concept | Définition | Règle clé |
|---|---|---|
| **Compte** | Entité centrale. Input : nom de lead, nom de boîte, ou URL | Attributs : taille, localisation, stade, signaux, interlocuteurs |
| **Mapping** | Organigramme visuel du compte | **La brique fondamentale.** Chaque personne = un carré cliquable |
| **Surbrillance** | Mise en avant des personnes pertinentes pour le cas d'usage | Ex. HireSweet : rôles concernés par le recrutement (CEO, Sales, People) |
| **Brief personne** | Fiche générée au clic sur une personne | Pourquoi la contacter + limites + coordonnées + social proof + angle |
| **Draft sequence** | Génération one-click d'un mail personnalisé | S'appuie sur : rôle + contexte compte + signal + social proof |
| **Moteur d'analyse** | Liste de critères qui définit un "bon compte" | **C'est lui qui pilote les outils.** → `MOTEUR-ANALYSE.md` (livré) |

## 3. MVP, périmètre, user stories, acceptation

### Bloc A, Trouver les leads *(Kubilay + Léo)*
**User story** : *"Je suis Léo. J'appuie sur un bouton → je vois 10 comptes pertinents avec la raison pour laquelle ils sont pertinents."*
- Input : critères de qualification (`MOTEUR-ANALYSE.md`)
- Source : **Sillage via MCP**, un seul signal, un seul canal
- Output : liste de ~10 comptes, chacun avec son signal déclencheur
- Une liste locale/statique est acceptable en V0
**Done quand** : la liste s'affiche avec, pour chaque compte : nom, signal, et lien vers la vue compte.

### Bloc B, Analyser et présenter le lead *(Mathieu + Valériane + Adrien)*
**User story** : *"Je clique sur un compte → je vois qui contacter et pourquoi, sans réfléchir."*
- Clic sur compte → **vue compte** : organigramme + personnes en surbrillance
- Enrichissement coordonnées via **FullEnrich**
- Clic sur personne → **brief** : *Pourquoi elle* (ex. "CEO, vient de lever, doit recruter") · *Ses limites* (ex. "pas forcément in-zone, préférer le Head of Sales") · *Coordonnées* · *Angle + social proof*
**Done quand** : le parcours liste → compte → personne → brief fonctionne sans friction et se démo bien.

### Bloc C, Base pour contacter *(Mathieu + Valériane + Adrien)*
**User story** : *"Depuis le brief, un clic → j'ai un mail draft prêt à personnaliser."*
- Bouton "Draft sequence" → mail généré par **Claude** (pas de séquenceur externe)
- Niveau MVP acceptable : contextualisé simple ("tu es CEO, tu viens de lever, tu dois recruter, nous on fait ça")
- Envoi réel **non requis** : mock accepté. Cible ultérieure : one-click Gmail
**Done quand** : chaque personne du mapping peut produire un mail draft cohérent avec son brief.

### Hors périmètre MVP (explicitement)
- Autopilote, multi-signaux, multi-canaux, request intro → couches d'expansion (§6)
- Persistance/enregistrement des leads → point ouvert (§7)
- Envoi réel de mails

## 4. Outils & méthode

| Outil | Rôle | Statut |
|---|---|---|
| **Sillage (MCP)** | Signal + identification comptes | MVP, source unique |
| **FullEnrich** | Enrichissement personnes | MVP (clé validée, ~100 crédits) |
| **Claude** | **Orchestrateur central** de tout le flow | MVP |
| **HubSpot** | Historique de contact, dédup | Bloquant fonctionnel, périmètre à trancher (§7) |
| **Gradium** | Canaux alternatifs (vocaux WhatsApp, démos) | Clés en place, couche 5 |
| **Harmonic** | Source complémentaire | Couche 3 |

**Méthode de travail avec Claude** (pattern validé, les devs ne manipulent PAS la doc des outils) :
1. Générer les critères : fait → `MOTEUR-ANALYSE.md`
2. Poser le problème : *"je suis Léo, je cherche des leads avec ces caractéristiques"*
3. Donner les tools (MCP Sillage + doc + FullEnrich) : *"explore la doc et dis-moi comment tu résoudrais le problème"*
4. Claude propose la solution → les devs implémentent

## 5. Architecture

```
[MOTEUR-ANALYSE.md, critères, Mathieu]
                 │
                 ▼
        [Claude, Orchestrateur]
        │           │           │
        ▼           ▼           ▼
  [Sillage MCP] [FullEnrich] [HubSpot]
   comptes      enrichissement  historique/dédup
                 │
                 ▼
   ┌─────────────────────────────┐
   │ UI                          │
   │ Liste comptes               │
   │   └─ clic → Vue compte      │
   │        (organigramme)       │
   │        └─ clic → Brief      │
   │             └─ Draft mail   │
   └─────────────────────────────┘
                 │
                 ▼  (couche 4)
        [Autopilote, agent]
```

**Data model minimal** :
- `Compte` : nom, URL, taille, localisation, stade, signaux[], personnes[]
- `Personne` : nom, rôle, coordonnées, pertinence (surbrillance oui/non), brief, statut contact (HubSpot)
- `Brief` : raison de contact, limites, angle, social proof[]

## 6. Couches d'expansion (post-MVP, dans l'ordre)

1. **Fluidité sales** : flèche "compte suivant" (file de travail), pitch une phrase par interlocuteur (la boîte, la personne, pourquoi j'appelle), barre de recherche langage naturel sur un compte.
2. **Social proof & graphe** : base clients → auto-génération de social proof ("ils ont levé avec le fonds X qui a investi chez Y, notre client"), visualisation des **nœuds de connexion** ("hyper puissant pour un sales"), bouton **Request intro**.
3. **Multi-signaux** : 4-5 agents de détection (interne + externe) : prospects liés aux **clients**, aux **champions**, aux **partenaires**, aux **compétiteurs** (= cabinets de recrutement) ; keyword detection ; Harmonic. **Acté : côté client, pas côté candidat.**
4. **Autopilote** : sur liste validée, "passe tout en autopilote" → mappe, choisit la meilleure personne, drafte, envoie. Ne se construit QUE sur le socle.
5. **Multi-canaux** : Gradium (vocaux WhatsApp, démos one-shot), gifts automatisés. Cible : ~8 manières d'atteindre une personne depuis une interface.

## 7. Décisions actées vs points ouverts

**✅ Acté en réunion** :
- Claude = orchestrateur, pas de séquenceur externe
- Un seul signal pour le MVP
- Mock accepté pour la démo (pas tout fonctionnel)
- Côté client, pas côté candidat
- Noms des interlocuteurs = enrichissement (Bloc B), pas Bloc A
- Split : Kubilay + Léo = Bloc A / Mathieu + Valériane + Adrien = Blocs B+C
- Le MVP sert la **préparation** du sales, l'humain garde la touche finale (pas d'envoi autonome)

**❓ À trancher** (recos argumentées dans `PLAN-JOUR-J.md` §4) :
1. HubSpot : lecture seule ? affichage historique ? écriture ?
2. Persistance des leads : où enregistrer ?
3. Échange des critères : Git vs Slack
4. Frontière du mock : réel vs simulé dans la démo
5. Dépendance Sillage : quand ajouter d'autres sources ?

## 8. Dépendances immédiates

| Qui | Quoi | Bloque | Statut |
|---|---|---|--------|
| **Mathieu** | Moteur d'analyse (critères markdown) | Bloc A | ✅ LIVRÉ : `MOTEUR-ANALYSE.md` |
| **Léo** | Lancer l'environnement, démarrer le build | Tout | en cours |
| **Specs** | Trancher le périmètre HubSpot | Bloc C (dédup avant contact) | reco dans PLAN §4 |
