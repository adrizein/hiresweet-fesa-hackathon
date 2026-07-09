# Lead Analysis Reference, méthode Léo (verticale Sales HireSweet)

> Dernière MAJ: 2026-07-09 | Statut: à jour
> **Rôle** : document de référence pour un agent autonome de lead-gen (hackathon Agentic GTM). Il encode la manière dont Léo (captain, Account Strategist HireSweet, 100% recrutement Sales/AE depuis sept 2025) identifie et juge les leads : entreprises qui recrutent des profils sales et peuvent devenir clientes HireSweet.
> **Vision** : l'agent consommateur de ce doc doit trouver des leads, juger le signal, et enrichir via FullEnrich, Sillage, et des outils gratuits (Mantiks, BODACC, websearch).
> **Note public-safe / demo-safe** : ce document est anonymisé ET dépondéré. Les clients réels sont remplacés par des archétypes (secteur + stade + taille) ; aucun nom de client, candidat ou interlocuteur. Les **poids exacts de scoring, seuils chiffrés, tactiques de pricing internes et KPI de conversion sont retirés** et remplacés par des priorités ordinales (Très fort / Fort / Moyen / Faible). L'agent conserve la logique de jugement et l'ordre de priorité des signaux ; l'algorithme propriétaire chiffré n'est pas publié.

## 0. TL;DR opérationnel

**Le lead parfait** : SaaS B2B ou AI-first, France (Paris), 3-50 personnes, seed → Series A (levée <18 mois), affilié à un écosystème (YC, Hexa, Station F, Seedcamp), qui ouvre son **premier ou deuxième poste d'AE mid-level** au moment où son ARR décolle, et dont le **CEO/fondateur** est joignable. Bonus décisif : une relation HireSweet existante (ex-client tech, candidat en process chez eux, champion placé).

**Les 5 règles d'or** :
1. **Pas de signal frais = pas de lead.** Jamais de liste froide. 1 signal sourcé et daté = 1 approche.
2. **La relation bat le signal externe.** Ordre de force : candidat en process chez le prospect > ex-client tech qui ouvre un poste sales (cross-sell, le canal qui a produit la majorité des placements) > offre AE publiée > nouveau leader sales <6 mois > levée <3 mois > pair d'écosystème. La réactivation d'anciens clients est le canal le plus rentable ; l'outreach déclenché par un signal convertit nettement mieux que la liste froide.
3. **Cibler le CEO/fondateur.** Sur les placements sales 2026, l'acheteur est le founder dans la quasi-totalité des cas ; les contacts Head of Sales n'ont jamais closé un mandat.
4. **Disqualifier vite** : >600 employés, hors France, <5 personnes, cabinet/ESN/grand groupe, contacté récemment (au niveau domaine), deal ouvert, client actif, refus loggé, "Founding AE quasi-CRO" sur pre-seed (ne convertit pas).
5. **Le job posting seul ne suffit pas** : il faut un chemin vers le décideur + un momentum (prêt à passer des process maintenant, pas "voir des CV").

**Preuve que ça marche** : verticale lancée sept 2025, une dizaine de placements sales sur les 6 premiers mois chez 11 entreprises.

## 1. Contexte HireSweet et mission de l'agent

### 1.1 HireSweet et la verticale Sales

HireSweet est une marketplace de recrutement qui connecte des candidats préqualifiés avec des startups et scale-ups. Différenciation : qualité, précision, vélocité (pas le volume). Modèle économique public : **au succès, 0€ si pas de recrutement, garantie 4 mois**. Signaux outcome autorisés en externe : 60-75% de taux de réponse, 1150+ placements, time-to-hire ~3 semaines, premiers profils sous 5 jours. **Interdit : citer un volume de pool.**

La verticale **recrutement de profils Sales (AE en particulier)** a été lancée from scratch en septembre 2025 : même base clients HireSweet + acquisition de nouveaux clients spécifiquement sur cette verticale. Un Talent Strategist junior source les profils.

Le modèle au succès supprime la barrière budget d'entrée (pas de cash upfront) : même une seed serrée peut acheter. Le fit s'affaiblit quand la boîte a une TA interne forte (enterprise) car le modèle au succès se compare mal à un recruteur salarié. Argument universel : coût au succès très inférieur à un cabinet classique, et 0€ si pas de recrutement + garantie. Le temps fondateur a une valeur (raisonnement "combien te coûte une journée passée à sourcer toi-même").

### 1.2 Mission de l'agent consommateur de ce document

Trouver des leads (entreprises qui recrutent des profils sales en France) et **juger le signal** comme Léo le ferait :
1. Détecter les entreprises avec un signal de recrutement sales frais (offre AE/SDR ouverte, levée, nouveau leader sales, cross-sell sur client tech).
2. Qualifier contre l'ICP (§2) et scorer/tier (§3-4).
3. Éliminer via les disqualifiers (§5) et le dédup CRM.
4. Enrichir (FullEnrich, Sillage, Mantiks, BODACC, websearch, §9) : décideur, email, contexte.
5. Restituer chaque lead au format §11 avec verdict, signaux sourcés et angle d'approche. **Jamais d'envoi automatique : tout outreach reste draft + review humaine.**

## 2. ICP : à quoi ressemble une entreprise qui devient cliente pour du recrutement sales

