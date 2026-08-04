// Screen/tab navigation: switching the main-screen tab and dispatching to the right render function.
import { state } from './state.js';
import { showScreen } from './helpers.js';
import { checkFechaPopup } from './attendance.js';
import { renderJugadores } from './players.js';
import { renderAsistencia } from './attendance.js';
import { renderEquipos } from './teams.js';
import { renderLive } from './live.js';
import { renderCalificar } from './ratings.js';
import { renderHistorial } from './history.js';

/* ── NAVIGATION ── */
export function showMain(){
  showScreen('main-screen');
  showTab(state.currentTab||'jugadores');
  checkFechaPopup();
}

export function showTab(tab){
  state.currentTab = tab;
  document.querySelectorAll('.tab-item').forEach(el=>{
    el.classList.remove('active','live-active');
  });
  const tabEl = document.getElementById('tab-'+tab);
  if(tabEl){
    // Live tab gets a special red state when a match is running
    if(tab==='live' && state.liveMatch.active){
      tabEl.classList.add('live-active');
    } else {
      tabEl.classList.add('active');
    }
    // Re-trigger bounce by cloning the icon
    const icon = tabEl.querySelector('.tab-icon');
    if(icon){
      const clone = icon.cloneNode(true);
      icon.replaceWith(clone);
    }
  }
  // Also keep the Live tab visually pulsing when a match is active, regardless of selected tab
  if(tab !== 'live' && state.liveMatch.active){
    const liveEl = document.getElementById('tab-live');
    if(liveEl) liveEl.classList.add('live-active');
  }
  const content = document.getElementById('main-content');
  content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px 0">
    <div style="width:32px;height:32px;border:2px solid var(--br);border-top-color:var(--cyan);border-radius:50%;animation:spin .8s linear infinite"></div>
  </div>`;
  const renders = {
    jugadores:renderJugadores,
    asistencia:renderAsistencia,
    equipos:renderEquipos,
    live:renderLive,
    calificar:renderCalificar,
    historial:renderHistorial,
  };
  (renders[tab]||(() => {}))(content);
}
window.showTab = showTab;
