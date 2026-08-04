// "Stats" (historial) screen: personal profile hero, quick stats, achievements,
// top scorers ranking, and full match history.
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { SKILLS, POSITIONS } from './constants.js';
import { avatarGradient, overallColor, getEloRank } from './helpers.js';
import { getCachedStats } from './stats.js';

/* ══════════════════════════════════════════════
   HISTORIAL — Stats Screen
══════════════════════════════════════════════ */
export async function renderHistorial(el){
  const snap = await getDoc(doc(db,'groups', state.currentGroup.id));
  const g = snap.data();
  const history = g.history||[];
  const {overall, stats} = await getCachedStats(state.currentUser.uid);
  const rSnap = await getDoc(doc(db,'ratings', state.currentGroup.id+'_'+state.currentUser.uid));
  const raterCount = rSnap.exists() ? Object.keys(rSnap.data().ratings||{}).length : 0;
  const eloRank = getEloRank(state.currentUser.elo||1000);
  const myMatches = history.filter(m=>m.teams?.some(t=>t.players?.some(p=>p.uid===state.currentUser.uid))).length;
  const myWins = history.filter(m=>{
    const idx = m.teams?.findIndex(t=>t.players?.some(p=>p.uid===state.currentUser.uid));
    if(idx===-1||idx===undefined) return false;
    const sA=m.scoreA||0, sB=m.scoreB||0;
    return (idx===0&&sA>sB)||(idx===1&&sB>sA);
  }).length;
  const ovrCol = overallColor(overall);
  const skillBarColor = v => v>=80?'var(--gold)':v>=65?'var(--green)':v>=40?'var(--cyan)':'var(--orange)';

  const golesMap = {};
  history.forEach(m => {
    (m.scorers||[]).forEach(s => {
      if(!golesMap[s.uid]) golesMap[s.uid] = { name: s.name, goals: 0 };
      golesMap[s.uid].goals += s.goals;
    });
  });
  const golesRanking = Object.entries(golesMap)
    .sort((a,b) => b[1].goals - a[1].goals)
    .slice(0, 5);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Stats</div>
        <div class="page-subtitle">Tu rendimiento en ${g.name}</div>
      </div>
    </div>

    <!-- ── PROFILE HERO FIFA ── -->
    <div style="
      background:linear-gradient(135deg,rgba(0,212,255,.08),rgba(0,119,255,.04));
      border:1px solid rgba(0,212,255,.2);border-radius:20px;
      padding:20px;margin-bottom:14px;position:relative;overflow:hidden;
    ">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;
        background:linear-gradient(90deg,var(--purple),var(--cyan),var(--purple));
        background-size:200% 100%;animation:shimmerBar 3s ease infinite"></div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div style="
          width:68px;height:68px;border-radius:50%;flex-shrink:0;
          background:${avatarGradient(state.currentUser.uid)};
          display:flex;align-items:center;justify-content:center;
          font-family:'Bebas Neue',sans-serif;font-size:28px;color:#000;
          box-shadow:0 0 0 3px rgba(0,212,255,.2),0 8px 24px rgba(0,0,0,.4);
        ">${state.currentUser.nombre[0]}${state.currentUser.apellido[0]}</div>
        <div style="flex:1">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">${state.currentUser.nombre} ${state.currentUser.apellido}</div>
          <div style="font-size:12px;color:var(--tx3);margin-top:3px">${POSITIONS[state.currentUser.posicion]||'Jugador'} · ${eloRank.icon} ${eloRank.name}</div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            <span class="chip chip-purple" style="font-size:10px">ELO ${state.currentUser.elo||1000}</span>
            <span class="chip chip-blue" style="font-size:10px">Nv.${state.currentUser.level||1} · ${state.currentUser.xp||0} XP</span>
          </div>
        </div>
        <div style="text-align:center;flex-shrink:0">
          <div style="
            font-family:'Bebas Neue',sans-serif;font-size:80px;line-height:.9;
            color:${ovrCol};
            filter:drop-shadow(0 0 20px ${ovrCol==='var(--gold)'?'rgba(255,214,0,.5)':ovrCol==='var(--green)'?'rgba(0,230,118,.4)':'rgba(0,212,255,.4)'});
          ">${overall||'—'}</div>
          <div style="font-size:9px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase">OVR</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${SKILLS.map(s=>{
          const val = stats[s]||0;
          const col = val>=80?'var(--gold)':val>=65?'var(--green)':val>=40?'var(--cyan)':'var(--orange)';
          return `<div style="display:flex;align-items:center;gap:10px">
            <div style="font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--tx3);width:72px;flex-shrink:0">${s}</div>
            <div style="flex:1;height:6px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${val}%;background:${col};border-radius:3px;box-shadow:0 0 6px ${col}"></div>
            </div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:${col};min-width:26px;text-align:right">${val||'—'}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- ── QUICK STATS FIFA ── -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      ${[
        {val:myMatches, lbl:'Partidos', icon:'⚽', col:'var(--cyan)'},
        {val:myWins,    lbl:'Victorias', icon:'🏆', col:'var(--green)'},
        {val:state.currentUser.mvpCount||0, lbl:'MVPs', icon:'⭐', col:'var(--gold)'},
      ].map(item=>`
        <div style="
          background:var(--sf2);border:1px solid var(--br);border-radius:14px;
          padding:14px 8px;text-align:center;position:relative;overflow:hidden;
        ">
          <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${item.col};opacity:.5"></div>
          <div style="font-size:22px;margin-bottom:4px">${item.icon}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;color:${item.col};line-height:1">${item.val}</div>
          <div style="font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:1px;margin-top:3px">${item.lbl}</div>
        </div>`).join('')}
    </div>

    <!-- ── XP BAR ── -->
    <div class="xp-bar" style="margin-bottom:16px">
      <div class="xp-bar-top">
        <div class="xp-bar-label">⚡ Nivel ${state.currentUser.level||1}</div>
        <div class="xp-bar-val">${state.currentUser.xp||0} / ${((state.currentUser.level||1)*500)} XP</div>
      </div>
      <div class="xp-track">
        <div class="xp-fill" style="width:${Math.min(100,((state.currentUser.xp||0)%500)/5)}%"></div>
      </div>
    </div>

    <!-- ── LOGROS ── -->
    <div class="section-title">🏅 Logros</div>
    <div class="achievements-row">
      <div class="achievement ${raterCount>=1?'unlocked':''}">
        <span class="achievement-icon">${raterCount>=1?'⭐':'🔒'}</span>
        <div class="achievement-name">Primera Calificación</div>
      </div>
      <div class="achievement ${myMatches>=5?'unlocked':''}">
        <span class="achievement-icon">${myMatches>=5?'🏃':'🔒'}</span>
        <div class="achievement-name">5 Partidos</div>
      </div>
      <div class="achievement ${myWins>=3?'unlocked':''}">
        <span class="achievement-icon">${myWins>=3?'🏆':'🔒'}</span>
        <div class="achievement-name">3 Victorias</div>
      </div>
      <div class="achievement ${(state.currentUser.mvpCount||0)>=1?'unlocked':''}">
        <span class="achievement-icon">${(state.currentUser.mvpCount||0)>=1?'👑':'🔒'}</span>
        <div class="achievement-name">Primer MVP</div>
      </div>
      <div class="achievement ${overall>=80?'unlocked':''}">
        <span class="achievement-icon">${overall>=80?'💎':'🔒'}</span>
        <div class="achievement-name">Overall 80+</div>
      </div>
      <div class="achievement ${state.groupMembers.length>=10?'unlocked':''}">
        <span class="achievement-icon">${state.groupMembers.length>=10?'🏟️':'🔒'}</span>
        <div class="achievement-name">Grupo 10+</div>
      </div>
    </div>

    <!-- ── GOLEADORES DEL GRUPO ── -->
    ${golesRanking.length ? `
    <div class="section-title">⚽ Goleadores del Grupo</div>
    <div class="leaderboard" style="margin-bottom:16px">
      ${golesRanking.map(([uid, data], i) => {
        const medals = ['🥇','🥈','🥉'];
        const rankCls = ['r1','r2','r3'][i] || '';
        const u = state.groupMembers.find(m=>m.uid===uid);
        return `<div class="leaderboard-item ${i<3?'top'+(i+1):''}">
          <div class="lb-rank ${rankCls}">${medals[i]||i+1}</div>
          <div class="lb-avatar" style="background:${u?avatarGradient(uid):'var(--sf3)'}">
            ${u ? u.nombre[0]+u.apellido[0] : '?'}
          </div>
          <div class="lb-info">
            <div class="lb-name">${data.name}</div>
            <div class="lb-sub">${data.goals} gol${data.goals!==1?'es':''}</div>
          </div>
          <div class="lb-val" style="color:var(--gold)">⚽ ${data.goals}</div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- ── HISTORIAL ── -->
    <div class="section-title">📅 Historial de Partidos</div>
    ${history.length
      ? [...history].map(m=>{
          const sA = m.scoreA||0, sB = m.scoreB||0;
          const myTeamIdx = m.teams?.findIndex(t=>t.players?.some(p=>p.uid===state.currentUser.uid));
          const iPlayed = myTeamIdx !== -1 && myTeamIdx !== undefined;
          let itemCls = '', badgeHtml = '';
          if(iPlayed){
            const iWon = (myTeamIdx===0&&sA>sB)||(myTeamIdx===1&&sB>sA);
            const isDraw = sA===sB;
            if(isDraw){ itemCls='draw'; badgeHtml=`<span class="history-result-badge draw">Empate</span>`; }
            else if(iWon){ itemCls='win'; badgeHtml=`<span class="history-result-badge win">Victoria</span>`; }
            else { itemCls='loss'; badgeHtml=`<span class="history-result-badge loss">Derrota</span>`; }
          }
          const isDraw = sA===sB;
          const getTeamCls = i => isDraw?'draw-side':(i===0?(sA>sB?'winner':'loser'):(sB>sA?'winner':'loser'));
          const mvpName = m.mvp?(state.groupMembers.find(u=>u.uid===m.mvp)?.nombre||'MVP'):null;
          return `<div class="history-item ${itemCls}">
            <div class="history-header">
              <div class="history-date">📅 ${m.date}</div>
              ${badgeHtml}
            </div>
            <div class="history-scoreboard">
              <div class="history-team ${getTeamCls(0)}">
                <div class="history-team-name">Equipo A</div>
                <div class="history-team-score">${sA}</div>
                <div class="history-team-ovr">OVR ${m.teams[0]?.avg||'—'}</div>
                <div class="history-team-players">${(m.teams[0]?.players||[]).slice(0,3).map(p=>p.nombre).join(', ')}${(m.teams[0]?.players||[]).length>3?'…':''}</div>
              </div>
              <div class="history-score-center">
                <span class="history-score-sep">—</span>
                <div class="history-score-label">Final</div>
              </div>
              <div class="history-team ${getTeamCls(1)}">
                <div class="history-team-name">Equipo B</div>
                <div class="history-team-score">${sB}</div>
                <div class="history-team-ovr">OVR ${m.teams[1]?.avg||'—'}</div>
                <div class="history-team-players">${(m.teams[1]?.players||[]).slice(0,3).map(p=>p.nombre).join(', ')}${(m.teams[1]?.players||[]).length>3?'…':''}</div>
              </div>
            </div>
            ${(iPlayed || mvpName || (m.scorers||[]).length) ? `
            <div class="history-footer">
              ${iPlayed ? `<span class="chip chip-blue">✓ Jugaste</span>` : ''}
              ${mvpName ? `<div class="history-mvp">⭐ MVP: ${mvpName}</div>` : ''}
              ${(m.scorers||[]).length ? `
                <div style="width:100%;margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">
                  ${[...m.scorers].sort((a,b)=>b.goals-a.goals).map(s=>`
                    <span class="chip chip-gold" style="font-size:10px">
                      ⚽ ${s.name}${s.goals>1?` <b>×${s.goals}</b>`:''}
                    </span>`).join('')}
                </div>` : ''}
            </div>` : ''}
          </div>`;
        }).join('')
      : `<div class="empty-state">
          <div class="empty-icon-wrap">📋</div>
          <div class="empty-title">Sin partidos aún</div>
          <div class="empty-msg">Cuando guarden el primer partido va a aparecer el historial acá.</div>
          <button class="empty-cta" onclick="showTab('asistencia')">ARRANCAR MATCH DAY →</button>
        </div>`}
  `;
}