### 2.1 Synthèse en une phrase (empirique)

L'entreprise qui achète du recrutement sales à HireSweet est un **SaaS B2B/IA parisien de 5 à 50 personnes, seed à Series A, souvent affilié à un écosystème (Hexa, YC, Station F, Seedcamp), très souvent déjà client tech HireSweet, qui ouvre son premier ou deuxième poste d'AE au moment où son produit commence à générer de l'ARR**. Le canal gagnant est le cross-sell porté par la relation existante. Les besoins "Founding AE quasi-CRO" sur des pre-seed et les comptes à exigences extrêmes sans placement préalable ne convertissent pas.

### 2.2 Firmographics cibles

- **Secteur** : SaaS B2B vertical ou AI-first en quasi-exclusivité (voice AI, AI devtool, SaaS BI, HR tech, fintech IA), puis insurtech, cleantech, infra AI. Exceptions plus grosses possibles si relation existante : ESN IA / scale-up RH ~250 pers.
- **Taille** : cœur de cible **3 à 50 employés**. Sweet spot élargi jusqu'à ~150 ; au-delà de ~600 le fit s'effondre (TA interne).
- **Stage** : pre-seed 2M€ → Series A ~13M$. Levée <18 mois = pression de recrutement maximale.
- **Géo** : France, Paris en pratique.
- **Affiliation écosystème** (signal de qualification fort) : Hexa, YC, Station F (Founders Program, Future40), Seedcamp, ou pair d'un VC déjà client.

### 2.3 Les 4 segments clients HireSweet (playbook général, transposé sales)

| Segment | Profil type | Ce qui convainc | Attention |
|---|---|---|---|
| **A, Scale-up Série A+** | insurtech/SaaS scale-up 50M+ | Social proof scale-up, performance vs cabinets, pricing dégressif, profils seniors | Ne pas se positionner "une marketplace de plus" |
| **B, Seed / Early Stage** | SaaS/cleantech early, YC | Zéro risque (0€ si pas de hire), fort taux de réponse, coût du temps fondateur | Ne pas pousser un pricing élevé |
| **C, Réactivation / ancien client** | ex-client tech dormant | Wins passées + social proof fraîche + dégressif. **Pour le sales : le segment roi (cross-sell tech→sales)** | Activer le bottom (RH) via le top (décideur) |
| **D, Post-levée / sous pression** | post-levée urgentes | Mode chasse, premiers profils sous 5j, équipe dédiée vs chasseur solo | On perd sur le storytelling, pas la capacité |

### 2.4 Déclencheurs récurrents observés (par fréquence)

1. **Bascule produit→commercialisation** : la boîte a son produit et son premier ARR (ex. un SaaS AI voice à 500k-1M ARR), elle ouvre son premier vrai poste AE, parfois en pivot direct d'un besoin Founding Engineer (cas documenté : Founding Engineer en février 2026 → AE en juillet 2026).
2. **Momentum post-placement tech** : un placement tech réussi crédibilise HireSweet, le client ouvre le front sales dans la foulée.
3. **Hyper-croissance / TA interne débordé ou absent** (ex. insurtech ~50 pers, +7-8 recrutements en 6 mois, recruteur interne en congé paternité).
4. **Post-levée** (cash → recrutement, souvent le moment du first AE hire).
5. **Nouveau leader sales nommé** (le signal le plus fort, cf §3.2) : un CRO/Head of Sales qui arrive constitue son équipe dans les 6 mois.

### 2.5 Séniorité des rôles qui convertissent

- **AE mid-level = le rôle dominant.** Sales Manager / Inside Sales possibles.
- **Red flag** : le "Founding AE quasi-CRO" (Enterprise, US-facing, trajectoire CRO) sur une pre-seed existe en demande mais ne convertit pas (§7.3).
- Repères de marché sur les packages AE observés (utile pour qualifier le budget candidat, pas un tarif HireSweet) : fixe typiquement 40-75k selon séniorité et secteur, variable souvent d'un ordre équivalent au fixe (OTE), quota calibré sur l'ACV de la boîte. Benchmark de raisonnement : "un package fixe+variable élevé correspond à un AE censé facturer autour d'1M€".

## 3. Signaux de recrutement sales, hiérarchie et pondération

### 3.1 La thèse chapeau (non négociable)

Le moteur new-business qui marche = une chaîne unique **signal → multi-touch (call + mail + LinkedIn) → valeur (profils rares pré-shortlistés) → mesure (logos par canal)**. Règle : **la liste est dérivée d'un signal, jamais une liste froide**. "1 signal = 1 email. Pas de signal (proof, levée, candidat, relation) : on ne contacte pas, on attend qu'un signal apparaisse."

⚠️ Nuance de périmètre : la doc ICP historique est écrite pour le recrutement **tech** (décideur CTO/VP Eng, signal "new tech leader"). Pour la verticale sales/AE, l'ICP firmographique se transfère tel quel, mais :
- le décideur cible devient **CEO / CRO / Head of Sales / VP Sales** (et le founder en early stage) ;
- le signal roi devient **"offre AE/SDR/Sales ouverte"** (remplace "offre eng ouverte") ;
- le signal "new tech leader" se transpose en **"nouveau Head of Sales / CRO nommé <6 mois"** (un leader sales qui arrive recrute son équipe).

