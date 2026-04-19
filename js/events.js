// ── events.js ─────────────────────────────────────────────────────────────
// Defines all morning actions and random midday events.
// Each event/action returns a result object for main.js to render.
// ─────────────────────────────────────────────────────────────────────────

// Use a local alias — avoids top-level const conflicts with state.js function declarations
const _WC = window.WC;
const _log = _WC.log, _modStat = _WC.modStat, _modHealth = _WC.modHealth,
      _modBond = _WC.modBond, _skillCheck = _WC.skillCheck, _rankUp = _WC.rankUp;

// ── Medicine cat content ───────────────────────────────────────────────────

const HERBS = ['catmint', 'marigold', 'burdock root', 'borage leaves', 'yarrow',
               'poppy seeds', 'goldenrod', 'tansy', 'feverfew', 'dock leaves',
               'cobwebs', 'juniper berries', 'chervil', 'water mint'];

function randomHerb() {
  return HERBS[Math.floor(Math.random() * HERBS.length)];
}

function randomOmen() {
  const omens = [
    'a flame that splits the oak but does not burn',
    'a shadow crossing the face of the moon',
    'silver fish leaping upstream against the current',
    'a hawk crying a name you cannot quite hear',
    'a river that runs two directions at once',
    'starlight pooling in the pawprint of a cat long dead',
  ];
  return omens[Math.floor(Math.random() * omens.length)];
}

function randomAncestor() {
  const ancestors = [
    'a long-dead medicine cat with silver-streaked fur',
    'a young cat with stars burning in their pelt',
    'an elder you once knew, walking among golden trees',
    'a kit that never opened its eyes, whole and bright in StarClan',
    'a warrior whose name your mentor spoke with reverence',
  ];
  return ancestors[Math.floor(Math.random() * ancestors.length)];
}

const MC_STAGES = ['medApprentice', 'medicineCat', 'seniorMedicineCat'];

// ── Morning actions ───────────────────────────────────────────────────────
// Each action: { id, label, icon, available(state), resolve(state) → ResultObj }
// ResultObj: { lines: [{ text, type }], statDeltas, nextPhase }

