// ai.js — Ashwarden's brain. It reads the table and picks cards it can
// afford, favouring survival when hurt and damage when ahead. It never
// peeks at the player's hand: it only knows its own cards and the life totals.

import { mainNumber } from './cards.js';

/**
 * Choose the AI's next card, or null when it should stop. The order it
 * reasons in: heal or shield when its life is low, then the biggest blow
 * it can afford, then anything cheap that is still useful.
 */
export function chooseCard(state) {
  const ai = state.ai;
  const player = state.player;
  const affordable = ai.hand.filter((c) => c.cost <= ai.ember);
  if (affordable.length === 0) return null;

  const hurt = ai.life <= 9;
  if (hurt) {
    const heal = affordable.filter((c) => c.heal > 0).sort((a, b) => b.heal - a.heal)[0];
    if (heal) return heal;
    const guard = affordable.filter((c) => c.guard > 0).sort((a, b) => b.guard - a.guard)[0];
    if (guard && player.life > 6) return guard;
  }

  // A killing blow first.
  const lethal = affordable.filter((c) => c.dmg > 0 && c.dmg >= player.life + player.shield);
  if (lethal.length > 0) return lethal.sort((a, b) => a.cost - b.cost)[0];

  // Otherwise the hardest hit it can afford, cheapest first on a tie.
  const strikes = affordable.filter((c) => c.dmg > 0);
  if (strikes.length > 0) {
    return strikes.sort((a, b) => mainNumber(b) - mainNumber(a) || a.cost - b.cost)[0];
  }

  // No strike in hand: shield up if the player is threatening, else heal.
  const guard = affordable.filter((c) => c.guard > 0).sort((a, b) => b.guard - a.guard)[0];
  if (guard) return guard;
  const heal = affordable.filter((c) => c.heal > 0).sort((a, b) => b.heal - a.heal)[0];
  if (heal) return heal;
  return null;
}

/**
 * Play the AI's whole turn, one card at a time, calling `onCard` after
 * each play so the table can animate it. Resolves when it is done.
 */
export async function takeAiTurn(state, playCardFn, onCard, waitMs) {
  let guard = 0;
  for (;;) {
    const card = chooseCard(state);
    if (!card) break;
    playCardFn(state, state.ai, card.uid);
    onCard(card);
    guard++;
    if (guard >= 6 || state.phase !== 'play') break;
    await waitMs(650);
  }
}