### 3.2 Signaux, par ordre de priorité (poids exacts non publiés)

Priorité ordinale : **Très fort** > **Fort** > **Moyen** > **Faible**. Un compte multi-signal (≥2 signaux distincts) reçoit un bonus. Un contact déjà connu ajoute un petit bonus.

| Signal | Priorité | Définition | Transposition verticale sales |
|---|---|---|---|
| `new_sales_leader` | **Très fort** | Nouveau dirigeant sales (CRO/Head of Sales/VP Sales) nommé **<6 mois** ("changed jobs <90j" + presse). Un fondateur en poste depuis l'origine ne compte PAS | Il va constituer ou renforcer son équipe : moment idéal |
| `champion` | **Très fort** | Ex-candidat HireSweet placé, aujourd'hui chez un prospect = warm intro nommée | Y compris ex-candidats tech placés dans une boîte qui ouvre des postes sales |
| `vc_peer` | **Fort** | Pair financé par le même VC qu'un client existant | Identique |
| `alumni_move` | **Fort** | Ex-employé/candidat parti vers une nouvelle boîte | Identique |
| `reactivation` | **Fort** | Ex-client dormant à réactiver | **Cross-sell tech→sales** : ex-client tech qui ouvre un poste AE = double signal (relation + besoin) |
| `icp_deal_scored` | **Moyen** | Présent dans les deals ICP scorés | Identique |
| `top_scored` | **Moyen** | Bien classé au scoring interne (email reply, activité produit, taille, funding) | Identique |
| `recent_funding` | **Moyen** | Levée récente (cash → recrutement) | Post-levée = souvent le moment du first AE hire ou du scale de l'équipe |
| `abm_target` | **Moyen** | Compte ABM ciblé | Identique |
| `mapping_ia_icp` | **Faible** | Startup IA d'un mapping écosystème | Identique |
| `known_contact` | **Faible** | Contact sales/CEO déjà connu | Identique |

