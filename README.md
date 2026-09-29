# Webtoon Dark Mode

<img src="icons/icon128.png" alt="" width="64" height="64">

Extension Chrome / Edge / Brave (Manifest V3) qui ajoute un mode sombre à [webtoons.com](https://www.webtoons.com), sans altérer les couleurs des planches.

## Fonctionnalités

- Mode sombre sur tout le site : accueil, listes, lecteur, commentaires.
- Planches, couvertures et vidéos affichées avec leurs couleurs exactes.
- Couleurs de l'interface conservées (logo, badges, emojis).
- Palette de fonds au choix : Doux, OLED, Anthracite, Nuit, Ardoise, Sépia, Forêt, Prune, ou une couleur personnalisée.
- Barre de défilement assortie au fond.
- Bouton on/off dans la popup, appliqué en direct sur tous les onglets.

## Fonctionnement

- La page entière est inversée avec `invert(1)`, et les médias sont ré-inversés. Comme `invert(1)` est sa propre réciproque et reste dans le gamut, les planches ressortent pixel pour pixel identiques.
- `content.js` recalcule les couleurs du site : les fonds clairs prennent la couleur de fond choisie, et les couleurs vives de l'interface (textes, boutons, SVG, bordures) gardent leur teinte avec une luminosité inversée.
- Les petites icônes en image de fond et le texte contenant des emojis reçoivent un `hue-rotate(180deg)` pour garder leur teinte.
- Un `MutationObserver` suit les éléments ajoutés et les changements d'état (`class`, `aria-selected`…), par exemple quand on change d'onglet.

## Installation

1. Ouvrir `chrome://extensions` (ou `edge://extensions`).
2. Activer le **Mode développeur**.
3. Cliquer sur **Charger l'extension non empaquetée** et choisir ce dossier.

## Licence

[MIT](LICENSE)
