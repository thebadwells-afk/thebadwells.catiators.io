// ── main.js ───────────────────────────────────────────────────────────────
// UI rendering, screen transitions, and the day-phase loop.
// Reads from window.WC (state.js + events.js).
// ─────────────────────────────────────────────────────────────────────────

const WC = window.WC;

// ── State ────────────────────────────────────────────────────────────────
let G = null; // the live game state

// ── Screen helpers ────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Title screen ──────────────────────────────────────────────────────────
document.getElementById('btn-new-game').addEventListener('click', () => {
  showScreen('screen-create');
  buildCreateScreen();
});

// ── Character creation ────────────────────────────────────────────────────
let selectedPelt   = null;
let selectedGender = null;
let selectedClan   = null;
let selectedPath   = null;

function buildCreateScreen() {
  selectedPelt = null;
  selectedGender = null;
  selectedClan = null;
  selectedPath = null;
  document.getElementById('btn-start').disabled = true;

  // Pelt swatches
  const peltEl = document.getElementById('pelt-options');
  peltEl.innerHTML = '';
  WC.PELTS.forEach(p => {
    const s = document.createElement('div');
    s.className = 'pelt-swatch';
    s.title = p.label;
    s.style.background = p.color;
    s.dataset.id = p.id;
    s.addEventListener('click', () => {
      selectedPelt = p.id;
      peltEl.querySelectorAll('.pelt-swatch').forEach(x => x.classList.remove('selected'));
      s.classList.add('selected');
      validateCreate();
    });
    peltEl.appendChild(s);
  });

  // Gender buttons
  const genderEl = document.getElementById('gender-options');
  genderEl.innerHTML = '';
  WC.GENDERS.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'gender-btn';
    btn.dataset.id = g.id;
    btn.innerHTML = `<span class="gender-symbol">${g.symbol}</span>${g.label}`;
    btn.addEventListener('click', () => {
      selectedGender = g;
      genderEl.querySelectorAll('.gender-btn').forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
      validateCreate();
    });
    genderEl.appendChild(btn);
  });

  // Path buttons
  const pathEl = document.getElementById('path-options');
  pathEl.innerHTML = '';
  const paths = [
    { id: 'warrior',     label: 'Warrior',      desc: 'Fight for your Clan. Hunt, patrol, and rise to lead.' },
    { id: 'medicineCat', label: 'Medicine Cat',  desc: 'Heal the Clan. Gather herbs and walk with StarClan.' },
  ];
  paths.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'path-btn';
    btn.innerHTML = `<span class="path-label">${p.label}</span><span class="path-desc">${p.desc}</span>`;
    btn.addEventListener('click', () => {
      selectedPath = p.id;
      pathEl.querySelectorAll('.path-btn').forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
      validateCreate();
    });
    pathEl.appendChild(btn);
  });

  // Clan buttons
  const clanEl = document.getElementById('clan-options');
  clanEl.innerHTML = '';
  WC.CLANS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'clan-btn';
    btn.textContent = c;
    btn.addEventListener('click', () => {
      selectedClan = c;
      clanEl.querySelectorAll('.clan-btn').forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
      validateCreate();
    });
    clanEl.appendChild(btn);
  });

  document.getElementById('cat-name').addEventListener('input', validateCreate);

  document.getElementById('btn-start').addEventListener('click', startGame);
}

function validateCreate() {
  const name = document.getElementById('cat-name').value.trim();
  const errEl = document.getElementById('create-error');
  const ok = name.length >= 2 && selectedPelt && selectedGender && selectedClan && selectedPath;

  if (name.length > 0 && name.length < 2) {
    errEl.textContent = 'Name must be at least 2 characters.';
  } else {
    errEl.textContent = '';
  }

  document.getElementById('btn-start').disabled = !ok;
}

function startGame() {
  const name = document.getElementById('cat-name').value.trim();
  G = WC.createState(name, selectedPelt, selectedClan, selectedGender, selectedPath);
  WC.generateClanRoster(G);

  // Opening log
  const pro = G.gender.pronoun;
  const pos = G.gender.possessive;
  const gLabel = G.gender.label;
  WC.log(G, `You open your eyes for the first time. The nursery is warm and smells of milk.`, 'system');
  if (G.path === 'medicineCat') {
    WC.log(G, `You are ${G.fullName} of ${G.clan} — a ${gLabel} kit with a healer's calling.`, 'normal');
    WC.log(G, `Even now, you watch the medicine cat's den with curious, unblinking eyes.`, 'normal');
  } else {
    WC.log(G, `You are ${G.fullName} of ${G.clan} — a ${gLabel} kit with big dreams.`, 'normal');
    WC.log(G, `${pro.charAt(0).toUpperCase() + pro.slice(1)} curls ${pos} tiny paws beneath ${pos} chest and watches the world with wide eyes.`, 'normal');
  }

  showScreen('screen-game');
  renderAll();
  renderMorningActions();
}

