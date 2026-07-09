# Moteur d'analyse de deals HireSweet (critères de qualification)

> Version 1.0, 2026-07-09, rédigé par Mathieu (via Fable). **C'est CE fichier qui pilote les outils** : Bloc A le donne à Claude avec le MCP Sillage pour trouver des comptes, Bloc B s'en sert pour la surbrillance et les briefs.
> Public-safe : aucune donnée client nommée. Consommable tel quel par un agent.

## 0. Comment l'utiliser (méthode actée en synchro)

1. Bloc A : "Je suis Léo, je cherche des leads avec ces caractéristiques" + ce fichier + MCP Sillage (+ doc) → Claude explore et propose comment trouver ~10 comptes qui matchent, avec le signal déclencheur.
2. Bloc B : pour chaque compte, ce fichier définit QUI mettre en surbrillance dans l'organigramme et QUOI dire dans le brief (angle, limites).
3. Chaque verdict doit être EXPLICABLE en une phrase : "signal X + fit Y" (c'est la colonne "pourquoi" de la liste).

## 1. Ce que vend HireSweet (pour cadrer le "fit")

Marketplace de recrutement tech : on connecte des candidats tech préqualifiés (devs, EM, data/ML, produit) avec des startups/scale-ups. Modèle : 15% au succès, 0 EUR si pas de recrutement, garantie 4 mois. Preuves utilisables dans un angle : 60-75% de taux de réponse candidats (vs ~20% en direct LinkedIn), 1150+ placements, premiers profils sous 5 jours, time-to-hire ~3 semaines. (Ne JAMAIS avancer un chiffre de "pool de candidats".)

**Donc un bon compte = une boîte qui doit recruter des profils tech/produit rares, vite, et qui valorise la qualité plutôt que le volume de CV.**

## 2. Filtres durs (éliminatoires, dans cet ordre)

- **Tech produit** : la boîte construit un produit logiciel/IA (pas une agence, pas une ESN pure, pas un cabinet de recrutement, c'est un compétiteur).
- **France** : siège ou équipe tech significative en France (Paris = sweet spot, remote-FR OK).
- **Taille** : ~5 à ~250 employés. Sweet spot : **10-80**. En dessous de 5 : trop tôt sauf si signal "founder early" (voir §4). Au-dessus de 250 : process achats/TA internes lourds, cycle long.
- **Besoin tech/produit** : recrute (ou va recruter) des ingénieurs/EM/data/produit. Une boîte qui ne recrute QUE des sales/ops est un fit faible (notre track record sales est mince).

## 3. Guards (ne JAMAIS contacter à froid, router vers un humain)

- Client actif ou process de recrutement en cours avec nous.
- Deal ouvert dans le CRM avec un owner actif.
- Contact < 30 jours par quelqu'un de l'équipe (dédup HubSpot obligatoire avant tout draft).
- Personne taggée do-not-contact (power map Sillage ou CRM).

→ Ces cas ne sont pas des "mauvais leads", ce sont des comptes à traiter par l'humain qui possède la relation. L'agent doit le DIRE, pas les jeter.

## 4. Signaux why-now (ce qui déclenche l'approche, du plus fort au plus faible)

| Force | Signal | Pourquoi ça compte | Fenêtre |
|-------|--------|--------------------|---------|
| ⭐⭐⭐ | **Levée récente** (seed, A ou B) | Budget frais + pression de croissance = plan de recrutement tech quasi certain | < 6 mois, idéal < 3 |
| ⭐⭐⭐ | **Hiring wave tech** : 3+ postes eng/data/produit ouverts | Besoin actif, douleur immédiate, budget validé | postes < 30 jours |
| ⭐⭐⭐ | **Nouveau CTO / VP Eng / Head of Talent** | Nouveau décideur, mandat de structuration, pas d'habitudes fournisseurs | prise de poste < 90 jours |
| ⭐⭐ | **Champion move** : un contact qui nous connaît arrive dans la boîte | Porte d'entrée chaude, taux de réponse x10 vs cold | < 60 jours |
| ⭐⭐ | **Founder early** : boîte < 2 ans, < 15 personnes, souvent pré-levée | Quasi jamais contactés, pas encore outillés, loyaux si on les aide tôt. Notre edge. | permanent |
| ⭐⭐ | **Competitor engagement** : la cible interagit avec des cabinets de recrutement / job boards | Intent recrutement explicite, ils cherchent déjà une solution | < 30 jours |
| ⭐ | Croissance headcount rapide (>20%/6 mois) sans postes publiés | Besoin probable mais non exprimé, angle plus spéculatif | continu |

**Règle de corroboration** : 1 signal fort = GO. 2 signaux moyens qui convergent = GO. 1 signal faible seul = EXPLORE (enrichir avant de décider).

## 5. Qui contacter (surbrillance organigramme + limites par rôle)

| Stade de la boîte | Cible n°1 | Cible n°2 | Limites à mettre dans le brief |
|-------------------|-----------|-----------|-------------------------------|
| < 20 pers / pré-A | **CEO / founder** | CTO co-fondateur | Le CEO décide tout mais est sur-sollicité : l'angle doit être ultra spécifique (son poste ouvert, sa levée), jamais générique |
| 20-80 pers / A-B | **CTO ou VP Eng** | CEO (mentionnable), Head of Talent s'il existe | Le CEO n'est plus forcément in-zone sur le recrutement opérationnel : préférer le hiring manager du poste |
| 80-250 pers / B+ | **Head of Talent / TA** | VP Eng (hiring manager) | Le TA a déjà des fournisseurs : l'angle = qualité/vélocité vs son stack actuel, pas "on existe" |

## 6. L'angle (quoi dire, ce qui alimente le brief et le draft)

Un bon angle combine, dans l'ordre de priorité :
1. **Le signal** (spécifique, daté) : "vous avez ouvert 4 postes backend ce mois-ci" / "félicitations pour la série A" est INTERDIT seul, le signal doit porter une implication : "4 postes backend + un délai de 3 mois, c'est là où un pipeline candidats préqualifiés change l'issue".
2. **La preuve** (traçable) : un placement pertinent (même rôle / même stack / même stade), une métrique publique (§1). Jamais de preuve inventée : pas de preuve = angle produit générique assumé, et le brief le dit.
3. **Le chemin** (si warm) : relation existante, intro possible, ex-contact commun. Un chemin chaud PRIME sur un bon angle cold.

**Kill-list copy** (un draft qui contient ça est mauvais) : compliment/félicitations sans implication, leçon de marché ("le recrutement tech est difficile"), volumétrie invérifiable, plus de 150 mots, français par défaut si la boîte opère en anglais.

## 7. Verdict attendu (l'output du moteur)

Pour chaque compte, l'agent rend :
- **GO** : filtres durs OK + signal fort (ou 2 moyens) + pas de guard. → passe en vue compte.
- **EXPLORE** : fit OK mais signal faible ou données manquantes. → enrichir (FullEnrich) puis re-trier.
- **SKIP** : filtre dur violé. → dire lequel.
- **HUMAN** : guard déclenché. → nommer le guard, ne rien drafter.

Toujours accompagné d'UNE phrase : "{signal} + {fit}, contacter {rôle} avec l'angle {angle}". C'est cette phrase qui s'affiche dans la liste du Bloc A.
