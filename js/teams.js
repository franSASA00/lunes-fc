// "Equipos" (teams) screen: balanced team draw algorithm, rendering the drawn teams,
// and saving a finished match into the group's history.
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { showToast, overallColor } from './helpers.js';
import { getCachedStats } from './stats.js';
import { getAttendance } from './attendance.js';

/* ══════════════════════════════════════════════
   EQUIPOS — Teams Draw
══════════════════════════════════════════════ */

export async function renderEquipos(el){
  const att = await getAttendance();
  const confirmed = state.groupMembers.filter(u=>att[u.uid]);
  const n = confirmed.length;

  const statsMap = {};
  await Promise.all(confirmed.map(async u=>{ statsMap[u.uid]=await getCachedStats(u.uid); }));

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Equipos</div>
        <div class="page-subtitle">Sorteo balanceado con IA</div>
      </div>
    </div>
    <div class="conf-hero" style="margin-bottom:16px">
      <div class="conf-hero-item"><div class="conf-hero-val">${n}</div><div class="conf-hero-lbl">Jugadores</div></div>
      <div class="conf-hero-item"><div class="conf-hero-val">${Math.floor(n/2)}</div><div class="conf-hero-lbl">vs</div></div>
      <div class="conf-hero-item"><div class="conf-hero-val">${Math.ceil(n/2)}</div><div class="conf-hero-lbl">Rival</div></div>
    </div>
    ${n<4
      ?`<div class="empty-state">
          <div class="empty-icon-wrap">⚽</div>
          <div class="empty-title">Falta gente</div>
          <div class="empty-msg">Necesitás al menos 4 jugadores confirmados para armar equipos.</div>
          <button class="empty-cta" onclick="showTab('asistencia')">CONFIRMAR ASISTENCIA →</button>
        </div>`
      :`<button class="draw-btn" onclick="drawTeams()">🤖 SORTEO INTELIGENTE</button>`}
    <div id="teams-result"></div>
  `;
  if(state.currentTeams) renderTeamsResult();
}

window.drawTeams = async function(){
  const att = await getAttendance();
  const confirmed = state.groupMembers.filter(u=>att[u.uid]);
  if(confirmed.length<4){ showToast('⚠️ No hay suficientes jugadores'); return; }
  const withOvr = await Promise.all(confirmed.map(async u=>({
    ...u, ovr:(await getCachedStats(u.uid)).overall||0
  })));
  // Serpentine sort for balance
  withOvr.sort((a,b)=>b.ovr-a.ovr);
  const teams = [[],[]];
  withOvr.forEach((p,i)=>{
    const round=Math.floor(i/2), inRound=i%2, team=round%2===0?inRound:1-inRound;
    teams[team].push(p);
  });
  // Shuffle within teams
  teams.forEach(t=>{ for(let i=t.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [t[i],t[j]]=[t[j],t[i]]; } });
  state.currentTeams = teams.map(t=>({
    players:t,
    avg:Math.round(t.reduce((s,p)=>s+p.ovr,0)/t.length)||0
  }));
  state.liveMatch.teams = state.currentTeams;
  renderTeamsResult();
};

export function renderTeamsResult(){
  const el = document.getElementById('teams-result');
  if(!el||!state.currentTeams) return;
  const diff = Math.abs(state.currentTeams[0].avg - state.currentTeams[1].avg);
  const probA = Math.round(50 + (state.currentTeams[0].avg - state.currentTeams[1].avg));
  const probB = 100-probA;

  el.innerHTML = `
    <div class="win-prob">
      <div class="win-prob-title">Win Probability</div>
      <div class="win-prob-bar">
        <div class="win-prob-a" style="width:${Math.max(10,Math.min(90,probA))}%"></div>
        <div class="win-prob-b" style="width:${Math.max(10,Math.min(90,probB))}%"></div>
      </div>
      <div class="win-prob-labels">
        <div class="win-prob-label" style="color:var(--cyan)">Equipo A ${probA}%</div>
        <div class="win-prob-label" style="color:var(--orange)">Equipo B ${probB}%</div>
      </div>
    </div>

    <div class="teams-container">
      ${state.currentTeams.map((team,idx)=>`
        <div class="team-card ${idx===0?'team-a':'team-b'}">
          <div class="team-header">
            <div class="team-name" style="color:${idx===0?'var(--cyan)':'var(--orange)'}">${idx===0?'⚡ A':'🔥 B'}</div>
            <div class="team-ovr" style="color:${overallColor(team.avg)}">${team.avg}</div>
          </div>
          ${team.players.map((u,i)=>{
            const posBadge = {
              DEL:{label:'DEL',color:'rgba(255,23,68,.85)',border:'rgba(255,23,68,.4)'},
              MED:{label:'MED',color:'rgba(0,230,118,.85)',border:'rgba(0,230,118,.4)'},
              DEF:{label:'DEF',color:'rgba(0,212,255,.85)',border:'rgba(0,212,255,.4)'},
              ARQ:{label:'ARQ',color:'rgba(255,214,0,.9)',border:'rgba(255,214,0,.4)'},
            }[u.posicion]||{label:'JUG',color:'rgba(160,180,204,.7)',border:'rgba(160,180,204,.3)'};
            return `<div class="team-player">
              <div class="team-player-num">${i+1}</div>
              <div class="team-player-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                ${u.nombre} ${u.apellido[0]}.
                <span style="font-size:8px;font-weight:800;letter-spacing:.8px;padding:2px 5px;border-radius:4px;background:${posBadge.color};border:1px solid ${posBadge.border};color:#000;line-height:1.4;flex-shrink:0">${posBadge.label}</span>
              </div>
              <div class="team-player-ovr">${u.ovr||'—'}</div>
            </div>`;
          }).join('')}
        </div>`).join('')}
    </div>

    ${diff>5?`<div style="font-size:12px;color:var(--orange);text-align:center;margin-bottom:8px">⚠️ Diferencia de ${diff} puntos. Considerá redibujar.</div>`:''}

    <button class="redraw-btn" onclick="drawTeams()">🔄 VOLVER A SORTEAR</button>
    <button class="btn-primary" style="margin-top:8px" onclick="saveMatch()">💾 GUARDAR PARTIDO</button>
    <button class="btn-secondary" style="margin-top:8px" onclick="showTab('live')">🔴 MODO LIVE MATCH</button>
  `;
}

window.saveMatch = async function(){
  if(!state.currentTeams) return;
  const ref = doc(db,'groups', state.currentGroup.id);
  const snap = await getDoc(ref);
  const g = snap.data();
  const history = g.history||[];

  // Construir lista de goleadores desde los eventos
  const scorers = {};
  state.liveMatch.events.forEach(ev => {
    if(!ev.scorerUid) return;
    if(!scorers[ev.scorerUid]){
      scorers[ev.scorerUid] = {
        uid: ev.scorerUid,
        name: ev.scorerName,
        goals: 0,
        team: ev.team,
      };
    }
    scorers[ev.scorerUid].goals++;
  });

  history.unshift({
    date: new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}),
    timestamp: Date.now(),
    scoreA: state.liveMatch.scoreA||0,
    scoreB: state.liveMatch.scoreB||0,
    events: state.liveMatch.events||[],
    scorers: Object.values(scorers), // ← NUEVO
    teams: state.currentTeams.map(t=>({
      avg: t.avg,
      players: t.players.map(p=>({uid:p.uid,nombre:p.nombre,apellido:p.apellido,ovr:p.ovr}))
    }))
  });

  await updateDoc(ref, {history});
  state.currentGroup = {...state.currentGroup, history};
  showToast('✓ ¡Partido guardado!');
  state.currentTeams = null;
  state.liveMatch.scoreA=0; state.liveMatch.scoreB=0; state.liveMatch.events=[];
};
