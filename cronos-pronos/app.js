// Charge data/latest.json + data/latest-summary.md et rend la page.

const DATE_FMT = new Intl.DateTimeFormat('fr-BE', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

const TIME_FMT = new Intl.DateTimeFormat('fr-BE', {
  hour: '2-digit', minute: '2-digit',
});

const SPORT_LABELS = {
  soccer_epl: 'Premier League',
  soccer_spain_la_liga: 'La Liga',
  soccer_italy_serie_a: 'Serie A',
  soccer_germany_bundesliga: 'Bundesliga',
  soccer_france_ligue_one: 'Ligue 1',
  soccer_belgium_first_div: 'Pro League',
  soccer_uefa_champs_league: 'Ligue des Champions',
  soccer_uefa_europa_league: 'Europa League',
  soccer_uefa_europa_conference_lge: 'Conference League',
  basketball_nba: 'NBA',
  basketball_euroleague: 'EuroLeague',
};

function groupKey(sportKey) {
  if (sportKey.startsWith('soccer_')) return 'football';
  if (sportKey.startsWith('basketball_')) return 'basket';
  if (sportKey.startsWith('tennis_')) return 'tennis';
  return 'autre';
}

const GROUP_LABEL = {
  football: 'Football',
  basket: 'Basket',
  tennis: 'Tennis',
  autre: 'Autres',
};

function sportLabel(key) {
  return SPORT_LABELS[key] || key.replace(/_/g, ' ');
}

function categoryLabel(c) {
  if (c === 'tres_favori') return { text: 'Très favori', cls: 'badge-tres-favori' };
  if (c === 'favori') return { text: 'Favori', cls: 'badge-favori' };
  return { text: 'Équilibré', cls: 'badge-equilibre' };
}

async function loadData() {
  const res = await fetch('data/latest.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Impossible de charger latest.json (HTTP ${res.status})`);
  return res.json();
}

async function loadSummary() {
  try {
    const res = await fetch('data/latest-summary.md', { cache: 'no-cache' });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}

function fallbackSummary(data) {
  const n = data.n_events;
  if (n === 0) return 'Aucun événement programmé dans les championnats suivis.';
  const tresFavoris = data.events.filter((e) => e.favorite.category === 'tres_favori').length;
  const equilibres = data.events.filter((e) => e.favorite.category === 'equilibre').length;
  return `${n} événement${n > 1 ? 's' : ''} au programme aujourd'hui dans les championnats suivis. ` +
    `${tresFavoris} rencontre${tresFavoris > 1 ? 's affichent' : ' affiche'} un favori très marqué (≥ 80 % d'implicite), ` +
    `${equilibres} reste${equilibres > 1 ? 'nt' : ''} ouverte${equilibres > 1 ? 's' : ''} avec un favori sous les 65 %. ` +
    `Ces chiffres reflètent le consensus du marché des bookmakers, pas une certitude.`;
}

function renderHeader(data) {
  const dt = new Date(data.date + 'T00:00:00');
  document.getElementById('date-line').textContent = DATE_FMT.format(dt);
}

function renderSummary(text) {
  document.getElementById('summary-text').textContent = text;
}

function renderTabs(groups, activeGroup, onSelect) {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'tab' + (activeGroup === 'all' ? ' active' : '');
  allBtn.textContent = 'Tout';
  allBtn.addEventListener('click', () => onSelect('all'));
  tabs.appendChild(allBtn);

  for (const g of Object.keys(groups)) {
    const btn = document.createElement('button');
    btn.className = 'tab' + (activeGroup === g ? ' active' : '');
    btn.textContent = `${GROUP_LABEL[g] || g} (${groups[g].length})`;
    btn.addEventListener('click', () => onSelect(g));
    tabs.appendChild(btn);
  }
}

function renderEventCard(e) {
  const card = document.createElement('article');
  card.className = 'event-card';

  const left = document.createElement('div');
  const meta = document.createElement('div');
  meta.className = 'event-meta';
  const time = TIME_FMT.format(new Date(e.commence_time));
  meta.textContent = `${sportLabel(e.sport_key)} · ${time}`;
  left.appendChild(meta);

  const teams = document.createElement('div');
  teams.className = 'event-teams';
  teams.textContent = `${e.home_team} vs ${e.away_team}`;
  left.appendChild(teams);

  const pct = (e.favorite.median_implied * 100).toFixed(0);
  const fav = document.createElement('div');
  fav.className = 'event-fav';
  fav.innerHTML = `Favori marché : <strong>${e.favorite.outcome}</strong> · ${pct}% implicite · cote médiane ${e.favorite.median_odds.toFixed(2)}`;
  left.appendChild(fav);

  const bar = document.createElement('div');
  bar.className = 'dispersion-bar';
  const dispPct = Math.min(100, e.favorite.dispersion * 400);
  bar.innerHTML = `<span style="width: ${dispPct.toFixed(0)}%"></span>`;
  left.appendChild(bar);

  const right = document.createElement('div');
  right.className = 'event-right';
  const lbl = categoryLabel(e.favorite.category);
  right.innerHTML = `<span class="badge ${lbl.cls}">${lbl.text}</span>` +
    `<div class="odds-pill">${e.n_bookmakers} books</div>`;

  card.appendChild(left);
  card.appendChild(right);
  return card;
}

function renderEvents(events) {
  const container = document.getElementById('events');
  container.innerHTML = '';
  if (events.length === 0) {
    container.innerHTML = '<p class="empty">Aucun événement dans cette catégorie.</p>';
    return;
  }
  for (const e of events) container.appendChild(renderEventCard(e));
}

function groupEvents(events) {
  const out = {};
  for (const e of events) {
    const g = groupKey(e.sport_key);
    (out[g] ||= []).push(e);
  }
  return out;
}

async function main() {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    document.getElementById('events').innerHTML =
      `<p class="empty">Pas encore de données. Le premier run du workflow doit s'exécuter.</p>`;
    return;
  }
  renderHeader(data);

  const summaryText = (await loadSummary()) || fallbackSummary(data);
  renderSummary(summaryText);

  const groups = groupEvents(data.events);
  let active = 'all';

  const update = () => {
    renderTabs(groups, active, (g) => { active = g; update(); });
    const list = active === 'all' ? data.events : (groups[active] || []);
    renderEvents(list);
  };
  update();
}

main();