// ── Main render ───────────────────────────────────────────────────────────

function renderAll() {
  renderHeader();
  renderStats();
  renderLog();
  renderPortrait();
  renderRelationships();
  document.body.className = `season-${WC.currentSeason(G)}`;
}

function renderHeader() {
  document.getElementById('hdr-name').textContent = G.fullName;
  document.getElementById('hdr-rank').textContent = stageLabel(G.stage);
  document.getElementById('hdr-season').textContent = WC.currentSeason(G);
  document.getElementById('hdr-moon').textContent = `Moon ${G.moons}`;

  const livesEl = document.getElementById('hdr-lives');
  if (G.stage === 'leader') {
    livesEl.classList.remove('hidden');
    livesEl.textContent = '♥'.repeat(G.lives) + '♡'.repeat(G.livesMax - G.lives);
  } else {
    livesEl.classList.add('hidden');
  }
}

function renderStats() {
  const row = document.getElementById('stats-row');
  row.innerHTML = '';

  // Health pill
  const hp = pill('HP', G.health, G.maxHealth, 'health-pill' + (G.health < 30 ? ' low' : ''));
  row.appendChild(hp);

  // Stat pills
  const statMap = [
    ['STR', 'strength'],
    ['AGI', 'agility'],
    ['STL', 'stealth'],
    ['END', 'endurance'],
    ['CHA', 'charisma'],
  ];
  const cap = WC.statCap(G);
  statMap.forEach(([label, key]) => {
    row.appendChild(pill(label, G.stats[key], cap, 'stat-pill'));
  });
}

function pill(label, val, max, extraClass = '') {
  const pct = Math.round((val / max) * 100);
  const el = document.createElement('div');
  el.className = `stat-pill ${extraClass}`;
  el.innerHTML = `
    <span class="stat-label">${label}</span>
    <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
    <span class="stat-val">${val}</span>
  `;
  return el;
}

function renderLog() {
  const logEl = document.getElementById('narrative-log');
  logEl.innerHTML = '';
  // Render newest → oldest so latest entries are always at the top
  G.log.forEach((entry, i) => {
    if (i > 0 && i % 3 === 0) {
      const hr = document.createElement('hr');
      hr.className = 'log-divider';
      logEl.appendChild(hr);
    }
    const div = document.createElement('div');
    div.className = `log-entry ${entry.type}`;
    div.textContent = entry.text;
    logEl.appendChild(div);
  });
  // Scroll to top so newest is always visible
  const panel = logEl.closest('.narrative-panel');
  if (panel) panel.scrollTop = 0;
}

// ── Cat portrait ─────────────────────────────────────────────────────────

