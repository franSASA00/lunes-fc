// Live match mode: timer/clock, dramatic scoreboard, goal scoring (with scorer picker),
// goal banner toast, and the event timeline.
import { state } from './state.js';
import { formatTimer, avatarGradient, showToast } from './helpers.js';
// NOTE: showTab (navigation.js) is called via window.showTab(...) to avoid a circular import,
// since navigation.js needs renderLive() from this module.

/* ══════════════════════════════════════════════
   LIVE MATCH — Cronómetro + Goles
══════════════════════════════════════════════ */
export function stopLiveTimer(){
  if(state.liveMatch.timerInterval){ clearInterval(state.liveMatch.timerInterval); state.liveMatch.timerInterval=null; }
  state.liveMatch.active=false;
}

export async function renderLive(el){
  const hasTeams = !!state.currentTeams;
  const sA = state.liveMatch.scoreA, sB = state.liveMatch.scoreB;
  const aLeads = sA > sB, bLeads = sB > sA, tied = sA === sB;
  const sideACls = aLeads?'leading':bLeads?'trailing':'';
  const sideBCls = bLeads?'leading':aLeads?'trailing':'';

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Live Match</div>
        <div class="page-subtitle">Partido en vivo</div>
      </div>
      ${state.liveMatch.active?'<div class="live-badge"><div class="live-dot"></div>LIVE</div>':''}
    </div>

    ${!hasTeams
      ? `<div class="empty-state">
          <div class="empty-icon-wrap">⚔️</div>
          <div class="empty-title">Sin equipos sorteados</div>
          <div class="empty-msg">Confirmá asistencia y sorteá equipos en la pestaña Match antes de arrancar.</div>
          <button class="empty-cta" onclick="showTab('asistencia')">IR A MATCH DAY →</button>
        </div>`
      : `
    <div class="match-clock">
      <div class="clock-time" id="live-clock">${formatTimer(state.liveMatch.timer)}</div>
      <div class="clock-label">Tiempo de juego</div>
      <div class="clock-controls">
        <button class="clock-btn ${state.liveMatch.active?'stop':'start'}" onclick="toggleTimer()">${state.liveMatch.active?'⏸ PAUSAR':'▶ INICIAR'}</button>
        <button class="clock-btn reset" onclick="resetTimer()">↺ RESET</button>
      </div>
    </div>

    <!-- DRAMATIC SCOREBOARD -->
    <div class="live-scoreboard" id="live-scoreboard">
      <div class="live-sb-inner">
        <div class="live-sb-team side-a ${sideACls}">
          <div class="live-sb-team-badge">⚡ Equipo A</div>
          <div class="live-sb-score" id="sb-score-a">${sA}</div>
        </div>
        <div class="live-sb-center">
          <div class="live-sb-vs">VS</div>
          <div class="live-sb-half">${state.liveMatch.active?'EN JUEGO':state.liveMatch.timer>0?'PAUSA':'ESPERA'}</div>
        </div>
        <div class="live-sb-team side-b ${sideBCls}">
          <div class="live-sb-team-badge">🔥 Equipo B</div>
          <div class="live-sb-score" id="sb-score-b">${sB}</div>
        </div>
      </div>
    </div>

    <!-- GOAL BUTTONS -->
    <div class="goal-btn-row">
      <button class="goal-btn team-a" onclick="addGoal(0)">
        <span class="goal-btn-icon">⚽</span>
        <span style="font-size:14px;font-weight:800">GOL A</span>
        <div class="goal-btn-label">Equipo A</div>
      </button>
      <button class="goal-btn team-b" onclick="addGoal(1)">
        <span class="goal-btn-icon">⚽</span>
        <span style="font-size:14px;font-weight:800">GOL B</span>
        <div class="goal-btn-label">Equipo B</div>
      </button>
    </div>
    <div class="goal-undo-row">
      <button class="goal-undo-btn" onclick="undoGoal(0)">↺ Quitar gol A</button>
      <button class="goal-undo-btn" onclick="undoGoal(1)">↺ Quitar gol B</button>
    </div>

    <div class="section-title">📋 Timeline</div>
    <div class="event-timeline" id="live-timeline">
      ${state.liveMatch.events.length===0
        ? `<div style="color:var(--tx3);font-size:13px;text-align:center;padding:16px;opacity:.6">Sin eventos aún · los goles aparecen aquí</div>`
        : [...state.liveMatch.events].reverse().map(ev=>`
          <div class="event-item">
            <div class="event-time">${formatTimer(ev.time)}</div>
            <div class="event-icon">${ev.icon}</div>
            <div>
              <div class="event-text">${ev.text}</div>
              <div class="event-team" style="color:${ev.team===0?'var(--cyan)':'var(--orange)'}">${ev.team===0?'Equipo A':'Equipo B'}</div>
            </div>
          </div>`).join('')}
    </div>

    <button class="btn-primary" style="margin-top:4px;margin-bottom:16px" onclick="saveMatch()">💾 GUARDAR PARTIDO</button>
    `}
  `;
}

/* ── Goal Banner helper ── */
export function showGoalBanner(team, sA, sB, scorerName){
  // Remove any existing banner
  const old = document.getElementById('goal-banner');
  if(old) old.remove();

  const banner = document.createElement('div');
  banner.id = 'goal-banner';
  banner.className = `goal-banner banner-${team===0?'a':'b'}`;
  banner.innerHTML = `
    <div class="goal-banner-inner">
      <div class="goal-banner-ball">⚽</div>
      <div class="goal-banner-text">
        <div class="goal-banner-title">¡GOOOOL!</div>
        <div class="goal-banner-sub">${scorerName ? scorerName : 'Equipo '+(team===0?'A':'B')}</div>
      </div>
      <div class="goal-banner-score">${sA} — ${sB}</div>
    </div>`;
  document.body.appendChild(banner);

  requestAnimationFrame(()=>{ banner.classList.add('show'); });
  setTimeout(()=>{
    banner.classList.remove('show');
    setTimeout(()=>banner.remove(), 350);
  }, 2200);
}

window.toggleTimer = function(){
  if(state.liveMatch.active){
    stopLiveTimer();
  } else {
    state.liveMatch.active = true;
    state.liveMatch.timerInterval = setInterval(()=>{
      state.liveMatch.timer++;
      const el = document.getElementById('live-clock');
      if(el) el.textContent = formatTimer(state.liveMatch.timer);
    },1000);
  }
  window.showTab('live');
};

window.resetTimer = function(){
  stopLiveTimer();
  state.liveMatch.timer = 0;
  window.showTab('live');
};

// Abre el picker de goleador para el equipo indicado
window.addGoal = function(team){
  if(!state.currentTeams) return;
  openScorerModal(team);
};

// Llena el modal con los jugadores del equipo y lo abre
export function openScorerModal(team){
  const teamData = state.currentTeams[team];
  const titleEl = document.getElementById('scorer-title');
  const gridEl  = document.getElementById('scorer-grid');
  if(!titleEl || !gridEl) return;

  titleEl.innerHTML = `<span style="color:${team===0?'var(--cyan)':'var(--orange)'}">⚽ Equipo ${team===0?'A':'B'}</span> — ¿Quién metió el gol?`;

  gridEl.innerHTML = teamData.players.map(p => `
    <button class="scorer-btn ${team===1?'team-b':''}" onclick="confirmGoal('${p.uid}',${team})">
      <div class="scorer-btn-avatar" style="background:${avatarGradient(p.uid)}">${p.nombre[0]}${p.apellido[0]}</div>
      <div>
        <div class="scorer-btn-name">${p.nombre} ${p.apellido}</div>
<div class="scorer-btn-ovr" style="display:flex;align-items:center;gap:5px">
  OVR ${p.ovr||'—'}
  ${(()=>{
    const pb = {
      DEL:'🔴',MED:'🟢',DEF:'🔵',ARQ:'🟡'
    }[p.posicion]||'⚪';
    const pl = {DEL:'DEL',MED:'MED',DEF:'DEF',ARQ:'ARQ'}[p.posicion]||'JUG';
    return `<span style="font-size:9px;color:var(--tx3)">${pb} ${pl}</span>`;
  })()}
</div>
      </div>
    </button>`).join('');

  // Guardamos el equipo pendiente para usarlo en confirmGoal
  document.getElementById('scorer-modal').dataset.pendingTeam = team;
  document.getElementById('scorer-modal').classList.add('open');
}

// Se llama cuando se elige un goleador (o null = sin asignar)
window.confirmGoal = function(scorerUid, team){
  // Si team no viene como parámetro, lo leemos del dataset
  if(team === undefined){
    team = parseInt(document.getElementById('scorer-modal').dataset.pendingTeam);
  }
  document.getElementById('scorer-modal').classList.remove('open');

  if(team===0) state.liveMatch.scoreA++;
  else state.liveMatch.scoreB++;

  const scorer = scorerUid
    ? state.groupMembers.find(u=>u.uid===scorerUid)
    : null;
  const scorerName = scorer ? `${scorer.nombre} ${scorer.apellido}` : null;

  state.liveMatch.events.push({
    time:   state.liveMatch.timer,
    icon:   '⚽',
    text:   scorerName ? `¡Gol de ${scorerName}!` : '¡Goooool!',
    team,
    scorerUid: scorerUid || null,
    scorerName: scorerName || null,
  });


  // If live tab is active, update DOM in-place (no full re-render)
  const sbEl = document.getElementById('live-scoreboard');
  if(sbEl){
    const sA=state.liveMatch.scoreA, sB=state.liveMatch.scoreB;
    const aLeads=sA>sB, bLeads=sB>sA;
    // Update scores in-place with pop animation
    const scoreAEl=document.getElementById('sb-score-a');
    const scoreBEl=document.getElementById('sb-score-b');
    if(scoreAEl){ scoreAEl.textContent=sA; }
    if(scoreBEl){ scoreBEl.textContent=sB; }
    // Pop the scored team
    const popEl = team===0?scoreAEl:scoreBEl;
    if(popEl){ popEl.classList.remove('score-pop'); void popEl.offsetWidth; popEl.classList.add('score-pop'); }
    // Update leading/trailing classes
    ['.side-a','.side-b'].forEach((sel,i)=>{
      const el=sbEl.querySelector(sel); if(!el) return;
      el.classList.remove('leading','trailing');
      const leads = i===0?aLeads:bLeads, trails = i===0?bLeads:aLeads;
      if(leads) el.classList.add('leading');
      else if(trails) el.classList.add('trailing');
    });
    // Flash scoreboard
    sbEl.classList.remove('goal-flash'); void sbEl.offsetWidth; sbEl.classList.add('goal-flash');
    // Update half label
    const halfEl=sbEl.querySelector('.live-sb-half');
    if(halfEl) halfEl.textContent=state.liveMatch.active?'EN JUEGO':state.liveMatch.timer>0?'PAUSA':'ESPERA';
    // Append event to timeline
    const timeline=document.getElementById('live-timeline');
    if(timeline){
      if(timeline.querySelector('[style*="Sin eventos"]')) timeline.innerHTML='';
      const ev=state.liveMatch.events[state.liveMatch.events.length-1];
      const item=document.createElement('div');
      item.className='event-item';
      item.innerHTML=`
  <div class="event-time">${formatTimer(ev.time)}</div>
  <div class="event-icon">⚽</div>
  <div>
    <div class="event-text">${ev.text}</div>
    <div class="event-team" style="color:${team===0?'var(--cyan)':'var(--orange)'}">${team===0?'Equipo A':'Equipo B'}</div>
  </div>`;
timeline.insertBefore(item, timeline.firstChild);
    }
  } else {
    window.showTab('live');
  }
  showGoalBanner(team, state.liveMatch.scoreA, state.liveMatch.scoreB, scorerName);
};

window.undoGoal = function(team){
  if(team===0 && state.liveMatch.scoreA>0) state.liveMatch.scoreA--;
  else if(team===1 && state.liveMatch.scoreB>0) state.liveMatch.scoreB--;
  window.showTab('live');
};
