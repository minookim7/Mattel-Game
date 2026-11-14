const KEY = 'wannaplay-v1';
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
export const state = Object.assign({
  avatar: { skin: 1, hair: 'bob', hairColor: '#3b2416', top: '#FA001E', topType: 'tee', bottom: '#3146E4', bottomType: 'shorts', shoes: '#ffffff', acc: 'none' },
  tee: null, wearTee: false, rings: {}, best: {}, created: false, medal: false,
}, load());
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }
export const RINGS = [
  { id: 'simone', label: 'Simone Says', color: '#0081C8' },
  { id: 'race', label: 'Ultimate Race', color: '#FCB131' },
  { id: 'uno', label: 'Club UNO', color: '#222222' },
  { id: 'court', label: 'Dream Court', color: '#00A651' },
  { id: 'quiz', label: 'Creator Studio', color: '#EE334E' },
];
