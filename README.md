# Webtoon Dark Mode

Extension Chrome / Edge / Brave (Manifest V3) qui ajoute un mode sombre à [webtoons.com](https://www.webtoons.com), sans altérer les couleurs des planches.

## Fonctionnement

- La page est inversée (fond clair → sombre), puis les images, vidéos et iframes sont ré-inversées pour garder leurs vraies couleurs.
- Les fonds blancs sont légèrement grisés avant inversion pour obtenir un gris très foncé (`#171717`) plutôt qu'un noir pur.
- Barre de défilement sombre.
- Bouton on/off dans la popup de l'extension, appliqué en direct sur tous les onglets.

## Installation

1. Ouvrir `chrome://extensions` (ou `edge://extensions`).
2. Activer le **Mode développeur**.
3. Cliquer sur **Charger l'extension non empaquetée** et choisir ce dossier.
