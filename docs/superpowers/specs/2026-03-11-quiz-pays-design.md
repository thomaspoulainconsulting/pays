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

**Normalisation des reponses** :
1. Lowercase
2. Suppression des accents (NFD + strip diacritics)
3. Trim des espaces
4. Comparaison avec le nom principal + toutes les variantes

Exemple : `"etats unis"` → normalise → match `"etats-unis"` → correct.

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
| Clic sur pays deja trouve | Pas d'action |
| Saisie correcte + Entree | Confettis, pays vert + nom, compteur +1, input vide |
| Saisie incorrecte + Entree | Input shake (animation CSS) |
| Echap | Deselectionne le pays |
| Molette sur carte | Zoom CSS transform scale (borne 1-8) centre sur curseur |
| Clic-drag sur carte | Pan (deplacement translateX/Y) |

### Panneau lateral (toujours visible)

- Nom du mode en cours ("Pays — Europe" ou "Capitales — Monde")
- Champ input (visible quand un pays est selectionne)
- Placeholder adapte au mode : "Quel est ce pays ?" / "Quelle est la capitale ?"
- Compteur : "42 / 197 trouves"
- Barre de progression visuelle
- Bouton retour a l'accueil

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
- **Confettis** : `canvas-confetti` depuis le haut, particules multicolores, ~2s
- **Pays trouve** : transition `fill` 0.5s vers vert, texte fade-in
- **Barre progression** : transition `width` 0.3s ease

**Typographie** : `Inter` ou `system-ui`

## Carte SVG

- **Source** : Natural Earth 110m, simplifiee via mapshaper, ou carte SVG open source pre-faite (amCharts ou similaire) avec id ISO alpha-2
- **Poids estime** : ~200-400ko brut, ~80ko gzippe
- **Integration** : SVG importe comme composant React (vite-plugin-svgr ou inline)
- **Chaque `<path>`** recoit : `fill`, `stroke`, `className`, `onClick`, `onMouseEnter`, `onMouseLeave` dynamiques

### Zoom & Pan

- Conteneur `<div>` avec `overflow: hidden`
- Etat `{ scale, translateX, translateY }`
- Molette → scale (1-8) centre sur curseur
- Clic-drag → translateX/Y
- CSS `transform: scale(${s}) translate(${x}px, ${y}px)`
- Zero dependance externe

## Hors perimetre (v1)

- Pas de mode multijoueur
- Pas de timer / score temps
- Pas de classement / leaderboard
- Pas de mode hint / indice
- Pas de responsive mobile (desktop-first, mobile en v2)
