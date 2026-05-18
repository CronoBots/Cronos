// Lit data/latest.json et génère un résumé éditorial via Claude API.
// Écrit data/latest-summary.md (et data/YYYY-MM-DD-summary.md).
// Variables d'env requises : ANTHROPIC_API_KEY

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY manquante. Aborting.');
  process.exit(1);
}

// Format compact des événements pour le prompt (limite la taille).
function compactEvents(events) {
  return events.slice(0, 40).map((e) => {
    const time = new Date(e.commence_time).toISOString().slice(11, 16);
    const fav = e.favorite;
    const pct = (fav.median_implied * 100).toFixed(0);
    return `[${e.sport_title}] ${e.home_team} vs ${e.away_team} @ ${time}UTC — favori : ${fav.outcome} (${pct}%, cote ${fav.median_odds.toFixed(2)}, ${fav.category})`;
  }).join('\n');
}

const PROMPT_SYSTEM = `Tu es éditorialiste sportif francophone pour un site de pronostics.
Ton ton : direct, factuel, sans marketing. Tu écris comme un journaliste qui présente la journée, pas comme un vendeur.
Tu ne dis JAMAIS qu'un pari est "sûr" ou "safe". Tu rappelles que les cotes reflètent les probabilités du marché, pas une garantie.
Tu n'inventes pas de matchs ou de chiffres : tu te bases uniquement sur les données fournies.`;

function userPrompt({ date, n_events, eventsText }) {
  return `Date : ${date}
${n_events} événement(s) couvert(s) aujourd'hui :

${eventsText}

Rédige un paragraphe d'introduction (4 à 6 phrases) en français qui résume cette journée sportive : volume d'événements, 1 à 2 affiches phares, le ou les favoris les plus marqués (avec leur probabilité implicite), et le niveau d'incertitude général. Pas de titre, pas de liste — juste un paragraphe coulant. Termine par une phrase rappelant que ces chiffres reflètent le marché, pas une certitude.`;
}

async function callClaude(systemPrompt, userMessage) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.content?.[0]?.text?.trim() || '';
}

async function main() {
  const raw = await readFile(join(DATA_DIR, 'latest.json'), 'utf8');
  const data = JSON.parse(raw);

  if (!data.events?.length) {
    const fallback = `Aucun événement dans les 36 prochaines heures pour les championnats suivis. Revenez demain pour la prochaine vague de rencontres.`;
    await writeFile(join(DATA_DIR, 'latest-summary.md'), fallback);
    await writeFile(join(DATA_DIR, `${data.date}-summary.md`), fallback);
    console.log('✓ Aucun événement, résumé de fallback écrit.');
    return;
  }

  const eventsText = compactEvents(data.events);
  const text = await callClaude(PROMPT_SYSTEM, userPrompt({ date: data.date, n_events: data.n_events, eventsText }));

  await writeFile(join(DATA_DIR, 'latest-summary.md'), text);
  await writeFile(join(DATA_DIR, `${data.date}-summary.md`), text);
  console.log(`✓ Résumé écrit (${text.length} caractères)`);
}

main().catch((err) => {
  console.error('Échec generate-summary :', err);
  process.exit(1);
});
