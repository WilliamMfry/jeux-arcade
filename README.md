# Jeux arcade

Une collection de jeux d'arcade rétro, inspirés des grands classiques des années 80 et 90, pour une borne d'arcade faite maison. Chaque jeu se lance directement dans un navigateur (Chrome ou Edge), sans installation ni connexion Internet.

## Les jeux

| Dossier | Inspiré de | Particularité |
|---|---|---|
| `casse-brique` | Arkanoid | souris |
| `01-envahisseurs` | Space Invaders | |
| `02-glouton` | Pac-Man | |
| `03-gorille` | Donkey Kong | |
| `04-galaxiens` | Galaxian | |
| `05-essaim` | Galaga | rayon tracteur, double vaisseau |
| `06-phenix` | Phoenix | bouclier |
| `07-asteroides` | Asteroids | graphismes vectoriels |
| `08-grenouille` | Frogger | |
| `09-mille-pattes` | Centipede | souris (trackball) |
| `10-alerte-missiles` | Missile Command | souris (trackball) |
| `11-poing-de-fer` | Tekken | combat en 3D, 4 boutons |

Tous les jeux se jouent à 1 ou 2 joueurs, en même temps à l'écran. Ils ont un écran titre, un top 10 des scores avec saisie des initiales, des sons 8-bit et un effet d'écran cathodique.

## Jouer

Ouvre le fichier `index.html` du dossier d'un jeu. Le dossier `commun` (moteur partagé et bibliothèque 3D) doit rester à côté des jeux.

- `1` / `Entrée` : partie à 1 joueur, `2` : partie à 2 joueurs
- Joueur 1 : flèches, `Espace` (bouton 1), `Alt` (bouton 2)
- Joueur 2 : `R` `F` `D` `G`, `Q` (bouton 1), `S` (bouton 2), en AZERTY
- `P` : pause, `F` : plein écran, `V` : mode d'affichage, `O` : rotation pour un écran vertical, `M` : son
- Les manettes USB sont reconnues automatiquement.

Poing de fer a ses propres commandes à 4 boutons. Le détail des commandes et des coups est dans [LISEZMOI.txt](LISEZMOI.txt).

## Organisation

- `commun/arcade.js` : moteur commun (affichage, sons, commandes, scores). Les touches et les boutons de manette se règlent dans son bloc `CONFIG`.
- `commun/lib/three.min.js` : [Three.js](https://threejs.org) r149 (licence MIT), utilisé pour la 3D de Poing de fer.
- [RECALBOX.txt](RECALBOX.txt) : pistes pour une future adaptation à Recalbox.

Les noms, personnages et graphismes sont originaux. Les jeux reprennent l'esprit et les mécaniques des classiques, sans leurs marques ni leurs sprites.
