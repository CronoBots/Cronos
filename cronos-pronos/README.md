# Cronos Pronos

Plateforme statique qui agrège chaque jour les cotes des bookmakers européens
(via [The Odds API](https://the-odds-api.com)) pour les principaux championnats
de football, basket et tennis, et produit un résumé éditorial du jour
(via Claude).

## Architecture

```
GitHub Actions (cron 07:00 UTC)
   ├── scripts/fetch-odds.mjs   → data/YYYY-MM-DD.json + data/latest.json
   └── scripts/generate-summary.mjs → data/YYYY-MM-DD-summary.md + data/latest-summary.md
   ↓
git commit + push → main
   ↓
GitHub Pages sert index.html (statique, lit data/latest.json côté client)
```

## Setup

### 1. Clés API

- **The Odds API** — créer un compte sur https://the-odds-api.com (free tier : 500 req/mois).
- **Anthropic** — clé API sur https://console.anthropic.com.

### 2. Secrets GitHub

Dans **Settings → Secrets and variables → Actions**, ajouter :

| Nom | Valeur |
|---|---|
| `ODDS_API_KEY` | clé The Odds API |
| `ANTHROPIC_API_KEY` | clé Anthropic |

### 3. Permissions du workflow

Dans **Settings → Actions → General → Workflow permissions**, choisir
*Read and write permissions* (sinon le bot ne peut pas committer les données).

### 4. GitHub Pages

Dans **Settings → Pages**, source = *Deploy from a branch*, branche `main`, dossier `/ (root)`.

> Repo privé : Pages nécessite un plan Pro/Team. Sinon passer le repo en public,
> ou déployer sur Cloudflare Pages / Netlify (équivalent gratuit, hooks sur push).

### 5. Premier run

Pour ne pas attendre 24h :

- Onglet **Actions** → workflow *Daily update* → *Run workflow*.
- Vérifier que `data/latest.json` apparaît dans `main` après quelques minutes.

## Développement local

```bash
export ODDS_API_KEY=xxx
export ANTHROPIC_API_KEY=xxx
npm run build           # fetch + summary
python3 -m http.server  # puis http://localhost:8000
```

## Méthodologie

- Pour chaque événement, on récupère les cotes H2H (head-to-head) des bookmakers européens.
- Par bookmaker, on calcule la probabilité implicite normalisée (marge retirée).
- Le consensus est la **médiane** des probabilités implicites entre bookmakers.
- La **dispersion** est l'écart-type entre bookmakers — élevée = marché hésitant.
- Catégorisation du favori :
  - Très favori : implicite ≥ 80 %
  - Favori : 65 % – 80 %
  - Équilibré : < 65 %

## Avertissement

Les probabilités affichées **reflètent le consensus du marché**, pas une certitude.
Aucun pari n'est garanti. Les bookmakers conservent une marge structurelle.
Le pari sportif comporte un risque de perte financière.
