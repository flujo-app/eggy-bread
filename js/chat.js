// The office chat next to the game. Coworkers keep trying to talk about a
// real problem at work. You can only answer with "mm-hm".

const PEOPLE = {
  greg: { name: 'Greg', role: 'Team Lead', color: '#2f6db5' },
  dana: { name: 'Dana', role: 'Finance', color: '#a3449b' },
  priya: { name: 'Priya', role: 'People Team', color: '#1f8a5b' },
  you: { name: 'You', role: '', color: '#5c5346' },
};

// Arrives over time while you play.
const SCRIPT = [
  ['greg', 'hey, got a minute?'],
  ['greg', 'need to talk about the Pemberton account'],
  ['greg', 'they say we billed them twice. for the whole year.'],
  ['dana', 'adding myself. this is not small. it’s around $180k'],
  ['greg', 'did you send the corrected invoices on Friday?'],
  ['greg', 'you said Friday'],
  ['dana', 'the auditors are here Monday'],
  ['greg', 'are you looking at this right now?'],
  ['priya', 'Hi! Priya from the People Team, Greg looped me in 🙂'],
  ['dana', 'found the file. it’s called final_FINAL_v3_USE_THIS.xls and it’s empty'],
  ['greg', 'I need you to focus for like five minutes'],
  ['priya', 'Let’s find a time today to chat about priorities 🙂'],
  ['greg', 'I can hear you clicking'],
  ['dana', 'Pemberton’s lawyer just emailed. cc’ing everyone'],
  ['greg', 'hello??'],
];

const BONUS = [
  ['greg', 'what is on your screen'],
  ['priya', 'Is that… bread with no crust on it?'],
  ['dana', 'please close that. the auditors are literally in the lobby'],
];

const COMEBACKS = ['that is not an answer', 'ok so is that a yes', '...', 'you said that last time', 'great. so when?'];

export function createChat({ log, typing, replies, title, onMessage }) {
  let queue = [], i = 0, timer = 0, typingFor = null, typingT = 0;
  let fromThem = 0, fromYou = 0, unread = 0, running = false;

  function add(who, text) {
    const p = PEOPLE[who];
    const row = document.createElement('div');
    row.className = 'msg' + (who === 'you' ? ' me' : '');
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    row.innerHTML = `<div class="msg-head"><b style="color:${p.color}"></b><span class="msg-role"></span><time>${time}</time></div><div class="msg-text"></div>`;
    row.querySelector('b').textContent = p.name;
    row.querySelector('.msg-role').textContent = p.role;
    row.querySelector('.msg-text').textContent = text;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    if (who !== 'you') { fromThem++; unread++; onMessage?.(who, text); }
    else fromYou++;
    updateTitle();
  }
  function updateTitle() {
    title.textContent = unread > 0 ? `OfficeChat — #billing (${unread})` : 'OfficeChat — #billing';
  }
  function setTyping(who) {
    typing.textContent = who ? `${PEOPLE[who].name} is typing…` : '';
  }

  replies.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    add('you', b.textContent);
    unread = 0; updateTitle();
    if (Math.random() < 0.55) {
      const line = COMEBACKS[Math.floor(Math.random() * COMEBACKS.length)];
      queue.unshift(['greg', line, 6]);
      if (!typingFor) timer = Math.min(timer, 1.2);
    }
  });

  return {
    start() { running = true; timer = 3.5; },
    stop() { running = false; setTyping(null); typingFor = null; },
    reset() {
      log.innerHTML = ''; queue = []; i = 0; timer = 3.5; typingFor = null; fromThem = 0; fromYou = 0; unread = 0;
      setTyping(null); updateTitle(); running = false;
    },
    bonus() { BONUS.forEach(([w, t], k) => queue.push([w, t, k === 0 ? 3.2 : 2.6])); running = true; timer = Math.min(timer, 0.5); },
    tick(dt) {
      if (!running) return;
      if (typingFor) {
        typingT -= dt;
        if (typingT <= 0) { add(typingFor[0], typingFor[1]); typingFor = null; setTyping(null); }
        return;
      }
      timer -= dt;
      if (timer > 0) return;
      let next = queue.shift();
      if (!next && i < SCRIPT.length) next = [...SCRIPT[i++], null];
      if (!next) { timer = 9999; return; }
      typingFor = next; typingT = 1.1 + Math.random() * 0.8; setTyping(next[0]);
      timer = next[2] ?? (8 + Math.random() * 5);
    },
    stats() { return { ignored: Math.max(0, fromThem - fromYou), received: fromThem }; },
  };
}
