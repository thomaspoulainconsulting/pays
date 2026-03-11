# Quiz des Pays — Design Spec

## Vue d'ensemble

Application web de quiz geographique. Le joueur doit identifier les pays et capitales du monde sur une mappemonde SVG interactive.

**URL du projet** : https://github.com/thomaspoulainconsulting/pays.git

## Decisions techniques

| Decision | Choix | Justification |
|---|---|---|
| Stack | React + Vite + TypeScript | Ecosysteme riche, gestion d'etat naturelle, animations fluides |
| Carte | SVG statique embarque (Natural Earth 110m) | Zero dependance carto, controle total, performant |
| Langue | Francais + variantes (accents, abreviations) | Public cible francophone, tolerance aux erreurs de saisie |
| Persistence | localStorage | Reprise de progression entre sessions |
| Theme | Dark Geopolitique (bleus profonds) | Immersif, la carte ressort sur fond sombre |
| Input UX | Panneau lateral fixe | Progression toujours visible, pas de popup |
| Pays trouves | Couleur succes (vert) + nom affiche | Lisible meme sur petits pays |
| Dependances | react, react-dom, canvas-confetti | Minimaliste, pas de lib carto ni router |

## Architecture

```
pays/
├── public/
│   └── world.svg              # Carte SVG (Natural Earth simplifiee)
├── src/
│   ├── main.tsx               # Point d'entree
│   ├── App.tsx                # Router principal (accueil / quiz)
│   ├── components/
│   │   ├── HomePage.tsx       # Page d'accueil (titre + boutons)
│   │   ├── QuizPage.tsx       # Layout : carte + panneau lateral
│   │   ├── WorldMap.tsx       # SVG interactif (hover, clic, couleurs)
│   │   ├── Sidebar.tsx        # Panneau lateral (input, progression, filtres)
│   │   ├── CountryInput.tsx   # Champ de saisie + validation
│   │   ├── ConfettiEffect.tsx # Animation confettis (canvas-confetti)
│   │   └── ContinentFilter.tsx # Boutons filtre continent
│   ├── data/
│   │   ├── countries.ts       # 197 pays (nom FR, variantes, code ISO, continent, capitale)
│   │   └── continents.ts      # Mapping continent → codes ISO
│   ├── hooks/
│   │   ├── useQuizState.ts    # Etat du quiz (trouves, mode, filtre)
│   │   └── useLocalStorage.ts # Persistence localStorage
│   ├── utils/
│   │   ├── normalize.ts       # Normalisation texte (accents, casse, variantes)
│   │   └── matching.ts        # Logique de comparaison reponse/attendu
│   └── styles/
│       └── index.css          # Styles globaux + theme dark geopolitique
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Routing** : state-based (pas de react-router). 2 vues : Accueil et Quiz. Le mode (pays/capitales) et le filtre continent sont geres en etat React.

## Modele de donnees

```typescript
interface Country {
  iso: string;            // Code ISO 3166-1 alpha-2 ("FR", "US", "CN")
  name: string;           // Nom principal FR ("France")
  variants: string[];     // Variantes acceptees (["Republique francaise"])
  capital: string;        // Capitale ("Paris")
  capitalVariants: string[]; // Variantes capitale
  continent: Continent;
}

