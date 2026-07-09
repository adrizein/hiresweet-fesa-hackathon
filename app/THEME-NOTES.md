# Thème HireSweet, notes

Skin de marque pour l'Account Intelligence Tool. Le thème surcharge uniquement les variables CSS `:root` (plus quelques couleurs codées en dur), sans toucher au layout ni au JS.

## La charte retenue

Système "cobalt + pink" du produit HireSweet : navy primaire, bleu ciel interactif, jaune en highlight.

| Rôle | Hex | Token HireSweet |
|------|-----|-----------------|
| Primaire (navy) | `#1F2E77` | cobalt-100 / text-primary |
| Navy foncé (hover) | `#141D54` | dérivé (pressed) |
| Bleu ciel (accent interactif) | `#709DFF` / `#5C89EB` | sky-100 / sky-120 |
| Texte secondaire | `#4C5892` | cobalt-80 |
| Texte faible | `#7982AD` | cobalt-60 / text-secondary |
| Bordures | `#E8EAF1` | cobalt-10 |
| Fond | `#F8F9FC` | bg-light |
| Rose (wash rouge) | `#FCEDEF` | pink-40 |
| Jaune (highlight) | `#FFBD2E` | yellow |
| Vert (positif) | `#28CA42` | positive |
| Rouge (négatif) | `#ff6059` | negative |

Tiers verdict gardés distincts (vert `#1E9E4A` / ambre `#9A6B12` / rouge `#DE3A4C`), dérivés des accents HireSweet mais assombris pour rester lisibles en texte sur blanc et sur les fonds `*-soft`.

**Police** : stack système (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`), exactement celle du produit HireSweet. Pas de web font, pas de `@import`.

**Sources exactes** :
- `Dev/hiresweet-knowledge-pack-v2/src/styles/tokens.css` (palette de référence)
- `Dev/hiresweet-onboarding-chat/src/styles/{tokens.css,partners.css}` (mêmes tokens, usage composants)
- Ces deux apps internes portent la charte produit vivante, source la plus fiable.

## Ce que le thème change et comment l'activer

Change : la palette (navy à la place du bleu générique), les bordures et ombres teintées cobalt, le rayon des cartes (16px), le wordmark deux tons, le dégradé du pitch box (cobalt vers pink), le badge cible, la chip investisseur (ramenée dans le bleu de marque) et un focus ring bleu ciel.

Activer : ajouter une ligne dans `index.html`, APRÈS le `<style>` inline (juste avant `</head>`) :

```html
<link rel="stylesheet" href="theme-hiresweet.css">
```

Rien d'autre. Le thème est purement additif, désactivable en retirant le `<link>`.

## Pour aller plus loin

- **Logo / wordmark** : remplacer le texte "Account Intelligence" par le vrai logo HireSweet (SVG dispo dans `Dev/hiresweet-onboarding-chat/src/assets/`).
- **Favicon** : aucun favicon HireSweet pour l'instant, à ajouter.
- **Police de marque** : le produit tourne en system-ui ; si l'on veut la police du site marketing (hiresweet.com, build Webflow), il faut l'identifier côté design (CSS obfusqué, non extractible ici) puis l'ajouter en `@import` ou `@font-face`.
- **Illustrations / imagerie** : le style HireSweet marketing utilise des visuels de marque non repris ici.
