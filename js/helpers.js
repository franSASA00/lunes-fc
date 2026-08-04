// Small shared utilities used by almost every other module:
// DOM shortcuts, toast/modal helpers, screen switching, and formatting/lookup helpers
// for overall ratings, ELO ranks, avatar colors, and role badges.
import { state } from './state.js';
import { ELO_RANKS } from './constants.js';

/* ── HELPERS ── */
export const v = id => document.getElementById(id)?.value?.trim() || '';
export const showErr = (el, msg) => { el.textContent = msg; el.classList.add('show'); };
export const hideErr = el => el.classList.remove('show');

let _tt;
export function showToast(msg, dur=2500){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), dur);
}
export function openModal(id) { document.getElementById(id).classList.add('open'); }
export function closeModal(id) { document.getElementById(id).classList.remove('open'); }
window.closeModal = closeModal;
window.copyCode = copyCode;
export function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }
export function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

export function overallColor(v){
  if(v>=85) return 'var(--gold)';
  if(v>=70) return 'var(--green)';
  if(v>=50) return 'var(--cyan)';
  return 'var(--orange)';
}
export function cardClass(v){
  if(v>=80) return 'elite';
  if(v>=60) return 'good';
  return 'avg';
}
export function statBarClass(v){
  if(v>=80) return 'elite';
  if(v>=65) return 'good';
  if(v>=40) return 'avg';
  return 'low';
}

export function isSupremo(){ return state.currentGroup?.createdBy === state.currentUser.uid; }
export function isAdmin(){ return state.currentGroup?.admins?.includes(state.currentUser.uid); }
export function canManage(){ return isSupremo() || isAdmin(); }
export function getRolBadge(uid){
  if(state.currentGroup?.createdBy===uid) return '<span class="chip chip-gold" style="font-size:9px">👑 Supremo</span>';
  if(state.currentGroup?.admins?.includes(uid)) return '<span class="chip chip-purple" style="font-size:9px">🛡️ Admin</span>';
  return '<span class="chip" style="font-size:9px;background:rgba(255,255,255,.05);color:var(--tx3)">👤 Jugador</span>';
}
   
export function getEloRank(elo){
  return ELO_RANKS.find(r => elo >= r.min) || ELO_RANKS[ELO_RANKS.length-1];
}
export function avatarGradient(uid){
  const sum = uid ? uid.split('').reduce((a,c)=>a+c.charCodeAt(0),0) : 0;
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}
export function formatTimer(secs){
  const m = Math.floor(secs/60).toString().padStart(2,'0');
  const s = (secs%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

// Copies the group's invite code to the clipboard.
// (Previously referenced from onclick="copyCode(...)" in the UI but never implemented — added here.)
export function copyCode(code){
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(code)
      .then(() => showToast('📋 ¡Código copiado!'))
      .catch(() => showToast('⚠️ No se pudo copiar el código'));
  } else {
    showToast('⚠️ Tu navegador no soporta copiar automáticamente');
  }
}