type Continent = "europe" | "afrique" | "asie" | "amerique" | "oceanie";
```

**Source des donnees pays** : les 193 Etats membres de l'ONU + 4 Etats observateurs/reconnus (Kosovo, Taiwan, Palestine, Vatican) = 197 pays. La liste definitive sera constituee a partir des noms officiels en francais de l'ONU. Seuls les pays presents a la fois dans `countries.ts` ET dans le SVG sont jouables.

**Regle continents** : 5 continents (Amerique regroupe intentionnellement Nord et Sud). Chaque pays appartient a exactement un continent. Pour les cas ambigus : Russie → Europe, Turquie → Europe, Egypte → Afrique, Kazakhstan → Asie. Le fichier `countries.ts` fait foi.

**Normalisation des reponses** (`normalize.ts`) :
1. Lowercase
2. Suppression des accents (NFD + strip diacritics)
3. Suppression des tirets, apostrophes et ponctuation (remplaces par des espaces)
4. Collapse des espaces multiples + trim
5. Comparaison du resultat avec le nom principal normalise + toutes les variantes normalisees

Exemple : `"etats unis"` → normalise → `"etats unis"` — compare a `"etats-unis"` normalise → `"etats unis"` → match → correct.

## Interactions & Flux utilisateur

### Page d'accueil

1. Titre "Connaissez-vous le monde ?" + sous-titre "Quiz des pays"
2. Deux boutons principaux :
   - **Pays** avec sous-titre "197 pays"
   - **Capitales** sans sous-titre de nombre
3. Sous chaque bouton : 5 filtres continent (Amerique, Europe, Asie, Afrique, Oceanie)
4. Le bouton principal = mode monde entier

### Page Quiz (carte + panneau lateral)

| Action | Resultat |
|---|---|
| Hover sur pays non trouve | drop-shadow bleu + brightness accrue |
| Clic sur pays non trouve | Pays selectionne (bordure bleu vif), input focus dans panneau |
| Clic sur pays deja trouve | Pas d'action (pays reste vert avec son nom) |
| Saisie correcte + Entree | Confettis, pays vert + nom, compteur +1, input vide |
| Tous les pays trouves | Message de felicitations dans le panneau lateral ("Bravo ! Vous avez trouve tous les pays/capitales !"), confettis prolonges, bouton pour revenir a l'accueil |
| Saisie incorrecte + Entree | Input shake (animation CSS), le champ reste actif pour re-essayer |
| Saisie d'un nom de pays en mode capitales (ou inverse) | Traite comme une reponse incorrecte (shake). Pas de message specifique. |
| Echap | Deselectionne le pays |
| Molette sur carte | Zoom CSS transform scale (borne 1-8) centre sur curseur |
| Clic-drag sur carte | Pan (deplacement translateX/Y). Disambiguation clic vs drag : si le curseur bouge de moins de 5px entre mousedown et mouseup, c'est un clic (selection). Au-dela, c'est un drag (pan). |
| Double-clic sur carte | Reset du zoom et de la position (scale=1, translate=0,0) |

### Panneau lateral (toujours visible)

- Nom du mode en cours ("Pays — Europe" ou "Capitales — Monde")
- En mode capitales : le nom du pays selectionne est affiche au-dessus du champ input ("Capitale de : France")
- Champ input (visible quand un pays est selectionne)
- Placeholder adapte au mode : "Quel est ce pays ?" / "Quelle est la capitale ?"
- Compteur : "42 / 197 trouves"
- Barre de progression visuelle
- Bouton retour a l'accueil

### Persistence localStorage

**Schema** :
```typescript
interface SavedProgress {
  countries: string[];  // Liste des codes ISO trouves en mode pays
  capitals: string[];   // Liste des codes ISO trouves en mode capitales
}
```

**Cle** : `"quiz-pays-progress"`

- Une seule cle, pas de segmentation par continent (la progression est globale)
- Les filtres continent ne font que masquer/afficher des pays sur la carte, ils ne creent pas de sessions separees
- Au chargement, si la cle n'existe pas ou est corrompue (JSON invalide), on repart de zero sans erreur
- Mise a jour a chaque bonne reponse (ecriture immediate)

## Theme visuel

### Palette Dark Geopolitique

| Element | Couleur |
|---|---|
| Fond page | `#0a1628` |
| Fond panneau lateral | `#1e293b` |
| Pays non trouve (fill) | `#1e3a5f` |
| Pays non trouve (stroke) | `#334155` |
| Pays hover | `#2563eb33` + drop-shadow |
| Pays selectionne (bordure) | `#2563eb` |
| Pays trouve (fill) | `#166534` |
| Pays trouve (stroke) | `#22c55e` |
| Pays trouve (texte) | `#e2e8f0` |
| Texte principal | `#e2e8f0` |
| Texte secondaire | `#94a3b8` |
| Accent/boutons | `#2563eb` |
| Barre progression | `#2563eb` sur `#0f172a` |

### Animations

- **Hover pays** : `transition: filter 0.2s`, `drop-shadow(0 4px 8px rgba(37,99,235,0.3))` + `brightness(1.3)`
- **Shake input** : keyframe CSS (translation X rapide, 3 oscillations)
- **Confettis** : `canvas-confetti` depuis le haut, particules multicolores, ~2s. Confettis de completion : 5s (3 salves successives)
- **Pays trouve** : transition `fill` 0.5s vers vert, texte fade-in
- **Barre progression** : transition `width` 0.3s ease