function renderPortrait() {
  const el = document.getElementById('cat-portrait');
  if (!el) return;

  const pelt = WC.PELTS.find(p => p.id === G.pelt) || WC.PELTS[0];
  const c = pelt.color;

  // Compute mood from state
  let mood = 'neutral';
  if (G.sick)                           mood = 'sick';
  else if (G.injured || G.health < 30)  mood = 'injured';
  else if (G.stage === 'leader')        mood = 'proud';
  else if (G.health > 85)              mood = 'happy';

  // Stage scale
  const scales = { kit: 0.52, apprentice: 0.72, warrior: 0.9, seniorWarrior: 1, deputy: 1, leader: 1.05 };
  const scale = scales[G.stage] || 1;

  // Body classes
  const bodyClasses = ['cat-body',
    G.sick    ? 'is-sick'    : '',
    G.injured ? 'is-injured' : '',
    G.stage === 'leader' ? 'is-leader' : '',
  ].filter(Boolean).join(' ');

  // Scar SVG paths (up to 4 visible marks on the face/body)
  const scarPaths = [
    'M 32,52 L 45,64',
    'M 56,50 L 67,62',
    'M 37,66 L 50,58',
    'M 46,74 L 57,80',
  ];
  const scarSVG = Array.from({ length: Math.min(G.scars, 4) }, (_, i) =>
    `<path d="${scarPaths[i]}" stroke="rgba(0,0,0,0.38)" stroke-width="2.2" stroke-linecap="round"/>`
  ).join('');

  // Build a 2D SVG cat — reused for player and kit figures
  function buildCatSVG(peltColor, moodKey, isKit) {
    const eyes = {
      neutral: `
        <circle cx="41" cy="60" r="4.5" fill="rgba(0,0,0,0.65)"/>
        <circle cx="57" cy="60" r="4.5" fill="rgba(0,0,0,0.65)"/>
        <circle cx="42" cy="59" r="1.5" fill="rgba(255,255,255,0.35)"/>
        <circle cx="58" cy="59" r="1.5" fill="rgba(255,255,255,0.35)"/>`,
      happy: `
        <path d="M 36,64 Q 41,57 46,64" fill="none" stroke="rgba(0,0,0,0.65)" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M 52,64 Q 57,57 62,64" fill="none" stroke="rgba(0,0,0,0.65)" stroke-width="2.5" stroke-linecap="round"/>`,
      injured: `
        <line x1="37" y1="56" x2="45" y2="64" stroke="rgba(0,0,0,0.65)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="45" y1="56" x2="37" y2="64" stroke="rgba(0,0,0,0.65)" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="57" cy="60" r="4.5" fill="rgba(0,0,0,0.65)"/>`,
      sick: `
        <path d="M 36,62 Q 38.5,66 41,62 Q 43.5,58 46,62" fill="none" stroke="rgba(0,0,0,0.65)" stroke-width="2" stroke-linecap="round"/>
        <path d="M 52,62 Q 54.5,66 57,62 Q 59.5,58 62,62" fill="none" stroke="rgba(0,0,0,0.65)" stroke-width="2" stroke-linecap="round"/>`,
      proud: `
        <circle cx="41" cy="61" r="4.5" fill="rgba(0,0,0,0.65)"/>
        <circle cx="57" cy="61" r="4.5" fill="rgba(0,0,0,0.65)"/>
        <circle cx="42" cy="60" r="2" fill="rgba(255,255,255,0.4)"/>
        <circle cx="58" cy="60" r="2" fill="rgba(255,255,255,0.4)"/>
        <rect x="35" y="53" width="13" height="5" fill="${peltColor}" rx="1.5"/>
        <rect x="51" y="53" width="13" height="5" fill="${peltColor}" rx="1.5"/>`,
    };
    const w = isKit ? 60 : 100;
    const h = isKit ? 81 : 135;
    return `
      <svg class="cat-svg" viewBox="0 0 100 135" width="${w}" height="${h}"
           xmlns="http://www.w3.org/2000/svg" overflow="visible">
        <!-- Tail (drawn first so it sits behind the body) -->
        <g class="cat-svg-tail">
          <path d="M 62,118 C 89,106 93,76 77,63 C 71,57 62,63 65,71"
                fill="none" stroke="${peltColor}" stroke-width="10" stroke-linecap="round"/>
        </g>
        <!-- Body -->
        <ellipse class="cat-svg-body" cx="50" cy="100" rx="29" ry="26" fill="${peltColor}"/>
        <!-- Head -->
        <circle class="cat-svg-head" cx="50" cy="59" r="27" fill="${peltColor}"/>
        <!-- Left ear -->
        <g class="cat-svg-ear-l">
          <polygon points="24,44 14,18 39,36" fill="${peltColor}" style="filter:brightness(0.82)"/>
          <polygon points="26,40 19,22 36,33" fill="rgba(255,175,160,0.55)"/>
        </g>
        <!-- Right ear -->
        <g class="cat-svg-ear-r">
          <polygon points="76,44 86,18 61,36" fill="${peltColor}" style="filter:brightness(0.82)"/>
          <polygon points="74,40 81,22 64,33" fill="rgba(255,175,160,0.55)"/>
        </g>
        <!-- Eyes -->
        <g class="cat-svg-eyes">${eyes[moodKey] || eyes.neutral}</g>
        <!-- Nose -->
        <path d="M 50,70 L 46,65 L 54,65 Z" fill="rgba(0,0,0,0.4)"/>
        <!-- Mouth -->
        <path d="M 47,71 Q 50,74 53,71" fill="none" stroke="rgba(0,0,0,0.28)" stroke-width="1.3" stroke-linecap="round"/>
        <!-- Whiskers left -->
        <line x1="18" y1="67" x2="43" y2="68" stroke="rgba(255,255,255,0.38)" stroke-width="1" stroke-linecap="round"/>
        <line x1="18" y1="72" x2="43" y2="71" stroke="rgba(255,255,255,0.38)" stroke-width="1" stroke-linecap="round"/>
        <!-- Whiskers right -->
        <line x1="82" y1="67" x2="57" y2="68" stroke="rgba(255,255,255,0.38)" stroke-width="1" stroke-linecap="round"/>
        <line x1="82" y1="72" x2="57" y2="71" stroke="rgba(255,255,255,0.38)" stroke-width="1" stroke-linecap="round"/>
        <!-- Front paws -->
        <ellipse cx="37" cy="124" rx="11" ry="7" fill="${peltColor}" style="filter:brightness(0.88)"/>
        <ellipse cx="63" cy="124" rx="11" ry="7" fill="${peltColor}" style="filter:brightness(0.88)"/>
        <!-- Toe lines -->
        <line x1="31" y1="127" x2="31" y2="122" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="37" y1="128" x2="37" y2="123" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="43" y1="127" x2="43" y2="122" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="57" y1="127" x2="57" y2="122" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="63" y1="128" x2="63" y2="123" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="69" y1="127" x2="69" y2="122" stroke="rgba(0,0,0,0.22)" stroke-width="1.2" stroke-linecap="round"/>
        <!-- Scars -->
        ${isKit ? '' : scarSVG}
      </svg>`;
  }

  // Kit figures beside the main cat
  const kitHTML = Array.from({ length: Math.min(G.kitsCount, 3) }, () =>
    `<div class="kit-figure">${buildCatSVG(c, 'happy', true)}</div>`
  ).join('');

  // Status badges
  const badges = [];
  if (G.path === 'medicineCat') badges.push(`<span class="p-badge medcat">🌿 Medicine Cat</span>`);
  if (G.injured)     badges.push(`<span class="p-badge injury">🩹 Injured</span>`);
  if (G.sick)        badges.push(`<span class="p-badge sick">🤒 Sick</span>`);
  if (G.scars > 0)   badges.push(`<span class="p-badge scar">⭐ ${G.scars} scar${G.scars > 1 ? 's' : ''}</span>`);
  if (G.kitsCount>0) badges.push(`<span class="p-badge kits">🐾 ${G.kitsCount} kit${G.kitsCount > 1 ? 's' : ''}</span>`);
  if (G.stage==='leader') badges.push(`<span class="p-badge leader">★ ${G.lives} lives</span>`);

  el.innerHTML = `
    <div class="nest-card">
      <div class="cat-wrap" style="transform: scale(${scale}); transform-origin: bottom center;">
        ${kitHTML}
        <div class="${bodyClasses}">
          ${buildCatSVG(c, mood, false)}
        </div>
      </div>
      <div class="portrait-badges">${badges.join('')}</div>
    </div>`;
}

