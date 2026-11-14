import { h, fill } from './ui.js';
import { audio, sfx } from './audio.js';

const CARDS = [
  ['Only a select few will ever get to experience the joy of competing at the Games.', 'For them, it is pretty incredible.'],
  ['The rest of us are on the sidelines, like kids who did not get picked for the team.', 'And nobody likes watching everyone else have all the fun.'],
  ['So what if you could step right through our logo into a world of joy, and someone asked you…', ''],
];

export function runIntro(app, worldReady, done) {
  let i = -1, loaded = false;
  const root = h('div', { class: 'screen bgpattern' }); app.overlay.append(root);
  const status = h('div', { class: 'loading' }, 'Building the Playhouse… 0%');
  addEventListener('world-progress', (e) => { if (!loaded) status.textContent = `Building the Playhouse… ${Math.round(e.detail * 100)}%`; });
  worldReady.then(() => { loaded = true; status.textContent = 'The Playhouse is ready'; }, (err) => { status.textContent = 'The Playhouse failed to load: ' + err.message; });
  function show() {
    fill(root, );
    if (i < 0) {
      root.append(h('img', { class: 'logo', src: import.meta.env.BASE_URL + 'assets/ui/wannaplay.png', alt: 'Wanna Play?' }),
        h('div', { class: 'card' }, h('p', {}, 'Welcome to the Mattel Wanna Playhouse on Venice Beach. Step through the portal, build your player and try every game.')),
        h('button', { class: 'btn', onclick: next }, 'Start'), status);
    } else if (i < CARDS.length) {
      root.append(h('div', { class: 'card' }, h('h2', {}, CARDS[i][0]), CARDS[i][1] && h('p', {}, CARDS[i][1])),
        i === CARDS.length - 1 && h('img', { class: 'logo', src: import.meta.env.BASE_URL + 'assets/ui/wannaplay.png', alt: 'Wanna Play?', style: 'width:min(380px,50vw)' }),
        h('button', { class: 'btn', onclick: next }, i === CARDS.length - 1 ? "Let's Play" : 'Next'), status);
    } else { root.remove(); done(); }
  }
  function next() { audio(); sfx.click(); i++; show(); }
  show();
}
