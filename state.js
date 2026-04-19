// ── state.js ──────────────────────────────────────────────────────────────
// Central game state and all mutation helpers.
// No DOM access here — this is pure data/logic.
// ─────────────────────────────────────────────────────────────────────────

const CLANS = ['Stormclan', 'Lakeclan', 'Fieldclan', 'Shadeclan', 'Cloudclan'];

const GENDERS = [
  { id: 'she-cat', label: 'She-cat', symbol: '♀', pronoun: 'she', possessive: 'her' },
  { id: 'tom',     label: 'Tom',     symbol: '♂', pronoun: 'he',  possessive: 'his' },
  { id: 'other',   label: 'Other',   symbol: '✦', pronoun: 'they', possessive: 'their' },
];

const PELTS = [
  { id: 'flame',  label: 'Flame',    color: '#c0522a' },
  { id: 'silver', label: 'Silver',   color: '#9eaab5' },
  { id: 'black',  label: 'Black',    color: '#2a2a35' },
  { id: 'tabby',  label: 'Tabby',    color: '#8c6b3e' },
  { id: 'white',  label: 'White',    color: '#dde4e6' },
  { id: 'gray',   label: 'Gray',     color: '#6b7a80' },
];

const SEASONS = ['Newleaf', 'Greenleaf', 'Leaf-fall', 'Leaf-bare'];

// Life stage thresholds (moons)
const STAGE_THRESHOLDS = {
  kit:              { min: 0,  max: 5  },   // 0–5 moons
  apprentice:       { min: 6,  max: 11 },   // 6–11 moons
  warrior:          { min: 12, max: 29 },   // 12–29 moons
  seniorWarrior:    { min: 30, max: 59 },   // 30–59 moons
  deputy:           { min: 60, max: null },  // appointed by leader
  leader:           { min: 0,  max: null },  // appointed after deputy
  // Medicine cat path
  medApprentice:    { min: 6,  max: 11 },
  medicineCat:      { min: 12, max: null },
  seniorMedicineCat:{ min: 30, max: null },
};

// Base stat caps per stage
const STAT_CAPS = {
  kit:              15,
  apprentice:       35,
  warrior:          65,
  seniorWarrior:    80,
  deputy:           90,
  leader:           100,
  // Medicine cat path
  medApprentice:    35,
  medicineCat:      75,
  seniorMedicineCat:90,
};

// ── Initial state factory ─────────────────────────────────────────────────
function createState(name, peltId, clan, gender, path = 'warrior') {
  return {
    // Identity
    kitName:   name,
    fullName:  name + 'kit',      // updated on rank-up
    pelt:      peltId,
    clan:      clan,
    gender:    gender,            // { id, label, symbol, pronoun, possessive }
    path:      path,              // 'warrior' | 'medicineCat'

    // Progression
    moons:     0,
    stage:     'kit',
    lives:     1,                 // becomes 9 on leader ceremony
    livesMax:  1,

    // Stats (0–100 scale, capped per stage)
    stats: {
      strength:  5,
      agility:   5,
      stealth:   5,
      endurance: 5,
      charisma:  5,
    },

    // Health
    health:    100,
    maxHealth: 100,
    injured:   false,

    // Portrait state
    sick:      false,
    scars:     0,
    kitsCount: 0,

    // Mate
    hasMate:   false,
    mateName:  null,
    codeBroken: false,            // medicine cat code

    // Clan relationships: { catName: bondLevel (0–100) }
    bonds: {},

    // Clan roster (generated on start)
    clanmates: [],

    // Season tracking
    seasonIndex: 0,       // 0=Newleaf ... 3=Leaf-bare
    dayOfSeason: 0,       // 0–29 days per season
    DAYS_PER_SEASON: 5,

    // Flags
    deputyAppointed: false,
    leaderDead:      false,
    mentorName:      null,

    // Narrative log entries [{ text, type }]
    log: [],

    // Pending event (shown to player before they choose action)
    pendingEvent: null,

    // Phase of the current day: 'morning' | 'event' | 'evening' | 'night'
    phase: 'morning',

    // Whether game is over
    gameOver: false,
    gameOverReason: '',
  };
}

// ── Accessors ─────────────────────────────────────────────────────────────

function currentSeason(state) {
  return SEASONS[state.seasonIndex];
}

