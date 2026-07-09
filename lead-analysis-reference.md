# Lead Analysis Reference, méthode de qualification (verticale Sales)

> Statut: à jour | Public-safe
> **Rôle** : document de référence pour un agent autonome de lead-gen (hackathon Agentic GTM). Il encode comment on identifie et juge un lead : une entreprise qui recrute des profils sales et peut devenir cliente d'une marketplace de recrutement.
> **Vision** : l'agent trouve des leads, juge le signal, enrichit via FullEnrich + Sillage + outils gratuits (Mantiks, BODACC, websearch), et restitue au format §8.
> **Note public-safe** : document 100% générique. Aucun nom de client, de candidat, d'interlocuteur, aucun montant de deal, aucune date de placement, aucun poids de scoring propriétaire. Seule la logique de jugement est décrite (priorités ordinales, patterns, garde-fous).

## 0. TL;DR

**Le lead parfait** : SaaS B2B ou AI-first, France (Paris), 3-50 personnes, seed → Series A (levée récente), affilié à un écosystème (YC, Hexa, Station F, Seedcamp), qui ouvre son **premier ou deuxième poste d'AE mid-level** au moment où son ARR décolle, et dont le **CEO/fondateur** est joignable. Bonus décisif : une relation existante (ex-client tech, candidat déjà en process chez eux, ancien candidat aujourd'hui en poste chez eux).

**5 règles d'or** :
1. **Pas de signal frais = pas de lead.** Jamais de liste froide. 1 signal sourcé et daté = 1 approche.
2. **La relation bat le signal externe.** Ordre : candidat en process chez le prospect > ex-client tech qui rouvre un front sales (cross-sell) > offre AE publiée > nouveau leader sales <6 mois > levée récente > pair d'écosystème.
3. **Cibler le CEO/fondateur.** Sur une boîte de 3-50 personnes, c'est lui le hiring manager du first AE ; les contacts Head of Sales qualifient le signal mais signent rarement le mandat.
4. **Disqualifier vite** : trop gros (TA interne), hors France, trop tôt (<5 pers), cabinet/ESN/grand groupe, contacté récemment, deal ouvert, client actif, refus loggé, "Founding AE quasi-CRO" sur pre-seed.
5. **Le job posting seul ne suffit pas** : il faut un chemin vers le décideur + un momentum réel (prêt à passer des process maintenant, pas juste "voir des CV").

## 1. ICP : l'entreprise qui achète du recrutement sales

- **Secteur** : SaaS B2B vertical ou AI-first en priorité ; puis insurtech, cleantech, infra AI. Exceptions (scale-up plus grosse) seulement si relation existante.
- **Taille** : cœur de cible **3 à 50 employés**, sweet spot élargi jusqu'à ~150. Au-delà de quelques centaines d'employés, le fit s'effondre (TA interne, le modèle au succès se compare mal à un recruteur salarié).
- **Stage** : seed → Series A. Une **levée récente** = pression de recrutement maximale.
- **Géo** : France (Paris en pratique).
- **Écosystème** (signal fort) : incubateur/accélérateur reconnu (YC, Hexa, Station F, Seedcamp) ou pair d'un VC déjà client.

