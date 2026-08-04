// "Calificar" (rate teammates) screen: skill sliders, radar chart comparison vs. group average,
// and saving a rating.
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { SKILLS } from './constants.js';
import { overallColor, avatarGradient, showToast } from './helpers.js';
import { getCachedStats, saveRating } from './stats.js';
// NOTE: showTab (navigation.js) is called via window.showTab(...) to avoid a circular import,
// since navigation.js needs renderCalificar() from this module.

/* ══════════════════════════════════════════════
   CALIFICAR — Rating Screen
══════════════════════════════════════════════ */
let pendingRateUid = null, rateSliders = {};

export async function renderCalificar(el){
  const members = state.groupMembers.filter(u=>u.uid!==state.currentUser.uid);
  if(!members.length){
    el.innerHTML = `<div class="page-header"><div class="page-title">Calificar</div></div>
      <div class="empty-state">
        <div class="empty-icon-wrap">👥</div>
        <div class="empty-title">Estás solo</div>
        <div class="empty-msg">No hay compañeros para calificar todavía. Invitá a alguien con el código del grupo.</div>
        <button class="empty-cta" onclick="showTab('jugadores')">VER CÓDIGO DEL GRUPO →</button>
      </div>`;
    return;
  }
  const selectedUid = pendingRateUid&&members.find(u=>u.uid===pendingRateUid)
    ? pendingRateUid : members[0].uid;
  pendingRateUid = null;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Calificar</div>
        <div class="page-subtitle">Evaluá a tus compañeros</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Seleccioná jugador</label>
      <select class="form-input" id="rate-player-select" onchange="selectRatePlayer(this.value)">
        ${members.map(u=>`<option value="${u.uid}" ${u.uid===selectedUid?'selected':''}>${u.nombre} ${u.apellido}</option>`).join('')}
      </select>
    </div>
    <div id="rate-form-container"></div>
  `;
  await buildRateForm(selectedUid);
}

window.selectRatePlayer = async function(uid){ await buildRateForm(uid); };

/* ── Radar drawing helper ── */
export function drawRateRadar(canvasId, myVals, avgVals){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  const R = Math.min(W,H)/2 - 20;
  const N = SKILLS.length;
  const angle = i => (i * 2*Math.PI/N) - Math.PI/2;

  ctx.clearRect(0,0,W,H);

  // Grid rings
  for(let r=0.25;r<=1;r+=0.25){
    ctx.beginPath();
    for(let i=0;i<N;i++){
      const a=angle(i), x=cx+Math.cos(a)*R*r, y=cy+Math.sin(a)*R*r;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.strokeStyle=`rgba(255,255,255,${r===1?.12:.06})`;
    ctx.lineWidth=1;
    ctx.stroke();
  }

  // Axis lines + labels
  SKILLS.forEach((skill,i)=>{
    const a=angle(i);
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(a)*R, cy+Math.sin(a)*R);
    ctx.strokeStyle='rgba(255,255,255,.08)';
    ctx.lineWidth=1;
    ctx.stroke();

    const lx=cx+Math.cos(a)*(R+14), ly=cy+Math.sin(a)*(R+14);
    ctx.fillStyle='rgba(160,180,204,.7)';
    ctx.font='bold 9px Rajdhani,sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(skill.toUpperCase().slice(0,3), lx, ly);
  });

  // Draw polygon helper
  function drawPoly(vals, fill, stroke){
    ctx.beginPath();
    vals.forEach((v,i)=>{
      const a=angle(i), r=(v/100)*R;
      const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle=fill;
    ctx.fill();
    ctx.strokeStyle=stroke;
    ctx.lineWidth=2;
    ctx.stroke();
  }

  // Avg polygon (gray, behind)
  if(avgVals){
    const avg = SKILLS.map(s=>avgVals[s]||0);
    drawPoly(avg,'rgba(90,112,144,.2)','rgba(90,112,144,.5)');
  }

  // My rating polygon (cyan, front)
  const my = SKILLS.map(s=>myVals[s]||0);
  drawPoly(my,'rgba(0,212,255,.15)','rgba(0,212,255,.85)');

  // Dots on vertices
  my.forEach((v,i)=>{
    const a=angle(i), r=(v/100)*R;
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*r, cy+Math.sin(a)*r, 3.5, 0, Math.PI*2);
    ctx.fillStyle='var(--cyan, #00d4ff)'; // fallback for canvas
    ctx.fillStyle='#00d4ff';
    ctx.fill();
  });
}

/* ── Thumb color helper ── */
export function sliderThumbColor(v){
  if(v>=85) return {color:'var(--gold)',glow:'rgba(255,214,0,.5)'};
  if(v>=70) return {color:'var(--green)',glow:'rgba(0,230,118,.4)'};
  if(v>=50) return {color:'var(--cyan)',glow:'rgba(0,212,255,.4)'};
  return {color:'var(--orange)',glow:'rgba(255,107,0,.4)'};
}

let rateCurrentStats = {}; // avg stats of the rated player

export async function buildRateForm(uid){
  const u = state.groupMembers.find(m=>m.uid===uid); if(!u) return;
  const {stats, overall} = await getCachedStats(uid);
  const rSnap = await getDoc(doc(db,'ratings', state.currentGroup.id+'_'+uid));
  const myPrev = rSnap.exists() ? ((rSnap.data().ratings||{})[state.currentUser.uid]||{}) : {};
  rateSliders = {};
  rateCurrentStats = stats;
  SKILLS.forEach(s=>{ rateSliders[s] = myPrev[s]??stats[s]??50; });

  const myOverall = Math.round(SKILLS.reduce((a,s)=>a+(rateSliders[s]||0),0)/SKILLS.length);
  const col = overallColor(overall);

  const container = document.getElementById('rate-form-container'); if(!container) return;
  container.innerHTML = `
    <div class="rate-player-header">
      <div class="rate-avatar" style="background:${avatarGradient(uid)}">${u.nombre[0]}${u.apellido[0]}</div>
      <div>
        <div class="rate-name">${u.nombre} ${u.apellido}</div>
        <div class="rate-sub">${u.edad} años · ${POSITIONS[u.posicion]||'Jugador'} · Pie ${u.pie}</div>
      </div>
      <div class="rate-overall-badge" style="color:${col}">${overall||'—'}</div>
    </div>

    <div class="rate-radar-wrap">
      <div class="rate-radar-legend">
        <div class="rate-radar-leg-item"><div class="rate-radar-leg-dot" style="background:#00d4ff"></div>Tu calificación</div>
        <div class="rate-radar-leg-item"><div class="rate-radar-leg-dot" style="background:rgba(90,112,144,.7)"></div>Promedio grupo</div>
      </div>
      <canvas id="rate-radar-canvas" width="220" height="220" style="display:block;margin:0 auto"></canvas>
    </div>

    <div class="rate-compare">
      <div class="rate-compare-col">
        <div class="rate-compare-val" id="rate-my-ovr" style="color:${overallColor(myOverall)}">${myOverall}</div>
        <div class="rate-compare-lbl">Tu calificación</div>
      </div>
      <div class="rate-compare-sep">vs</div>
      <div class="rate-compare-col">
        <div class="rate-compare-val" style="color:${col}">${overall||'—'}</div>
        <div class="rate-compare-lbl">Promedio grupo</div>
      </div>
    </div>

    <div class="sliders-section">
      <div class="sliders-section-title">Atributos</div>
      ${SKILLS.map(skill=>{
        const vv = rateSliders[skill];
        const avg = stats[skill]||0;
        const tc = sliderThumbColor(vv);
        const pct = avg+'%';
        return`<div class="slider-group">
          <div class="slider-header">
            <div class="slider-label">${skill}</div>
            <div class="slider-value" id="sv_${skill}" style="color:${overallColor(vv)}">${vv}</div>
          </div>
          <div class="slider-track-wrap">
            <input type="range" class="slider-input" id="si_${skill}" min="0" max="100" value="${vv}"
              style="--thumb-color:${tc.color};--thumb-glow:${tc.glow}"
              oninput="updateSlider('${uid}','${skill}',this.value)">
            <div class="slider-avg-tick" style="left:calc(${pct} - 1px)" title="Promedio: ${avg}"></div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <button class="btn-primary" onclick="submitRating('${uid}')">✓ GUARDAR CALIFICACIÓN</button>
  `;

  // Draw initial radar
  drawRateRadar('rate-radar-canvas', rateSliders, stats);
  updateSliderTracks();
}

export function updateSliderTracks(){
  SKILLS.forEach(s=>{
    const input = document.getElementById('si_'+s);
    if(!input) return;
    const v = rateSliders[s];
    const tc = sliderThumbColor(v);
    // Filled track: gradient from accent to dark
    input.style.background = `linear-gradient(to right, ${tc.color.replace('var(--cyan)','#00d4ff').replace('var(--green)','#00e676').replace('var(--gold)','#ffd600').replace('var(--orange)','#ff6b00')} 0%, ${tc.color.replace('var(--cyan)','#00d4ff').replace('var(--green)','#00e676').replace('var(--gold)','#ffd600').replace('var(--orange)','#ff6b00')} ${v}%, rgba(28,43,66,.8) ${v}%, rgba(28,43,66,.8) 100%)`;
    input.style.setProperty('--thumb-color', tc.color);
    input.style.setProperty('--thumb-glow', tc.glow);
  });
}

window.updateSlider = function(uid, skill, val){
  val = parseInt(val); rateSliders[skill] = val;
  const valEl = document.getElementById('sv_'+skill);
  if(valEl){ valEl.textContent=val; valEl.style.color=overallColor(val); }
  // Update radar live
  drawRateRadar('rate-radar-canvas', rateSliders, rateCurrentStats);
  // Update compare overall
  const myOvr = Math.round(SKILLS.reduce((a,s)=>a+(rateSliders[s]||0),0)/SKILLS.length);
  const ovrEl = document.getElementById('rate-my-ovr');
  if(ovrEl){ ovrEl.textContent=myOvr; ovrEl.style.color=overallColor(myOvr); }
  // Update track fill + thumb color
  updateSliderTracks();
};

window.submitRating = async function(uid){
  await saveRating(uid,{...rateSliders});
  // Award XP to rater
  await updateDoc(doc(db,'users',state.currentUser.uid),{ xp:(state.currentUser.xp||0)+50 });
  state.currentUser.xp=(state.currentUser.xp||0)+50;
  showToast('✓ ¡Calificación guardada! +50 XP');
  window.showTab('jugadores');
};

// Lets other modules (e.g. the player detail modal, via an inline onclick handler) pick which
// player should be pre-selected the next time the "Calificar" tab is rendered.
// (Previously the onclick handler tried to set the module-scoped `pendingRateUid` directly, which
// doesn't work from inline HTML attributes — that's a separate global scope. This setter fixes it.)
window.setPendingRateUid = function(uid){ pendingRateUid = uid; };
