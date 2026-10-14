// GTA-style in-game phone: messages with reply choices, calls/voicemail, photos, notes.
// The game keeps running while it's open.
const $ = (id) => document.getElementById(id);
const CONTACTS = {
  Luz: { name: 'Luz', color: '#7a3ab0', sub: 'mija' },
  Rosa: { name: 'Doña Rosa', color: '#b0452a', sub: 'Taquería' },
  Rafa: { name: 'Rafa', color: '#2a6a9a', sub: 'carnal' },
  Chuy: { name: 'Chuy', color: '#3a7a3a', sub: 'night crew' },
  Gus: { name: 'Gus (foreman)', color: '#8a6a2a', sub: 'work' },
};

export function createPhone(audio) {
  const el = $('phone'), scr = $('phoneScreen');
  const state = { open: false, app: 'home', thread: null, threads: {}, replies: {}, voicemails: [], photos: [], unread: {}, battery: 0.62, hasPhone: true, onClose: null };
  for (const k of Object.keys(CONTACTS)) state.threads[k] = [];

  const clock = () => { const d = new Date(); return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const unreadTotal = () => Object.values(state.unread).reduce((a, b) => a + b, 0);

  function status() { return `<div class="ph-status"><span>${state.gameClock || clock()}</span><span>LTE ▮▮▮</span><span>${Math.round(state.battery * 100)}%</span></div>`; }
  function render() {
    if (!state.open) return;
    let h = status();
    if (state.app === 'home') {
      const u = unreadTotal();
      h += `<div class="ph-wall"><div class="ph-time">${state.gameClock || clock()}</div><div class="ph-date">Tuesday, October 14</div></div>
      <div class="ph-grid">
        <button data-app="messages" class="ph-app" style="background:#2e9a4a">MSG${u ? `<i>${u}</i>` : ''}</button>
        <button data-app="calls" class="ph-app" style="background:#2a6ad0">CALL${state.voicemails.some((v) => !v.heard) ? '<i>1</i>' : ''}</button>
        <button data-app="photos" class="ph-app" style="background:#c0702a">PICS</button>
        <button data-app="notes" class="ph-app" style="background:#c8a82a">NOTES</button>
      </div>
      <div class="ph-labels"><span>Messages</span><span>Phone</span><span>Photos</span><span>Notes</span></div>`;
    } else if (state.app === 'messages' && !state.thread) {
      h += `<div class="ph-head"><button data-back="home">&lsaquo;</button>Messages</div><div class="ph-list">`;
      const order = Object.keys(state.threads).filter((k) => state.threads[k].length).sort((a, b) => (state.threads[b].at(-1)?.t || 0) - (state.threads[a].at(-1)?.t || 0));
      for (const k of order) { const last = state.threads[k].at(-1); h += `<button class="ph-row" data-thread="${k}"><b style="background:${CONTACTS[k].color}">${CONTACTS[k].name[0]}</b><span><strong>${CONTACTS[k].name}</strong><em>${esc(last.text).slice(0, 38)}</em></span>${state.unread[k] ? '<i class="dot"></i>' : ''}</button>`; }
      if (!order.length) h += `<div class="ph-empty">No messages</div>`;
      h += `</div>`;
    } else if (state.app === 'messages') {
      const k = state.thread; state.unread[k] = 0;
      h += `<div class="ph-head"><button data-back="messages">&lsaquo;</button>${CONTACTS[k].name}</div><div class="ph-thread" id="phThread">`;
      for (const m of state.threads[k]) h += m.typing ? `<div class="ph-bub them typing">• • •</div>` : `<div class="ph-bub ${m.me ? 'me' : 'them'}">${esc(m.text)}</div>`;
      h += `</div><div class="ph-replies">`;
      for (const [i, r] of (state.replies[k] || []).entries()) h += `<button data-reply="${i}">${esc(r.text)}</button>`;
      if (!(state.replies[k] || []).length) h += `<div class="ph-empty small">No reply right now.</div>`;
      h += `</div>`;
    } else if (state.app === 'calls') {
      h += `<div class="ph-head"><button data-back="home">&lsaquo;</button>Phone</div><div class="ph-list">`;
      for (const [i, v] of state.voicemails.entries()) h += `<button class="ph-row" data-vm="${i}"><b style="background:${CONTACTS[v.from].color}">VM</b><span><strong>Voicemail · ${CONTACTS[v.from].name}</strong><em>${v.time}</em></span>${v.heard ? '' : '<i class="dot"></i>'}</button>`;
      for (const k of Object.keys(CONTACTS)) h += `<button class="ph-row" data-call="${k}"><b style="background:${CONTACTS[k].color}">${CONTACTS[k].name[0]}</b><span><strong>${CONTACTS[k].name}</strong><em>${CONTACTS[k].sub}</em></span></button>`;
      h += `</div>`;
    } else if (state.app === 'vm') {
      const v = state.voicemails[state.vm]; v.heard = true;
      h += `<div class="ph-head"><button data-back="calls">&lsaquo;</button>Voicemail</div><div class="ph-note"><b>${CONTACTS[v.from].name} · ${v.time}</b><br><br>"${esc(v.text)}"</div>`;
    } else if (state.app === 'calling') {
      h += `<div class="ph-call"><div class="ph-avatar" style="background:${CONTACTS[state.calling].color}">${CONTACTS[state.calling].name[0]}</div><div>${CONTACTS[state.calling].name}</div><small>${state.callText || 'calling...'}</small><button data-hang="1" class="ph-hang">END</button></div>`;
    } else if (state.app === 'photos') {
      h += `<div class="ph-head"><button data-back="home">&lsaquo;</button>Photos</div><div class="ph-photos">`;
      for (const p of state.photos) h += `<figure><img src="${p.src}"><figcaption>${esc(p.cap)}</figcaption></figure>`;
      if (!state.photos.length) h += `<div class="ph-empty">No photos</div>`;
      h += `</div>`;
    } else if (state.app === 'notes') {
      h += `<div class="ph-head"><button data-back="home">&lsaquo;</button>Notes</div><div class="ph-note"><b>TO DO</b><br><br>${esc(state.objective || 'Nothing right now.')}<br><br><b>REMEMBER</b><br><br>Luz's party, Saturday. Pink bike with streamers.<br>Dale owes 6 weeks.</div>`;
    }
    h += `<div class="ph-bar"></div>`;
    scr.innerHTML = h;
    const th = $('phThread'); if (th) th.scrollTop = th.scrollHeight;
  }
  scr.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    audio.click();
    if (b.dataset.app) { state.app = b.dataset.app; state.thread = null; }
    else if (b.dataset.back) { state.app = b.dataset.back === 'messages' ? 'messages' : b.dataset.back; state.thread = null; }
    else if (b.dataset.thread) { state.thread = b.dataset.thread; }
    else if (b.dataset.reply != null) { const k = state.thread; const r = state.replies[k][+b.dataset.reply]; state.replies[k] = []; send(k, r.text); r.then && r.then(); }
    else if (b.dataset.vm != null) { state.vm = +b.dataset.vm; state.app = 'vm'; }
    else if (b.dataset.call) { call(b.dataset.call); return; }
    else if (b.dataset.hang) { state.app = 'calls'; clearTimeout(state.callTimer); }
    render();
  });
  function call(k) {
    state.app = 'calling'; state.calling = k; state.callText = 'calling...'; render();
    for (let i = 0; i < 2; i++) setTimeout(() => audio.tone({ freq: 440, dur: 1.2, gain: 0.04, type: 'sine' }), i * 2500);
    state.callTimer = setTimeout(() => { state.callText = (state.noAnswer && state.noAnswer[k]) || 'No answer'; render(); }, 5000);
  }
  function send(k, text) { state.threads[k].push({ text, me: true, t: performance.now() }); audio.tone({ freq: 1200, freqTo: 1600, dur: 0.12, gain: 0.04 }); }

  const api = {
    get isOpen() { return state.open; },
    state,
    open(app = 'home', thread = null) {
      return false; // handheld phone removed; texts show as notifications only
      state.open = true; state.app = app; state.thread = thread; el.classList.add('on'); render(); return true;
    },
    close() { state.open = false; el.classList.remove('on'); const cb = state.onClose; state.onClose = null; cb && cb(); },
    toggle() { return state.open ? (api.close(), false) : api.open(); },
    // incoming text: buzz + banner, optional typing delay
    receive(k, text, delay = 0, typing = 1.4) {
      return new Promise((res) => setTimeout(() => {
        const th = state.threads[k]; const tmp = { typing: true }; if (typing) { th.push(tmp); render(); }
        setTimeout(() => {
          const i = th.indexOf(tmp); if (i >= 0) th.splice(i, 1);
          th.push({ text, me: false, t: performance.now() });
          if (!(state.open && state.app === 'messages' && state.thread === k)) { state.unread[k] = (state.unread[k] || 0) + 1; api.banner(k, text); }
          audio.vibrate(); render(); res();
        }, typing ? typing * 1000 : 0);
      }, delay * 1000));
    },
    // seed history without notifications
    history(k, msgs) { for (const [me, text] of msgs) state.threads[k].push({ text, me, t: 0 }); },
    replies(k, list) { state.replies[k] = list; render(); },
    voicemail(from, time, text) { state.voicemails.unshift({ from, time, text, heard: false }); render(); },
    photo(src, cap) { state.photos.unshift({ src, cap }); },
    objective(t) { state.objective = t; render(); },
    banner(k, text) {
      const b = $('phoneBanner'); b.innerHTML = `<b>${CONTACTS[k].name}</b> ${esc(text).slice(0, 70)}`; b.classList.add('on');
      clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 5000);
    },
    reset() {
      for (const k of Object.keys(CONTACTS)) state.threads[k] = [];
      state.replies = {}; state.voicemails = []; state.unread = {}; state.photos = []; state.noAnswer = null; state.hasPhone = true; api.close();
    },
    render,
  };
  return api;
}
