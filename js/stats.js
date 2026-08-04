// Player skill stats & ratings: computing averages from group ratings, caching, and saving new ratings.
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { SKILLS } from './constants.js';
import { showToast } from './helpers.js';

/* ── STATS & RATINGS ── */
const statsCache = {};

export async function getPlayerStats(uid){
  try {
    const snap = await getDoc(doc(db,'ratings', state.currentGroup.id+'_'+uid));
    if(!snap.exists()) return {stats:{},overall:0};
    const data = snap.data();
    const stats = {};
    SKILLS.forEach(s=>{
      const vals = Object.values(data.ratings||{}).map(r=>r[s]).filter(v=>v!=null);
      stats[s] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
    });
    const filled = Object.values(stats).filter(v=>v>0);
    const overall = filled.length ? Math.round(filled.reduce((a,b)=>a+b,0)/filled.length) : 0;
    return { stats, overall };
  } catch{ return {stats:{},overall:0}; }
}

export async function getCachedStats(uid){
  if(!statsCache[uid]) statsCache[uid] = await getPlayerStats(uid);
  return statsCache[uid];
}
export function invalidateCache(uid){ delete statsCache[uid]; }

export async function saveRating(targetUid, skillRatings){
  if(targetUid===state.currentUser.uid){ showToast('⚠️ No podés calificarte a vos mismo'); return; }
  const ref = doc(db,'ratings', state.currentGroup.id+'_'+targetUid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {ratings:{}};
  existing.ratings[state.currentUser.uid] = skillRatings;
  await setDoc(ref, existing);
  invalidateCache(targetUid);
}
