# Leads digest — session du 2026-07-09

> Fichier local, gitignoré (données réelles, ne jamais committer). À partager directement
> avec l'équipe (Slack/email), pas via GitHub. Chaque entrée = signal réel observé + raison
> honnête de la présence dans la liste. Rien n'est un GO automatique : voir verdict.

## Comment lire ce doc

- **GO** = signal fort ou corroboré, prêt pour enrichissement FullEnrich + premier contact
- **EXPLORE** = fit correct mais signal seul et faible → à corroborer avant d'agir
- **HUMAN** = client actif ou compte protégé → ne pas prospecter à froid, router en interne
- **SKIP** = hors persona (taille, secteur) → ne pas dépenser de crédits dessus
- **PENDING** = signal détecté mais donnée insuffisante (contact non enrichi, domaine non résolu)

---

## GO — hiring wave fraîche, à enrichir en priorité

### Orus — orus.eu
- **Signal** : 22 offres ouvertes en simultané (tech, sales, ops, compliance), dont un poste de
  "Talent Acquisition Specialist" pour devenir le **4ème recruteur interne** — signe clair de
  volume de recrutement qui dépasse leurs capacités actuelles.
- **Pourquoi ce compte** : Série B 25M€ (juin 2025), 30→100+ collaborateurs en 18 mois, plan à
  200 collaborateurs d'ici 2027, expansion Espagne/Pays-Bas. Financement + hiring wave = signal
  ⭐⭐⭐ (fort, non corroboré par un 2e type de signal pour l'instant).
- **Contact** : non enrichi ce tour — prochaine étape : FullEnrich sur Margot (Talent Acquisition
  Lead, citée dans une offre) ou un profil Sales/RH plus senior.
- **Statut compte HireSweet** : non trouvé dans les clients actifs connus → prospect neuf.

### Illuin Technology — illuin.tech
- **Signal** : 12 offres ouvertes en simultané, mélange tech pur (Lead Software Engineer, Lead
  Data Scientist, Solution Architect IA, Data Science Manager, Senior AI Engineering Manager)
  et business (Channel Manager, RevOps/Sales Ops).
- **Pourquoi ce compte** : "nouvellement adossé au fonds privé Seven2", entrée en "phase
  d'investissement et de forte croissance" — recrutement tech ET business simultané = budget
  débloqué. Signal ⭐⭐⭐ (funding + hiring wave).
- **Contact** : non enrichi ce tour.
- **Statut compte HireSweet** : non trouvé dans les clients actifs connus → prospect neuf.

---

## EXPLORE — fit correct, signal seul et faible (déjà identifié plus tôt dans la session)

### 365Talents — 365talents.com
- **Signal** : webinar co-organisé avec Figures (VP Product cité), sujet transparence salariale
  — `ecosystem_mention` détecté via mentions sur les posts Figures.
- **Pourquoi EXPLORE et pas GO** : fit filtres durs OK (SaaS RH, France, 64 pers.) mais un seul
  signal faible (pas de levée, pas de hiring wave, pas de nouveau CTO) — à corroborer avant
  d'agir.

### Mayday — mayday.fr
- **Signal** : partenariat événementiel avec iAdvize (Happy Hour All4Customer Paris, CEO cité) —
  `ecosystem_mention`, mars 2024 (signal ancien).
- **Pourquoi EXPLORE et pas GO** : fit OK (127 pers., France) mais signal ancien et faible seul.

---

## EXPLORE — engagement uniquement, pas de hiring wave (à corroborer)

### Kolecto — kolecto.fr, Mendo — mendo.cloud, Inato — inato.com
- **Signal** : uniquement des likes/commentaires LinkedIn sur leurs propres posts (annonces de
  levée pour Mendo, contenu produit pour Kolecto, félicitations internes pour Inato) — pas
  d'offre d'emploi détectée ce tour.
- **Pourquoi pas GO** : signal ⭐ (engagement seul) — pas assez pour agir seul, per la règle de
  corroboration. À surveiller si un 2e signal (hiring, funding) apparaît.

### Nabla — nabla.com
- **Signal** : nouvelle Directrice France annoncée (Laurie Soffiati, ex-ENA/CNAM), accélération
  du marché français.
- **Pourquoi intéressant sans être un GO immédiat** : signal de type "nouveau décisionnaire" —
  bon point d'entrée si/quand Nabla recrute en France, mais pas un signal de recrutement en soi.
  À rapprocher d'un futur signal hiring pour corroborer.

---

## HUMAN — comptes déjà actifs, ne pas prospecter à froid

### iAdvize — iadvize.com
- **Signal réel** : 5 offres ouvertes (Head of Data, Sales Director New Business, Enterprise
  Sales AM, Enterprise CSM, System Engineer) — signal de recrutement fort en temps normal.
- **Pourquoi HUMAN et pas GO** : client récent (deal signé) → guard "client actif" déclenché.
  Bon signal d'**upsell/expansion** à remonter en interne, pas en prospection à froid.

### Upway — upway.shop / upway.fr
- **Signal** : 3 placements récents confirmés (avril-juin 2026, HubSpot + Slack #team) ; ce
  tour, 37 offres ouvertes détectées côté Sillage (surtout ops/mécanique DE/BE/NL, quelques
  postes Paris comme Founding Product Designer, Group Treasury Manager).
- **Pourquoi HUMAN et pas GO** : guard client actif → router vers la personne qui possède
  la relation, ne pas recontacter à froid malgré le volume de postes ouverts.

---

## SKIP — hors persona ou hors scope, ne pas dépenser de crédits

### Mistral AI — mistral.ai
- **Signal** : 200+ détections `jobPostingKeywordDetection` sur 2 pages (pagination non
  terminée), ex. "AI Engineer", "CyberSecurity Engineer" — volume massif.
- **Pourquoi SKIP** : 1072 employés, très au-dessus du persona (1-100, idéal 10-80). Entreprise
  déjà hyper-visible, saturée d'attention recruteur — différenciation HireSweet faible ici.
  Signal réel mais volontairement non travaillé pour ne pas gaspiller de budget FullEnrich.

### Escape, Wiremind, Foodles, Indy — déjà clients HireSweet
- **Signal** : détections job-posting/keyword confirmées (`data/hiring-targets.json`, 5 postes
  chacun pour Escape/Wiremind/Indy, 1 pour Foodles) mais ce sont des comptes déjà clients dans
  la top-account list → aucun de ces signaux n'est un nouveau prospect. Limite structurelle déjà
  documentée : les agents `keyword_detection`/`job_posting_keyword_detection` ne scannent que
  la top-account list, jamais le marché large.

### FullEnrich — fullenrich.com
- **Ne pas traiter comme un prospect.** FullEnrich est un partenaire outil du hackathon (sponsor),
  pas une cible commerciale — sa présence dans la top-account list est un artefact de setup, pas
  un signal métier. Garde-fou à documenter explicitement pour éviter un faux pas en démo.

---

## PENDING — signal insuffisant ce tour

- **Riot** : jamais résolu (nom trop générique pour FullEnrich `search_companies`) — domaine/
  LinkedIn exact toujours attendu du côté utilisateur.
- **Theodo (theodo.com), Tomorro (tomorro.co), Emerton (emerton.com)** : résolution de domaine
  échouée ou aucun contenu job-posting retourné ce tour — à revérifier avec le bon domaine avant
  de conclure à une absence de signal.
- **Mirakl** : domaine correct, mais aucune offre d'emploi retournée ce tour (seulement des posts
  d'entreprise) — probablement hors du scope de contenu capté pour ce compte, à re-tester plus
  tard.

---

## Résumé actionnable pour l'équipe

1. **2 prospects neufs prioritaires** (Orus, Illuin Technology) — hiring wave + funding, prêts
   pour un enrichissement FullEnrich sur un contact Talent/RevOps avant tout premier contact.
2. **2 EXPLORE anciens** (365Talents, Mayday) — signal seul, à corroborer avant d'agir.
3. **2 comptes clients** (iAdvize, Upway) — bons signaux d'upsell, à remonter en interne, jamais
   en prospection froide.
4. **1 SKIP volontaire** (Mistral) — trop gros pour notre persona, volume de signal non exploité
   par choix, pas par échec.
5. **1 garde-fou à ne pas oublier en démo** : FullEnrich ne doit jamais apparaître comme cible
   commerciale malgré sa présence technique dans la top-account list.
