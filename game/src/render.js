// render.js — draws the table. The game is DOM, not canvas, so every
// card, number and life total stays crisp text at any size, including in
// a screenshot shrunk to a thumbnail.

import { SUITS } from './cards.js';
import { MAX_LIFE, MAX_EMBER } from './state.js';

/** The pips a suit is told by: a shape character in the suit's colour. */
function suitMark(suit) {
  const s = SUITS[suit];
  return `<span class="suit-mark" style="color:${s.color}" title="${s.name}">${s.glyph}</span>`;
}

/** One card's face, as an element. `opts.playable` marks it clickable. */
export function cardElement(card, opts = {}) {
  const s = SUITS[card.suit];
  const el = document.createElement('div');
  el.className = `card suit-${card.suit}${opts.playable ? ' playable' : ''}${opts.selected ? ' selected' : ''}${opts.justPlayed ? ' just-played' : ''}`;
  el.dataset.uid = card.uid;
  const main = card.dmg > 0 ? `⚔ ${card.dmg}` : card.guard > 0 ? `⛨ ${card.guard}` : `✚ ${card.heal}`;
  el.innerHTML = `
    <div class="card-cost" style="background:${s.dark}">${card.cost}</div>
    <div class="card-suit">${suitMark(card.suit)}<span class="card-suit-name">${s.name}</span></div>
    <div class="card-name">${card.name}</div>
    <div class="card-power" style="color:${s.color}">${main}</div>
    <div class="card-text">${card.text}</div>
    ${card.surge ? `<div class="card-surge">SURGE +${card.surge}</div>` : ''}`;
  if (opts.onClick) el.addEventListener('click', () => opts.onClick(card));
  return el;
}

/** A face-down card back for the opponent's hand. */
function cardBack() {
  const el = document.createElement('div');
  el.className = 'card card-back mini';
  el.innerHTML = '<div class="card-back-mark">♛</div><div class="card-back-name">EMBER COURT</div>';
  return el;
}

/** Ember pips: filled for ember left, dim for spent, locked past the max. */
function emberPips(ember, maxEmber) {
  let out = '';
  for (let i = 0; i < MAX_EMBER; i++) {
    const cls = i < ember ? 'pip on' : i < maxEmber ? 'pip off' : 'pip locked';
    out += `<span class="ember-pip ${cls}">●</span>`;
  }
  return out;
}

/** A life bar: a number and a coloured fill. */
function lifeBar(side) {
  const pct = Math.max(0, (side.life / MAX_LIFE) * 100);
  const cls = pct > 50 ? 'hp-good' : pct > 25 ? 'hp-warn' : 'hp-bad';
  const shield = side.shield > 0 ? `<span class="shield">⛨ ${side.shield}</span>` : '';
  return `<div class="life-row"><span class="life-num">${side.life} / ${MAX_LIFE}</span>
    <div class="life-bar"><div class="life-fill ${cls}" style="width:${pct}%"></div></div>${shield}</div>`;
}

/** Draw the whole table from the state. */
export function renderTable(state, els, handlers) {
  const p = state.player;
  const a = state.ai;

  els.aiName.textContent = a.name;
  els.aiLife.innerHTML = lifeBar(a);
  els.aiEmber.innerHTML = emberPips(a.ember, a.maxEmber);
  els.aiHand.replaceChildren();
  a.hand.forEach(() => els.aiHand.appendChild(cardBack()));
  els.aiCount.textContent = `${a.hand.length} cards · deck ${a.deck.length}`;

  els.playerName.textContent = p.name;
  els.playerLife.innerHTML = lifeBar(p);
  els.playerEmber.innerHTML = emberPips(p.ember, p.maxEmber);
  els.playerHand.replaceChildren();
  p.hand.forEach((card) => {
    const playable = state.phase === 'play' && state.turn === 'player' && card.cost <= p.ember;
    els.playerHand.appendChild(cardElement(card, { playable, onClick: handlers.onCard }));
  });
  els.playerCount.textContent = `${p.hand.length} cards · deck ${p.deck.length}`;

  els.score.textContent = `Score ${state.score}`;
  els.round.textContent = `Round ${state.round}`;
  els.turnBanner.textContent = state.phase === 'play'
    ? (state.turn === 'player' ? 'Your turn — play a card or end the turn' : 'Ashwarden is thinking…')
    : '';
  els.endTurn.disabled = !(state.phase === 'play' && state.turn === 'player');

  els.log.replaceChildren();
  state.log.slice(-5).forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    els.log.appendChild(li);
  });

  els.surgeBanner.classList.toggle('show', !!state.lastSurge);
  if (state.lastSurge) {
    els.surgeBanner.textContent = `⚡ SURGE! ${state.lastSurge.name} burns brighter (+2)`;
  }

  document.body.classList.toggle('your-turn', state.phase === 'play' && state.turn === 'player');
}

