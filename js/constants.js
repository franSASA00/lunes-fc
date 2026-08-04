// App-wide constants: skills list, position labels, ELO rank tiers, avatar colors.
/* ── CONSTANTS ── */
export const SKILLS = ['Ataque','Velocidad','Defensa','Precisión','Potencia','Resistencia'];
export const POSITIONS = { DEL:'Delantero', MED:'Mediocampo', DEF:'Defensor', ARQ:'Arquero' };
export const ELO_RANKS = [
  { min:2000, name:'Leyenda', cls:'legend', icon:'👑' },
  { min:1700, name:'Diamante', cls:'diamond', icon:'💎' },
  { min:1400, name:'Oro', cls:'gold', icon:'🥇' },
  { min:1100, name:'Plata', cls:'silver', icon:'🥈' },
  { min:0,    name:'Bronce', cls:'bronze', icon:'🏅' },
];
export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#00d4ff,#0077ff)',
  'linear-gradient(135deg,#ff6b00,#cc0000)',
  'linear-gradient(135deg,#00e676,#00897b)',
  'linear-gradient(135deg,#ffd600,#ff6d00)',
  'linear-gradient(135deg,#7c3aed,#db2777)',
  'linear-gradient(135deg,#06b6d4,#6366f1)',
];
