// Group management: create/join/enter/leave a group, list "my groups", load member profiles.
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { v, showToast, showScreen, avatarGradient } from './helpers.js';
import { showMain } from './navigation.js';

/* ── GROUPS ── */
export function genCode(){
  const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r=''; for(let i=0;i<6;i++) r+=c[Math.floor(Math.random()*c.length)];
  return r;
}

export async function showGroupScreen(){
  showScreen('group-screen');
  document.getElementById('group-welcome').textContent = `¡Hola, ${state.currentUser.nombre}! 👋`;
  const av = document.getElementById('group-welcome-avatar');
  if(av){ av.textContent = (state.currentUser.nombre[0]+state.currentUser.apellido[0]).toUpperCase(); av.style.background=avatarGradient(state.currentUser.uid); }
  await renderMyGroups();
}

export async function renderMyGroups(){
  const list = document.getElementById('my-groups-list');
  list.innerHTML = '<div style="color:var(--tx3);font-size:13px;text-align:center;padding:12px">Cargando...</div>';
  try {
    const q = query(collection(db,'groups'), where('members','array-contains',state.currentUser.uid));
    const snap = await getDocs(q);
    const groups = snap.docs.map(d=>d.data());
    if(!groups.length){
      list.innerHTML='<div style="color:var(--tx3);font-size:13px;text-align:center;padding:12px">No estás en ningún grupo todavía</div>';
      return;
    }
    list.innerHTML = groups.map(g=>`
      <div class="group-item" onclick="enterGroup('${g.id}')">
        <div class="group-item-left">
          <div class="group-item-icon">🏟️</div>
          <div>
            <div class="group-item-name">${g.name}</div>
            <div class="group-item-meta">Código: <b style="color:var(--gold)">${g.code}</b> · ${g.members.length} jugador(es)</div>
          </div>
        </div>
        <span class="group-item-arrow">›</span>
      </div>`).join('');
  } catch(e){ list.innerHTML='<div style="color:var(--red);font-size:13px;padding:12px">Error al cargar grupos</div>'; }
}

window.createGroup = async function(){
  const name = v('new-group-name');
  if(!name){ showToast('⚠️ Ingresá un nombre'); return; }
  const id='g_'+Date.now(), code=genCode();
  await setDoc(doc(db,'groups',id),{
  id, name, code, members:[state.currentUser.uid],
  createdBy: state.currentUser.uid,
  admins: [],
  createdAt:Date.now(), history:[], season:1
});
  document.getElementById('new-group-name').value='';
  showToast('✓ ¡Grupo creado!');
  await enterGroup(id);
};

window.joinGroup = async function(){
  const code = v('join-code').toUpperCase();
  if(code.length!==6){ showToast('⚠️ El código debe tener 6 caracteres'); return; }
  const q = query(collection(db,'groups'), where('code','==',code));
  const snap = await getDocs(q);
  if(snap.empty){ showToast('❌ Código incorrecto'); return; }
  const gDoc = snap.docs[0]; const g = gDoc.data();
  if(!g.members.includes(state.currentUser.uid))
    await updateDoc(doc(db,'groups',g.id),{ members:arrayUnion(state.currentUser.uid) });
  document.getElementById('join-code').value='';
  showToast('🎉 ¡Te uniste al grupo!');
  await enterGroup(g.id);
};

window.enterGroup = async function(id){
  const snap = await getDoc(doc(db,'groups',id));
  if(!snap.exists()) return;
  state.currentGroup = snap.data();
  await loadGroupMembers();
  showMain();
};

window.leaveGroupUI = function(){
  if(state.groupUnsubscribe){ state.groupUnsubscribe(); state.groupUnsubscribe=null; }
  state.currentGroup=null; state.groupMembers=[];
  showGroupScreen();
};

export async function loadGroupMembers(){
  if(!state.currentGroup) return;
  const promises = state.currentGroup.members.map(uid=>getDoc(doc(db,'users',uid)));
  const snaps = await Promise.all(promises);
  state.groupMembers = snaps.filter(s=>s.exists()).map(s=>s.data());
}