const ACTIONS = [

  // ── KIT ACTIONS ──────────────────────────────────────────────────────
  {
    id: 'play',
    label: 'Play with denmates',
    icon: '🐾',
    available: (s) => s.stage === 'kit',
    resolve: (s) => {
      const result = skillCheck(s, 'agility', 20);
      if (result === 'success') {
        modStat(s, 'agility', 2);
        modStat(s, 'charisma', 1);
        return lines([
          good(`You chase ${randomDenmate(s)} around the nursery. Your legs feel faster already!`),
          info('Agility +2, Charisma +1'),
        ]);
      }
      modStat(s, 'agility', 1);
      return lines([
        normal(`You tumble over your own paws but laugh it off. ${randomDenmate(s)} patiently waits for you.`),
        info('Agility +1'),
      ]);
    },
  },

  {
    id: 'listen',
    label: 'Listen to elder stories',
    icon: '📖',
    available: (s) => s.stage === 'kit',
    resolve: (s) => {
      modStat(s, 'charisma', 2);
      const elder = randomElder();
      return lines([
        normal(`${elder} tells you of the great battle of Sunningrocks. You listen with wide eyes.`),
        info('Charisma +2'),
      ]);
    },
  },

  {
    id: 'explore_nursery',
    label: 'Explore the camp',
    icon: '🏕️',
    available: (s) => s.stage === 'kit',
    resolve: (s) => {
      modStat(s, 'stealth', 1);
      modStat(s, 'endurance', 1);
      return lines([
        normal('You sneak past the warriors\' den and peek inside. It smells of pine and old moss.'),
        info('Stealth +1, Endurance +1'),
      ]);
    },
  },

  // ── MEDICINE CAT APPRENTICE ACTIONS ──────────────────────────────────
  {
    id: 'mc_learn_herbs',
    label: 'Study herb identification',
    icon: '🌿',
    available: (s) => s.stage === 'medApprentice',
    resolve: (s) => {
      const herb = randomHerb();
      const result = skillCheck(s, 'charisma', 25);
      if (result === 'success') {
        modStat(s, 'charisma', 3);
        modStat(s, 'endurance', 1);
        return lines([
          good(`${s.mentorName} holds up a sprig of ${herb}. The scent is sharp. You won't forget it.`),
          info('Charisma +3, Endurance +1'),
        ]);
      }
      modStat(s, 'charisma', 1);
      return lines([
        normal(`You confuse ${herb} with a similar plant. ${s.mentorName} corrects you gently.`),
        info('Charisma +1'),
      ]);
    },
  },

  {
    id: 'mc_gather_apprentice',
    label: 'Gather healing herbs',
    icon: '🌱',
    available: (s) => s.stage === 'medApprentice',
    resolve: (s) => {
      const herb = randomHerb();
      const result = skillCheck(s, 'stealth', 28);
      if (result === 'success') {
        modStat(s, 'stealth', 2);
        modHealth(s, 5);
        return lines([
          good(`You find a patch of ${herb} near the stream. Your mentor nods approval.`),
          info('Stealth +2, Health +5'),
        ]);
      }
      modStat(s, 'stealth', 1);
      return lines([
        normal('You search for a long time but find only a few scraggly stems.'),
        info('Stealth +1'),
      ]);
    },
  },

  {
    id: 'mc_treat_patient_app',
    label: 'Assist treating a patient',
    icon: '🩹',
    available: (s) => s.stage === 'medApprentice',
    resolve: (s) => {
      const clanmate = randomClanmateName(s);
      const result = skillCheck(s, 'endurance', 22);
      if (result === 'success') {
        modStat(s, 'endurance', 2);
        modStat(s, 'charisma', 2);
        modBond(s, clanmate, 15);
        return lines([
          good(`You help ${s.mentorName} change ${clanmate}'s poultice. The warrior thanks you quietly.`),
          info(`Endurance +2, Charisma +2, Bond with ${clanmate} +15`),
        ]);
      }
      modStat(s, 'endurance', 1);
      return lines([
        normal(`You mix the herbs wrong and ${s.mentorName} has to redo it. You watch more carefully this time.`),
        info('Endurance +1'),
      ]);
    },
  },

  {
    id: 'mc_moonstone_app',
    label: 'Travel to Moonstone with mentor',
    icon: '🌕',
    available: (s) => s.stage === 'medApprentice' && s.moons >= 8,
    resolve: (s) => {
      modStat(s, 'charisma', 3);
      modStat(s, 'endurance', 2);
      return lines([
        good(`You travel with ${s.mentorName} to Moonstone under the light of Silverpelt.`),
        good(`You touch your nose to the cold stone and dream of ${randomAncestor()}.`),
        info('Charisma +3, Endurance +2'),
      ]);
    },
  },

  // ── APPRENTICE ACTIONS ───────────────────────────────────────────────
  {
    id: 'train_combat',
    label: 'Combat training — choose a move',
    icon: '⚔️',
    available: (s) => s.stage === 'apprentice',
    resolve: (s) => {
      const mentor = s.mentorName || 'your mentor';
      return {
        type: 'battle',
        intro: `${mentor} squares up across the clearing. "Show me what you've learned."`,
        isTraining: true,
        moves: [
          {
            name: 'Pounce',
            hint: 'Strength · High reward, high risk',
            resolve: (s) => {
              const r = _skillCheck(s, 'strength', 35);
              if (r === 'success') { _modStat(s, 'strength', 4); _modStat(s, 'agility', 1);
                return lines([good(`You launch and pin ${mentor} clean. "Well done," they say.`), info('Strength +4, Agility +1')]); }
              _modHealth(s, -8);
              return lines([normal(`You over-commit and hit the ground hard. ${mentor} steps aside easily.`), info('Health −8, Strength +1')]);
            },
          },
          {
            name: 'Dodge & Counter',
            hint: 'Agility · Safe and steady',
            resolve: (s) => {
              const r = _skillCheck(s, 'agility', 30);
              if (r === 'success') { _modStat(s, 'agility', 3); _modStat(s, 'strength', 1);
                return lines([good(`You sidestep ${mentor}'s swipe and tap their flank. "Quick paws," they nod.`), info('Agility +3, Strength +1')]); }
              _modStat(s, 'agility', 1);
              return lines([normal(`You dodge but too slowly. ${mentor} tags you. "Faster."`)  , info('Agility +1')]);
            },
          },
          {
            name: 'Ambush Stance',
            hint: 'Stealth · Surprise strike',
            resolve: (s) => {
              const r = _skillCheck(s, 'stealth', 33);
              if (r === 'success') { _modStat(s, 'stealth', 3); _modStat(s, 'agility', 2);
                return lines([good(`You melt into the shadows and strike before ${mentor} turns. They look impressed.`), info('Stealth +3, Agility +2')]); }
              _modStat(s, 'stealth', 1);
              return lines([normal(`You snap a twig. ${mentor} has you pinned before you can blink.`), info('Stealth +1')]);
            },
          },
          {
            name: 'Defense Form',
            hint: 'Endurance · Hold your ground',
            resolve: (s) => {
              const r = _skillCheck(s, 'endurance', 28);
              _modStat(s, 'endurance', r === 'success' ? 4 : 2);
              _modHealth(s, r === 'success' ? 5 : -5);
              return r === 'success'
                ? lines([good(`You absorb blow after blow and stay standing. ${mentor} finally steps back. "You have grit."`), info('Endurance +4, Health +5')])
                : lines([normal(`The hits pile up but you learn to lean into the pain.`), info('Endurance +2, Health −5')]);
            },
          },
        ],
      };
    },
  },

  {
    id: 'train_hunt',
    label: 'Hunting practice',
    icon: '🐭',
    available: (s) => s.stage === 'apprentice',
    resolve: (s) => {
      const result = skillCheck(s, 'stealth', 30);
      if (result === 'success') {
        modStat(s, 'stealth', 3);
        modStat(s, 'agility', 1);
        modHealth(s, 10);
        return lines([
          good('You catch a thrush with a clean pounce. Your mentor nods — you are learning.'),
          info('Stealth +3, Agility +1, Health +10'),
        ]);
      } else if (result === 'partial') {
        modStat(s, 'stealth', 2);
        return lines([
          normal('The mouse escapes, but you nearly had it. Close.'),
          info('Stealth +2'),
        ]);
      } else {
        modStat(s, 'stealth', 1);
        return lines([
          normal('You startle a flock of starlings. Not your best performance.'),
          info('Stealth +1'),
        ]);
      }
    },
  },

  {
    id: 'patrol_border',
    label: 'Border patrol (with mentor)',
    icon: '🗺️',
    available: (s) => s.stage === 'apprentice',
    resolve: (s) => {
      const result = skillCheck(s, 'endurance', 25);
      const mentor = s.mentorName || 'your mentor';
      if (result === 'success') {
        modStat(s, 'endurance', 2);
        modStat(s, 'charisma', 1);
        return lines([
          good(`You keep pace with ${mentor} across the entire border. Your scent marks are strong.`),
          info('Endurance +2, Charisma +1'),
        ]);
      }
      modStat(s, 'endurance', 1);
      return lines([
        normal(`You fall behind ${mentor} near Snakerocks and have to catch up, panting.`),
        info('Endurance +1'),
      ]);
    },
  },

  // ── WARRIOR / SENIOR WARRIOR ACTIONS ─────────────────────────────────
  {
    id: 'hunt',
    label: 'Go hunting',
    icon: '🐭',
    available: (s) => ['warrior', 'seniorWarrior', 'deputy', 'leader'].includes(s.stage),
    resolve: (s) => {
      const season = window.WC.currentSeason(s);
      const diff = season === 'Leaf-bare' ? 55 : season === 'Leaf-fall' ? 40 : 30;
      const result = skillCheck(s, 'stealth', diff);

      if (result === 'success') {
        modStat(s, 'stealth', 1);
        modHealth(s, 15);
        const prey = randomPrey(season);
        return lines([
          good(`You stalk and catch a ${prey} near the ${randomLocation()}. Fresh-kill for the Clan.`),
          info('Stealth +1, Health +15'),
        ]);
      } else if (result === 'partial') {
        modHealth(s, 5);
        return lines([
          normal(`You catch only a small vole. Better than nothing.`),
          info('Health +5'),
        ]);
      } else {
        return lines([
          normal('The prey is scarce today. You return to camp empty-pawed.'),
        ]);
      }
    },
  },

  {
    id: 'fight_patrol',
    label: 'Lead border skirmish',
    icon: '⚔️',
    available: (s) => ['warrior', 'seniorWarrior', 'deputy'].includes(s.stage),
    resolve: (s) => {
      const rival = rivalClan(s.clan);
      return {
        type: 'battle',
        intro: `A ${rival} patrol blocks your path at ${randomLocation()}. They won't back down.`,
        isTraining: false,
        moves: [
          {
            name: 'Pounce',
            hint: 'Strength · Overwhelming force',
            resolve: (s) => {
              const r = _skillCheck(s, 'strength', 52);
              if (r === 'success') { _modStat(s, 'strength', 3); _modStat(s, 'charisma', 1);
                return lines([good(`You barrel into the lead warrior and send them sprawling. The patrol retreats.`), info('Strength +3, Charisma +1')]); }
              if (r === 'partial') { _modStat(s, 'strength', 1); _modHealth(s, -12);
                return lines([normal(`You drive them back but take claws to the shoulder.`), info('Strength +1, Health −12')]); }
              _modHealth(s, -22); s.injured = true;
              return lines([danger(`They dodge and pile on. You fall back bloodied.`), info('Health −22 · Injured')]);
            },
          },
          {
            name: 'Dodge & Counter',
            hint: 'Agility · Read their moves',
            resolve: (s) => {
              const r = _skillCheck(s, 'agility', 48);
              if (r === 'success') { _modStat(s, 'agility', 3); _modStat(s, 'strength', 1);
                return lines([good(`You slip every strike and punish each overreach. They withdraw.`), info('Agility +3, Strength +1')]); }
              _modStat(s, 'agility', 1); _modHealth(s, -15);
              return lines([normal(`You dodge most hits but the weight of numbers tells.`), info('Agility +1, Health −15')]);
            },
          },
          {
            name: 'Feint & Strike',
            hint: 'Stealth · Unpredictable',
            resolve: (s) => {
              const r = _skillCheck(s, 'stealth', 45);
              if (r === 'success') { _modStat(s, 'stealth', 3); _modStat(s, 'charisma', 2);
                return lines([good(`Your feint draws them wide open. One clean blow ends it. The ${rival} cats look stunned.`), info('Stealth +3, Charisma +2')]); }
              _modHealth(s, -18); s.injured = true;
              return lines([danger(`They don't bite on the feint. You absorb a heavy hit.`), info('Health −18 · Injured')]);
            },
          },
          {
            name: 'Hold Ground',
            hint: 'Endurance · Outlast them',
            resolve: (s) => {
              const r = _skillCheck(s, 'endurance', 44);
              if (r === 'success') { _modStat(s, 'endurance', 3); _modHealth(s, -8); _modStat(s, 'charisma', 1);
                return lines([good(`You absorb their charge and don't move an inch. They tire first and leave.`), info('Endurance +3, Charisma +1, Health −8')]); }
              _modStat(s, 'endurance', 1); _modHealth(s, -20);
              return lines([normal(`You hold as long as you can, but they push you back.`), info('Endurance +1, Health −20')]);
            },
          },
        ],
      };
    },
  },

  {
    id: 'mentor_apprentice',
    label: 'Mentor an apprentice',
    icon: '🎓',
    available: (s) => ['seniorWarrior', 'deputy', 'leader'].includes(s.stage),
    resolve: (s) => {
      modStat(s, 'charisma', 3);
      const apprentice = randomApprentice(s);
      return lines([
        good(`You spend the morning teaching ${apprentice} the hunter's crouch. Patient work.`),
        info('Charisma +3'),
      ]);
    },
  },

  {
    id: 'seek_mate',
    label: 'Spend time with a special cat',
    icon: '♥',
    available: (s) => s.moons >= 20 && !s.hasMate && ['warrior', 'seniorWarrior', 'deputy', 'leader'].includes(s.stage),
    resolve: (s) => {
      const chosen = randomClanmateName(s);
      s.hasMate   = true;
      s.mateName  = chosen;
      _modBond(s, chosen, 50);
      _modStat(s, 'charisma', 2);
      return lines([
        good(`You and ${chosen} share tongues by the river as Silverpelt lights the sky.`),
        good(`Something unspoken passes between you. ${chosen} is now your mate.`),
        info('Mate: ' + chosen + ' · Charisma +2'),
      ]);
    },
  },

  {
    id: 'have_kits',
    label: 'Expect kits with your mate',
    icon: '🐾',
    available: (s) => s.hasMate && s.kitsCount === 0 && ['warrior', 'seniorWarrior', 'deputy', 'leader'].includes(s.stage),
    resolve: (s) => {
      const count = Math.floor(Math.random() * 3) + 1;
      s.kitsCount = count;
      return lines([
        good(`After some moons, ${s.mateName} tells you there are kits on the way.`),
        good(`${count} kit${count > 1 ? 's' : ''} arrive, filling the nursery with tiny mews.`),
        info(`Kits: ${count}`),
      ]);
    },
  },

  // ── MEDICINE CAT ACTIONS ─────────────────────────────────────────────
  {
    id: 'mc_gather',
    label: 'Gather herbs',
    icon: '🌿',
    available: (s) => s.stage === 'medicineCat' || s.stage === 'seniorMedicineCat',
    resolve: (s) => {
      const season = window.WC.currentSeason(s);
      const diff = season === 'Leaf-bare' ? 55 : season === 'Leaf-fall' ? 42 : 28;
      const herb = randomHerb();
      const result = skillCheck(s, 'stealth', diff);
      if (result === 'success') {
        modStat(s, 'stealth', 1);
        modStat(s, 'charisma', 1);
        modHealth(s, 10);
        return lines([
          good(`You return with cobwebs, ${herb}, and dried marigold. The herb store is well stocked.`),
          info('Stealth +1, Charisma +1, Health +10'),
        ]);
      } else if (result === 'partial') {
        modStat(s, 'stealth', 1);
        modHealth(s, 5);
        return lines([
          normal('A decent haul — not everything you hoped for, but the store grows.'),
          info('Stealth +1, Health +5'),
        ]);
      }
      return lines([
        normal(season === 'Leaf-bare' ? 'The frozen ground hides everything. You return nearly empty-pawed.' : 'The forest has little to offer today.'),
      ]);
    },
  },

  {
    id: 'mc_treat_clan',
    label: 'Tend to injured Clanmates',
    icon: '🩺',
    available: (s) => s.stage === 'medicineCat' || s.stage === 'seniorMedicineCat',
    resolve: (s) => {
      const clanmate = randomClanmateName(s);
      const result = skillCheck(s, 'endurance', 35);
      if (result === 'success') {
        modStat(s, 'endurance', 2);
        modStat(s, 'charisma', 2);
        modBond(s, clanmate, 20);
        modHealth(s, 5);
        return lines([
          good(`You work from dawn to dusk. ${clanmate}'s infection clears by nightfall. They press their nose to your cheek.`),
          info(`Endurance +2, Charisma +2, Bond with ${clanmate} +20, Health +5`),
        ]);
      } else if (result === 'partial') {
        modStat(s, 'endurance', 1);
        modStat(s, 'charisma', 1);
        return lines([
          normal(`A long day in the medicine den. ${clanmate} is stable, but will need more time.`),
          info('Endurance +1, Charisma +1'),
        ]);
      }
      modHealth(s, -8);
      return lines([
        normal('You push yourself too hard. By nightfall your own paws tremble.'),
        info('Health −8'),
      ]);
    },
  },

  {
    id: 'mc_starclan',
    label: 'Seek StarClan guidance',
    icon: '✨',
    available: (s) => s.stage === 'medicineCat' || s.stage === 'seniorMedicineCat',
    resolve: (s) => {
      const result = skillCheck(s, 'charisma', 40);
      if (result === 'success') {
        modStat(s, 'charisma', 4);
        return lines([
          good(`You sit at the Moonstone until the stars wheel overhead. A vision comes — ${randomOmen()}.`),
          good('You wake knowing what must be done.'),
          info('Charisma +4'),
        ]);
      } else if (result === 'partial') {
        modStat(s, 'charisma', 2);
        return lines([
          normal('A half-formed dream, more feeling than image. StarClan speaks, but quietly tonight.'),
          info('Charisma +2'),
        ]);
      }
      modStat(s, 'charisma', 1);
      return lines([
        normal('Silence. The stars are beautiful but reveal nothing.'),
        info('Charisma +1'),
      ]);
    },
  },

  {
    id: 'mc_prepare_herbs',
    label: 'Prepare medicines',
    icon: '⚗️',
    available: (s) => s.stage === 'medicineCat' || s.stage === 'seniorMedicineCat',
    resolve: (s) => {
      const herb = randomHerb();
      modStat(s, 'endurance', 2);
      modStat(s, 'agility', 1);
      return lines([
        normal(`You spend the morning sorting ${herb}, crushing dried leaves, and laying cobwebs to dry.`),
        normal('The medicine den smells sharp and clean.'),
        info('Endurance +2, Agility +1'),
      ]);
    },
  },

  {
    id: 'mc_mentor_med',
    label: 'Teach your apprentice',
    icon: '🎓',
    available: (s) => s.stage === 'seniorMedicineCat',
    resolve: (s) => {
      const apprentice = randomApprentice(s);
      modStat(s, 'charisma', 3);
      return lines([
        good(`You walk ${apprentice} through the herb store, naming each plant and its use. They listen intently.`),
        info('Charisma +3'),
      ]);
    },
  },

  {
    id: 'rest',
    label: 'Rest in camp',
    icon: '💤',
    available: (s) => !s.gameOver,
    resolve: (s) => {
      modHealth(s, 20);
      return lines([
        normal('You curl up in the warriors\' den and sleep through the morning.'),
        info('Health +20'),
      ]);
    },
  },

  {
    id: 'socialize',
    label: 'Spend time with Clanmates',
    icon: '🐱',
    available: (s) => !s.gameOver,
    resolve: (s) => {
      const clanmate = randomClanmateName(s);
      const bond = Math.floor(Math.random() * 8) + 3;
      modBond(s, clanmate, bond);
      modStat(s, 'charisma', 1);
      return lines([
        normal(`You share tongues with ${clanmate} by the fresh-kill pile. The afternoon passes pleasantly.`),
        info(`Bond with ${clanmate} +${bond}, Charisma +1`),
      ]);
    },
  },

];

