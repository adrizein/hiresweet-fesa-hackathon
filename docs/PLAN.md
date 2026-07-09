# PLAN JOUR J, orchestration Account Intelligence Tool

> Dernière MAJ: 2026-07-09 | Rôle : vision d'ensemble + découpage + contrats entre blocs + recos sur les points ouverts. Léo (capitaine) tranche, ce doc prépare ses décisions.
> Compagnons : `SPECS.md` (le backbone produit) · `MOTEUR-ANALYSE.md` (les critères, LIVRÉ, débloque Bloc A).

## 1. Vision d'ensemble en une image

```
  BLOC A (Kubilay + Léo)              BLOC B+C (Mathieu + Valériane + Adrien)
  "10 comptes + pourquoi"             "qui contacter, quoi dire, draft"

  MOTEUR-ANALYSE.md ──> Claude+Sillage ──> accounts.json ──> UI vue compte ──> brief ──> draft
                                            ▲ LE CONTRAT           (organigramme      (Claude)
                                            entre les 2 teams       + FullEnrich)
```

**Le point de couplage unique entre les deux teams = `accounts.json`.** Si ce contrat est figé tôt, les deux blocs avancent en parallèle sans se bloquer : Bloc B peut développer sur un `accounts.json` d'exemple écrit à la main pendant que Bloc A branche Sillage.

## 2. LE contrat de données (à figer en premier, 10 minutes)

`data/accounts.json` = array de Compte. Proposition (colle au data model des specs) :

```json
{
  "id": "acct_lumengrid",
  "name": "Lumen Grid",
  "domain": "lumengrid.io",
  "url": "https://lumengrid.io",
  "size": 45,
  "location": "Paris",
  "stage": "Series A",
  "signals": [
    { "type": "funding_round", "detail": "Series A announced this week", "detected_at": "2026-07-09", "source": "sillage" }
  ],
  "verdict": { "tier": "GO", "why": "Série A récente + équipe tech en scale, contacter le CTO avec l'angle vélocité" },
  "people": []
}
```

- **Bloc A remplit** : tout SAUF `people` (les interlocuteurs = enrichissement, acté).
- **Bloc B remplit** : `people[]` via FullEnrich : `{ name, role, email, phone, linkedin_url, highlighted: true/false, contact_status: "never|contacted|client" }` + le `brief` par personne `{ why, limits, angle, social_proof[] }`.
- `verdict.tier` suit `MOTEUR-ANALYSE.md` §7 : GO / EXPLORE / SKIP / HUMAN. `why` = LA phrase affichée dans la liste.

## 3. Découpage fin par personne (proposition, Léo arbitre)

| Qui | Bloc | Livrable concret | Peut démarrer |
|-----|------|------------------|---------------|
| **Léo** | A + capitaine | Le flow Claude+Sillage : critères → ~10 comptes réels avec signal. Arbitrages scope. | maintenant (moteur livré) |
| **Kubilay** | A | Le remplissage `accounts.json` conforme au contrat + fallback liste statique V0 si Sillage coince | maintenant |
| **Adrien** | B (moteur) | La vue compte : organigramme cliquable + surbrillance + branchement FullEnrich (people) | maintenant sur un accounts.json d'exemple |
| **Mathieu** | B (contenu) + C | La logique brief (pourquoi/limites/angle, règles = MOTEUR-ANALYSE §5-6) + prompt du draft Claude | maintenant |
| **Valériane** | C + présentation | Qualité des drafts (kill-list copy §6), script démo 2 min, deck, side challenge LinkedIn | dès premiers drafts |

## 4. Les 5 points ouverts : recommandations (à faire trancher par Léo)

1. **HubSpot : LECTURE SEULE pour le MVP.** Un seul usage : `contact_status` par personne ("déjà contacté le X par Y" affiché dans le brief + guard dédup avant draft). L'écriture (log des drafts) = post-MVP. C'est le plus petit périmètre qui débloque le Bloc C et c'est un guard vendeur au pitch.
2. **Persistance : fichiers JSON locaux dans `data/` (gitignoré).** `accounts.json` = LA base du jour. HubSpot/base dédiée = après le hackathon. Zéro infra, zéro risque.
3. **Échange des critères : GIT.** `criteria/lead-criteria.md` dans le repo (poussé). Versionné, visible de tous, consommable par les agents Claude directement. Slack sert à notifier "critères mis à jour", pas à transporter le fichier.
4. **Frontière du mock : au moins 1 appel RÉEL de chaque sponsor dans la démo** (règle des 3 outils + critère 3 = 25 pts). Réel : Sillage (liste ou 1 compte), FullEnrich (enrich 1-2 personnes en live, clé validée, ~100 crédits), Claude (draft). Mock accepté : structure d'organigramme si la data people est pauvre, historique HubSpot si token absent. Le pitch DIT ce qui est mock (honnêteté = crédibilité).
5. **Dépendance Sillage : aujourd'hui Sillage only, mais coder `signals[].source` dès maintenant** (déjà dans le contrat). Ajouter Harmonic/keyword = changer une source, pas l'architecture. Zéro coût aujourd'hui, optionnalité gratuite.

## 5. Protocole de synchro (léger, jour J)

- **Contrat d'abord** : figer `accounts.json` (§2) AVANT de coder les deux côtés. 10 min à deux (Léo + Adrien).
- **3 checkpoints** : ~13h (le contrat circule ? un compte réel traverse ?), ~15h30 (parcours complet liste → brief → draft sur 1 compte ?), **16h30 = FREEZE** (plus de features, on répète la démo 2 fois + on prépare la soumission : vidéo 2 min, description, repo propre).
- **Git** : branches courtes par module, merge par Léo ou Adrien, pas de PR formelle. `docs/` + `criteria/` = source de vérité partagée.
- **Le "done" du MVP** (des specs) : liste → compte → personne → brief → draft, sans friction, joli. Tout le reste est couche d'expansion.

## 6. Ce qui existe déjà et se réutilise (sans forcer)

| Asset | Réutilisable pour | Attention |
|-------|-------------------|-----------|
| `criteria/lead-criteria.md` (livré) | Bloc A (recherche) + Bloc B (surbrillance, briefs, angles) | version 1.0, itérer si les résultats Sillage sont à côté |
| Pattern connecteur FullEnrich (submit + poll, clé validée) | Bloc B enrichissement | l'API bulk est ASYNC, prévoir le poll |
| Kill-list copy (`criteria/lead-criteria.md` §6) | Bloc C qualité drafts | c'est un différenciateur au pitch (l'agent qui refuse le slop) |
| Skeleton PR #2 (serveur Express + contrats + tests) | Plomberie si utile | ⚠️ l'UI inbox ne correspond plus au produit (pivot vers vue compte/organigramme). Le capitaine décide : merger pour la plomberie ou fermer. |
| Comptes de démo | Démo réaliste | Données fictives ou publiques uniquement dans ce repo (il sera public). Jamais de données clients réelles. |

## 7. Risques du jour (et parades)

- **Le visuel prend tout le temps** ("la démo prime" peut avaler la journée) → parade : vue compte = layout simple d'abord (cartes + surbrillance), le beau à 15h30 si le flow marche.
- **Sillage ne rend pas ce qu'on espère sur nos cibles** (dit en synchro : segmenté enterprise) → parade : V0 liste statique actée dans les specs ; le moteur d'analyse s'applique quand même (le "pourquoi" reste réel).
- **Deux teams qui divergent sur le format de données** → parade : le contrat §2, figé avant de coder.
- **La démo de 17h30 pas répétée** → parade : freeze 16h30 non négociable, 2 répétitions, Valériane chronomètre.
