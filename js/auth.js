// Authentication screens: register / login / logout / password reset.
// Functions are attached to `window` because the HTML uses inline onclick="..." handlers.
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from './firebase.js';
import { state } from './state.js';
import { v, showErr, hideErr, showToast, showScreen } from './helpers.js';
import { stopLiveTimer } from './live.js';

/* ── AUTH ── */
window.switchAuthTab = function(tab){
  document.querySelectorAll('.auth-tab').forEach((el,i) =>
    el.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='register')));
  document.getElementById('login-form').classList.toggle('active', tab==='login');
  document.getElementById('register-form').classList.toggle('active', tab==='register');
};

window.doRegister = async function(){
  const nombre=v('reg-nombre'), apellido=v('reg-apellido'), email=v('reg-email').toLowerCase();
  const pass=v('reg-pass'), edad=parseInt(v('reg-edad'))||0;
  const pie=v('reg-pie'), posicion=v('reg-posicion');
  const err = document.getElementById('reg-error');
  hideErr(err);
  if(!nombre||!apellido||!email||!pass||!edad) return showErr(err,'Completá todos los campos');
  if(pass.length<6) return showErr(err,'Contraseña mínimo 6 caracteres');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db,'users',cred.user.uid),{
      uid:cred.user.uid, nombre, apellido, email, edad, pie, posicion,
      elo:1000, xp:0, level:1, mvpCount:0,
      createdAt:Date.now()
    });
    showToast('🎉 Bienvenido a La Pechera!');
  } catch(e){
    const msgs = { 'auth/email-already-in-use':'Email ya registrado', 'auth/invalid-email':'Email inválido' };
    showErr(err, msgs[e.code]||e.message);
  }
};
window.doResetPassword = async function(){
  const email = v('login-email').toLowerCase();
  const err = document.getElementById('login-error');
  hideErr(err);
  if(!email){ showErr(err,'Ingresá tu email primero'); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast('📧 ¡Email de recupero enviado! Revisá tu casilla');
  } catch(e){
    showErr(err,'No encontramos ese email. ¿Está bien escrito?');
  }
};
window.doLogin = async function(){
  const email=v('login-email').toLowerCase(), pass=v('login-pass');
  const err = document.getElementById('login-error');
  hideErr(err);
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch(e){ showErr(err,'Email o contraseña incorrectos'); }
};

window.doLogout = async function(){
  if(state.groupUnsubscribe){ state.groupUnsubscribe(); state.groupUnsubscribe=null; }
  stopLiveTimer();
  await signOut(auth);
  state.currentUser=null; state.currentGroup=null; state.groupMembers=[];
  showScreen('auth-screen');
};
