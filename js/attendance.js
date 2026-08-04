// Attendance ("Match Day") screen: confirming/cancelling attendance, proposing/cancelling the
// next match date, the pre-match popup, and group-admin actions (promote/demote/remove members).
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { POSITIONS } from './constants.js';
import { showToast, avatarGradient, overallColor, getEloRank, canManage } from './helpers.js';
import { getCachedStats } from './stats.js';
// NOTE: showTab (navigation.js) is called via window.showTab(...) below to avoid a circular
// import, since navigation.js itself needs checkFechaPopup() from this module.

/* ── ATTENDANCE ── */
export async function getAttendance(){
  try {
    const snap = await getDoc(doc(db,'attendance', state.currentGroup.id));
    return snap.exists() ? snap.data() : {};
  } catch{ return {}; }
}
export async function setAttendance(uid, confirmed){
  await setDoc(doc(db,'attendance', state.currentGroup.id), {[uid]:confirmed}, {merge:true});
}


/* ══════════════════════════════════════════════
   ASISTENCIA — Match Screen
══════════════════════════════════════════════ */
export async function renderAsistencia(el){
  const att = await getAttendance();
  const confirmed = state.groupMembers.filter(u=>att[u.uid]);
  const statsMap = {};
  await Promise.all(state.groupMembers.map(async u=>{ statsMap[u.uid]=await getCachedStats(u.uid); }));
  const avgOvr = confirmed.length
    ? Math.round(confirmed.reduce((s,u)=>(s+(statsMap[u.uid]?.overall||0)),0)/confirmed.length)
    : 0;
  const n = confirmed.length;
  const perTeam = Math.ceil(n/2);
  const teamA = perTeam, teamB = n - perTeam;
  const isCreator = canManage();
  const fecha = state.currentGroup.proximaFecha || null;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Match Day</div>
        <div class="page-subtitle">Próximo partido</div>
      </div>
    </div>

    <!-- FECHA PROPUESTA -->
    ${fecha ? `
    <div style="background:${fecha.cancelada?'rgba(255,23,68,.08)':'linear-gradient(135deg,rgba(0,212,255,.08),rgba(0,119,255,.05))'};border:1px solid ${fecha.cancelada?'rgba(255,23,68,.3)':'rgba(0,212,255,.25)'};border-radius:16px;padding:16px;margin-bottom:16px;position:relative">
      <div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${fecha.cancelada?'var(--red)':'var(--cyan)'};margin-bottom:8px">${fecha.cancelada?'❌ PARTIDO CANCELADO':'📅 PRÓXIMO PARTIDO'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--tx);line-height:1">${fecha.dia}</div>
      <div style="font-size:14px;color:var(--tx2);margin-top:2px">🕐 ${fecha.hora}hs · Mínimo ${fecha.minJugadores} jugadores</div>
      ${fecha.cancelada
        ? `<div style="font-size:12px;color:var(--red);margin-top:8px">El partido fue cancelado por el organizador.</div>`
        : `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <div style="font-size:12px;color:var(--green)">✓ Van: <b>${n}</b></div>
            <div style="font-size:12px;color:var(--tx3)">· Necesitan: <b>${fecha.minJugadores}</b></div>
            ${n>=fecha.minJugadores
              ? `<div style="font-size:12px;color:var(--green)">🟢 ¡Hay partido!</div>`
              : `<div style="font-size:12px;color:var(--orange)">⚠️ Faltan ${fecha.minJugadores-n}</div>`}
          </div>`}
      ${isCreator && !fecha.cancelada ? `
        <button onclick="cancelarFecha()" style="margin-top:12px;padding:8px 16px;border-radius:8px;background:rgba(184,48,48,.12);border:1px solid rgba(184,48,48,.25);color:var(--red);font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">
          ❌ CANCELAR FECHA
        </button>` : ''}
      ${isCreator ? `
        <button onclick="borrarFecha()" style="margin-top:8px;margin-left:8px;padding:8px 16px;border-radius:8px;background:transparent;border:1px solid var(--br2);color:var(--tx3);font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">
          🗑 PROPONER NUEVA
        </button>` : ''}
    </div>
    ` : isCreator ? `
    <!-- FORM NUEVA FECHA -->
    <div style="background:var(--sf2);border:1px solid var(--br);border-radius:16px;padding:16px;margin-bottom:16px">
      <div style="font-size:11px;color:var(--cyan);font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px">📅 Proponer Fecha</div>
      <div class="form-group">
        <label class="form-label">Día</label>
        <input type="date" class="form-input" id="fecha-dia" min="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Hora</label>
          <input type="time" class="form-input" id="fecha-hora">
        </div>
        <div class="form-group">
          <label class="form-label">Mínimo jugadores</label>
          <input type="number" class="form-input" id="fecha-min" placeholder="8" min="4" max="30" value="8">
        </div>
      </div>
      <button class="btn-primary" onclick="proponerFecha()">📅 PROPONER FECHA</button>
    </div>
    ` : `
    <div style="background:var(--sf2);border:1px solid var(--br);border-radius:14px;padding:14px;margin-bottom:16px;text-align:center">
      <div style="font-size:13px;color:var(--tx3)">⏳ El organizador todavía no propuso fecha</div>
    </div>
    `}

    <!-- CONFIRMADOS -->
    ${!fecha?.cancelada && n>=4 ? `
    <div style="background:var(--sf2);border:1px solid var(--br);border-radius:14px;padding:14px;margin-bottom:16px;text-align:center">
      <div style="font-size:11px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Formato del partido</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:48px;color:var(--cyan);line-height:1">
        ${teamA}<span style="color:var(--tx3);font-size:28px;margin:0 8px">vs</span>${teamB}
      </div>
      <div style="font-size:12px;color:var(--tx3);margin-top:4px">${n} jugadores confirmados</div>
    </div>
    <button class="draw-btn" style="margin-bottom:16px" onclick="showTab('equipos')">⚔️ SORTEAR EQUIPOS ${teamA}v${teamB}</button>` : ''}

    <div class="section-title">Lista de Jugadores</div>
    <div class="attendance-list">
      ${state.groupMembers.map(u=>{
        const isConf = att[u.uid]; const isSelf = u.uid===state.currentUser.uid;
        const {overall} = statsMap[u.uid]||{overall:0};
        const eloRank = getEloRank(u.elo||1000);
        const btnCls = isSelf ? (isConf?'mine-yes':'mine-no') : (isConf?'confirmed':'absent');
        const btnTxt = isSelf ? (isConf?'✓ VOY':'CONFIRMAR') : (isConf?'✓ Va':'No va');
        return`<div class="attendance-item ${isConf?'is-confirmed':''}">
          <div class="attendance-info">
            <div class="attendance-avatar" style="background:${avatarGradient(u.uid)}">${u.nombre[0]}${u.apellido[0]}</div>
            <div>
              <div class="attendance-name">${u.nombre} ${u.apellido}</div>
              <div class="attendance-meta">${POSITIONS[u.posicion]||'Jugador'} · OVR <b style="color:${overallColor(overall)}">${overall||'—'}</b> · ${eloRank.icon}</div>
            </div>
          </div>
          ${isSelf
  ? estaBloquadaAsistencia()
    ? `<div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:var(--tx3);font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase">🔒 ${horaCorte(state.currentGroup.proximaFecha.hora)}hs</div>`
    : `<button class="attendance-toggle ${btnCls}" onclick="toggleMyAttendance()">${btnTxt}</button>`
  : `<span class="attendance-toggle ${btnCls}">${btnTxt}</span>`}
        </div>`;
      }).join('')}
    </div>
  `;
}

window.hacerAdmin = async function(uid){
  const admins = [...(state.currentGroup.admins||[]), uid];
  await updateDoc(doc(db,'groups', state.currentGroup.id), { admins });
  state.currentGroup.admins = admins;
  showToast('🛡️ ¡Usuario ascendido a Admin!');
  window.showTab('jugadores');
};

window.quitarAdmin = async function(uid){
  const admins = (state.currentGroup.admins||[]).filter(id=>id!==uid);
  await updateDoc(doc(db,'groups', state.currentGroup.id), { admins });
  state.currentGroup.admins = admins;
  showToast('👤 Admin removido');
  window.showTab('jugadores');
};

window.eliminarMiembro = async function(uid){
  if(uid===state.currentGroup.createdBy){ showToast('⚠️ No podés eliminar al Supremo'); return; }
  if(!confirm('¿Seguro que querés eliminar a este jugador del grupo?')) return;
  const members = state.currentGroup.members.filter(id=>id!==uid);
  const admins = (state.currentGroup.admins||[]).filter(id=>id!==uid);
  await updateDoc(doc(db,'groups', state.currentGroup.id), { members, admins });
  state.currentGroup.members = members;
  state.currentGroup.admins = admins;
  state.groupMembers = state.groupMembers.filter(u=>u.uid!==uid);
  showToast('✓ Jugador eliminado del grupo');
  window.showTab('jugadores');
};

export async function checkFechaPopup() {
  const fecha = state.currentGroup.proximaFecha;
  if (!fecha || fecha.cancelada) return;

  // Si ya pasó el corte, no mostramos el popup
  if (estaBloquadaAsistencia()) return;

  const att = await getAttendance();
  const yaConfirmo = att[state.currentUser.uid] !== undefined;
  if (yaConfirmo) return;

  // Crear popup
  const overlay = document.createElement('div');
  overlay.id = 'fecha-popup';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.85);
    display:flex;align-items:center;justify-content:center;
    z-index:999;padding:24px;
    animation:fadeIn .25s ease;
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--sf);border:1px solid var(--br2);border-radius:24px;
      padding:28px;width:100%;max-width:360px;
      box-shadow:0 30px 80px rgba(0,0,0,.6);
      animation:slideUp .3s cubic-bezier(.22,1,.5,1);
    ">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px;margin-bottom:8px">📅</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--cyan)">¡Nuevo Partido!</div>
        <div style="font-size:14px;color:var(--tx2);margin-top:4px">${state.currentGroup.name}</div>
      </div>
      <div style="background:var(--sf2);border:1px solid var(--br);border-radius:14px;padding:16px;margin-bottom:20px;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--tx);line-height:1.2">${fecha.dia}</div>
        <div style="font-size:15px;color:var(--tx2);margin-top:6px">🕐 ${fecha.hora}hs</div>
        <div style="font-size:12px;color:var(--tx3);margin-top:4px">Mínimo ${fecha.minJugadores} jugadores</div>
      </div>
      <div style="font-size:13px;color:var(--tx3);text-align:center;margin-bottom:16px">¿Vas a poder ir?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button onclick="responderFechaPopup(true)" style="
          padding:16px;border-radius:14px;
          background:linear-gradient(135deg,var(--green),#2e8060);
          color:#000;font-size:15px;font-weight:800;letter-spacing:1px;
          text-transform:uppercase;border:none;cursor:pointer;
          box-shadow:0 4px 16px rgba(0,230,118,.3);
        ">✓ VOY</button>
        <button onclick="responderFechaPopup(false)" style="
          padding:16px;border-radius:14px;
          background:rgba(184,48,48,.12);
            border:1px solid rgba(184,48,48,.25);
            color:var(--red);font-size:15px;font-weight:800;letter-spacing:1px;
          text-transform:uppercase;cursor:pointer;
        ">✗ NO PUEDO</button>
      </div>
      <button onclick="document.getElementById('fecha-popup').remove()" style="
        width:100%;margin-top:10px;padding:10px;
        background:transparent;border:none;
        color:var(--tx3);font-size:12px;cursor:pointer;
      ">Decidir después</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

window.responderFechaPopup = async function(va){
  await setAttendance(state.currentUser.uid, va);
  document.getElementById('fecha-popup')?.remove();
  showToast(va ? '✓ ¡Confirmaste que vas!' : '👍 Registramos que no podés');
  window.showTab('asistencia');
};

window.proponerFecha = async function(){
  if(!canManage()){ showToast('⚠️ No tenés permisos'); return; }
  const dia = document.getElementById('fecha-dia')?.value;
  const hora = document.getElementById('fecha-hora')?.value;
  const min = parseInt(document.getElementById('fecha-min')?.value)||8;
  if(!dia||!hora){ showToast('⚠️ Completá día y hora'); return; }
  const diaFormateado = new Date(dia+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
  const proximaFecha = { dia: diaFormateado, hora, minJugadores: min, cancelada: false, creadaEn: Date.now() };
  await updateDoc(doc(db,'groups', state.currentGroup.id), { proximaFecha });
  state.currentGroup.proximaFecha = proximaFecha;
  showToast('📅 ¡Fecha propuesta!');
  window.showTab('asistencia');
}

window.cancelarFecha = async function(){
  if(!canManage()){ showToast('⚠️ No tenés permisos'); return; }
  const f = {...state.currentGroup.proximaFecha, cancelada: true};
  await updateDoc(doc(db,'groups', state.currentGroup.id), { proximaFecha: f });
  state.currentGroup.proximaFecha = f;
  showToast('❌ Partido cancelado');
  window.showTab('asistencia');
}

window.borrarFecha = async function(){
  await updateDoc(doc(db,'groups', state.currentGroup.id), { proximaFecha: null });
  state.currentGroup.proximaFecha = null;
  window.showTab('asistencia');
};

export function estaBloquadaAsistencia() {
  const fecha = state.currentGroup?.proximaFecha;
  if (!fecha || fecha.cancelada) return false;

  const [hh, mm] = fecha.hora.split(':').map(Number);
  const now = new Date();

  // Usamos creadaEn para saber el día exacto del partido
  const partido = new Date(fecha.creadaEn);
  partido.setHours(hh, mm, 0, 0);

  // Si la fecha del partido ya pasó por completo, bloqueado
  if (partido < now) return true;

  const diffMinutos = (partido - now) / 1000 / 60;
  return diffMinutos <= 60;
}

window.toggleMyAttendance = async function() {
  if (estaBloquadaAsistencia()) {
    const hora = state.currentGroup.proximaFecha.hora;
    showToast(`⏱ Confirmación cerrada — debías responder antes de las ${horaCorte(hora)}hs`);
    return;
  }
  const att = await getAttendance();
  const cur = att[state.currentUser.uid] || false;
  await setAttendance(state.currentUser.uid, !cur);
  showToast(!cur ? '✓ ¡Confirmaste tu asistencia!' : 'Cancelaste tu asistencia');
  window.showTab('asistencia');
};

// Helper: calcula la hora de corte (1 hora antes)
export function horaCorte(horaPartido) {
  const [hh, mm] = horaPartido.split(':').map(Number);
  const corte = new Date();
  corte.setHours(hh - 1, mm, 0, 0);
  return corte.getHours().toString().padStart(2, '0') + ':' +
         corte.getMinutes().toString().padStart(2, '0');
};
