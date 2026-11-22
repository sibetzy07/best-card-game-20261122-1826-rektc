// state.js — the duel's state and its turn rules.
// Ember Court is a two-duelist card battle. Each duelist has life, shield
// and a hand of cards. Ember is the mana: it grows by one each round, up to
// ten, and refills at the start of your turn. Playing two cards of the same
// suit in one turn triggers a Surge: the second card's main number grows by 2.

import { buildDeck, makeCard, shuffle, mainStat } from './cards.js';

export const MAX_LIFE = 24;
export const MAX_HAND = 7;
export const MAX_EMBER = 10;
export const SURGE_BONUS = 2;

/** A seeded random function, so a demo table always deals the same hand. */
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** One duelist's side of the table. */
function newSide(name, isAi) {
  return {
    name,
    isAi,
    life: MAX_LIFE,
    shield: 0,
    ember: 1,
    maxEmber: 1,
    hand: [],
    deck: [],
    discard: [],
    playedThisTurn: [],
  };
}

/** A fresh duel. `rand` deals the opening hands. */
export function newGame(rand) {
  const state = {
    phase: 'title', // title | play | won | lost
    round: 1,
    turn: 'player',
    score: 0,
    damageDealt: 0,
    cardsPlayed: 0,
    log: [],
    lastSurge: null,
    player: newSide('You', false),
    ai: newSide('Ashwarden', true),
    winner: null,
    uidCounter: 0,
  };
  for (const side of [state.player, state.ai]) {
    const defs = shuffle(buildDeck(), rand);
    side.deck = defs.map((d) => makeCard(d, `c${state.uidCounter++}`));
    drawCards(state, side, 4);
  }
  state.log.push('The duel begins. Ember Court is yours to win.');
  return state;
}

/** Draw up to n cards into a side's hand (reshuffling the discard when empty). */
export function drawCards(state, side, n) {
  for (let i = 0; i < n; i++) {
    if (side.hand.length >= MAX_HAND) break;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(side.discard, Math.random);
      side.discard = [];
    }
    side.hand.push(side.deck.pop());
  }
}

/** Damage first eats shield, then life. Returns the life lost. */
export function dealDamage(side, amount) {
  let left = amount;
  if (side.shield > 0) {
    const absorbed = Math.min(side.shield, left);
    side.shield -= absorbed;
    left -= absorbed;
  }
  const lost = Math.min(side.life, left);
  side.life -= lost;
  return lost;
}

/** Can this side afford the card right now? */
export function canPlay(state, side, card) {
  return state.phase === 'play' && state.turn === (side.isAi ? 'ai' : 'player') && card.cost <= side.ember;
}

/**
 * Play a card from a side's hand. The Surge rule: a second card of the same
 * suit in one turn adds +2 to its main number. Returns what happened.
 */
export function playCard(state, side, cardUid) {
  const idx = side.hand.findIndex((c) => c.uid === cardUid);
  if (idx < 0) return null;
  const card = side.hand[idx];
  if (card.cost > side.ember) return null;
  const foe = side.isAi ? state.player : state.ai;
  const sameSuitPlayed = side.playedThisTurn.some((c) => c.suit === card.suit);
  const surge = sameSuitPlayed ? SURGE_BONUS : 0;
  const stat = mainStat(card);
  const played = { ...card, surge, [stat]: card[stat] + surge };

  side.ember -= card.cost;
  side.hand.splice(idx, 1);
  side.discard.push(card);
  side.playedThisTurn.push(played);
  state.cardsPlayed++;
  state.lastSurge = surge > 0 ? { suit: card.suit, name: card.name } : null;

  if (played.dmg > 0) {
    const lost = dealDamage(foe, played.dmg);
    if (!side.isAi) {
      state.damageDealt += lost;
      state.score += lost;
    }
  }
  if (played.guard > 0) side.shield += played.guard;
  if (played.heal > 0) side.life = Math.min(MAX_LIFE, side.life + played.heal);

  const bits = [];
  if (played.dmg > 0) bits.push(`deals ${played.dmg} damage`);
  if (played.guard > 0) bits.push(`gains ${played.guard} shield`);
  if (played.heal > 0) bits.push(`restores ${played.heal} life`);
  state.log.push(
    `${side.name} plays ${card.name}${surge > 0 ? ' — SURGE +2!' : ''} (${bits.join(', ')}).`
  );
  checkEnd(state);
  return played;
}

/** Start the player's turn: more ember, a fresh draw, a clean slate. */
export function startPlayerTurn(state) {
  state.turn = 'player';
  state.round++;
  const p = state.player;
  p.maxEmber = Math.min(MAX_EMBER, p.maxEmber + 1);
  p.ember = p.maxEmber;
  p.playedThisTurn = [];
  drawCards(state, p, 1);
  state.log.push(`Round ${state.round} — your turn. Ember refills to ${p.ember}.`);
}

/** Start the AI's turn the same way. */
export function startAiTurn(state) {
  state.turn = 'ai';
  const a = state.ai;
  a.maxEmber = Math.min(MAX_EMBER, a.maxEmber + 1);
  a.ember = a.maxEmber;
  a.playedThisTurn = [];
  drawCards(state, a, 1);
}

/** Has either duelist fallen? */
export function checkEnd(state) {
  if (state.ai.life <= 0 && state.phase === 'play') {
    state.phase = 'won';
    state.winner = 'player';
    state.score += 50;
    state.log.push('Ashwarden falls. The Ember Court is yours!');
  } else if (state.player.life <= 0 && state.phase === 'play') {
    state.phase = 'lost';
    state.winner = 'ai';
    state.log.push('You fall. Ashwarden keeps the Ember Court… this time.');
  }
}

/** Begin a duel from the title screen. */
export function startDuel(state) {
  state.phase = 'play';
  state.turn = 'player';
  const p = state.player;
  p.maxEmber = 1;
  p.ember = 1;
  state.log.push('Your move — click a card to play it, then End Turn.');
}
