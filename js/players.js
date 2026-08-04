// "Squad" screen: the player list/leaderboard, and the player detail modal.
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { SKILLS, POSITIONS } from './constants.js';
import { avatarGradient, overallColor, cardClass, getEloRank, statBarClass, isSupremo, getRolBadge, openModal } from './helpers.js';
import { getCachedStats } from './stats.js';
import { getAttendance } from './attendance.js';

/* ══════════════════════════════════════════════
   JUGADORES — Squad Screen
══════════════════════════════════════════════ */
export async function renderJugadores(el){
  // Show skeleton first
  el.innerHTML = `
    <div class="field-bg"></div>
    <div class="page-header">
      <div><div class="page-title">Squad</div><div class="page-subtitle">Cargando...</div></div>
    </div>
    <div class="players-grid" style="margin-top:8px">
      ${Array(4).fill(0).map((_,i)=>`
        <div class="skeleton-card" style="animation-delay:${i*0.07}s">
          <div class="skeleton-card-top">
            <div class="skeleton" style="width:22px;height:22px;border-radius:50%"></div>
            <div class="skeleton" style="width:22px;height:22px;border-radius:50%"></div>
          </div>
          <div class="skeleton skeleton-card-ovr"></div>
          <div class="skeleton skeleton-card-avatar"></div>
          <div class="skeleton skeleton-card-name"></div>
          <div class="skeleton skeleton-card-skills"></div>
        </div>`).join('')}
    </div>`;

  const att = await getAttendance();
  const statsMap = {};
  await Promise.all(state.groupMembers.map(async u=>{ statsMap[u.uid]=await getCachedStats(u.uid); }));

  // Build leaderboard
  const ranked = [...state.groupMembers]
    .map(u=>({...u, overall:(statsMap[u.uid]||{}).overall||0}))
    .sort((a,b)=>b.overall-a.overall);

  const g = state.currentGroup;
  el.innerHTML = `
    <div class="field-bg"></div>
    <div class="page-header">
      <div>
        <div class="page-title">Squad</div>
        <div class="page-subtitle">${state.groupMembers.length} jugadores · ${g.name}</div>
      </div>
      <div class="user-pill" onclick="copyCode('${g.code}')">
        <div class="user-pill-avatar" style="background:${avatarGradient(state.currentUser.uid)}">${state.currentUser.nombre[0]}${state.currentUser.apellido[0]}</div>
        <div class="user-pill-name">${state.currentUser.nombre}</div>
      </div>
    </div>

    <div class="group-header-bar">
      <div>
        <div class="group-header-name">${g.name}</div>
        <div style="font-size:11px;color:var(--tx3)">Código de invitación</div>
      </div>
      <div class="group-header-code" onclick="copyCode('${g.code}')">${g.code} 📋</div>
    </div>

    <div class="section-title">🏆 Ranking del Grupo</div>
    <div class="leaderboard" style="margin-bottom:20px">
      ${ranked.slice(0,3).map((u,i)=>{
        const cls=['r1','r2','r3'][i]; const medal=['🥇','🥈','🥉'][i];
        const eloRank = getEloRank(u.elo||1000);
        return `<div class="leaderboard-item top${i+1}" style="animation:cardIn .4s cubic-bezier(.22,1,.5,1) ${i*0.08}s both">
          <div class="lb-rank ${cls}">${i+1}</div>
          <div class="lb-avatar" style="background:${avatarGradient(u.uid)}">${u.nombre[0]}${u.apellido[0]}</div>
          <div class="lb-info">
            <div class="lb-name">${u.nombre} ${u.apellido} ${i===0?'👑':''}</div>
            <div class="lb-sub">${POSITIONS[u.posicion]||'Jugador'} · <span style="color:${eloRank.cls==='gold'?'var(--gold)':'var(--tx3)'}">${eloRank.icon} ${eloRank.name}</span></div>
          </div>
          <div class="lb-val">${u.overall||'—'}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="section-title">👥 Todos los Jugadores</div>
    <div class="players-grid">
      ${state.groupMembers.map((u,idx)=>{
        const {overall, stats:sk} = statsMap[u.uid]||{overall:0,stats:{}};
        const pie = {derecho:'D',zurdo:'Z',ambos:'A'}[u.pie]||'?';
        const col = overallColor(overall);
        const cls = cardClass(overall);
        const isConf = att[u.uid];
        const eloRank = getEloRank(u.elo||1000);
        const ovrGlow = overall>=85?'rgba(255,200,0,.5)':overall>=70?'rgba(0,230,118,.4)':overall>=50?'rgba(0,212,255,.4)':'rgba(255,107,0,.3)';
        const skillAbbr = {Ataque:'ATK',Velocidad:'VEL',Defensa:'DEF',Precisión:'PRC',Potencia:'POT',Resistencia:'RES'};
        const skillColor = v => v>=80?'var(--gold)':v>=65?'var(--green)':v>=40?'var(--cyan)':'var(--orange)';
        const topSkills = SKILLS.slice(0,4);
        // Stagger: offset based on index, with a natural row stagger (row delay + column offset)
        const row = Math.floor(idx/2), col2 = idx%2;
        const delay = (row * 0.10 + col2 * 0.05).toFixed(2);
        return `<div class="player-card ${cls}" onclick="openPlayerDetail('${u.uid}')" style="animation-delay:${delay}s">
          <div class="pc-top">
            <div class="pc-left">
              <span class="player-card-foot">${pie}</span>
              ${isConf?'<div class="confirmed-dot" title="Confirmado"></div>':''}
            </div>
            <div class="pc-right">
              ${u.mvpCount>0?'<div class="mvp-crown">⭐</div>':''}
              <div class="elo-badge">${eloRank.icon}</div>
            </div>
          </div>
          <div class="pc-overall-wrap">
            <div class="player-card-overall" style="color:${col};--ovr-glow:${ovrGlow}">${overall||'—'}</div>
            <div class="player-card-pos">${POSITIONS[u.posicion]||'Jugador'}</div>
          </div>
          <div class="pc-avatar-wrap">
            <div class="player-card-avatar" style="background:${avatarGradient(u.uid)}">${u.nombre[0]}${u.apellido[0]}</div>
          </div>
          <div class="pc-name-wrap">
            <div class="player-card-name">${u.nombre} ${u.apellido}</div>
            <div class="player-card-sub">${u.edad} a · ${eloRank.name}</div>
          </div>
          <div class="pc-skills">
            ${topSkills.map(s=>{
              const v=sk[s]||0;
              return`<div class="pc-skill-row">
                <div class="pc-skill-name">${skillAbbr[s]||s.slice(0,3)}</div>
                <div class="pc-skill-track"><div class="pc-skill-fill" style="width:${v}%;background:${skillColor(v)}"></div></div>
                <div class="pc-skill-val">${v||'—'}</div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
    ${isSupremo()?`
<div class="section-title" style="margin-top:24px">⚙️ Gestión del Grupo</div>
<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
  ${state.groupMembers.filter(u=>u.uid!==state.currentUser.uid).map(u=>`
    <div style="background:var(--sf2);border:1px solid var(--br);border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px">
      <div style="width:36px;height:36px;border-radius:50%;background:${avatarGradient(u.uid)};display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:14px;color:#000;flex-shrink:0">${u.nombre[0]}${u.apellido[0]}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${u.nombre} ${u.apellido}</div>
        <div style="margin-top:3px">${getRolBadge(u.uid)}</div>
      </div>
      <div style="display:flex;gap:6px">
        ${state.currentGroup.admins?.includes(u.uid)
          ? `<button onclick="quitarAdmin('${u.uid}')" style="padding:6px 10px;border-radius:8px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);color:#b08dff;font-size:11px;font-weight:700">Quitar Admin</button>`
          : `<button onclick="hacerAdmin('${u.uid}')" style="padding:6px 10px;border-radius:8px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.3);color:var(--cyan);font-size:11px;font-weight:700">Hacer Admin</button>`}
        <button onclick="eliminarMiembro('${u.uid}')" style="padding:6px 10px;border-radius:8px;background:rgba(255,23,68,.1);border:1px solid rgba(255,23,68,.3);color:var(--red);font-size:11px;font-weight:700">✕</button>
      </div>
    </div>`).join('')}
</div>`:''}
<div style="margin-top:8px"><button class="btn-secondary" onclick="leaveGroupUI()">← Cambiar de grupo</button></div>
  `;
}

/* ── PLAYER DETAIL ── */
window.openPlayerDetail = async function(uid){
  const u = state.groupMembers.find(m=>m.uid===uid); if(!u) return;
  const {stats,overall} = await getCachedStats(uid);
  const ratingSnap = await getDoc(doc(db,'ratings', state.currentGroup.id+'_'+uid));
  const raterCount = ratingSnap.exists() ? Object.keys(ratingSnap.data().ratings||{}).length : 0;
  const isSelf = uid===state.currentUser.uid;
  const col = overallColor(overall);
  const eloRank = getEloRank(u.elo||1000);

  // Total de goles del jugador en el historial del grupo
  const histSnap = await getDoc(doc(db,'groups', state.currentGroup.id));
  const histData = histSnap.data();
  const totalGoles = (histData.history||[]).reduce((total, m) => {
    const scored = (m.scorers||[]).find(s=>s.uid===uid);
    return total + (scored ? scored.goals : 0);
  }, 0);

  document.getElementById('player-modal-body').innerHTML = `
    <button class="modal-close" onclick="closeModal('player-modal')">✕</button>
        
    <div class="detail-hero">
      <div class="player-card-avatar" style="width:64px;height:64px;font-size:26px;margin:0 auto 12px;background:${avatarGradient(uid)}">${u.nombre[0]}${u.apellido[0]}</div>
      <div class="detail-overall" style="color:${col}">${overall||'—'}</div>
      <div class="detail-name">${u.nombre} ${u.apellido}</div>
      <div class="detail-meta">${u.edad} años · ${POSITIONS[u.posicion]||'Jugador'} · ${{derecho:'Derecho',zurdo:'Zurdo',ambos:'Ambos'}[u.pie]||u.pie}</div>
      <div class="detail-chips">
        <span class="chip chip-blue">${raterCount} calificación(es)</span>
        <span class="chip chip-purple">${eloRank.icon} ${eloRank.name}</span>
        ${u.mvpCount>0?`<span class="chip chip-gold">⭐ ${u.mvpCount} MVP(s)</span>`:''}
        ${totalGoles>0?`<span class="chip chip-gold">⚽ ${totalGoles} gol${totalGoles!==1?'es':''}</span>`:''}
        ${isSelf?'<span class="chip chip-orange">● Vos</span>':''}
      </div>
    </div>
    <div class="elo-display">
      <div class="elo-left">
        <div class="elo-icon">${eloRank.icon}</div>
        <div>
          <div class="elo-label">ELO Rating</div>
          <div class="elo-number">${u.elo||1000}</div>
        </div>
      </div>
      <div class="elo-rank ${eloRank.cls}">${eloRank.name}</div>
    </div>
    <div class="xp-bar">
      <div class="xp-bar-top">
        <div class="xp-bar-label">⚡ Nivel ${u.level||1}</div>
        <div class="xp-bar-val">${u.xp||0} XP</div>
      </div>
      <div class="xp-track"><div class="xp-fill" style="width:${Math.min(100,((u.xp||0)%500)/5)}%"></div></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Atributos</div>
      ${SKILLS.map(skill=>{
        const vv=stats[skill]||0; const cls=statBarClass(vv);
        return`<div class="stat-bar-row">
          <div class="stat-bar-label">${skill}</div>
          <div class="stat-bar-track"><div class="stat-bar-fill ${cls}" style="width:${vv}%"></div></div>
          <div class="stat-bar-val" style="color:${overallColor(vv)}">${vv||'—'}</div>
        </div>`;
      }).join('')}
    </div>
    ${!isSelf?`<button class="btn-primary" style="margin-top:8px" onclick="closeModal('player-modal');setPendingRateUid('${uid}');showTab('calificar')">⭐ CALIFICAR A ${u.nombre.toUpperCase()}</button>`:''}
  `;
  openModal('player-modal');
};