**Logique de score** : additionner les priorités des signaux distincts, bonus si multi-signal, bonus si contact connu, puis moduler par un verdict CRM (nouveau lead à contacter / réengagement d'un dormant = positif ; à coordonner avec un owner = neutre ; opt-out/à retirer = éliminatoire). Le résultat est un tiering Tier 1 / Tier 2 / Tier 3 (les seuils numériques exacts ne sont pas publiés).

### 3.3 Autres détecteurs de signaux

- **Offres publiées / Hiring Radar** : qui recrute cette semaine = source #1. Pour la verticale sales : chercher AE, Account Executive, SDR, BDR, Business Developer, Sales Manager, Head of Sales, CSM sur pages carrières, LinkedIn Jobs, Welcome to the Jungle. Mantiks : count/preview gratuits.
- **Move Detector** : changements de poste = signal d'achat (nouveau CRO, Head of Sales, Head of Talent).
- **BODACC/Pappers** : augmentation de capital = proxy levée (0€, lag 1-4 mois, précision pas rappel, vérifier le SIREN à la main si confidence=low).
- **Leading indicators** (pour juger un compte "à potentiel", direction seulement) : plus le nombre de sends est élevé, plus la probabilité de close monte fortement ; un process actif fait bondir la conversion ; l'absence de réponse positive après plusieurs semaines effondre les chances ; l'inbound convertit bien mieux que l'outbound.
- **Fraîcheur** : une social proof très récente a beaucoup plus d'impact ; tout scoring statique est une priorisation, pas la vérité terrain, le Step 0 live (§10) est le filet obligatoire.

## 4. Grille de jugement d'un lead (scoring + tiering T1/T2/T3)

Triage déterministe (0 LLM). Deux axes indépendants, T1 n'est pas "mieux" que T2 :
- **Axe A, ICP/valeur** : "ce compte vaut-il un outreach ?"
- **Axe B, complexité du contexte** : "l'historique est-il trop riche pour du batch ?"

### 4.1 Axe A, ICP/valeur, facteurs (par ordre d'importance)

1. Score composite du lead-index (s'il existe) : le facteur le plus lourd.
2. Nombre d'offres ouvertes (`open_jobs_count`) : plusieurs postes ouverts pèse plus qu'un seul.
3. `why_now` : funding récent (levée dans les ~6 derniers mois).
4. Effectif dans la cible (~10 à 500).
5. Présence de signaux (priorité / reply email / revenue).

### 4.2 Axe B, complexité, facteurs

Client déjà recruté (récent > ancien) ; plusieurs placements passés ; process passé fermé ; fiche client existante ; plusieurs interlocuteurs connus. Plus il y a d'historique, plus la complexité est haute (donc à traiter en manuel, pas en batch).

### 4.3 Guards (règles dures, AVANT la matrice)

| Guard | Condition | Effet |
|---|---|---|
| G1 `active_process` | process actif | T1 forcé |
| G2 `open_deal` | deal CRM ouvert | T1 forcé |
| G3 `account_active` | client actif (sends récents) | T1 forcé + `do_not_contact_cold` (passer par l'owner, jamais de cold) |
| G4 `insufficient_data` | absent du lead-index ET sans relationship/firmographics/careers | T3 + `needs_enrichment` |

### 4.4 Matrice de verdict

| | complexité basse | complexité haute |
|---|---|---|
| **ICP suffisant** | **T2** (semi-auto, review batch) | **T1** (manuel assisté) |
| **ICP faible** | **T3** (pas d'outreach) | **T1** (l'historique prime : jamais de batch sur un compte à contexte riche) |

Direction fail-closed : **doute sur la complexité → T1 ; doute sur l'ICP → T3**. (Les seuils numériques de bascule ne sont pas publiés.)

### 4.5 Firmographics, direction du scoring

- **Effectif** : sweet spot ~40-150 (meilleure LTV) ; bon ~10-40 ; acceptable jusqu'à ~400 ; **malus croissant au-delà de ~600** (enterprise : TA interne, fit faible pour le modèle au succès) ; <5 = trop tôt.
- **Levée** : <18 mois = pression de recrutement forte ; 18-36 mois = modérée.
- **Géo** : France uniquement.
- **Contact email connu** : léger bonus. Priorité mapping Hot > Warm.

### 4.6 Social proof, par ordre de force

- **Ex-candidat en poste chez le prospect** (le plus fort) : levier INTERNE (appeler l'ex-candidat pour entrer), jamais une phrase d'email.
- **Ancien client à réactiver** (fort ; décote si la relation est ancienne ; une proof de plus de ~3-4 ans est considérée éteinte).
- **Employeur réciproque / même batch d'accélérateur** (fort).
- **Pair financé par le même VC** (moyen à fort si le VC est focalisé ; faible si c'est un financeur généraliste qui investit dans des milliers de boîtes).
- **Volume d'écosystème** (faible) = proof faible.

## 5. Disqualifiers et red flags

### 5.1 Disqualifiers durs (retrait de liste)

1. **Client actif** (placement récent) → motion second-placement/rétention, jamais de cold (guard G3).
2. **Deal CRM ouvert** → laisser l'owner, ne pas cold-pitcher (guard G2).
3. **Contacté récemment** (tout canal, au niveau **domaine**, pas seulement l'email du contact) → retirer/différer.
4. **Opt-out / plainte spam / bounce dur** → retrait définitif (property `do_not_contact`, à interroger en PREMIER).
5. **Refus explicite loggé** → STOP relance (cas réel : refus CTO loggé quelques jours avant, la note disait "relancer" ; ne jamais relancer sur un refus explicite).
6. **Enterprise trop gros** hors proof réelle (TA interne forte) ; **non-France** ; **<5 employés** (trop tôt) ; **aucun signal**.
7. **Besoin non-fit** : le volume de recrutement seul ne suffit pas, il faut que les postes soient dans le pool HireSweet (cas réel : un plan orienté consultants/formateurs plutôt que des rôles dans le pool → fit partiel). Pour la verticale sales : vérifier que les postes ouverts sont bien des AE/SDR/BDR/CSM France, pas des channel partners US ou des profils retail.
8. **Conflit entre sources → non-envoi** (prudence par défaut).

### 5.2 Anti-patterns process

Dial de masse sur liste froide ; touche unique ; attendre au lieu d'envoyer la valeur ; relance vide ("vous avez vu mon message ?") ; ciblage hors signal ; réactivation du book déguisée en new-business.

### 5.3 Anti-patterns data

- Les deal stages CRM ≠ revenue/statut (peu fiables). Hiérarchie de vérité : sources de statut structurées > calls > messagerie interne > email > CRM.
- Data completeness check avant toute analyse (stop si écart significatif).
- **Jamais citer un volume de pool.** Stats autorisées uniquement : {60-75% taux de réponse, 1150+ placements, au succès, 0€ si pas de recrutement, garantie 4 mois, premiers profils sous 5 jours, ~3 semaines time-to-hire}.

## 6. Personas acheteurs : qui contacter

Recoupement sur les placements sales 2026 :

- **L'acheteur est le CEO/founder dans la quasi-totalité des cas, zéro TA/RH.** Sur les 11 entreprises ayant recruté un sales, l'interlocuteur qui a signé le mandat était le fondateur/CEO ou un co-fondateur.
- **Hiérarchie de ciblage** : CEO/fondateur > CRO/Head of Sales (s'il vient d'arriver, il recrute son équipe) > Head of Talent. Attention : les contacts Head of Sales observés en entrée (sur des comptes inactifs) n'ont **jamais closé** à ce jour ; ils qualifient le signal mais le mandat se signe avec le fondateur.
- **Taille oblige** : sur des boîtes de 3-50 personnes, le fondateur EST le hiring manager du first AE ; c'est lui qui ressent le bottleneck de closing.
- Persona secondaire utile : relais recruteuse/talent en warm intro (observé une fois), et le TA interne sur les comptes >50 pers.

## 7. Base d'exemples : cas historiques (positifs et contre-exemples)

### 7.0 Volumétrie et caveat data

- HireSweet accumule des années de placements (base de plusieurs milliers de deals depuis 2016). **Le ledger ne porte pas le rôle** : la liste sales ci-dessous est reconstruite par recoupement (canal équipe + fiches clients + emails), robuste car la verticale est récente et son équipe identifiable.
- **Verticale sales : une dizaine de placements confirmés (dont 1 avoir) chez 11 entreprises, janvier → début juillet 2026.** Ramp : ~5 mois entre le lancement (sept 2025) et le 1er closing, puis accélération nette.

### 7.1 Les placements sales 2026 (base empirique canonique, anonymisée)

| # | Archétype entreprise | Rôle | Date | Notes |
|---|---|---|---|---|
| 1 | HealthTech / care SaaS | AE Mid Market | févr.-mars 2026 | |
| 2 | InsurTech voyage B2B2C, ~15-50 pers | AE (cycles longs, anglais) | jan-févr. 2026 | fixe visé ~50-55k |
| 3 | SaaS BI self-service, ~10 pers (Alven + YC) | Sales | mars 2026 | réactivation ex-client tech |
| 4 | Voice AI SaaS | Sales | mars 2026 | client tech 2024 → sales |
| 5 | SaaS early-stage | Sales/BizDev | mars 2026 | profil aussi pitché à 2 autres comptes |
| 6 | Voice AI devtool, 8M seed | Founding AE MidMarket | ~avril 2026 | |
| 7 | SaaS AI prospection/sales, YC | AE | ~avril 2026 | 0→1,5M ARR en 12 mois |
| 8 | (même compte que #7) | 2e AE | ~mai-juin 2026 | **repeat client** |
| 9 | LLM security / AI testing | BDR | ~mai-juin 2026 | |
| 10 | (même compte que #1) | Sales, **AVOIR** | ~juin 2026 | rupture période d'essai (garantie jouée) |
| 11 | SaaS referral/growth | Founding AE | ~juin 2026 | |
| 12 | SaaS B2B | Sales/AE | juin 2026 | |
| 13 | Formation IA grands comptes | AE | ~début juil. 2026 | grands comptes, quota trimestriel |

**Lecture stratégique** : deux moteurs coexistent, **cross-sell tech→sales** (une relation tech existante qui rouvre un front sales) et **new logos sales-first** (acquisition directe sur signal de recrutement sales). Le template d'outreach cross-sell existe déjà ("Après vous avoir accompagné à recruter vos équipes techs...").

### 7.1bis Comptes à pipeline sales actif (contexte riche, archétypes)

| Archétype | Profil | État sales | Enseignement |
|---|---|---|---|
| **SaaS AI voice** (secteur auto), YC + Station F Future40, ~10 pers, 500k-1M ARR | compte sales le plus actif | AE : plusieurs process actifs | Bascule produit→commercialisation = moment d'achat idéal ; pivot documenté Founding Engineer → AE |
| **InsurTech TPE/PME**, ~50 pers, hyper-croissance (+7-8 en 6 mois) | Sales Manager + Inside Sales en process, placements tech 2026 | TA interne débordé = fenêtre ; grilles salariales fixes du client peuvent bloquer une négo |

### 7.2 Recherches sales actives (pipeline vivant, archétypes)

- **SaaS B2B (écosystème Hexa), client depuis 2024** : offre AE, candidats en 1ers échanges. Momentum post-placement tech.
- **SaaS HR Tech, ~4,6M$ levés** : vague AE en parallèle d'offres tech.
- **FinTech B2B IA (recouvrement), 3 personnes** : double mandat dès l'entrée, Founding Engineer ET sales. Entrée via la BU Sales.
- **CleanTech énergie, ~10 pers, 5,5M$** : carte sales en 1ers échanges pendant la pause estivale du volet tech.
- **ESN IA (NLP/GenAI), ~250 pers** : piste sales créée par un outbound proactif (email "est-ce que vous recrutez des Sales ?"), concrétisée en mandat sales 8 mois plus tard. Leçon : le semis proactif sur compte tech existant paie, avec un long cycle.

### 7.3 Contre-exemples (à apprendre par cœur)

1. **Le Founding AE trop senior** : besoin quasi-cofondateur (Enterprise, US-facing, trajectoire CRO) sur une pre-seed 2M€. Seul cas d'entrée "sales-first" observé, et il est resté bloqué : candidats pitchés, mails jamais ouverts. Aggravants : multi-owner non coordonné, social proof sales faible au moment du pitch. **Règle : un besoin Founding AE quasi-CRO sur une pre-seed = signal à pondérer fortement à la baisse.**
2. **Le compte à volume sans conversion** (infra AI, ~50 pers, $13.3M levés) : beaucoup de sends, aucun hire en ~18 mois, exigences extrêmes, cabinet concurrent actif, plus d'offre ouverte. Requalifié "prescripteur réseau > client direct". **Règle : exigences très hautes + 0 placement passé = plafonner l'investissement.**
3. **Le signal jamais transformé** (SaaS staffing ~250 pers) : offre AE détectée via un outil de hiring-intent, contact Head of Sales existant, mais aucun mandat sales ouvert. **Règle : un job posting seul ne suffit pas, il faut un chemin vers le décideur et un momentum.**
4. **Le one-shot sans rétention** (insurtech) : placement AE réussi puis compte dormant peu après, ownership éclaté jamais tranché.
5. **Autres non-convertis** : AE sans accroche/social proof à l'époque ; AE trouvé ailleurs malgré un bon call ; AE MidMarket relancé sans réponse ; un BDR closé mais le mandat AE Enterprise EMEA du même compte non ; un avoir (premier recrutement Sales cassé en période d'essai, la garantie a joué).

### 7.4 Signaux faibles observés (veille à répliquer)

- **Sortie d'un founding sales** (un founding AE quitte sa boîte) = double signal : candidat AE à placer ET la boîte devra probablement re-staffer.
- **Nouveau Head of Sales dans le CRM d'un compte inactif** = signe de réveil possible.
- **Pool AE partagé** : les mêmes candidats AE circulent entre comptes : chaque candidat AE en process est un vecteur de dispatch multi-clients.

## 8. La méthode Léo en pratique (traces réelles, dépersonnalisées)

> Sources : corpus d'emails de prospection, analyses de conversion, transcripts de calls de discovery/démo (2026). Les verbatims ci-dessous sont réels, avec noms de personnes et de sociétés retirés. Note data : l'activité récente vit dans la messagerie et les notes de call, pas dans les deal stages CRM.

### 8.1 Ses heuristiques de priorisation (par ordre de force du signal)

1. **Candidat HireSweet en process ou recruté chez le prospect = signal n°1** ("conversion quasi-garantie"). Ses deux meilleurs cold emails reposent dessus : "un candidat m'a dit qu'il avait accepté chez toi", "une candidate m'a dit qu'elle rentrait en process chez vous".
2. **Client existant / dormant > tout signal externe.** La réactivation est le canal qui pèse le plus dans les onboardings. Relance type : "tu as closé ton AE MidMarket ?".
3. **Post LinkedIn "on recrute" / offre AE publiée.** Verbatim call : "je t'ai revu débarquer sur LinkedIn avec 'recrute :' liste de postes qui ne s'arrête jamais. Je me suis dit ok, il a réussi [à lever]".
4. **Levée récente (<3 mois)** : contexte déclencheur, mais la levée seule est un proxy insuffisant (les boîtes levées sont déjà toutes dans le CRM) ; le gisement neuf = **changement de décideur** (nouveau CRO/CTO <6 mois).
5. **Post investisseur / écosystème** (Kima, Hexa, YC, Station F) : hook + social proof.
6. **Pause annoncée = tâche datée, pas un kill.** Un prospect "met en pause, reviendra dans l'année" → tracé, le compte remonte au bon moment. Credo : "Kill ou tâche, rien entre. J+3 ou J+90."
7. **Signaux d'usage produit** (activité récente, reply email récent) : pondérés, en ignorant le deal stage CRM.
8. **Champions/referrals** : un CEO/CTO multi-placements = porte d'entrée vers son portfolio VC.

Système derrière : plusieurs heures de prospection ciblée par semaine, une centaine de prospects en parallèle, tout dans le même thread, 1er mail conçu pour créer un ancrage (pas pour la réponse), call > email.

### 8.2 Ses questions de qualification en call (verbatims dépersonnalisés)

**Timing et réalité du besoin :**
- "Est-ce que là c'est le bon moment pour toi de commencer à avoir du monde en process ?"
- "Tu veux juste voir des CV... ou tu te dis que c'est un moment où ça peut valoir le coup de passer des process ?" (force la distinction curiosité vs recrutement réel)
- "C'est une prio ou c'est de l'opportuniste ?"

**Package et budget :**
- "Sur le profil sales, le package, c'est combien ?" (réponse type : fixe + variable)
- "Tu te donnes quelle range ? Le fixe, comment tu veux calculer ton variable ?"

**Structure de l'équipe sales et rôle exact :**
- "Tu as besoin d'un AE parce que tu as du pipe et tu as besoin de quelqu'un pour closer ? ... vous êtes bottleneck au niveau du closing, c'est ça ?"
- "Ton founding AE... il ne va peut-être pas gérer [l'enterprise], c'est toi qui vas le garder ?"
- "Tu cherches des gens qui un jour sont appelés à recruter [et manager], ou plutôt un giga IC qui monte en taille de compte ?"

**Calibration par l'ACV et le quota (sa signature sur l'AE) :**
- "Quand tu voulais que je te pousse des profils, tu avais un ACV autour de X... Là tu es où à peu près ?"
- "Un package fixe+variable élevé, c'est le benchmark de quelqu'un qui doit facturer autour d'un million. À quoi ressemble ton AE dans deux-trois ans ? C'est ça où il faut atterrir."

**Critères candidats (en challengeant les critères excluants) :**
- "Tu veux vraiment quelqu'un de parfaitement bilingue ? ... ça devient un critère très excluant. Ces profils-là sont très bankables."
- "Avoir une XP [secteur] c'est un gros critère ou c'est un bonus ?"

**Process et concurrence :**
- "Toi tu vas t'occuper des premiers entretiens ?"
- "Pour le cabinet, c'était quoi la facturation ?" (il calcule le delta de coût en live)
- "Tu as déjà eu des discussions avec des AE qui t'ont plu ?"

**Rituel de next step** : mail récap conditions + 2-3 profils épinglés + fiche de poste demandée + point ritualisé de 15 min sous 48h puis hebdo.

### 8.3 Sa formule d'outreach (ce qu'elle révèle des signaux)

1. **Objets ultra-courts, 1-2 mots** : "hiring?", "founding eng", "hiresweet".
2. **Le candidat comme preuve d'entrée** : "Plusieurs candidats avec qui je suis en relation m'ont dit qu'ils étaient en process chez toi". Son signal favori : la demande candidat côté prospect = la boîte recrute ET attire.
3. **Social proof opérationnelle nommée, même écosystème** : "plusieurs CTO du même écosystème (Hexa) : 3 recrutements chacun". Il matche la preuve au monde du prospect.
4. **Offre de prise de référence** : "je te laisse leur shooter un mail, on délivre fort ;)".
5. **CTA spécifique avec inventaire** : "15 min en visio pour... 4/5 top profils que j'ai en tête pour vous ?" Jamais de "on échange ?" vide : il ne contacte que quand il a du stock qui matche.
6. **Retargeting du décideur du moment** : "Historiquement on parlait à [X], mais je me dis que tu es sûrement un meilleur interlocuteur".
7. **Post investisseur comme hook** : "J'ai vu un post de [le VC] qui mentionnait que vous lanciez des recrutements...".

### 8.4 Ses disqualifiers exprimés

**Côté compte :**
- **Pas de signal = pas de contact** (règle absolue).
- **Pas prêt à passer des process** : il refuse le mode "épingler des profils de temps en temps" ("pas engageant, potentiellement inutile") et propose de **décaler le démarrage de 4-6 semaines** plutôt que de brûler des candidats : "les gens que tu contactes si tu n'es pas prêt à les recruter, dans deux mois ils ont trouvé".
- **Exclusions structurelles** : cabinets de recrutement, ESN, grands groupes, boîtes défuntes, contacts sans pouvoir de décision, prestataires externes (email `.ext@`), contactés très récemment, clients actifs (exclus de l'outbound).
- **Critère client trop excluant = deal à risque** : il le challenge frontalement (ex. bilinguisme US).
- **Budget incompatible** : calcul du coût au succès en live ; refus du discount hors cadre : "on a un truc fixe, on n'a pas trop de marge".

**Côté profil recherché (révèle le fit du mandat) :**
- L'"AE Enterprise classique" type Salesforce pour une early-stage = "l'écueil à éviter" ; le bon profil = "AE enterprise à l'aise dans l'early stage, ce croisement qui est dur".
- Quota irréaliste : "1M de quota première année, ça me paraît un peu [beaucoup] pour de l'early" : il recadre le client.
- Standard qualité : "un candidat tous les quinze jours... pas moins que ce standard-là, sinon on perd du temps".

### 8.5 Portrait consolidé des leads travaillés (2026)

Comptes actifs : quasi tous SaaS B2B ou AI-first, 5-80 personnes, très majoritairement en recrutement AE / Founding AE / Sales (AE Enterprise, Founding AE, AE MidMarket). Calls de discovery 2026 : AE vente complexe grands comptes, Founding AE full-cycle post-levée, recrutement sales enterprise... Dominante : fondateur/CEO ou Talent Manager d'une boîte tech FR qui ouvre son 1er/2e/3e poste sales.

## 9. Outillage de l'agent

### 9.1 FullEnrich (MCP connecté)
- Vérifier le solde de crédits avant tout enrichissement (`get_credits`) et annoncer le coût.
- Usage : `search_companies` / `search_people` (lookups ≤10), `export_contacts` / `export_companies` (volume, CSV), `enrich_bulk` + `get_enrichment_results` (emails/téléphones vérifiés, asynchrone).
- Règle : `list_industries` avant tout filtre industrie.

### 9.2 Sillage (MCP connecté)
- Au démarrage : `get_setup_state`. Si aucun top account n'est uploadé, le mapping est bloquant ; viser au moins 3 agents.
- Setup à faire par l'agent avant usage : `add_top_accounts` (5-20 comptes), puis `create_agent` type **job_update** en priorité (signal recrutement = notre signal #1), poll `get_top_account_list_status`, puis `list_signals` / `get_contents`.

### 9.3 Autres outils (gratuits / open source)
- **Mantiks** : signal hiring-intent (job postings), count/preview GRATUITS, export contacts payant gaté.
- **BODACC** (API sans clé) : proxy levée de fonds par SIREN (augmentation de capital), lag 1-4 mois, rappel partiel. Check ciblé sur une liste, jamais le feed brut.
- **Websearch** : pages carrières, LinkedIn Jobs, Welcome to the Jungle, annonces de levées (presse tech FR).
- **CRM (HubSpot)** : dédup obligatoire avant tout outreach (le lead est-il déjà un client, un deal ouvert, un contact travaillé ?).

### 9.4 Artefacts existants à réutiliser (ne pas repartir de zéro)

- Une **shortlist interne de boîtes qui recrutent des AE à Paris (5-50 pers, croisées avec l'historique)**, déjà tiérées, existe côté équipe (partagée en privé, hors repo public).
- Un **référentiel d'offres sales avec packages** (calibration des attentes fixe/variable par archétype).
- Des **listes de leads scorées** et des **listes ICP A/B** existent en interne (partagées en privé). ⚠️ Fraîcheur : scorings figés début juin, à re-vérifier en live.

## 10. Workflow de l'agent, pas à pas

### Étape 1 : Sourcing par signal (jamais de liste froide)

Lancer en parallèle plusieurs modes de détection (multi-modal, chaque angle voit ce que les autres ratent) :
- **Offres sales publiées** : Mantiks count/preview (gratuit), LinkedIn Jobs, Welcome to the Jungle, pages carrières. Requêtes : "Account Executive", "AE", "SDR", "BDR", "Business Developer", "Sales Manager", "Head of Sales", "CSM", France, CDI.
- **Sillage job_update agents** sur une watchlist de comptes ICP (après setup, §9.2).
- **Levées récentes** : presse tech FR (Maddyness, La French Tech, JDN), BODACC par SIREN en confirmation.
- **Moves de décideurs** : nouveau CRO/Head of Sales/VP Sales nommé <6 mois (LinkedIn, presse nominations).
- **Cross-sell interne** : clients tech actifs ou dormants qui ouvrent des postes sales (croiser le portefeuille avec les offres publiées ; c'est LE canal qui convertit, §2.1).
- **Posts LinkedIn "on recrute"** de fondateurs, posts de VC/écosystèmes (Hexa, YC, Station F, Kima).
- **Sorties de founding sales** (double signal : candidat à placer + boîte à re-staffer).

### Étape 2 : Qualification ICP

Pour chaque entreprise détectée, vérifier via websearch/FullEnrich `search_companies` : secteur (SaaS B2B / AI-first ?), effectif (cible 3-50, malus si trop gros), géo (France), stage de financement, affiliation écosystème. Vérifier que le poste ouvert est bien dans le pool HireSweet (AE/SDR/BDR/CSM France, pas channel partner US ni retail).

### Étape 3 : Scoring et tiering

Appliquer la priorisation des signaux (§3.2) et le triage §4 (guards puis matrice ICP × complexité). Doute sur l'ICP → T3 ; doute sur la complexité (historique riche) → T1.

### Étape 4 : Dédup et check interne (Step 0, non négociable avant tout contact)

Croiser minimum 4 sources dont 2 LIVE : ① `do_not_contact`/opt-out CRM (en PREMIER) ; ② client redevenu actif ? (→ retirer, router vers l'owner) ; ③ deal ouvert ? (→ laisser l'owner) ; ④ contacté récemment tout canal, au niveau domaine ? ; ⑤ contact toujours en poste ? (LinkedIn) ; ⑥ check owner (anti double-touch). Conflit entre sources → non-envoi.

### Étape 5 : Enrichissement (gradient gratuit → payant)

1. Websearch gratuite d'abord (site, LinkedIn company, presse).
2. CRM backfill (emails de contacts existants, gratuit).
3. FullEnrich : `search_people` pour identifier le décideur (CEO/founder > CRO/Head of Sales > Head of Talent), puis `enrich_search_contact`/`enrich_bulk` pour email/téléphone vérifiés. Annoncer le coût crédits avant tout enrichissement.
4. Sillage `enrich_company` pour le contexte compte.
5. BODACC par SIREN si la levée doit être confirmée.

### Étape 6 : Angle et social proof

Choisir l'angle selon la hiérarchie : T0 dernier échange (refus = STOP) > T1 relation directe (placements chez eux, ex-candidat) > gate hors-ICP > T2 demande active (offres ouvertes) > T3 preuve par pairs (même VC/écosystème, décote VC large) > T4 générique honnête. Chaque signal porte source + fraîcheur (une proof très récente a beaucoup plus d'impact ; une proof trop ancienne est éteinte). Chercher la proof via l'équipe fondatrice, pas seulement la company.

### Étape 7 : Restitution

Sortir chaque lead au format §11, trié par score. **Jamais d'envoi automatique** : drafts + review humaine, 2 candidats max par email, jamais de stat hors whitelist.

## 11. Format de sortie attendu par lead

```yaml
company: <nom>
domain: <site>
verdict: T1 | T2 | T3          # + guard déclenché le cas échéant
score_icp: <bas | suffisant | fort>        # axe A, qualitatif
score_complexite: <bas | haut>             # axe B, qualitatif
firmographics:
  secteur: <SaaS B2B / AI-first / ...>
  effectif: <n> (source, date)
  stage: <pre-seed / seed / series A> + montant + date levée
  geo: <ville>
  ecosysteme: <Hexa / YC / Station F / VC / aucun>
signaux:                        # chacun avec SOURCE + DATE (fraîcheur obligatoire)
  - type: offre_sales_ouverte | new_sales_leader | recent_funding | champion | vc_peer | alumni_move | reactivation | cross_sell_tech
    priorite: tres_fort | fort | moyen | faible
    detail: <titre du poste, nom du leader, montant levé...>
    source: <url / outil>
    date: <AAAA-MM-JJ>
poste_ouvert:
  titre: <AE / SDR / Founding AE...>
  seniorite: <mid / senior / founding>
  red_flag: <ex. founding-AE-quasi-CRO sur pre-seed>
decideur:
  nom: <>
  titre: <CEO / CRO / Head of Sales>
  email: <vérifié FullEnrich / à enrichir>
  linkedin: <url>
dedup_crm: <clean | client_actif | deal_ouvert | contacte_recemment | do_not_contact>
relation_hiresweet: <aucune | ex-client tech (détail) | candidat en process | champion nommé>
angle: <T1-T4 + 1-2 phrases de raisonnement qualitatif>
next_action: <cold email draft | router vers owner X | attendre signal | kill>
```

Règle de restitution : 3-5 phrases de raisonnement qualitatif par lead (pas du keyword matching), et tout claim daté et sourcé. Un lead sans signal frais sourcé ne sort pas de l'agent.