**Typographie** : `Inter` ou `system-ui`

## Carte SVG

- **Source** : Carte SVG open source avec `id` ISO alpha-2 (minuscules) sur chaque `<path>`. Source privilegiee : carte amCharts low-resolution world map SVG (https://www.amcharts.com/svg-maps/?map=world). Si les id ne correspondent pas au format alpha-2, le script `parse-svg.ts` les renommera lors de la generation de `worldPaths.ts`.
- **Contrat SVG ↔ donnees** : les valeurs `Country.iso` dans `countries.ts` doivent correspondre exactement aux `id` dans `worldPaths.ts`. Un test Vitest verifiera cette correspondance.
- **Territoires non-pays** (Groenland, Porto Rico, Guyane francaise, etc.) : presents dans le SVG mais rendus comme des shapes statiques (meme fill que les pays non trouves, pas de hover, pas de clic). Ils ne font pas partie du quiz.
- **Poids estime** : ~200-400ko brut, ~80ko gzippe

### Mecanisme de rendu SVG

Le SVG n'est PAS importe via `vite-plugin-svgr` (qui genererait un composant monolithique sans controle par path). A la place :

1. Le fichier SVG source est pre-traite en un fichier `worldPaths.ts` contenant un tableau d'objets :
   ```typescript
   interface SvgPath {
     id: string;      // ISO alpha-2, ex: "fr"
     paths: string[]; // Tableau d'attributs "d" (un ou plusieurs pour les pays multi-polygones)
   }
   ```
   Les pays multi-polygones (USA: mainland + Alaska + Hawaii, France: mainland + overseas, Indonesie, etc.) ont plusieurs entrees dans `paths[]`. Le script `parse-svg.ts` fusionne automatiquement les `<path>` ayant le meme `id` dans le SVG source.
2. `WorldMap.tsx` itere sur ce tableau et rend un `<g>` par pays contenant un ou plusieurs `<path>`. Les event handlers sont attaches au `<g>` (pas aux path individuels) pour que tout le pays reagisse comme une seule unite.
3. Chaque `<path>` recoit ses props dynamiques (`fill`, `stroke`, `onClick`, `onMouseEnter`, `onMouseLeave`) en fonction de l'etat du quiz (non trouve / hover / selectionne / trouve)
4. Un script `scripts/parse-svg.ts` extrait les paths du SVG source et genere `worldPaths.ts`

Ce mecanisme donne un controle total sur chaque pays individuellement tout en restant dans le modele React (pas de manipulation DOM directe).

### Zoom & Pan

- Conteneur `<div>` avec `overflow: hidden`
- Etat `{ scale, translateX, translateY }`
- Molette → scale (1-8) centre sur curseur
- Clic-drag → translateX/Y (clampe pour que la carte ne puisse pas sortir entierement du viewport : au moins 20% de la carte doit rester visible)
- Ordre de transformation : `transform: translate(${x}px, ${y}px) scale(${s})`  (translate d'abord, puis scale)
- Compensation des coordonnees souris : pour convertir les coordonnees ecran en coordonnees SVG, soustraire translateX/Y puis diviser par scale. Formule : `svgX = (clientX - containerLeft - translateX) / scale`
- Zero dependance externe

### Affichage du nom sur les pays trouves

- Element `<text>` SVG positionne au centre du bounding box du `<path>` correspondant
- Taille de police adaptative : `font-size` proportionnel a la surface du path (min 6px, max 14px en coordonnees SVG)
- Pour les tres petits pays (bounding box < 20x20 en coordonnees SVG), le nom est affiche via un `<div>` positionne en absolute au-dessus du curseur au hover (pas de SVG `<title>` car le style n'est pas controlable). Le tooltip disparait au mouseLeave.

## Contraintes

- **Viewport minimum** : 1024px de large (desktop-first)
- **canvas-confetti** : dependance production, derniere version stable

## Hors perimetre (v1)

- Pas de mode multijoueur
- Pas de timer / score temps
- Pas de classement / leaderboard
- Pas de mode hint / indice
- Pas de responsive mobile (desktop-first, mobile en v2)
- Pas d'accessibilite clavier avancee (navigation Tab entre pays, fleches pour pan/zoom)
- Pas de tests framework (Vitest recommande, a configurer en implementation)
