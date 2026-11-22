// main.js — Ember Court's entry point: wires the table, the input and the
// turns together, and builds the demo tables the screenshots are taken of.
// Open with ?scene=title (the title screen), ?scene=play (a duel mid-flow),
// ?scene=win or ?scene=loss (an ended duel). No scene means the title.

import { newGame, startDuel, playCard, startPlayerTurn, startAiTurn, seededRandom, MAX_LIFE } from './state.js';
import { takeAiTurn } from './ai.js';
import { renderTable, renderPlayed, showOverlay, flashLife } from './render.js';
import { sfx, toggleMute, isMuted } from './audio.js';

const $ = (id) => document.getElementById(id);

const els = {
  overlay: $('overlay'),
  aiName: $('aiName'), aiLife: $('aiLife'), aiEmber: $('aiEmber'), aiHand: $('aiHand'), aiCount: $('aiCount'),
  playerName: $('playerName'), playerLife: $('playerLife'), playerEmber: $('playerEmber'),
  playerHand: $('playerHand'), playerCount: $('playerCount'),
  score: $('score'), round: $('round'), turnBanner: $('turnBanner'),
  endTurn: $('endTurn'), log: $('log'), played: $('played'),
  surgeBanner: $('surgeBanner'), muteBtn: $('muteBtn'),
};

let state = newGame(Math.random);
let busy = false;

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function refresh() {
  renderTable(state, els, { onCard: onCardClick });
  renderPlayed(state, els);
}

function onCardClick(card) {
  if (busy || state.phase !== 'play' || state.turn !== 'player') return;
  if (card.cost > state.player.ember) {
    sfx.click();
    return;
  }
  const played = playCard(state, state.player, card.uid);
  if (!played) return;
  if (played.surge > 0) sfx.surge();
  else if (played.dmg > 0) { sfx.playCard(); flashLife('ai'); }
  else if (played.heal > 0) sfx.heal();
  else sfx.playCard();
  refresh();
  if (state.phase === 'won') return endDuel();
  if (state.phase === 'lost') return endDuel();
}

async function endTurn() {
  if (busy || state.phase !== 'play' || state.turn !== 'player') return;
  busy = true;
  sfx.turn();
  startAiTurn(state);
  refresh();
  await takeAiTurn(state, playCard, (card) => {
    if (card.dmg > 0) { sfx.hurt(); flashLife('player'); }
    else if (card.heal > 0) sfx.heal();
    else sfx.playCard();
    refresh();
  }, waitMs);
  if (state.phase === 'won' || state.phase === 'lost') { busy = false; return endDuel(); }
  startPlayerTurn(state);
  sfx.turn();
  refresh();
  busy = false;
}

function endDuel() {
  refresh();
  if (state.phase === 'won') sfx.win();
  if (state.phase === 'lost') sfx.lose();
  setTimeout(() => showOverlay(state.phase, state, els, { onRestart: restart }), 700);
}

function restart() {
  state = newGame(Math.random);
  busy = false;
  showOverlay('title', state, els, { onStart: start });
  refresh();
}

function start() {
  sfx.click();
  startDuel(state);
  showOverlay(null, state, els, {});
  refresh();
}

els.endTurn.addEventListener('click', endTurn);
els.muteBtn.addEventListener('click', () => {
  const m = toggleMute();
  els.muteBtn.textContent = m ? '🔇 Sound off' : '🔊 Sound on';
});

document.addEventListener('keydown', (e) => {
  if (state.phase === 'title' && (e.key === 'Enter' || e.key === ' ')) { start(); return; }
  if (state.phase !== 'play' || state.turn !== 'player' || busy) return;
  if (e.key === 'Enter') { endTurn(); return; }
  const n = Number.parseInt(e.key, 10);
  if (n >= 1 && n <= state.player.hand.length) {
    onCardClick(state.player.hand[n - 1]);
  }
});

// ---------------------------------------------------------------- demo scenes
// A demo table is the same game, dealt from a fixed seed and played forward
// a few scripted moves, so a screenshot always shows a real, readable duel.

function demoPlay() {
  const demo = newGame(seededRandom(20261123));
  startDuel(demo);
  demo.round = 4;
  demo.player.maxEmber = 4;
  demo.player.ember = 4;
  // Guarantee two ember cards in hand, so the Surge rule shows on the table.
  const takeFromDeck = (name) => {
    const i = demo.player.deck.findIndex((c) => c.name === name);
    return i < 0 ? null : demo.player.deck.splice(i, 1)[0];
  };
  const fan = takeFromDeck('Ember Fan');
  const slash = takeFromDeck('Cinder Slash');
  if (fan && slash) {
    demo.player.deck.push(demo.player.hand[0], demo.player.hand[1]);
    demo.player.hand[0] = fan;
    demo.player.hand[1] = slash;
  }
  const emberCards = demo.player.hand.filter((c) => c.suit === 'ember');
  if (emberCards[0]) playCard(demo, demo.player, emberCards[0].uid);
  if (emberCards[1]) playCard(demo, demo.player, emberCards[1].uid);
  const guard = demo.ai.hand.find((c) => c.guard > 0);
  if (guard) {
    demo.turn = 'ai';
    playCard(demo, demo.ai, guard.uid);
    demo.turn = 'player';
  }
  demo.player.ember = 3;
  demo.log.push(`Round 4 — your turn. Ember refills to ${demo.player.ember}.`);
  return demo;
}

function demoEnd(won) {
  const demo = demoPlay();
  if (won) {
    demo.ai.life = 0;
    demo.ai.shield = 0;
    demo.phase = 'won';
    demo.winner = 'player';
    demo.score = 87;
    demo.damageDealt = 37;
    demo.cardsPlayed = 14;
    demo.log.push('Ashwarden falls. The Ember Court is yours!');
  } else {
    demo.player.life = 0;
    demo.player.shield = 0;
    demo.phase = 'lost';
    demo.winner = 'ai';
    demo.score = 41;
    demo.damageDealt = 22;
    demo.cardsPlayed = 11;
    demo.log.push('You fall. Ashwarden keeps the Ember Court… this time.');
  }
  return demo;
}

// ---------------------------------------------------------------- boot

const scene = new URLSearchParams(window.location.search).get('scene') || 'title';
if (scene === 'play') {
  state = demoPlay();
  state.phase = 'play';
  showOverlay(null, state, els, {});
} else if (scene === 'win') {
  state = demoEnd(true);
  showOverlay('won', state, els, { onRestart: restart });
} else if (scene === 'loss') {
  state = demoEnd(false);
  showOverlay('lost', state, els, { onRestart: restart });
} else {
  showOverlay('title', state, els, { onStart: start });
}
refresh();