// ── Relationships panel ───────────────────────────────────────────────────

function renderRelationships() {
  const el = document.getElementById('relationships-panel');
  if (!el) return;

  const bonds = Object.entries(G.bonds);
  if (bonds.length === 0) { el.innerHTML = ''; return; }

  // Mate always first, then sort by level descending, show top 5
  bonds.sort((a, b) => {
    if (a[0] === G.mateName) return -1;
    if (b[0] === G.mateName) return  1;
    return b[1] - a[1];
  });
  const top = bonds.slice(0, 5);

  const rows = top.map(([name, val]) => {
    const isMate = name === G.mateName;
    const pct = Math.round(val);
    return `<div class="rel-row">
      <span class="rel-name ${isMate ? 'is-mate' : ''}">${name}</span>
      <div class="rel-bar-bg"><div class="rel-bar-fill ${isMate ? 'mate' : ''}" style="width:${pct}%"></div></div>
      <span class="rel-val">${val}</span>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="relationships-panel">
    <div class="rel-heading">Bonds</div>
    <div class="rel-list">${rows}</div>
  </div>`;
}

// ── Day phases ────────────────────────────────────────────────────────────

/** Phase 1: Show morning action choices */
function renderMorningActions() {
  G.phase = 'morning';
  hideEventBox();

  // Injury recovery: if healed enough overnight, convert to scar
  if (G.injured && G.health >= 60) {
    G.injured = false;
    G.scars++;
    WC.log(G, 'Your wound has closed, leaving a permanent scar.', 'system');
  }

  // Sickness recovery: gradual chance each morning
  if (G.sick && Math.random() < 0.3) {
    G.sick = false;
    WC.log(G, 'The sickness has passed. You feel yourself again.', 'good');
  }

  const heading = document.getElementById('action-heading');
  heading.textContent = phaseHeading(G);

  const actions = WC.getAvailableActions(G);
  const btnArea = document.getElementById('action-buttons');
  btnArea.innerHTML = '';

  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.innerHTML = `<span class="icon">${action.icon}</span>${action.label}`;
    btn.addEventListener('click', () => resolveMorningAction(action));
    btnArea.appendChild(btn);
  });
}

