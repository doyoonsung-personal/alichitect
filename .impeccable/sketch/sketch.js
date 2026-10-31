// Renders the direction sketch: ?state=landing|working|hover|link|streaming|panel, and &lang=en|ko|zh for the landing.
// Static demonstration of spec states L1, W2 and W6, the hover popover, the record-to-canvas link and the open products panel.
(function () {
  const D = window.SKETCH;
  const P = D.products;
  const q = new URLSearchParams(location.search);
  const state = q.get('state') || 'working';
  const lang = state === 'landing' ? q.get('lang') || 'en' : 'en';
  document.documentElement.lang = lang;
  const EN = window.STRINGS.en;
  const S = window.STRINGS[lang] || EN;
  const t = (k, v = {}) => String(S[k] ?? EN[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => (v[n] ?? ''));
  const app = document.getElementById('app');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // UI icons: one authored stroke set, 1.5 px on a 16 grid (spec 7).
  const UI = {
    up: '<path d="M4 10l4-4 4 4"/>', down: '<path d="M4 6l4 4 4-4"/>', send: '<path d="M8 13V3.5M4 7.5l4-4 4 4"/>',
    check: '<path d="M3.5 8.5l3 3 6-7"/>', plus: '<path d="M8 3.5v9M3.5 8h9"/>', minus: '<path d="M3.5 8h9"/>',
    planned: '<circle cx="8" cy="8" r="4.25" stroke-dasharray="2 2"/>', fit: '<path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3"/>',
    focus: '<path d="M2.5 3.5h11v9h-11zM6.5 3.5v9"/>', ext: '<path d="M9.5 3H13v3.5M13 3L7.5 8.5M11 9.5V13H3V5h3.5"/>',
    stop: '<path d="M4.5 4.5h7v7h-7z"/>', clock: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.25l2 1.25"/>', arrow: '<path d="M3 8h9.5M9 4.5L12.5 8 9 11.5"/>',
  };
  const ui = (k, cls = '') => `<svg class="i ${cls}" viewBox="0 0 16 16" aria-hidden="true">${UI[k]}</svg>`;
  const icon = (product) => `<svg class="prod-ic" viewBox="0 0 1024 1024" aria-hidden="true" data-norm>${window.ICONS[product] || ''}</svg>`;
  const logoSvg = () => {
    const L = lang === 'zh' ? window.LOGO_ZH : window.LOGO_EN;
    return `<svg class="logo" viewBox="${L.viewBox}" role="img" aria-label="Alibaba Cloud">${L.inner}</svg>`;
  };
  const lockup = (cursor) => `<a class="lockup" href="#" aria-label="Alibaba Cloud ${esc(EN['app.name'])}, home">${logoSvg()}<span class="rule" aria-hidden="true"></span><span class="name">${esc(t('app.name'))}${cursor ? '<span class="cursor" aria-hidden="true"></span>' : ''}</span></a>`;

  if (state === 'landing') renderLanding(); else renderWork();
  normalizeIcons();

  // ---------- Landing (spec 5) ----------
  function renderLanding() {
    const ex = window.EXAMPLES;
    app.innerHTML = `
      <main class="landing">
        <div class="util">
          <div class="seg" role="group" aria-label="${esc(t('header.language'))}">
            <button aria-pressed="${lang === 'en'}" lang="en">EN</button><button aria-pressed="${lang === 'ko'}" lang="ko">한국어</button><button aria-pressed="${lang === 'zh'}" lang="zh">中文</button>
          </div>
          <button class="btn ghost">${ui('clock')}${esc(t('header.sessions'))}</button>
        </div>
        <div class="stack" id="stack">
          <h1>${lockup(true)}</h1>
          <p class="lead" id="lead">${esc(t('landing.lead'))}</p>
          <form class="brief focus" onsubmit="return false">
            <div class="field ph" role="textbox" aria-multiline="true" aria-labelledby="lead"><span class="caret" aria-hidden="true"></span>${esc(t('landing.placeholder'))}</div>
            <div class="row"><span class="hint">${esc(t('landing.hint'))}</span><button class="btn primary">${esc(t('landing.submit'))}${ui('send')}</button></div>
          </form>
          <section class="examples" aria-labelledby="exh">
            <h2 id="exh">${esc(t('landing.examplesHeading'))}</h2>
            <ul>${ex.map((e, i) => `<li><button class="${i === 0 ? 'hover' : ''}" aria-label="${esc(t('landing.useExample'))}: ${esc(e[lang])}"><span class="tag">${esc(t(e.tag))}</span><span class="txt" lang="${lang}">${esc(e[lang])}</span><span class="go">${ui('arrow')}</span></button></li>`).join('')}</ul>
          </section>
        </div>
        <p class="foot">${esc(t('landing.footer', { date: D.catalogDate }))}</p>
      </main>`;
    const stack = document.getElementById('stack');
    stack.style.top = Math.max(64, Math.round((innerHeight - stack.offsetHeight) / 2 - 24)) + 'px';
  }

  // ---------- Working view (spec 6) ----------
  function renderWork() {
    const live = state === 'streaming';
    const latest = live ? 3 : 4; // the revision on screen: streaming shows revision 3 mid-turn
    const committed = live ? 2 : 4; // the latest committed revision, whose cards carry ink tags
    const drawnLive = new Set(['chatbot', 'vector-db']); // revision 3 so far: two of three planned products drawn
    const shown = (n) => (n.rev < latest || (n.rev === latest && (!live || drawnLive.has(n.id))));
    const edgeShown = (e) => {
      if (e.rev > latest || (e.gone && e.gone <= latest)) return false;
      if (live && e.rev === latest) return !e.waits; // edges to products not drawn yet wait for their card
      return true;
    };
    const nodes = D.nodes.filter(shown);
    const edges = D.edges.filter(edgeShown);
    const hoverId = state === 'hover' ? 'ga' : null;
    const linkId = state === 'link' ? 'ga' : null; // a pointer on the change line "+ Global Accelerator" (spec 7.24)
    const hlRow = state === 'panel' ? 'ga' : null;

    app.innerHTML = `
      <div class="work">
        <header class="hdr">
          ${lockup(false)}
          <span class="title" title="${esc(D.revisions[0].ask)}">${esc(D.revisions[0].ask)}</span>
          <div class="right">
            <span class="mode" title="qwen3.8-max, Singapore endpoint">${esc(t('header.live'))}</span>
            <button class="btn ghost">${ui('focus')}${esc(t('header.focusDiagram'))}</button>
            <button class="btn ghost">${ui('clock')}${esc(t('header.sessions'))}</button>
            <button class="btn">${ui('plus')}${esc(t('header.newSession'))}</button>
            <button class="btn ghost" aria-label="${esc(t('header.languageMenu'))}">EN${ui('down', 's12')}</button>
          </div>
        </header>
        <aside class="console" aria-label="Revision record">
          ${requirements()}
          <div class="record" id="record" role="log" aria-label="Revisions">
            ${D.revisions.slice(0, latest - 1).map(row).join('')}
            ${revision(D.revisions[latest - 1], live, linkId)}
          </div>
          ${composer(live)}
        </aside>
        <main class="stage" aria-label="${esc(t('canvas.label'))}">
          <div class="canvas" id="canvas">
            <div class="world" id="world"></div>
            <div class="tools" role="toolbar" aria-label="Zoom"><button aria-label="${esc(t('canvas.zoomOut'))}">${ui('minus')}</button><span class="sep"></span><span class="z" id="zoomv">100%</span><span class="sep"></span><button aria-label="${esc(t('canvas.zoomIn'))}">${ui('plus')}</button><span class="sep"></span><button aria-label="${esc(t('canvas.fit'))}">${ui('fit')}</button></div>
            <div class="legend" aria-hidden="true">
              <span><svg viewBox="0 0 24 8"><path d="M1 4h22" stroke="var(--edge-path)" stroke-width="2"/></svg>Request path</span>
              <span><svg viewBox="0 0 24 8"><path d="M1 4h22" stroke="var(--edge)" stroke-width="1.5"/></svg>Data</span>
              <span><svg viewBox="0 0 24 8"><path d="M1 4h22" stroke="var(--edge)" stroke-width="1.5" stroke-dasharray="5 4"/></svg>Async</span>
              <span><svg viewBox="0 0 24 8"><path d="M2 4h20" stroke="var(--edge)" stroke-width="1.5" stroke-dasharray="0.1 4.5" stroke-linecap="round"/></svg>Resolves</span>
            </div>
          </div>
          ${state === 'panel' ? panel(nodes, hlRow, committed) : ''}
          <div class="pbar">
            ${state === 'panel' ? '' : `<button class="handle" aria-expanded="false" aria-controls="products" aria-label="${esc(t('panel.expand'))}">${ui('up')}</button>`}
            <div class="lhs"><span class="ttl">${esc(t('panel.title'))}</span><span class="cnt num">${nodes.length}</span>${state === 'panel' ? '' : '<span class="why">· why each one is here</span>'}</div>
            <div class="rhs">${esc(t('panel.aiNotice'))} · ${esc(t('panel.catalog', { date: D.catalogDate }))}</div>
          </div>
        </main>
      </div>`;

    drawCanvas(nodes, edges, committed, live, hoverId, latest, linkId);
    const rec = document.getElementById('record');
    rec.scrollTop = rec.scrollHeight;
  }

  function requirements() {
    return `<section class="reqs" aria-labelledby="reqh">
      <h2 id="reqh">${esc(t('req.heading'))} <span class="n num">1</span></h2>
      <div class="req">
        <span class="st">${ui('check')}</span>
        <span class="txt">${esc(D.requirement.text)}</span>
        <span class="state">${esc(t('req.held'))}</span>
        <span class="meta">${esc(t('req.staysIn', { regions: D.requirement.region }))}</span>
      </div>
    </section>`;
  }

  // RevisionRow, collapsed (spec 7.9)
  function row(r) {
    return `<button class="rrow" aria-expanded="false"><span class="rtag" aria-hidden="true">${r.n}</span><span><span class="ask1">${esc(r.ask)}</span><span class="m">+${r.added} −${r.removed} · ${r.seconds} s</span></span></button>`;
  }

  // Revision, expanded (spec 7.8). While streaming it shows revision 3 mid-turn: the note arriving, two of three planned products drawn.
  function revision(r, live, linkId) {
    let lines = r.changes.map((c) => changeLine(c, linkId));
    let note = esc(r.says.join(' '));
    let foot = `<span>${esc(t('rec.done', { s: r.seconds }))}</span><span>·</span><span class="ok">${ui('check', 's12')}${esc(t('rec.reqHeld'))}</span>`;
    if (live) {
      lines = [changeLine(r.changes[0]), changeLine(r.changes[1]), changeLine(['~', 'Model Studio', 'Model Studio (Qwen)', t('rec.planned')])];
      note = esc(r.says.join(' ').slice(0, 77)) + '<span class="cursor" aria-hidden="true"></span>';
      foot = `<span class="live">${esc(t('rec.drawing'))}</span><span>·</span><span>${esc(t('rec.planProgress', { done: 2, total: 3 }))}</span><span>·</span><span>4.1 s</span>`;
    }
    return `<article class="rev" aria-label="${esc(t('rec.revision', { n: r.n }))}">
      <button class="rtag ${live ? 'live' : 'latest'}" aria-label="${esc(t('rec.revision', { n: r.n }))}">${r.n}</button>
      <div>
        <div class="ask">${esc(r.ask)}</div>
        <p class="note">${note}</p>
        <ul class="changes" aria-label="${esc(t('rec.changesLabel'))}">${lines.join('')}</ul>
        <div class="rfoot">${foot}</div>
      </div>
    </article>`;
  }

  // ChangeLine (spec 7.10): mark, short name, card label when it differs, then the detail.
  function changeLine(c, linkId) {
    const [m, p, l = '', d = '', id = ''] = c;
    const cls = m === '+' ? 'add' : m === '-' ? 'rem' : 'plan';
    const mk = m === '+' ? ui('plus') : m === '-' ? ui('minus') : ui('planned');
    const label = l && l !== p ? ` <span class="d">${esc(l)}${d ? ' · ' + esc(d) : ''}</span>` : d ? ` <span class="d">· ${esc(d)}</span>` : '<span></span>';
    return `<li class="${cls}${/connection/.test(p) ? ' conn' : ''}${linkId && id === linkId ? ' hl' : ''}"><span class="mk" aria-label="${m === '+' ? t('rec.added') : m === '-' ? t('rec.removed') : t('rec.planned')}">${mk}</span><span class="p">${esc(p)}</span>${label}</li>`;
  }

  function composer(live) {
    return `<form class="composer" onsubmit="return false">
      <div class="cbox">
        <div class="field" role="textbox" aria-multiline="true" aria-label="${esc(t('composer.label'))}">${esc(t('composer.placeholder'))}</div>
        <div class="row"><span class="hint">${esc(live ? t('composer.busy') : t('composer.hint'))}</span>
          ${live ? `<button class="btn">${ui('stop')}${esc(t('rec.stop'))}</button>` : `<button class="btn primary" aria-label="${esc(t('composer.send'))}">${ui('send')}</button>`}</div>
      </div>
    </form>`;
  }

  // ---------- Canvas (spec 7.15 to 7.24, 11) ----------
  function drawCanvas(nodes, edges, committed, live, hoverId, latest, linkId) {
    const dim = (ids) => (linkId && !ids.includes(linkId) ? ' dim' : '');
    const canvas = document.getElementById('canvas');
    const world = document.getElementById('world');
    const { w: W, h: H } = D.world;
    const CW = D.card.w, CH = D.card.h;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    // Fit (spec 7.15): 24 px padding, zoom between the 12 px title floor and 1.25.
    let z = Math.min((cw - 48) / W, (ch - 48) / H, 1.25);
    z = Math.max(z, 12 / 14);
    const ox = Math.max(24, Math.round((cw - W * z) / 2));
    const oy = Math.max(24, Math.round((ch - H * z) / 2));
    world.style.transform = `translate(${ox}px, ${oy}px) scale(${z})`;
    world.style.width = W + 'px';
    world.style.height = H + 'px';
    document.getElementById('zoomv').textContent = Math.round(z * 100) + '%';
    window.__zoom = z;

    let html = '';
    for (const f of D.frames) {
      const lab = f.kind === 'vpc' ? `<span class="a">${esc(f.pre)}</span><span class="b">${esc(f.label)}</span>` : `<span class="b">${esc(f.label)}</span>${f.sub ? `<span class="a">${esc(f.sub)}</span>` : ''}`;
      html += `<div class="frame ${f.kind}" style="left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px"><span class="fl">${lab}</span></div>`;
    }
    for (const l of D.lanes) if (!(live && l.rev === latest)) html += `<span class="lane" style="left:${l.x}px;top:${l.y}px">${esc(l.label)}</span>`;

    // Edges: orthogonal; request path 2 px ink-2; data 1.5 px grey; edges arriving in a streaming revision draw in ink-2.
    const stroke = (e) => (e.path ? 'var(--edge-path)' : live && e.rev === latest ? 'var(--ink-2)' : 'var(--edge)');
    let svg = `<svg class="wire" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs>
      ${['edge-path', 'edge', 'ink-2'].map((c) => `<marker id="a-${c}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M1.5 1L7 4L1.5 7" fill="none" stroke="var(--${c})" stroke-width="1.5"/></marker>`).join('')}</defs>`;
    for (const e of edges) {
      const d = 'M' + e.pts.map((p) => p.join(' ')).join(' L');
      const col = stroke(e);
      const w = e.path ? 2 : 1.5;
      const dash = e.kind === 'async' ? 'stroke-dasharray="5 4"' : e.kind === 'resolve' ? 'stroke-dasharray="0.1 4.5" stroke-linecap="round"' : '';
      const mk = e.kind === 'resolve' ? '' : `marker-end="url(#a-${col.slice(6, -1)})"`;
      svg += `<path class="${dim(e.id.split('-'))}" d="${d}" fill="none" stroke="${col}" stroke-width="${w}" ${dash} ${mk}/>`;
    }
    html += svg + '</svg>';
    for (const e of edges) if (e.label && e.lab) html += `<span class="elab${e.labLeft ? ' left' : ''}${dim(e.id.split('-'))}" style="left:${e.lab[0]}px;top:${e.lab[1]}px">${esc(e.label)}</span>`;

    for (const n of nodes.filter((x) => !x.host)) {
      const p = P[n.product];
      const sub = n.label.toLowerCase() === p.short.toLowerCase() ? p.category : p.short;
      const tag = !live || n.rev !== latest ? (n.rev === committed ? `<span class="ctag" aria-label="${esc(t('rec.revision', { n: n.rev }))}">${n.rev}</span>` : '') : '';
      const mark = live && n.rev === latest ? '<span class="bmark" aria-hidden="true"></span>' : '';
      html += `<div class="card${hoverId === n.id ? ' hover' : ''}${linkId === n.id ? ' hl' : dim([n.id])}" id="c-${n.id}" style="left:${n.x}px;top:${n.y}px;width:${CW}px;height:${CH}px" tabindex="0" aria-label="${esc(n.label)}, ${esc(p.name)}, ${esc(n.where)}">
        <span class="tile">${icon(n.product)}</span>
        <div style="min-width:0"><div class="t">${esc(n.label)}</div><div class="s"><span class="sub">${esc(sub)}</span>${n.zones ? `<span class="z">${n.zones.join(' ')}</span>` : ''}</div></div>
        ${tag}${mark}
      </div>`;
    }
    world.innerHTML = html;

    // Badges on the host's top edge, 6 px from the left, stacking left to right (spec 7.20).
    const byHost = {};
    for (const n of nodes.filter((x) => x.host)) (byHost[n.host] = byHost[n.host] || []).push(n);
    for (const [host, list] of Object.entries(byHost)) {
      const h = D.nodes.find((n) => n.id === host);
      let x = h.x + 6;
      for (const b of list) {
        const el = document.createElement('span');
        el.className = 'badge' + dim([b.id]);
        el.innerHTML = `${icon(b.product)}${esc(P[b.product].short)}`;
        world.appendChild(el);
        el.style.left = x + 'px';
        el.style.top = h.y - 10 + 'px';
        x += el.offsetWidth + 6;
      }
    }

    if (hoverId) {
      const n = D.nodes.find((x) => x.id === hoverId);
      const p = P[n.product];
      const pop = document.createElement('div');
      pop.className = 'pop';
      pop.setAttribute('role', 'dialog');
      pop.innerHTML = `<div class="h">${icon(n.product)}<div class="n">${esc(p.name)}</div><div class="c">${esc(p.category)} · ${esc(n.where)}</div></div>
        <dl><dt>${esc(t('pop.why'))}</dt><dd>${esc(n.why)}</dd><dt>${esc(t('pop.what'))}</dt><dd class="what">${esc(p.purpose)}</dd></dl>
        <div class="f"><span class="num">${esc(t('pop.addedIn', { n: n.rev }))}</span><a href="#">${esc(t('pop.productPage'))}${ui('ext', 's12')}</a></div>`;
      canvas.appendChild(pop);
      // Beside the card, never covering it; flipped to stay inside the canvas.
      pop.style.left = Math.round(ox + (n.x + CW) * z + 12) + 'px';
      pop.style.top = Math.round(Math.min(ch - pop.offsetHeight - 12, oy + n.y * z - 8)) + 'px';
    }
  }

  // ---------- Products panel, expanded (spec 7.26) ----------
  function panel(nodes, hlRow, committed) {
    const groups = [
      ['Internet', ['users']], ['Global', ['dns']], ['Edge network', ['ga', 'esa']],
      ['Singapore · Portal VPC', ['firewall', 'nat', 'alb', 'waf', 'cert', 'app', 'scaling', 'cache', 'db', 'db-replica', 'chatbot', 'vector-db']],
      ['Singapore · regional services', ['backup', 'docs', 'kms', 'logs', 'llm']],
    ];
    const rows = groups.map(([g, ids]) => `<tr class="g"><td colspan="5">${esc(g)}</td></tr>` + ids.map((id) => {
      const n = D.nodes.find((x) => x.id === id);
      const p = P[n.product];
      const where = n.host ? esc(t('rec.attached', { host: D.nodes.find((x) => x.id === n.host).label })) : n.zones ? esc(t('rec.zones', { list: n.zones.join(', ') })) : '';
      const lb = n.label.toLowerCase() !== p.short.toLowerCase() ? `<span class="lb">${esc(n.label)}</span>` : '';
      return `<tr class="${n.host ? 'badge-row' : ''}${id === hlRow ? ' hl' : ''}"><td><div class="prod">${icon(n.product)}<span class="n">${esc(p.short)}</span>${lb}</div></td>
        <td class="why">${esc(n.why)}</td><td>${where}</td><td>${esc(p.note || '')}</td><td class="revc"><button class="rtag${n.rev === committed ? ' latest' : ''}" aria-label="${esc(t('rec.revision', { n: n.rev }))}">${n.rev}</button></td></tr>`;
    }).join('')).join('');
    return `<section class="panel" id="products" aria-label="${esc(t('panel.title'))}">
      <button class="handle" aria-expanded="true" aria-controls="products" aria-label="${esc(t('panel.collapse'))}">${ui('down')}</button>
      <div class="scroll"><table class="ptable" aria-label="${esc(t('panel.title'))}"><colgroup><col style="width:220px"><col><col style="width:150px"><col style="width:240px"><col style="width:56px"></colgroup>
        <thead><tr><th scope="col">${esc(t('panel.col.product'))}</th><th scope="col">${esc(t('panel.col.why'))}</th><th scope="col">${esc(t('panel.col.where'))}</th><th scope="col">${esc(t('panel.col.notes'))}</th><th scope="col" style="text-align:right">${esc(t('panel.col.rev'))}</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </section>`;
  }

  // Official icons fill their 1024 box unevenly; fit every glyph to its own bounding box.
  function normalizeIcons() {
    for (const s of document.querySelectorAll('svg[data-norm]')) {
      try {
        const b = s.getBBox();
        if (b.width && b.height) {
          const m = Math.max(b.width, b.height) * 0.04;
          const side = Math.max(b.width, b.height) + 2 * m;
          s.setAttribute('viewBox', `${b.x + b.width / 2 - side / 2} ${b.y + b.height / 2 - side / 2} ${side} ${side}`);
        }
      } catch (e) { /* not rendered */ }
    }
  }
})();