// ── Midday random events ──────────────────────────────────────────────────
// Events fire after the morning action. Some have choices.

const RANDOM_EVENTS = [

  {
    id: 'greencough',
    weight: (s) => s.seasonIndex === 3 ? 15 : 3, // higher in leaf-bare
    available: (s) => true,
    text: (s) => `A sickness spreads through camp. Several warriors cough and shiver.`,
    choices: [
      {
        label: 'Gather herbs',
        resolve: (s) => {
          const result = skillCheck(s, 'endurance', 40);
          if (result === 'success') {
            modHealth(s, 5);
            return lines([good('You find catmint near the old Twoleg nest. The medicine cat is grateful.'), info('Health +5')]);
          }
          modHealth(s, -10);
          return lines([normal('You search all day but find only dock leaves. Better than nothing.'), info('Health −10')]);
        },
      },
      {
        label: 'Help the medicine cat',
        resolve: (s) => {
          modStat(s, 'charisma', 2);
          modHealth(s, -5);
          return lines([good('You spend the day changing soaked moss and keeping the sick warm.'), info('Charisma +2, Health −5')]);
        },
      },
      {
        label: 'Avoid the sick',
        resolve: (s) => {
          // 40% chance of catching it anyway
          if (Math.random() < 0.4) {
            s.sick = true;
            _modHealth(s, -8);
            return lines([danger('Despite your caution, you feel the first scratch in your throat...'), info('You are sick. Health −8')]);
          }
          return lines([normal('You keep away from the sick den. You feel guilty about it.')]);
        },
      },
    ],
  },

  {
    id: 'rival_spy',
    weight: (s) => 8,
    available: (s) => s.stage !== 'kit' && !MC_STAGES.includes(s.stage),
    text: (s) => `You spot a ${rivalClan(s.clan)} cat lurking near your territory markers.`,
    choices: [
      {
        label: 'Confront them',
        resolve: (s) => {
          const result = skillCheck(s, 'strength', 45);
          if (result === 'success') {
            modStat(s, 'strength', 2);
            modStat(s, 'charisma', 1);
            return lines([good('You drive them off with authority. The Clan will hear of this.'), info('Strength +2, Charisma +1')]);
          }
          modHealth(s, -20);
          return lines([danger('They fight back. You send them away but take wounds.'), info('Health −20')]);
        },
      },
      {
        label: 'Warn Clan leader',
        resolve: (s) => {
          modStat(s, 'charisma', 3);
          return lines([good('You race back and report the spy. The leader nods approvingly.'), info('Charisma +3')]);
        },
      },
      {
        label: 'Shadow them quietly',
        resolve: (s) => {
          const result = skillCheck(s, 'stealth', 40);
          if (result === 'success') {
            modStat(s, 'stealth', 3);
            return lines([good('You follow them back to their border undetected — valuable information.'), info('Stealth +3')]);
          }
          modStat(s, 'stealth', 1);
          return lines([normal('You snap a twig and they bolt. Still, you saw which way they went.'), info('Stealth +1')]);
        },
      },
    ],
  },

  {
    id: 'injured_kit',
    weight: (s) => 6,
    available: (s) => s.stage !== 'kit',
    text: (s) => `A kit has wandered too close to the river and is crying for help.`,
    choices: [
      {
        label: 'Rescue them',
        resolve: (s) => {
          const result = skillCheck(s, 'endurance', 35);
          if (result === 'success') {
            modStat(s, 'charisma', 3);
            modHealth(s, -5);
            const kit = 'Smallkit';
            modBond(s, kit, 20);
            return lines([good('You plunge in and drag the kit to safety. The whole Clan is watching.'), info('Charisma +3, Health −5')]);
          }
          modHealth(s, -20);
          return lines([normal('You manage to save the kit but take a battering from the current.'), info('Health −20')]);
        },
      },
      {
        label: 'Call for help',
        resolve: (s) => {
          modStat(s, 'charisma', 1);
          return lines([normal('You yowl for nearby warriors. Together you pull the kit out safely.'), info('Charisma +1')]);
        },
      },
    ],
  },

  {
    id: 'good_hunt',
    weight: (s) => s.seasonIndex === 1 ? 12 : 5, // higher in greenleaf
    available: (s) => s.stage !== 'kit' && !MC_STAGES.includes(s.stage),
    text: (s) => `The forest is alive with prey today. A perfect hunting day.`,
    choices: [
      {
        label: 'Hunt alone — claim glory',
        resolve: (s) => {
          const result = skillCheck(s, 'stealth', 30);
          if (result === 'success') {
            modStat(s, 'stealth', 2);
            modHealth(s, 20);
            return lines([good('You return with your jaws full. The Clan eats well tonight.'), info('Stealth +2, Health +20')]);
          }
          modHealth(s, 10);
          return lines([normal('A decent catch. Not your best, but the fresh-kill pile grows.'), info('Health +10')]);
        },
      },
      {
        label: 'Organize a hunting patrol',
        resolve: (s) => {
          modStat(s, 'charisma', 2);
          modHealth(s, 15);
          return lines([good('You lead three warriors in a sweep. The pile overflows.'), info('Charisma +2, Health +15')]);
        },
      },
    ],
  },

  {
    id: 'peaceful_day',
    weight: (s) => 10,
    available: (s) => true,
    text: (s) => null, // no midday event — quiet day
    choices: [],
  },

  {
    id: 'leader_notices',
    weight: (s) => {
      // Only fires if warrior/senior, high charisma, not already deputy
      if (!['warrior', 'seniorWarrior'].includes(s.stage)) return 0;
      if (s.deputyAppointed) return 0;
      return s.stats.charisma >= 40 ? 10 : 0;
    },
    available: (s) => !s.deputyAppointed && ['warrior', 'seniorWarrior'].includes(s.stage),
    text: (s) => `${s.clan}'s leader calls you aside after the morning patrol.`,
    choices: [
      {
        label: 'Listen respectfully',
        resolve: (s) => {
          modStat(s, 'charisma', 2);
          s.deputyAppointed = true;
          rankUp(s, 'deputy');
          return lines([good('The leader speaks: "You have shown loyalty and courage. Henceforth you are deputy."'), info('Stage → Deputy')]);
        },
      },
    ],
  },

  {
    id: 'leader_dies',
    weight: (s) => {
      if (s.stage !== 'deputy') return 0;
      // Roughly 1-in-60 chance per day once deputy (about once per 2 seasons)
      return 2;
    },
    available: (s) => s.stage === 'deputy' && !s.leaderDead,
    text: (s) => `A messenger races into camp: the leader has fallen in battle against ${rivalClan(s.clan)}.`,
    choices: [
      {
        label: 'Accept the burden',
        resolve: (s) => {
          s.leaderDead = true;
          rankUp(s, 'leader');
          return lines([good('The Clan looks to you. You straighten your shoulders and step forward.'), info('Stage → Leader — 9 lives await')]);
        },
      },
    ],
  },

  // ── MEDICINE CAT EVENTS ───────────────────────────────────────────────

  {
    id: 'mc_epidemic',
    weight: (s) => MC_STAGES.includes(s.stage) ? (s.seasonIndex === 3 ? 18 : 8) : 0,
    available: (s) => MC_STAGES.includes(s.stage),
    text: (s) => `Three warriors collapsed this morning. The coughing is spreading fast. The Clan looks to you.`,
    choices: [
      {
        label: 'Work through the night treating them',
        resolve: (s) => {
          const r = _skillCheck(s, 'endurance', 45);
          if (r === 'success') {
            _modStat(s, 'endurance', 3); _modStat(s, 'charisma', 2); _modHealth(s, -15);
            return lines([good('By dawn all three are breathing easy. You saved them — at cost to yourself.'), info('Endurance +3, Charisma +2, Health −15')]);
          }
          _modHealth(s, -20);
          return lines([normal('Two recover. One will need more days. Your paws shake with exhaustion.'), info('Health −20')]);
        },
      },
      {
        label: 'Ration the catmint carefully',
        resolve: (s) => {
          _modStat(s, 'charisma', 3); _modStat(s, 'endurance', 1);
          return lines([good('Hard choices, but wise ones. The herb store holds. All three survive.'), info('Charisma +3, Endurance +1')]);
        },
      },
      {
        label: 'Send for herbs from a rival Clan',
        resolve: (s) => {
          const r = _skillCheck(s, 'charisma', 50);
          if (r === 'success') {
            _modStat(s, 'charisma', 4);
            return lines([good(`The ${rivalClan(s.clan)} medicine cat meets you at the border with catmint. Ancient law holds.`), info('Charisma +4')]);
          }
          _modStat(s, 'charisma', 1); _modHealth(s, -10);
          return lines([normal('They turn you away with suspicion. You return to do what you can with what you have.'), info('Charisma +1, Health −10')]);
        },
      },
    ],
  },

  {
    id: 'mc_difficult_birth',
    weight: (s) => (s.stage === 'medicineCat' || s.stage === 'seniorMedicineCat') ? 8 : 0,
    available: (s) => s.stage === 'medicineCat' || s.stage === 'seniorMedicineCat',
    text: (s) => `A queen has been laboring since moonhigh. Something is wrong.`,
    choices: [
      {
        label: 'Stay by her side through it all',
        resolve: (s) => {
          const r = _skillCheck(s, 'endurance', 40);
          if (r === 'success') {
            _modStat(s, 'endurance', 3); _modStat(s, 'charisma', 3); _modHealth(s, -10);
            return lines([good('As the sun rises, a kit — small but alive — gives its first cry. The queen weeps with relief.'), info('Endurance +3, Charisma +3, Health −10')]);
          }
          _modStat(s, 'endurance', 2); _modHealth(s, -15);
          return lines([normal('Two kits survive. The third does not. You wash your paws in silence. You did everything you could.'), info('Endurance +2, Health −15')]);
        },
      },
      {
        label: 'Prepare raspberry leaves and guide her through it',
        resolve: (s) => {
          _modStat(s, 'charisma', 4); _modStat(s, 'endurance', 2);
          return lines([good('The herbs ease her pain. Three healthy kits cry out in the warm den.'), info('Charisma +4, Endurance +2')]);
        },
      },
    ],
  },

  {
    id: 'mc_code_temptation',
    weight: (s) => (MC_STAGES.includes(s.stage) && s.moons >= 18 && !s.codeBroken && !s.hasMate) ? 5 : 0,
    available: (s) => MC_STAGES.includes(s.stage) && s.moons >= 18 && !s.codeBroken && !s.hasMate,
    text: (s) => `${randomClanmateName(s)} finds you alone at the stream. Their eyes say more than their words.`,
    choices: [
      {
        label: 'Honor the code — step away',
        resolve: (s) => {
          _modStat(s, 'charisma', 3);
          return lines([good('"I am medicine cat," you say quietly. It costs you something. You know it was right.'), info('Charisma +3')]);
        },
      },
      {
        label: 'Follow your heart',
        resolve: (s) => {
          const cat = randomClanmateName(s);
          s.codeBroken = true; s.hasMate = true; s.mateName = cat;
          _modBond(s, cat, 40);
          return lines([danger('You touch noses beneath the willows. StarClan is silent tonight.'), normal('Some things cannot be undone.'), info('Code broken · Mate: ' + cat)]);
        },
      },
    ],
  },

  {
    id: 'mc_rival_medicine_cat',
    weight: (s) => (s.stage === 'medicineCat' || s.stage === 'seniorMedicineCat') ? 7 : 0,
    available: (s) => s.stage === 'medicineCat' || s.stage === 'seniorMedicineCat',
    text: (s) => `A ${rivalClan(s.clan)} medicine cat waits at the border, carrying an injured kit.`,
    choices: [
      {
        label: 'Help them — medicine cats serve all',
        resolve: (s) => {
          _modStat(s, 'charisma', 4); _modHealth(s, -5);
          return lines([good('You treat the kit without hesitation. Ancient law, older than the Clans, guides your paws.'), info('Charisma +4, Health −5')]);
        },
      },
      {
        label: 'Refuse — Clan loyalty first',
        resolve: (s) => {
          _modStat(s, 'strength', 1);
          return lines([danger('You turn them away. The kit was not your Clan\'s. The memory sits heavy.'), info('You refused.')]);
        },
      },
      {
        label: 'Help quietly and say nothing to your leader',
        resolve: (s) => {
          const r = _skillCheck(s, 'stealth', 38);
          if (r === 'success') {
            _modStat(s, 'charisma', 3); _modStat(s, 'stealth', 2);
            return lines([good('You tend the kit quickly and send them on their way. No one saw. StarClan saw.'), info('Charisma +3, Stealth +2')]);
          }
          _modStat(s, 'charisma', 2);
          return lines([normal('A warrior spots you from the ridge. Your leader will have questions.'), info('Charisma +2')]);
        },
      },
    ],
  },

  {
    id: 'mc_poisoned_cat',
    weight: (s) => MC_STAGES.includes(s.stage) ? 8 : 0,
    available: (s) => MC_STAGES.includes(s.stage),
    text: (s) => `A warrior stumbles into camp, sides heaving. They ate something near the Twoleg fence.`,
    choices: [
      {
        label: 'Administer yarrow immediately',
        resolve: (s) => {
          const r = _skillCheck(s, 'charisma', 42);
          if (r === 'success') {
            _modStat(s, 'charisma', 3);
            return lines([good('The yarrow does its work. The warrior purges the poison and recovers by sundown.'), info('Charisma +3')]);
          }
          _modHealth(s, -10);
          return lines([normal('It works, but slowly. A close call. You make a note to restock the yarrow.'), info('Health −10')]);
        },
      },
      {
        label: 'Identify the plant first',
        resolve: (s) => {
          const r = _skillCheck(s, 'endurance', 35);
          if (r === 'success') {
            _modStat(s, 'endurance', 2); _modStat(s, 'charisma', 2);
            return lines([good('Nightshade. You know exactly what to do. Precise treatment, fast recovery.'), info('Endurance +2, Charisma +2')]);
          }
          _modStat(s, 'endurance', 1); _modHealth(s, -8);
          return lines([normal('You take too long identifying it. The warrior suffers more than needed.'), info('Endurance +1, Health −8')]);
        },
      },
    ],
  },

  {
    id: 'mc_starclan_vision',
    weight: (s) => MC_STAGES.includes(s.stage) ? 6 : 0,
    available: (s) => MC_STAGES.includes(s.stage),
    text: (s) => `You wake before dawn with a dream still burning behind your eyes — ${randomOmen()}.`,
    choices: [
      {
        label: 'Meditate on its meaning',
        resolve: (s) => {
          const r = _skillCheck(s, 'charisma', 38);
          if (r === 'success') {
            _modStat(s, 'charisma', 3);
            return lines([good('Slowly, the meaning comes. A warning. A path. You know what to prepare for.'), info('Charisma +3')]);
          }
          _modStat(s, 'charisma', 1);
          return lines([normal('The meaning stays just out of reach. You carry the image through the day, uneasy.'), info('Charisma +1')]);
        },
      },
      {
        label: 'Warn the Clan leader',
        resolve: (s) => {
          _modStat(s, 'charisma', 2); _modStat(s, 'endurance', 1);
          return lines([good('The leader listens carefully. Whether they believe it or not, you have done your duty to StarClan.'), info('Charisma +2, Endurance +1')]);
        },
      },
    ],
  },

];