/** Show the last cards played in the middle of the table. */
export function renderPlayed(state, els) {
  els.played.replaceChildren();
  const plays = [...state.ai.playedThisTurn.slice(-1), ...state.player.playedThisTurn.slice(-2)];
  plays.forEach((card) => els.played.appendChild(cardElement(card)));
}

/** The title screen, and the win / loss screens. */
export function showOverlay(kind, state, els, handlers) {
  const overlay = els.overlay;
  if (kind === 'title') {
    overlay.classList.add('show');
    overlay.innerHTML = `
      <div class="panel title-panel">
        <div class="title-kicker">A DUEL OF EMBERS AND WITS</div>
        <h1>Ember Court</h1>
        <p class="tagline">Outplay Ashwarden, the warden of the court, card by card.</p>
        <div class="rules">
          <div><b>⚔ Strike</b> — damage the warden &nbsp;·&nbsp; <b>⛨ Guard</b> — raise a shield &nbsp;·&nbsp; <b>✚ Mend</b> — restore life</div>
          <div>Ember refills each round and grows by 1, up to 10. Play two cards of the <b>same suit</b> in one turn for a <b>SURGE +2</b>.</div>
          <div>Reduce Ashwarden to 0 life to win. Fall to 0 and the court keeps you.</div>
        </div>
        <button id="playBtn" class="big-btn">▶ &nbsp;Enter the Court</button>
        <div class="keys">Mouse or keys: <b>1–7</b> play a card · <b>Enter</b> ends the turn</div>
      </div>`;
    overlay.querySelector('#playBtn').addEventListener('click', handlers.onStart);
    return;
  }
  if (kind === 'won' || kind === 'lost') {
    const won = kind === 'won';
    overlay.classList.add('show');
    overlay.innerHTML = `
      <div class="panel ${won ? 'win-panel' : 'lose-panel'}">
        <div class="end-mark">${won ? '♛' : '☠'}</div>
        <h1>${won ? 'Victory!' : 'Defeat'}</h1>
        <p class="tagline">${won ? 'Ashwarden falls. The Ember Court is yours!' : 'Ashwarden keeps the Ember Court… this time.'}</p>
        <div class="final-stats">
          <div><span>Final score</span><b>${state.score}</b></div>
          <div><span>Damage dealt</span><b>${state.damageDealt}</b></div>
          <div><span>Cards played</span><b>${state.cardsPlayed}</b></div>
          <div><span>Rounds</span><b>${state.round}</b></div>
          <div><span>Your life</span><b>${state.player.life} / ${MAX_LIFE}</b></div>
        </div>
        <button id="againBtn" class="big-btn">↻ &nbsp;Duel Again</button>
      </div>`;
    overlay.querySelector('#againBtn').addEventListener('click', handlers.onRestart);
    return;
  }
  overlay.classList.remove('show');
  overlay.innerHTML = '';
}

/** Flash the life bar of the side that just took a hit. */
export function flashLife(side) {
  const el = document.querySelector(side === 'player' ? '#playerLife' : '#aiLife');
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}
