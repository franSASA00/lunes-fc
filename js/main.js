// Entry point: wires up the loading animation, auth-state listener, and imports every
// feature module so their `window.X = ...` handlers (used by inline onclick="" in the HTML)
// get registered before the user can click anything.
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { auth, db } from './firebase.js';
import { state } from './state.js';
import { hideLoading, showScreen } from './helpers.js';
import { showGroupScreen } from './groups.js';

// Side-effect imports: these register window.doLogin, window.createGroup, window.drawTeams, etc.
// (auth.js pulls in live.js, and groups.js pulls in navigation.js, which in turn pulls in every
// screen module — players/attendance/teams/live/ratings/history — so importing these two is enough
// to load the whole app, but they're listed explicitly here for clarity.)
import './auth.js';
import './groups.js';
import './navigation.js';
import './players.js';
import './attendance.js';
import './teams.js';
import './live.js';
import './ratings.js';
import './history.js';

/* ── LOADING PARTICLES ── */
(function(){
  const container = document.getElementById('load-particles');
  if(!container) return;
  for(let i=0;i<25;i++){
    const p = document.createElement('div');
    p.className = 'load-particle';
    const x = Math.random()*100;
    const dx = (Math.random()-0.5)*120;
    const dur = 3 + Math.random()*4;
    const delay = Math.random()*3;
    p.style.cssText = `left:${x}%;--dx:${dx}px;animation-duration:${dur}s;animation-delay:${delay}s`;
    container.appendChild(p);
  }
})();

/* ── AUTH STATE ── */
onAuthStateChanged(auth, async (fbUser) => {
  hideLoading();
  if(!fbUser){ showScreen('auth-screen'); return; }
  const snap = await getDoc(doc(db,'users',fbUser.uid));
  if(!snap.exists()){ showScreen('auth-screen'); return; }
  state.currentUser = { ...snap.data() };
  showGroupScreen();
});
