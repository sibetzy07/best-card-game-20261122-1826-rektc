// cards.js — the card catalogue and the deck for Ember Court.
// Every card belongs to one of four suits. A suit is told apart by colour
// AND by shape, never by its name alone: ember is a red flame, tide a blue
// drop, leaf a green leaf, stone a grey mountain.

export const SUITS = {
  ember: { name: 'Ember', color: '#e2483d', dark: '#8f1f16', shape: 'flame', glyph: '▲' },
  tide: { name: 'Tide', color: '#2f7fd0', dark: '#174a7d', shape: 'drop', glyph: '●' },
  leaf: { name: 'Leaf', color: '#3f9e4d', dark: '#1f5c28', shape: 'leaf', glyph: '◆' },
  stone: { name: 'Stone', color: '#8a8f98', dark: '#4a4e55', shape: 'mountain', glyph: '■' },
};

/**
 * A card: id, name, suit, ember cost, and its effect numbers.
 * dmg = damage to the other duelist, guard = shield gained,
 * heal = life restored. A card may carry more than one number.
 */
export const CARD_DEFS = [
  // Ember — the aggressive suit.
  { id: 'spark', name: 'Spark', suit: 'ember', cost: 0, dmg: 1, text: 'Deal 1 damage.' },
  { id: 'cinder-slash', name: 'Cinder Slash', suit: 'ember', cost: 1, dmg: 3, text: 'Deal 3 damage.' },
  { id: 'ember-fan', name: 'Ember Fan', suit: 'ember', cost: 1, dmg: 2, text: 'Deal 2 damage.' },
  { id: 'flame-lash', name: 'Flame Lash', suit: 'ember', cost: 2, dmg: 4, text: 'Deal 4 damage.' },
  { id: 'wildfire', name: 'Wildfire', suit: 'ember', cost: 3, dmg: 5, text: 'Deal 5 damage.' },
  { id: 'pyre-burst', name: 'Pyre Burst', suit: 'ember', cost: 4, dmg: 6, text: 'Deal 6 damage.' },
  // Tide — damage with a little recovery.
  { id: 'frostbite', name: 'Frostbite', suit: 'tide', cost: 1, dmg: 2, text: 'Deal 2 damage.' },
  { id: 'ebb-strike', name: 'Ebb Strike', suit: 'tide', cost: 1, dmg: 3, text: 'Deal 3 damage.' },
  { id: 'tidal-crash', name: 'Tidal Crash', suit: 'tide', cost: 2, dmg: 4, text: 'Deal 4 damage.' },
  { id: 'mist-veil', name: 'Mist Veil', suit: 'tide', cost: 2, guard: 4, text: 'Gain 4 shield.' },
  { id: 'healing-rain', name: 'Healing Rain', suit: 'tide', cost: 2, heal: 4, text: 'Restore 4 life.' },
  { id: 'surge-wave', name: 'Surge Wave', suit: 'tide', cost: 3, dmg: 5, text: 'Deal 5 damage.' },
  // Leaf — the sturdy suit: guard and growth.
  { id: 'thorn-whip', name: 'Thorn Whip', suit: 'leaf', cost: 1, dmg: 3, text: 'Deal 3 damage.' },
  { id: 'vine-snare', name: 'Vine Snare', suit: 'leaf', cost: 1, dmg: 2, guard: 2, text: 'Deal 2 damage. Gain 2 shield.' },
  { id: 'root-shield', name: 'Root Shield', suit: 'leaf', cost: 2, guard: 5, text: 'Gain 5 shield.' },
  { id: 'bloom', name: 'Bloom', suit: 'leaf', cost: 3, heal: 5, text: 'Restore 5 life.' },
  { id: 'bramble', name: 'Bramble', suit: 'leaf', cost: 2, dmg: 2, guard: 3, text: 'Deal 2 damage. Gain 3 shield.' },
  { id: 'seedling', name: 'Seedling', suit: 'leaf', cost: 0, guard: 2, text: 'Gain 2 shield.' },
  // Stone — the heavy suit: big guard, slow blows.
  { id: 'granite-skin', name: 'Granite Skin', suit: 'stone', cost: 1, guard: 4, text: 'Gain 4 shield.' },
  { id: 'quake', name: 'Quake', suit: 'stone', cost: 1, dmg: 3, text: 'Deal 3 damage.' },
  { id: 'boulder-toss', name: 'Boulder Toss', suit: 'stone', cost: 2, dmg: 4, text: 'Deal 4 damage.' },
  { id: 'stone-wall', name: 'Stone Wall', suit: 'stone', cost: 2, guard: 6, text: 'Gain 6 shield.' },
  { id: 'avalanche', name: 'Avalanche', suit: 'stone', cost: 4, dmg: 6, text: 'Deal 6 damage.' },
  { id: 'pebble', name: 'Pebble', suit: 'stone', cost: 0, dmg: 1, text: 'Deal 1 damage.' },
];

/** Look a card definition up by id. */
export function cardDef(id) {
  return CARD_DEFS.find((c) => c.id === id);
}

/** A fresh copy of a card, with its own instance id. */
export function makeCard(def, instanceId) {
  return { uid: instanceId, id: def.id, name: def.name, suit: def.suit, cost: def.cost, dmg: def.dmg || 0, guard: def.guard || 0, heal: def.heal || 0, text: def.text };
}

/** Build a 30-card deck: every definition once, plus a second copy of the cheap ones. */
export function buildDeck() {
  const defs = [...CARD_DEFS];
  for (const def of CARD_DEFS) {
    if (def.cost <= 1) defs.push(def);
  }
  return defs;
}

/** Fisher-Yates shuffle. `rand` returns a float in [0, 1). */
export function shuffle(list, rand) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** The card's main number: the one the Surge bonus adds to. */
export function mainNumber(card) {
  return Math.max(card.dmg, card.guard, card.heal);
}

/** Which stat the card's main number belongs to. */
export function mainStat(card) {
  if (card.dmg >= card.guard && card.dmg >= card.heal) return 'dmg';
  if (card.guard >= card.heal) return 'guard';
  return 'heal';
}
