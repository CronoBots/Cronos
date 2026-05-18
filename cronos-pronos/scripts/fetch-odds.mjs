// Récupère les cotes du jour depuis The Odds API et écrit data/YYYY-MM-DD.json + data/latest.json.
// Variables d'env requises : ODDS_API_KEY

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const API = 'https://api.the-odds-api.com/v4';

const API_KEY = process.env.ODDS_API_KEY;
if (!API_KEY) {
  console.error('ODDS_API_KEY manquante. Aborting.');
  process.exit(1);
}

// Filtres pour ne garder que les sports qui nous intéressent.
const SPORT_FILTERS = [
  /^soccer_(epl|spain_la_liga|italy_serie_a|germany_bundesliga|france_ligue_one|belgium_first_div|uefa_champs_league|uefa_europa_league|uefa_europa_conference_lge)$/,
  /^basketball_(nba|euroleague)$/,
  /^tennis_/,
];

const matchesFilter = (key) => SPORT_FILTERS.some((re) => re.test(key));

// Calcule la probabilité implicite normalisée (sans marge) pour les outcomes d'un bookmaker.
function normalizeBookmaker(outcomes) {
  const raw = outcomes.map((o) => ({ name: o.name, p: 1 / o.price, price: o.price }));
  const total = raw.reduce((s, r) => s + r.p, 0);
  return raw.map((r) => ({ name: r.name, implied: r.p / total, price: r.price }));
}

function median(arr) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((s, x) => s + x, 0) / arr.length;
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

// À partir des bookmakers d'un événement, calcule consensus + favori + dispersion.
function summarizeEvent(event) {
  const perBookmaker = [];
  for (const bm of event.bookmakers ?? []) {
    const h2h = bm.markets?.find((m) => m.key === 'h2h');
    if (!h2h?.outcomes?.length) continue;
    perBookmaker.push({ key: bm.key, title: bm.title, outcomes: normalizeBookmaker(h2h.outcomes) });
  }

  if (perBookmaker.length === 0) return null;

  const outcomeNames = perBookmaker[0].outcomes.map((o) => o.name);
  const consensus = outcomeNames.map((name) => {
    const implieds = perBookmaker.map((bm) => bm.outcomes.find((o) => o.name === name)?.implied).filter((x) => x != null);
    const prices = perBookmaker.map((bm) => bm.outcomes.find((o) => o.name === name)?.price).filter((x) => x != null);
    return {
      name,
      median_implied: median(implieds),
      median_odds: median(prices),
      dispersion: stddev(implieds),
      n_books: implieds.length,
    };
  });

  consensus.sort((a, b) => b.median_implied - a.median_implied);
  const favorite = consensus[0];

  let category;
  if (favorite.median_implied >= 0.8) category = 'tres_favori';
  else if (favorite.median_implied >= 0.65) category = 'favori';
  else category = 'equilibre';

  return {
    sport_key: event.sport_key,
    sport_title: event.sport_title,
    commence_time: event.commence_time,
    home_team: event.home_team,
    away_team: event.away_team,
    n_bookmakers: perBookmaker.length,
    consensus,
    favorite: {
      outcome: favorite.name,
      median_implied: favorite.median_implied,
      median_odds: favorite.median_odds,
      dispersion: favorite.dispersion,
      category,
    },
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} sur ${url}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function listActiveSports() {
  const all = await fetchJson(`${API}/sports?all=false&apiKey=${API_KEY}`);
  return all.filter((s) => matchesFilter(s.key));
}

async function fetchOdds(sportKey) {
  const url = `${API}/sports/${sportKey}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${API_KEY}`;
  return fetchJson(url);
}

async function main() {
  console.log('→ Listage des sports actifs...');
  const sports = await listActiveSports();
  console.log(`  ${sports.length} sport(s) retenu(s) :`, sports.map((s) => s.key).join(', '));

  const now = Date.now();
  const horizon = now + 36 * 3600 * 1000; // 36 heures à venir

  const allEvents = [];
  for (const sport of sports) {
    try {
      const events = await fetchOdds(sport.key);
      const filtered = events.filter((e) => {
        const t = new Date(e.commence_time).getTime();
        return t >= now && t <= horizon;
      });
      const summarized = filtered.map(summarizeEvent).filter(Boolean);
      console.log(`  ${sport.key}: ${summarized.length} événement(s) dans les 36h`);
      allEvents.push(...summarized);
    } catch (err) {
      console.warn(`  ${sport.key}: erreur, on continue —`, err.message);
    }
  }

  allEvents.sort((a, b) => a.commence_time.localeCompare(b.commence_time));

  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    generated_at: new Date().toISOString(),
    date: today,
    n_events: allEvents.length,
    events: allEvents,
  };

  await mkdir(DATA_DIR, { recursive: true });
  const datedPath = join(DATA_DIR, `${today}.json`);
  const latestPath = join(DATA_DIR, 'latest.json');
  await writeFile(datedPath, JSON.stringify(payload, null, 2));
  await writeFile(latestPath, JSON.stringify(payload, null, 2));
  console.log(`✓ Écrit ${datedPath} et ${latestPath} (${allEvents.length} événements)`);
}

main().catch((err) => {
  console.error('Échec fetch-odds :', err);
  process.exit(1);
});