function resolveMorningAction(action) {
  const result = action.resolve(G);

  // Battle actions return an object instead of a lines array
  if (result && result.type === 'battle') {
    renderBattle(result);
    return;
  }

  result.forEach(l => WC.log(G, l.text, l.type));
  renderAll();
  renderMiddayEvent();
}

/** Render battle move picker, then resolve like a morning action */
function renderBattle(battleObj) {
  // Kits never battle — fall through to midday event
  if (G.stage === 'kit') { renderMiddayEvent(); return; }

  hideEventBox();
  const heading = document.getElementById('action-heading');
  const btnArea = document.getElementById('action-buttons');

  const label = battleObj.isTraining ? 'Choose your move' : '⚔️ Choose your attack';
  heading.textContent = label;
  btnArea.innerHTML = '';

  // Intro line above buttons
  const intro = document.createElement('p');
  intro.className = 'battle-intro';
  intro.textContent = battleObj.intro;
  btnArea.before(intro);   // insert just before button grid

  battleObj.moves.forEach(move => {
    const btn = document.createElement('button');
    btn.className = 'move-btn';
    btn.innerHTML = `<span class="move-name">${move.name}</span><span class="move-stat">${move.hint}</span>`;
    btn.addEventListener('click', () => {
      // Remove intro para
      btnArea.parentElement.querySelector('.battle-intro')?.remove();

      const resultLines = move.resolve(G);
      resultLines.forEach(l => WC.log(G, l.text, l.type));

      if (G.health <= 0) { handleDeath('Your wounds were too great.'); return; }
      renderAll();
      renderMiddayEvent();
    });
    btnArea.appendChild(btn);
  });
}

/** Phase 2: Show random midday event (if any) */
function renderMiddayEvent() {
  G.phase = 'event';
  const event = WC.pickRandomEvent(G);
  G.pendingEvent = event;

  const heading = document.getElementById('action-heading');
  const btnArea = document.getElementById('action-buttons');

  if (!event || !event.text || event.text(G) === null || event.choices.length === 0) {
    // Quiet day — go straight to evening
    if (event && event.text && event.text(G)) {
      WC.log(G, event.text(G), 'normal');
    }
    renderAll();
    renderEveningPhase();
    return;
  }

  const eventText = event.text(G);
  showEventBox(eventText);
  heading.textContent = 'How do you respond?';
  btnArea.innerHTML = '';

  event.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.innerHTML = `<span class="icon">↳</span>${choice.label}`;
    btn.addEventListener('click', () => resolveEventChoice(event, choice));
    btnArea.appendChild(btn);
  });
}

function resolveEventChoice(event, choice) {
  WC.log(G, `[${event.id.replace(/_/g, ' ')}] ${event.text(G)}`, 'system');
  const resultLines = choice.resolve(G);
  resultLines.forEach(l => WC.log(G, l.text, l.type));

  // Check for death
  if (G.health <= 0) {
    handleDeath('Your wounds were too great.');
    return;
  }

  renderAll();
  renderEveningPhase();
}

/** Phase 3: Evening — advance time, show night summary, loop */
function renderEveningPhase() {
  G.phase = 'evening';
  hideEventBox();

  const seasonChanged = WC.advanceDay(G);

  if (seasonChanged) {
    WC.log(G, `— The season turns. It is now ${WC.currentSeason(G)}. —`, 'system');
  }

  // Natural health regen (small)
  if (!G.injured) {
    WC.modHealth(G, 3);
  }

  renderAll();

  if (G.gameOver) {
    handleDeath(G.gameOverReason);
    return;
  }

  // Short pause before next morning
  setTimeout(() => {
    renderNightScene();
  }, 600);
}