function statCap(state) {
  return STAT_CAPS[state.stage] ?? 100;
}

function canDie(state) {
  return state.stage !== 'kit' && state.stage !== 'apprentice' && state.stage !== 'medApprentice';
}

// ── Mutations ─────────────────────────────────────────────────────────────

/** Add a log entry. type: 'normal' | 'danger' | 'good' | 'system' */
function log(state, text, type = 'normal') {
  state.log.unshift({ text, type });
  if (state.log.length > 120) state.log.pop();
}

/** Advance time by one day. Returns true if a season changed. */
function advanceDay(state) {
  state.dayOfSeason++;
  let seasonChanged = false;

  if (state.dayOfSeason >= state.DAYS_PER_SEASON) {
    state.dayOfSeason = 0;
    state.seasonIndex = (state.seasonIndex + 1) % 4;
    seasonChanged = true;

    // 1 season = 1 moon
    state.moons++;
    checkRankUp(state);
  }

  return seasonChanged;
}

/** Apply a stat delta (clamped to stage cap and 0). */
function modStat(state, stat, delta) {
  const cap = statCap(state);
  state.stats[stat] = Math.max(0, Math.min(cap, state.stats[stat] + delta));
}

/** Apply health delta. Returns true if cat died. */
function modHealth(state, delta) {
  state.health = Math.max(0, Math.min(state.maxHealth, state.health + delta));

  if (state.health <= 0) {
    if (!canDie(state)) {
      // Protected — survive at 1 hp, mentor/mother intervenes
      state.health = 1;
      return false;
    }
    if (state.stage === 'leader' && state.lives > 1) {
      state.lives--;
      state.health = state.maxHealth;
      return false; // lost a life, not dead yet
    }
    return true; // true death
  }
  return false;
}

/** Modify bond with a clanmate (create if needed). */
function modBond(state, catName, delta) {
  if (!(catName in state.bonds)) state.bonds[catName] = 20;
  state.bonds[catName] = Math.max(0, Math.min(100, state.bonds[catName] + delta));
}

// ── Rank-up logic ─────────────────────────────────────────────────────────

function checkRankUp(state) {
  const { moons, stage, path } = state;

  if (path === 'medicineCat') {
    if (stage === 'kit' && moons >= 6) {
      rankUp(state, 'medApprentice');
    } else if (stage === 'medApprentice' && moons >= 12) {
      rankUp(state, 'medicineCat');
    } else if (stage === 'medicineCat' && moons >= 30) {
      rankUp(state, 'seniorMedicineCat');
    }
  } else {
    if (stage === 'kit' && moons >= 6) {
      rankUp(state, 'apprentice');
    } else if (stage === 'apprentice' && moons >= 12) {
      rankUp(state, 'warrior');
    } else if (stage === 'warrior' && moons >= 30) {
      rankUp(state, 'seniorWarrior');
    }
    // deputy and leader are event-driven, not age-driven
  }
}

function rankUp(state, newStage) {
  const old = state.stage;
  state.stage = newStage;

  // Update name suffix
  const base = state.kitName;
  switch (newStage) {
    case 'apprentice':
      state.fullName = base + 'paw';
      state.mentorName = assignMentor(state);
      log(state, `You have been made an apprentice. Your new name is ${state.fullName}! ${state.mentorName} will be your mentor.`, 'good');
      break;
    case 'warrior':
      state.fullName = base + generateWarriorSuffix();
      log(state, `You have earned your warrior name: ${state.fullName}! You sit vigil through the night in silence.`, 'good');
      break;
    case 'seniorWarrior':
      log(state, `You have served ${state.moons} moons as a warrior. The Clan looks to you as a senior warrior.`, 'good');
      break;
    case 'medApprentice':
      state.fullName = base + 'paw';
      state.mentorName = assignMedicineMentor(state);
      log(state, `You have been chosen as medicine cat apprentice. Your name is ${state.fullName}. ${state.mentorName} will guide your paws.`, 'good');
      break;
    case 'medicineCat':
      state.fullName = base + generateWarriorSuffix();
      log(state, `You have earned your full medicine cat name: ${state.fullName}. StarClan walks with you always.`, 'good');
      break;
    case 'seniorMedicineCat':
      log(state, `After ${state.moons} moons of healing, you are now a senior medicine cat, respected across all Clans.`, 'good');
      break;
    case 'deputy':
      state.fullName = base + generateWarriorSuffix();
      log(state, `${state.clan}'s leader calls your name at Highledge: you are now deputy of ${state.clan}!`, 'good');
      break;
    case 'leader':
      state.fullName = base + 'star';
      state.lives = 9;
      state.livesMax = 9;
      state.health = state.maxHealth;
      log(state, `You travel to Moonstone and receive your nine lives. You are now ${state.fullName}, leader of ${state.clan}.`, 'good');
      break;
  }
}