// ── Helpers ───────────────────────────────────────────────────────────────

function lines(arr) { return arr; }
function good(t)    { return { text: t, type: 'good' }; }
function danger(t)  { return { text: t, type: 'danger' }; }
function normal(t)  { return { text: t, type: 'normal' }; }
function info(t)    { return { text: t, type: 'info' }; }

function rivalClan(clan) {
  const all = window.WC.CLANS.filter(c => c !== clan);
  return all[Math.floor(Math.random() * all.length)];
}

function randomPrey(season) {
  const pool = season === 'Leaf-bare'
    ? ['vole', 'shrew', 'rabbit']
    : ['mouse', 'thrush', 'rabbit', 'vole', 'squirrel', 'blackbird'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomLocation() {
  const locs = ['Tallpines', 'Sunningrocks', 'the meadow', 'the river bank', 'the oak forest', 'the moor edge'];
  return locs[Math.floor(Math.random() * locs.length)];
}

function randomElder() {
  const elders = ['Longtail', 'Mousefur', 'Halftail', 'Dappletail', 'Patchpelt'];
  return elders[Math.floor(Math.random() * elders.length)];
}

function randomDenmate(s) {
  if (s.clanmates.length) {
    const kits = s.clanmates.filter(c => c.stage === 'kit');
    if (kits.length) return kits[Math.floor(Math.random() * kits.length)].name;
  }
  return 'Smallkit';
}

function randomClanmateName(s) {
  if (s.clanmates.length) return s.clanmates[Math.floor(Math.random() * s.clanmates.length)].name;
  return 'a Clanmate';
}

function randomApprentice(s) {
  const apps = s.clanmates.filter(c => c.stage === 'apprentice');
  if (apps.length) return apps[Math.floor(Math.random() * apps.length)].name;
  return 'Firepaw';
}

/** Pick a random midday event using weighted selection. */
function pickRandomEvent(state) {
  const pool = RANDOM_EVENTS.filter(e => e.available(state));
  const weights = pool.map(e => e.weight(state));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Get all available morning actions for the current state. */
function getAvailableActions(state) {
  return ACTIONS.filter(a => a.available(state));
}

// ── Export ────────────────────────────────────────────────────────────────
window.WC = window.WC || {};
Object.assign(window.WC, {
  ACTIONS, RANDOM_EVENTS,
  pickRandomEvent, getAvailableActions,
  // helpers exposed for testing
  rivalClan, randomPrey,
});