/** Phase 4: Brief night flavour, then back to morning */
function renderNightScene() {
  G.phase = 'night';
  const flavour = nightFlavour(G);
  if (flavour) WC.log(G, flavour, 'normal');
  renderAll();

  setTimeout(() => {
    renderMorningActions();
  }, 400);
}

// ── Death / game over ─────────────────────────────────────────────────────
function handleDeath(reason) {
  G.gameOver = true;
  WC.log(G, `Your story ends: ${reason}`, 'danger');
  WC.log(G, `You lived ${G.moons} moons as ${G.fullName} of ${G.clan}.`, 'system');
  renderAll();

  document.getElementById('action-heading').textContent = 'Your journey has ended.';
  document.getElementById('action-buttons').innerHTML = `
    <button class="action-btn" onclick="location.reload()">
      <span class="icon">↩</span>Begin a new life
    </button>
  `;
}

// ── UI helpers ────────────────────────────────────────────────────────────
function showEventBox(text) {
  const box = document.getElementById('event-display');
  box.classList.remove('hidden');
  box.innerHTML = `<h4>Event</h4>${text}`;
}

function hideEventBox() {
  document.getElementById('event-display').classList.add('hidden');
}

function stageLabel(stage) {
  const map = {
    kit:              'Kit',
    apprentice:       'Apprentice',
    warrior:          'Warrior',
    seniorWarrior:    'Senior Warrior',
    deputy:           'Deputy',
    leader:           'Leader',
    medApprentice:    'Medicine Cat Apprentice',
    medicineCat:      'Medicine Cat',
    seniorMedicineCat:'Senior Medicine Cat',
  };
  return map[stage] ?? stage;
}

function phaseHeading(state) {
  switch (state.stage) {
    case 'kit':               return 'What will you do in the nursery?';
    case 'apprentice':        return 'What will you do today, apprentice?';
    case 'warrior':           return 'What will you do today, warrior?';
    case 'seniorWarrior':     return 'What will you do today?';
    case 'deputy':            return 'The Clan awaits your lead, Deputy.';
    case 'leader':            return 'Lead your Clan wisely.';
    case 'medApprentice':     return 'What will you tend to today?';
    case 'medicineCat':       return 'The medicine den awaits. What calls to you?';
    case 'seniorMedicineCat': return 'Your wisdom guides the Clan. What is needed?';
    default:                  return 'What will you do?';
  }
}

function nightFlavour(state) {
  const season = WC.currentSeason(state);
  const pool = {
    'Newleaf':   [
      'The camp is quiet. Somewhere a thrush sings the last of the evening.',
      'New growth pushes through the forest floor. The air smells of earth.',
    ],
    'Greenleaf': [
      'The long warm night hums with insects. Stars wheel overhead.',
      'Moonhigh comes early. You curl in the moss and close your eyes.',
    ],
    'Leaf-fall': [
      'Leaves drift into the camp. The nights grow colder.',
      'Fieldclan territory smells of rain tonight.',
    ],
    'Leaf-bare': [
      'Frost hardens the ground. The Clan huddles for warmth.',
      'You can see your breath in the moonlight.',
      'The cold presses in from all sides.',
    ],
  };
  const opts = pool[season];
  return opts ? opts[Math.floor(Math.random() * opts.length)] : null;
}

// ── Tab bar ───────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn:not(.tab-end)').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── End game button ───────────────────────────────────────────────────────
document.getElementById('btn-end-game').addEventListener('click', () => {
  if (!G) return;

  const heading = document.getElementById('action-heading');
  const btnArea = document.getElementById('action-buttons');
  hideEventBox();

  heading.textContent = 'End your journey?';
  btnArea.innerHTML = '';

  const note = document.createElement('p');
  note.className = 'battle-intro';
  note.style.cssText = 'color:var(--text-dim);border-color:var(--border)';
  note.textContent = 'This will return you to the title screen. Your current game will be lost.';
  btnArea.appendChild(note);

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'action-btn';
  confirmBtn.innerHTML = '<span class="icon">↩</span>Yes, end this life';
  confirmBtn.addEventListener('click', () => {
    G = null;
    showScreen('screen-title');
  });
  btnArea.appendChild(confirmBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'action-btn';
  cancelBtn.innerHTML = '<span class="icon">✕</span>No, keep playing';
  cancelBtn.addEventListener('click', () => renderMorningActions());
  btnArea.appendChild(cancelBtn);
});