// ── Clan roster generation ────────────────────────────────────────────────

const CAT_PREFIXES = ['Dust', 'Fire', 'Blue', 'Gray', 'Frost', 'Stone', 'Leaf', 'Swift', 'Moss', 'Bright', 'Ash', 'Cloud', 'Thorn', 'Bracken'];
const CAT_SUFFIXES = ['pelt', 'heart', 'fur', 'tail', 'claw', 'whisker', 'pool', 'step', 'flight', 'storm', 'shine', 'fang'];
const MENTOR_SUFFIXES = ['pelt', 'heart', 'claw', 'storm', 'fang', 'fur'];

function generateWarriorSuffix() {
  return CAT_SUFFIXES[Math.floor(Math.random() * CAT_SUFFIXES.length)];
}

function randomCatName() {
  const p = CAT_PREFIXES[Math.floor(Math.random() * CAT_PREFIXES.length)];
  const s = CAT_SUFFIXES[Math.floor(Math.random() * CAT_SUFFIXES.length)];
  return p + s;
}

function assignMentor(state) {
  // Pick a warrior clanmate as mentor
  const warriors = state.clanmates.filter(c => c.stage === 'warrior' || c.stage === 'seniorWarrior');
  if (warriors.length > 0) {
    return warriors[Math.floor(Math.random() * warriors.length)].name;
  }
  // Fallback
  const p = CAT_PREFIXES[Math.floor(Math.random() * CAT_PREFIXES.length)];
  const s = MENTOR_SUFFIXES[Math.floor(Math.random() * MENTOR_SUFFIXES.length)];
  return p + s;
}

function assignMedicineMentor(state) {
  // Medicine cat mentor — use a senior clanmate or a generated name
  const seniors = state.clanmates.filter(c => c.stage === 'seniorWarrior' || c.stage === 'deputy');
  if (seniors.length > 0) {
    return seniors[Math.floor(Math.random() * seniors.length)].name;
  }
  const p = CAT_PREFIXES[Math.floor(Math.random() * CAT_PREFIXES.length)];
  return p + 'pool';
}

function generateClanRoster(state) {
  const roster = [];
  const stages = ['kit', 'apprentice', 'warrior', 'warrior', 'warrior', 'seniorWarrior', 'seniorWarrior', 'deputy'];
  for (let i = 0; i < 12; i++) {
    const stage = stages[Math.min(i, stages.length - 1)];
    roster.push({
      name:  randomCatName(),
      stage: stage,
      bond:  20 + Math.floor(Math.random() * 20),
    });
  }
  // Seed bonds
  roster.forEach(c => { state.bonds[c.name] = c.bond; });
  state.clanmates = roster;
}

// ── Skill check ───────────────────────────────────────────────────────────

/**
 * Roll a skill check. Returns 'success' | 'partial' | 'failure'.
 * difficulty: 1–100
 */
function skillCheck(state, statName, difficulty) {
  const stat = state.stats[statName] ?? 0;
  const roll = Math.random() * 100;
  const effective = stat + roll * 0.4; // stat + luck component
  if (effective >= difficulty)        return 'success';
  if (effective >= difficulty * 0.6)  return 'partial';
  return 'failure';
}

// ── Export (no module system — attach to window) ───────────────────────────
window.WC = window.WC || {};
Object.assign(window.WC, {
  CLANS, GENDERS, PELTS, SEASONS, STAGE_THRESHOLDS, STAT_CAPS,
  createState, currentSeason, statCap, canDie,
  log, advanceDay, modStat, modHealth, modBond,
  checkRankUp, rankUp, generateClanRoster, skillCheck,
  assignMedicineMentor,
});