**Les 4 déclencheurs d'achat récurrents** :
1. **Bascule produit → commercialisation** : la boîte a son produit et son premier ARR, elle ouvre son premier vrai poste AE (parfois en pivot direct d'un besoin Founding Engineer).
2. **Momentum post-placement tech** : un placement tech réussi crédibilise, le client ouvre le front sales dans la foulée. **C'est le canal qui convertit le mieux (cross-sell tech → sales).**
3. **Hyper-croissance / TA interne débordé ou absent.**
4. **Post-levée** : le cash déclenche le recrutement, souvent le first AE hire ou le scale de l'équipe.

**Rôle qui convertit** : l'AE mid-level domine. Sales Manager / Inside Sales possibles. Red flag : le "Founding AE quasi-CRO" (Enterprise, US-facing, trajectoire CRO) sur une pre-seed est demandé mais ne convertit pas (§5).

## 2. Signaux, par ordre de priorité

Priorité ordinale : **Très fort > Fort > Moyen > Faible**. Un compte multi-signal (≥2 signaux distincts) monte d'un cran ; un contact déjà connu ajoute un petit bonus. (Les poids numériques exacts ne sont pas publiés.)

| Signal | Priorité | Définition |
|---|---|---|
| Nouveau leader sales (CRO/Head of Sales/VP Sales) nommé **<6 mois** | **Très fort** | Un fondateur en poste depuis l'origine ne compte pas. Un leader sales qui arrive constitue son équipe. |
| Champion : ex-candidat placé, aujourd'hui chez le prospect | **Très fort** | Warm intro nommée, y compris un ex-candidat tech dans une boîte qui ouvre des postes sales. |
| Pair financé par le même VC qu'un client existant | **Fort** | |
| Ex-employé/candidat parti vers une nouvelle boîte (alumni move) | **Fort** | |
| Ex-client dormant à réactiver | **Fort** | Cross-sell tech→sales : ex-client tech qui ouvre un poste AE = double signal (relation + besoin). |
| Levée récente | **Moyen** | Cash → recrutement. Mais la levée seule est un proxy faible (toutes déjà dans le CRM). |
| Compte ABM ciblé / bien classé au scoring interne | **Moyen** | |
| Contact sales/CEO déjà connu | **Faible** | |

**Autres détecteurs** :
- **Offres publiées (source #1)** : AE, Account Executive, SDR, BDR, Business Developer, Sales Manager, Head of Sales, CSM sur pages carrières, LinkedIn Jobs, Welcome to the Jungle. Mantiks : count/preview gratuits.
- **Move detector** : changement de poste = signal d'achat.
- **BODACC/Pappers** : augmentation de capital = proxy levée (0€, lag 1-4 mois, vérifier le SIREN à la main si incertain).
- **Fraîcheur** : une social proof très récente a beaucoup plus d'impact ; un scoring statique est une priorisation, pas la vérité terrain (le check live du §7 est le filet obligatoire).

## 3. Grille de jugement : triage T1 / T2 / T3

Deux axes indépendants (T1 n'est pas "mieux" que T2) :
- **Axe A, ICP/valeur** : "ce compte vaut-il un outreach ?" (facteurs, par ordre d'importance : score composite du lead-index > nombre d'offres ouvertes > levée récente > effectif dans la cible > présence de signaux).
- **Axe B, complexité du contexte** : "l'historique est-il trop riche pour du batch ?" (client déjà recruté, plusieurs placements passés, process passé, fiche existante, plusieurs interlocuteurs connus → plus il y a d'historique, plus c'est du manuel).

**Guards (règles dures, AVANT la matrice)** :
- Process actif → T1 forcé.
- Deal CRM ouvert → T1 forcé (laisser l'owner).
- Client actif (sends récents) → T1 forcé + jamais de cold (passer par l'owner).
- Données insuffisantes → T3 + à enrichir.

**Matrice** :

| | complexité basse | complexité haute |
|---|---|---|
| **ICP suffisant** | **T2** (semi-auto, review batch) | **T1** (manuel assisté) |
| **ICP faible** | **T3** (pas d'outreach) | **T1** (l'historique prime : jamais de batch sur un compte à contexte riche) |

Direction fail-closed : **doute sur la complexité → T1 ; doute sur l'ICP → T3.**

**Social proof, par ordre de force** : ex-candidat en poste chez le prospect (le plus fort, levier interne) > ancien client à réactiver (décote si relation ancienne, éteinte au-delà de ~3-4 ans) > employeur réciproque / même batch d'accélérateur > pair même VC (fort si VC focalisé, faible si financeur généraliste) > volume d'écosystème (faible).

## 4. Disqualifiers et red flags

**Retrait dur de la liste** :
1. Client actif → motion rétention, jamais de cold.
2. Deal CRM ouvert → laisser l'owner.
3. Contacté récemment (tout canal, au niveau **domaine**, pas seulement l'email du contact).
4. Opt-out / plainte spam / bounce dur → retrait définitif (à vérifier en PREMIER).
5. Refus explicite loggé → STOP, ne jamais relancer.
6. Trop gros (TA interne forte) ; hors France ; trop tôt (<5 pers) ; aucun signal.
7. **Besoin non-fit** : vérifier que les postes sont bien dans le pool (AE/SDR/BDR/CSM France, pas channel partner US ni retail ; un plan orienté consultants/formateurs plutôt que des rôles sourçables = fit partiel).
8. Conflit entre sources → non-envoi (prudence par défaut).

**Anti-patterns process** : dial de masse sur liste froide ; touche unique ; attendre au lieu d'envoyer la valeur ; relance vide ("vous avez vu mon message ?") ; ciblage hors signal ; réactivation du book déguisée en new-business.

**Anti-patterns data** : les deal stages CRM ≠ statut/revenue (peu fiables) ; hiérarchie de vérité = sources structurées > calls > messagerie interne > email > CRM ; jamais citer un volume de pool candidats.

## 5. Personas acheteurs

- **CEO/fondateur = l'acheteur dans la quasi-totalité des cas**, zéro TA/RH. Sur une early-stage, le fondateur EST le hiring manager du first AE ; c'est lui qui ressent le bottleneck de closing.
- Hiérarchie de ciblage : **CEO/fondateur > CRO/Head of Sales (surtout s'il vient d'arriver) > Head of Talent**. Les Head of Sales sur comptes inactifs qualifient le signal mais signent rarement.
- Persona secondaire : relais recruteuse/talent en warm intro, et le TA interne sur les comptes plus gros.

## 6. Méthode de qualification en call (verbatims dépersonnalisés)

Le principe : distinguer une vraie intention de recrutement d'une simple curiosité, calibrer le rôle sur l'ACV/quota, et challenger les critères excluants.

**Réalité du besoin** :
- "Est-ce que là c'est le bon moment pour toi de commencer à avoir du monde en process ?"
- "Tu veux juste voir des CV, ou tu te dis que c'est un moment où ça vaut le coup de passer des process ?"
- "C'est une prio ou c'est de l'opportuniste ?"

**Rôle et structure de l'équipe** :
- "Tu as besoin d'un AE parce que tu as du pipe et besoin de quelqu'un pour closer ? Vous êtes bottleneck au closing, c'est ça ?"
- "Tu cherches quelqu'un qui un jour sera appelé à recruter et manager, ou plutôt un IC qui monte en taille de compte ?"

**Package et calibration** :
- "Sur le profil sales, le package c'est combien ? Le fixe, comment tu calcules le variable ?"
- "Un package fixe+variable élevé, c'est le benchmark de quelqu'un qui doit facturer autour d'un million. À quoi ressemble ton AE dans deux-trois ans ? C'est là qu'il faut atterrir."

**Challenge des critères excluants** :
- "Tu veux vraiment quelqu'un de parfaitement bilingue ? Ça devient très excluant, ces profils sont très bankables."
- "Avoir une XP [secteur], c'est un gros critère ou un bonus ?"
- Recadrer un quota irréaliste ("1M de quota en première année pour de l'early, ça paraît beaucoup").

**Pas prêt à recruter** : refuser le mode "épingler des profils de temps en temps" ; proposer de décaler le démarrage de quelques semaines plutôt que de brûler des candidats ("les gens que tu contactes si tu n'es pas prêt à recruter, dans deux mois ils ont trouvé").

**Sa formule d'outreach** (ce qu'elle révèle du bon signal) : objets ultra-courts (1-2 mots) ; le candidat comme preuve d'entrée ("plusieurs candidats m'ont dit qu'ils étaient en process chez toi") ; social proof nommée dans le même écosystème ; CTA avec inventaire ("15 min pour te montrer 4/5 profils que j'ai en tête") jamais un "on échange ?" vide ; retargeting du décideur du moment ; post investisseur comme hook. Ne jamais contacter sans avoir du stock qui matche.

## 7. Workflow de l'agent

1. **Sourcing par signal (jamais de liste froide)**, en parallèle : offres sales publiées (Mantiks, LinkedIn Jobs, WTTJ), agents Sillage job_update sur une watchlist ICP, levées récentes (presse + BODACC), moves de décideurs (nouveau CRO/Head of Sales <6 mois), cross-sell interne (ex-clients tech qui ouvrent un poste sales), posts LinkedIn "on recrute", sorties de founding sales.
2. **Qualification ICP** : secteur, effectif (cible 3-50), géo (France), stage, écosystème ; vérifier que le poste est dans le pool.
3. **Scoring et tiering** (§2 + §3). Doute ICP → T3 ; doute complexité → T1.
4. **Dédup et check live (non négociable)** : opt-out/`do_not_contact` d'abord, client redevenu actif ?, deal ouvert ?, contacté <30j au niveau domaine ?, contact toujours en poste ?, check owner (anti double-touch). Conflit entre sources → non-envoi.
5. **Enrichissement, du gratuit au payant** : websearch → backfill CRM → FullEnrich (`search_people` pour le décideur : CEO/founder > CRO/Head of Sales > Head of Talent, puis enrichissement email/téléphone, annoncer le coût crédits) → Sillage `enrich_company` → BODACC par SIREN si besoin de confirmer une levée.
6. **Angle et social proof** : T0 dernier échange (refus = STOP) > relation directe > gate hors-ICP > demande active (offre ouverte) > preuve par pairs > générique honnête. Chaque signal porte source + date.
7. **Restitution** au format §8, triée par score. **Jamais d'envoi automatique** : drafts + review humaine, max 2 candidats par email.

**Setup outils** : FullEnrich (vérifier les crédits avant tout enrichissement) ; Sillage (`get_setup_state` au démarrage ; uploader 5-20 top accounts, créer au moins 3 agents dont un `job_update` en priorité, poller l'ingestion) ; Mantiks/BODACC gratuits ; CRM pour le dédup.

## 8. Format de sortie par lead

```yaml
company: <nom>
domain: <site>
verdict: T1 | T2 | T3            # + guard déclenché le cas échéant
score_icp: bas | suffisant | fort
score_complexite: bas | haut
firmographics:
  secteur: <SaaS B2B / AI-first / ...>
  effectif: <n> (source, date)
  stage: <seed / series A> + date levée
  geo: <ville>
  ecosysteme: <YC / Hexa / Station F / VC / aucun>
signaux:                          # chacun avec SOURCE + DATE (fraîcheur obligatoire)
  - type: offre_sales_ouverte | new_sales_leader | recent_funding | champion | vc_peer | alumni_move | reactivation | cross_sell_tech
    priorite: tres_fort | fort | moyen | faible
    detail: <titre du poste, leader nommé, contexte...>
    source: <url / outil>
    date: <AAAA-MM-JJ>
poste_ouvert:
  titre: <AE / SDR / Founding AE...>
  seniorite: <mid / senior / founding>
  red_flag: <ex. founding-AE-quasi-CRO sur pre-seed>
decideur:
  titre: <CEO / CRO / Head of Sales>
  email: <vérifié FullEnrich / à enrichir>
  linkedin: <url>
dedup_crm: clean | client_actif | deal_ouvert | contacte_recemment | do_not_contact
relation: aucune | ex-client tech | candidat en process | champion en poste
angle: <hiérarchie ci-dessus + 1-2 phrases de raisonnement qualitatif>
next_action: cold email draft | router vers owner | attendre signal | kill
```

Règle : 3-5 phrases de raisonnement qualitatif par lead (pas du keyword matching), tout claim daté et sourcé. Un lead sans signal frais sourcé ne sort pas de l'agent.
