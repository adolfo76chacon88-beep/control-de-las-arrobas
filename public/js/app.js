'use strict';
const { half, dia, cents, money, total: tot, fmtD, fmtC } = Calc;
const IC = { sum: 'M18 4H6l7 8-7 8h12', home: 'M3 11l9-8 9 8M5 10v10h14V10', table: 'M3 5h18v14H3zM3 10h18M9 5v14', flag: 'M5 21V4M5 4h13l-2 4 2 4H5', hist: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 2', users: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8M21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8', mail: 'M3 5h18v14H3zM3 5l9 8 9-8', chat: 'M21 12a8 8 0 01-11.5 7.2L3 21l1.8-5.5A8 8 0 1121 12z', bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3', plus: 'M12 5v14M5 12h14', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', pdf: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16', logout: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9', undo: 'M3 7v6h6M3 13a9 9 0 109-9 9 9 0 00-6 2.3', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z' };
const I = n => `<svg class="ic" viewBox="0 0 24 24"><path d="${IC[n]}"/></svg>`;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const friendly = e => e.code === '23505' ? 'Ya existe un registro de ese trabajador en esa fecha y corte' : (e.message || 'Ocurrió un error');
const FOOT = '© Derechos Reservados. Control de Arrobas.';
let sb, me, view = 'inicio', F = { w: '', d: '', q: '', wq: '', hq: '', qs: '' };
const S = { workers: [], cuts: [], cut: null, cw: [], recs: [], sum: [], fin: null, res: [], hist: [], invs: [], msgs: [], notifs: [], all: [] };
const isA = () => me && me.role === 'admin';
const isOpen = () => S.cut && S.cut.status === 'abierto';
const sumT = () => S.sum.reduce((a, x) => a + Number(x.total_arrobas), 0);
const q = async p => { const { data, error } = await p; if (error) throw error; return data; };
const NAV = [['inicio', 'home', 'Inicio'], ['registro', 'table', 'Registro diario'], ['resumen', 'sum', 'Resumen por trabajador'], ['finalizar', 'flag', 'Finalizar corte', 1], ['historial', 'hist', 'Historial de cortes'], ['trabajadores', 'users', 'Trabajadores', 1], ['invitar', 'mail', 'Invitar lectores', 1], ['mensajes', 'chat', 'Mensajes y observaciones']];

/* ---------- UI helpers ---------- */
function toast(m, t = 'ok') { const e = document.createElement('div'); e.className = 'toast ' + t; e.textContent = m; $('#toasts').append(e); setTimeout(() => e.remove(), 4000); }
function modal(title, body, o = {}) {
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'ov';
    d.innerHTML = `<div class="md" role="dialog" aria-label="${esc(title)}"><h3>${title}</h3><div>${body}</div><div class="mf"><button class="b ghost" data-x>${o.hideOk ? 'Cerrar' : 'Cancelar'}</button>${o.hideOk ? '' : `<button class="b ${o.danger ? 'dng' : 'pri'}" data-ok>${o.ok || 'Guardar'}</button>`}</div></div>`;
    document.body.append(d);
    const close = v => { d.remove(); res(v); };
    d.addEventListener('click', async e => {
      if (e.target === d || e.target.closest('[data-x]')) return close(false);
      const b = e.target.closest('[data-ok]'); if (!b) return;
      b.disabled = true;
      try { if (!o.onOk || await o.onOk(d) !== false) return close(true); } catch (x) { toast(friendly(x), 'err'); }
      b.disabled = false;
    });
    if (o.init) o.init(d);
  });
}
const confirmar = (t, msg, ok, onOk) => modal(t, `<p>${msg}</p>`, { ok, danger: true, onOk });
const tbl = (h, rows, foot = '') => `<div class="tw"><table><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${h.length}" class="mut">Sin datos</td></tr>`}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>`;
const card = (i, l, v) => `<div class="card stat">${I(i)}<div><b>${v}</b><small>${l}</small></div></div>`;
const empty = () => `<div class="card"><h1>Aún no hay cortes</h1><p class="mut">${isA() ? 'Crea el primer corte con “Nuevo corte” y elige los trabajadores.' : 'El administrador todavía no ha creado un corte.'}</p></div>`;
async function api(n, b) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch('/api/' + n, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(b) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Error del servidor'); return j;
}

/* ---------- Datos ---------- */
async function loadBase() {
  [S.workers, S.cuts] = await Promise.all([q(sb.from('workers').select('*').order('full_name')), q(sb.from('cuts').select('*').order('start_date', { ascending: false }))]);
  const cur = S.cut && S.cuts.find(c => c.id === S.cut.id);
  S.cut = cur || S.cuts.find(c => c.status === 'abierto') || S.cuts[0] || null;
}
async function loadCut() {
  const c = S.cut; S.cw = []; S.recs = []; S.sum = []; S.fin = null; S.res = []; if (!c) return;
  const [cw, recs, sum] = await Promise.all([q(sb.from('cut_workers').select('worker_id').eq('cut_id', c.id)), q(sb.from('daily_records').select('*,workers(full_name)').eq('cut_id', c.id)), q(sb.rpc('resumen_arrobas', { p_cut: c.id }))]);
  S.cw = cw.map(x => x.worker_id); S.sum = sum;
  S.recs = recs.sort((a, b) => b.work_date.localeCompare(a.work_date) || a.workers.full_name.localeCompare(b.workers.full_name));
  if (isA() && c.status === 'finalizado') [S.fin, S.res] = await Promise.all([q(sb.from('cut_finance').select('*').eq('cut_id', c.id).maybeSingle()), q(sb.from('cut_results').select('*').eq('cut_id', c.id))]);
}
const refresh = async () => { await loadBase(); await loadCut(); await loadView(); render(); };
async function loadView() {
  if (view === 'historial') {
    S.hist = await Promise.all(S.cuts.map(async c => { const s = await q(sb.rpc('resumen_arrobas', { p_cut: c.id })); return { c, n: s.length, a: s.reduce((t, x) => t + Number(x.total_arrobas), 0), s }; }));
    if (isA()) { const f = await q(sb.from('cut_finance').select('*')); S.hist.forEach(h => h.f = f.find(x => x.cut_id === h.c.id)); }
  }
  if (view === 'invitar') S.invs = await q(sb.from('invitations').select('*').order('created_at', { ascending: false }));
  if (view === 'mensajes') S.msgs = await q(sb.from('comments').select('*,profiles(email),replies(*),cuts(name),workers(full_name)').order('created_at', { ascending: false }));
  if (view === 'buscar') S.all = await q(sb.from('daily_records').select('*,workers(full_name),cuts(name)').order('work_date', { ascending: false }).limit(1500));
}
async function go(v) { view = v; try { await loadView(); } catch (e) { toast(friendly(e), 'err'); } render(); window.scrollTo(0, 0); }
async function loadNotifs() {
  try { S.notifs = await q(sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)); const n = S.notifs.filter(x => !x.read).length; $('#nc').textContent = n || ''; } catch (e) { /* silencioso */ }
}

/* ---------- Vistas ---------- */
const filt = () => { const t = F.q.toLowerCase(); return S.recs.filter(r => (!F.w || r.worker_id === F.w) && (!F.d || r.work_date === F.d) && (!t || (r.workers.full_name + ' ' + dia(r.work_date) + ' ' + r.work_date).toLowerCase().includes(t))); };
const recList = () => {
  const rows = filt(), byD = {}; rows.forEach(r => byD[r.work_date] = (byD[r.work_date] || 0) + Number(r.total_arrobas));
  const ed = isA() && isOpen();
  return `<div class="chips">${Object.keys(byD).sort().reverse().map(d => `<span class="chip">${d} · ${dia(d)}: <b>${byD[d]}</b></span>`).join('')}</div>` +
    tbl(['#', 'Nombre y apellido', 'Fecha', 'Día', 'Año', 'Arrobas', 'Medias arrobas', 'Total de arrobas', 'Estado', ed ? 'Acciones' : ''],
      rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.workers.full_name)}</td><td>${r.work_date}</td><td>${dia(r.work_date)}</td><td>${r.work_date.slice(0, 4)}</td><td>${r.absent ? '—' : r.full_count}</td><td>${r.absent ? '—' : half(r.half_count)}</td><td><b>${r.total_arrobas}</b></td><td>${r.absent ? '<span class="tag no">AUSENTE</span>' : '<span class="tag ok">Activo</span>'}</td><td>${ed ? `<button class="b sm" data-a="rec" data-id="${r.id}" aria-label="Editar">${I('edit')}</button><button class="b sm" data-a="delrec" data-id="${r.id}" aria-label="Eliminar">${I('trash')}</button>` : ''}</td></tr>`).join(''),
      rows.length ? `<tr class="ft"><td colspan="7">Total ${F.d ? 'del día' : 'filtrado'}</td><td>${rows.reduce((a, r) => a + Number(r.total_arrobas), 0)}</td><td colspan="2"></td></tr>` : '');
};
const wList = () => {
  const t = F.wq.toLowerCase();
  return tbl(['#', 'Nombre', 'Apellido', 'Estado', 'Creado', 'Acciones'], S.workers.filter(w => !t || w.full_name.toLowerCase().includes(t)).map((w, i) => `<tr><td>${i + 1}</td><td>${esc(w.first_name)}</td><td>${esc(w.last_name)}</td><td>${w.active ? '<span class="tag ok">Activo</span>' : '<span class="tag no">Inactivo</span>'}</td><td>${w.created_at.slice(0, 10)}</td><td><button class="b sm" data-a="wedit" data-id="${w.id}" aria-label="Editar">${I('edit')}</button><button class="b sm" data-a="wtog" data-id="${w.id}">${w.active ? 'Desactivar' : 'Reactivar'}</button><button class="b sm" data-a="whist" data-id="${w.id}">${I('hist')}Historial</button></td></tr>`).join(''));
};
const histRows = () => { const t = F.hq.toLowerCase(); return S.hist.filter(h => !t || (h.c.name + h.c.start_date + (h.c.end_date || '')).toLowerCase().includes(t)); };
const histList = () => tbl(['Id', 'Corte', 'Inicio', 'Fin', 'Estado', 'Trabajadores', 'Arrobas', ...(isA() ? ['Precio/arroba', 'Total dinero'] : []), 'Acciones'],
  histRows().map(h => `<tr><td>${h.c.id.slice(0, 8)}</td><td>${esc(h.c.name)}</td><td>${h.c.start_date}</td><td>${h.c.end_date || '—'}</td><td><span class="tag ${h.c.status === 'abierto' ? 'ok' : 'no'}">${h.c.status}</span></td><td>${h.n}</td><td>${h.a}</td>${isA() ? `<td>${h.f ? fmtD(h.f.price_per_arroba) : '—'}</td><td>${h.f ? fmtD(h.f.total_money) : '—'}</td>` : ''}<td><button class="b sm" data-a="ver" data-id="${h.c.id}">${I('eye')}Ver</button><button class="b sm" data-a="cpdf" data-id="${h.c.id}">${I('pdf')}PDF</button>${isA() && h.c.status === 'finalizado' ? `<button class="b sm" data-a="reopen" data-id="${h.c.id}">${I('undo')}Reabrir</button>` : ''}</td></tr>`).join(''));

const V = {
  inicio() {
    if (!S.cut) return empty();
    return `<h1>${esc(S.cut.name)} <span class="tag ${isOpen() ? 'ok' : 'no'}">${S.cut.status}</span></h1><div class="cards">${card('users', 'Trabajadores', S.sum.length)}${card('sum', 'Total de arrobas', sumT())}${card('table', 'Registros', S.recs.length)}${card('flag', 'Ausencias', S.recs.filter(r => r.absent).length)}${isA() ? card('flag', 'Total de dinero', S.fin ? fmtD(S.fin.total_money) : 'Pendiente') : ''}</div>${V.resumen(true)}`;
  },
  registro() {
    if (!S.cut) return empty();
    const opts = S.sum.map(x => `<option value="${x.worker_id}" ${F.w === x.worker_id ? 'selected' : ''}>${esc(x.full_name)}</option>`).join('');
    return `<div class="bar"><h1>Registro diario</h1><span class="sp"></span><button class="b" data-a="pdf" data-k="diario">${I('pdf')}PDF</button>${isA() && isOpen() ? `<button class="b" data-a="cutw">${I('users')}Trabajadores del corte</button><button class="b pri" data-a="rec">${I('plus')}Agregar registro</button>` : ''}</div>
<div class="flt"><input id="fq" placeholder="Buscar por nombre o día" value="${esc(F.q)}"><select id="fw"><option value="">Todos los trabajadores</option>${opts}</select><input type="date" id="fd" value="${F.d}"><button class="b ghost" data-a="clr">Limpiar filtros</button></div><div id="rl">${recList()}</div>${isOpen() ? '' : '<p class="mut">Corte finalizado: los registros están bloqueados.</p>'}`;
  },
  resumen(bare) {
    if (!S.cut) return empty();
    const rows = S.sum.map((x, i) => { const r = S.res.find(y => y.worker_id === x.worker_id), w = S.workers.find(y => y.id === x.worker_id); return `<tr><td>${i + 1}</td><td>${esc(x.full_name)}</td><td><b>${x.total_arrobas}</b> <small>(${x.full_total} + ${half(x.half_total)})</small></td>${isA() ? `<td>${r ? fmtD(r.money) : '—'}</td>` : ''}<td>${w && !w.active ? '<span class="tag no">Inactivo</span>' : '<span class="tag ok">Activo</span>'}${x.ausencias ? ` <span class="tag no">${x.ausencias} ausencia(s)</span>` : ''}</td></tr>`; }).join('');
    return `${bare ? '<h2>Resumen general</h2>' : `<div class="bar"><h1>Resumen por trabajador</h1><span class="sp"></span><button class="b" data-a="pdf" data-k="resumen">${I('pdf')}PDF arrobas</button>${isA() ? `<button class="b" data-a="pdf" data-k="dinero">${I('pdf')}PDF dinero</button>` : ''}</div>`}${tbl(['#', 'Nombre y apellido', 'Total de arrobas', ...(isA() ? ['Total de dinero'] : []), 'Estado'], rows, rows ? `<tr class="ft"><td></td><td>Total</td><td>${sumT()}</td>${isA() ? `<td>${S.fin ? fmtD(S.fin.total_money) : '—'}</td>` : ''}<td></td></tr>` : '')}${isA() && !S.fin ? '<p class="mut">El dinero se calcula al finalizar el corte.</p>' : ''}`;
  },
  finalizar() {
    if (!isA()) return V.inicio();
    if (!S.cut) return empty();
    if (!isOpen()) return `<div class="fin"><h1>FINALIZAR CORTE</h1><p>Este corte ya está <b>finalizado</b>${S.fin ? ` con precio de ${fmtD(S.fin.price_per_arroba)} por arroba y total de ${fmtD(S.fin.total_money)}` : ''}.</p><button class="b" data-a="reopen" data-id="${S.cut.id}">${I('undo')}Reabrir corte</button></div>${V.resumen(true)}`;
    return `<div class="fin"><h1>FINALIZAR CORTE</h1><p class="mut">Corte: ${esc(S.cut.name)}</p><div class="g2"><label>Precio de una arroba ($)<input id="price" type="number" min="0" step="0.01" placeholder="12.00"></label><label>Precio de media arroba (automático)<input id="pricehalf" readonly value="$0.00"></label></div><button class="b pri" data-a="fin">${I('flag')}FINALIZAR CORTE</button></div><div id="fp">${finPrev(0)}</div>`;
  },
  historial() {
    return `<div class="bar"><h1>Historial de cortes</h1><span class="sp"></span><button class="b" data-a="cmp">${I('sum')}Comparar</button>${isA() ? `<button class="b" data-a="pdf" data-k="historial">${I('pdf')}PDF historial</button>` : ''}</div><div class="flt"><input id="hq" placeholder="Buscar por nombre o fecha (ej. 2026-11)" value="${esc(F.hq)}"></div><div id="hl">${histList()}</div>`;
  },
  trabajadores() {
    return `<div class="bar"><h1>Trabajadores</h1><span class="sp"></span><button class="b pri" data-a="wadd">${I('plus')}Agregar trabajador</button></div><div class="flt"><input id="wq" placeholder="Buscar por nombre o apellido" value="${esc(F.wq)}"></div><div id="wl">${wList()}</div>`;
  },
  invitar() {
    return `<h1>Invitar lectores</h1><form id="inv" class="card" style="margin:1rem 0;max-width:480px"><label>Correo del lector<input type="email" id="ie" required placeholder="jefe@correo.com"></label><button class="b pri">${I('mail')}Enviar invitación</button><p class="mut">El invitado crea su contraseña desde el correo y recibe siempre el rol LECTOR.</p></form>${tbl(['Correo', 'Estado', 'Fecha', ''], S.invs.map(v => `<tr><td>${esc(v.email)}</td><td><span class="tag ${v.status === 'revocada' ? 'no' : 'ok'}">${v.status}</span></td><td>${v.created_at.slice(0, 10)}</td><td>${v.status !== 'revocada' ? `<button class="b sm" data-a="revoke" data-e="${esc(v.email)}">Revocar acceso</button>` : ''}</td></tr>`).join(''))}`;
  },
  mensajes() {
    const ms = [...S.msgs].sort((a, b) => (a.status === 'pendiente' ? 0 : 1) - (b.status === 'pendiente' ? 0 : 1));
    const form = isA() ? '' : `<form id="cf" class="card" style="margin:1rem 0"><div class="flt"><select id="cc"><option value="">Corte (opcional)</option>${S.cuts.map(c => `<option value="${c.id}" ${S.cut?.id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><select id="cwk"><option value="">Trabajador (opcional)</option>${S.workers.map(w => `<option value="${w.id}">${esc(w.full_name)}</option>`).join('')}</select><input type="date" id="cd"></div><label>Mensaje<textarea id="cb" rows="3" maxlength="2000" required placeholder="Ej.: Falta registrar media arroba de Juan Pérez el día 15"></textarea></label><button class="b pri">${I('chat')}Enviar comentario</button></form>`;
    return `<h1>Mensajes y observaciones</h1>${form}${ms.map(m => `<div class="msg"><div class="bar"><b>${isA() ? esc(m.profiles?.email) : 'Tú'}</b><small>${new Date(m.created_at).toLocaleString('es')}</small><span class="tag ${m.status === 'pendiente' ? 'no' : 'ok'}">${m.status}</span></div><p>${esc(m.body)}</p><small>${[m.cuts?.name && 'Corte: ' + esc(m.cuts.name), m.workers?.full_name && 'Trabajador: ' + esc(m.workers.full_name), m.record_date && 'Fecha: ' + m.record_date].filter(Boolean).join(' · ')}</small>${(m.replies || []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(r => `<div class="rp"><b>Administrador</b> <small>${new Date(r.created_at).toLocaleString('es')}</small><p>${esc(r.body)}</p></div>`).join('')}${isA() ? `<button class="b sm" data-a="reply" data-id="${m.id}">${I('chat')}Responder</button>` : ''}</div>`).join('') || '<p class="mut">Sin mensajes todavía.</p>'}`;
  },
  buscar() {
    const t = F.qs.toLowerCase();
    const w = S.workers.filter(x => x.full_name.toLowerCase().includes(t)), c = S.cuts.filter(x => (x.name + x.start_date + (x.end_date || '')).toLowerCase().includes(t));
    const r = S.all.filter(x => (x.workers.full_name + ' ' + x.work_date + ' ' + dia(x.work_date)).toLowerCase().includes(t)).slice(0, 100);
    return `<h1>Resultados para “${esc(F.qs)}”</h1><h2>Trabajadores (${w.length})</h2>${tbl(['Nombre', 'Estado'], w.map(x => `<tr><td>${esc(x.full_name)}</td><td>${x.active ? 'Activo' : 'Inactivo'}</td></tr>`).join(''))}<h2>Cortes (${c.length})</h2>${tbl(['Corte', 'Inicio', 'Estado', ''], c.map(x => `<tr><td>${esc(x.name)}</td><td>${x.start_date}</td><td>${x.status}</td><td><button class="b sm" data-a="ver" data-id="${x.id}">Ver</button></td></tr>`).join(''))}<h2>Registros (${r.length})</h2>${tbl(['Trabajador', 'Fecha', 'Día', 'Corte', 'Total'], r.map(x => `<tr><td>${esc(x.workers.full_name)}</td><td>${x.work_date}</td><td>${dia(x.work_date)}</td><td>${esc(x.cuts.name)}</td><td>${x.absent ? 'AUSENTE' : x.total_arrobas}</td></tr>`).join(''))}`;
  }
};
function finPrev(pc) {
  const rows = S.sum.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.full_name)}</td><td>${x.full_total}</td><td>${half(x.half_total)}</td><td>${x.total_arrobas}</td><td>${fmtC(money(x.full_total, x.half_total, pc))}</td></tr>`).join('');
  return tbl(['#', 'Trabajador', 'Arrobas', 'Medias', 'Total arrobas', 'Dinero'], rows, `<tr class="ft"><td colspan="4">Total general</td><td>${sumT()}</td><td>${fmtC(S.sum.reduce((a, x) => a + money(x.full_total, x.half_total, pc), 0))}</td></tr>`);
}
function shell() {
  document.body.innerHTML = `<div class="app"><aside class="side" id="side"><div class="brand">${I('sum')}<span>Control de Arrobas</span></div><nav>${NAV.filter(n => !n[3] || isA()).map(n => `<a href="#" class="nv" data-a="nav" data-v="${n[0]}" data-k="${n[0]}">${I(n[1])}<span>${n[2]}</span></a>`).join('')}</nav><div class="who"><small>${esc(me.email)}</small><b>${isA() ? 'Administrador' : 'Lector'}</b><button class="b ghost" data-a="out">${I('logout')}Salir</button></div></aside><div class="main"><header class="top"><button class="b ghost menu" data-a="menu" aria-label="Menú">☰</button><select id="cutsel" aria-label="Corte"></select>${isA() ? `<button class="b pri" data-a="newcut">${I('plus')}Nuevo corte</button>` : ''}<form id="gs" class="srch">${I('search')}<input id="gsi" placeholder="Buscar trabajadores, fechas, días, cortes…"></form><button class="b ghost bell" data-a="bell" aria-label="Notificaciones">${I('bell')}<i id="nc"></i></button></header><main id="view"></main><footer>${FOOT}</footer></div></div><div id="toasts"></div>`;
}
function render() {
  $('#cutsel').innerHTML = S.cuts.map(c => `<option value="${c.id}" ${S.cut?.id === c.id ? 'selected' : ''}>${esc(c.name)} (${c.status})</option>`).join('') || '<option>Sin cortes</option>';
  document.querySelectorAll('.nv').forEach(a => a.classList.toggle('on', a.dataset.k === view));
  $('#view').innerHTML = (V[view] || V.inicio)(); $('#side').classList.remove('show');
}

/* ---------- PDF (jsPDF en el navegador; el lector jamás recibe datos de dinero) ---------- */
function pdf(kind) {
  if ((kind === 'dinero' || kind === 'historial') && !isA()) throw new Error('Sin permiso para generar este PDF');
  if (!S.cut && kind !== 'historial') throw new Error('No hay un corte seleccionado');
  const { jsPDF } = window.jspdf, d = new jsPDF({ unit: 'pt', format: 'letter' }), c = S.cut, W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const names = { diario: 'Registro diario de arrobas', resumen: 'Resumen de arrobas por trabajador', dinero: 'Resumen de dinero', completo: 'Reporte completo del corte', historial: 'Historial de cortes' };
  d.setFontSize(18); d.setTextColor(60, 60, 160); d.text('Control de Arrobas', 40, 48);
  d.setFontSize(12); d.setTextColor(30); d.text(names[kind], 40, 68);
  d.setFontSize(9); d.setTextColor(90); d.text('Generado: ' + new Date().toLocaleString('es'), 40, 84);
  if (kind !== 'historial') d.text(`Corte: ${c.name} | id ${c.id.slice(0, 8)} | ${c.start_date}${c.end_date ? ' a ' + c.end_date : ''} | ${c.status}`, 40, 98);
  let y = 112;
  const T = (h, b, f) => { d.autoTable({ startY: y, head: [h], body: b, foot: f ? [f] : undefined, styles: { fontSize: 9 }, headStyles: { fillColor: [60, 60, 160] }, footStyles: { fillColor: [230, 232, 250], textColor: 20 } }); y = d.lastAutoTable.finalY + 20; };
  const daily = () => T(['#', 'Nombre', 'Fecha', 'Día', 'Año', 'Arrobas', 'Medias', 'Total', 'Estado'], S.recs.map((r, i) => [i + 1, r.workers.full_name, r.work_date, dia(r.work_date), r.work_date.slice(0, 4), r.absent ? '-' : r.full_count, r.absent ? '-' : half(r.half_count), r.total_arrobas, r.absent ? 'AUSENTE' : 'Activo']), ['', 'Total general', '', '', '', '', '', S.recs.reduce((a, r) => a + Number(r.total_arrobas), 0), '']);
  const summ = () => T(['#', 'Nombre', 'Arrobas', 'Medias', 'Total de arrobas', 'Ausencias'], S.sum.map((x, i) => [i + 1, x.full_name, x.full_total, half(x.half_total), x.total_arrobas, x.ausencias]), ['', 'Total general', '', '', sumT(), '']);
  const mon = () => {
    if (!S.fin) throw new Error('Finaliza el corte para generar el resumen de dinero');
    d.text(`Precio por arroba: ${fmtD(S.fin.price_per_arroba)} | Media arroba: ${fmtD(S.fin.price_per_half)}`, 40, y); y += 8;
    T(['#', 'Nombre', 'Total de arrobas', 'Dinero'], S.res.map((r, i) => [i + 1, (S.sum.find(x => x.worker_id === r.worker_id) || {}).full_name, r.total_arrobas, fmtD(r.money)]), ['', 'Total general', S.fin.total_arrobas, fmtD(S.fin.total_money)]);
  };
  if (kind === 'diario') daily();
  else if (kind === 'resumen') summ();
  else if (kind === 'dinero') mon();
  else if (kind === 'completo') { summ(); daily(); if (isA() && S.fin) mon(); }
  else if (kind === 'historial') T(['Id', 'Corte', 'Inicio', 'Fin', 'Estado', 'Trab.', 'Arrobas', 'Precio', 'Total dinero'], S.hist.map(h => [h.c.id.slice(0, 8), h.c.name, h.c.start_date, h.c.end_date || '-', h.c.status, h.n, h.a, h.f ? fmtD(h.f.price_per_arroba) : '-', h.f ? fmtD(h.f.total_money) : '-']));
  const n = d.getNumberOfPages();
  for (let i = 1; i <= n; i++) { d.setPage(i); d.setFontSize(8); d.setTextColor(110); d.text(`Página ${i} de ${n}`, W - 40, H - 20, { align: 'right' }); d.text(FOOT, 40, H - 20); }
  d.save(`control-de-arrobas-${kind}${c && kind !== 'historial' ? '-' + c.name.replace(/\W+/g, '_') : ''}.pdf`);
}

/* ---------- Acciones ---------- */
const wchk = sel => S.workers.filter(w => w.active || sel.has(w.id)).map(w => `<label class="ck"><input class="wc" type="checkbox" value="${w.id}" ${sel.has(w.id) ? 'checked' : ''}>${esc(w.full_name)}</label>`).join('') || '<p class="mut">Primero agrega trabajadores en la sección Trabajadores.</p>';
const checked = m => [...m.querySelectorAll('.wc:checked')].map(x => x.value);
const workerForm = w => `<label>Nombre<input id="wn" value="${esc(w?.first_name || '')}" required></label><label>Apellido<input id="wa" value="${esc(w?.last_name || '')}" required></label>`;
const A = {
  nav: d => go(d.v), menu: () => $('#side').classList.toggle('show'),
  out: async () => { await sb.auth.signOut(); location.reload(); },
  clr: () => { F.q = F.w = F.d = ''; render(); },
  async rec(d) {
    const r = d.id ? S.recs.find(x => x.id === d.id) : null;
    const ws = S.workers.filter(w => S.cw.includes(w.id) && (w.active || r?.worker_id === w.id));
    await modal(r ? 'Editar registro' : 'Agregar registro', `<label>Trabajador<select id="mw">${ws.map(w => `<option value="${w.id}" ${r?.worker_id === w.id ? 'selected' : ''}>${esc(w.full_name)}</option>`).join('')}</select></label><label>Fecha<input type="date" id="md" value="${r?.work_date || today()}"></label><label class="ck"><input type="checkbox" id="ma" ${r?.absent ? 'checked' : ''}>Ausente (total 0, sin dinero)</label><div class="g2"><label>Arrobas completas<input type="number" id="mf" min="0" step="1" value="${r?.full_count || 0}"></label><label>Medias arrobas (½)<input type="number" id="mh" min="0" step="1" value="${r?.half_count || 0}"></label></div><p class="pv">Total: <b id="mt">0</b> arrobas</p>`, {
      init(m) { const u = () => { const ab = $('#ma', m).checked; $('#mf', m).disabled = $('#mh', m).disabled = ab; $('#mt', m).textContent = ab ? 0 : tot(+$('#mf', m).value || 0, +$('#mh', m).value || 0); }; m.addEventListener('input', u); u(); },
      async onOk(m) {
        const ab = $('#ma', m).checked, f = ab ? 0 : +$('#mf', m).value, h = ab ? 0 : +$('#mh', m).value;
        if (!Number.isInteger(f) || !Number.isInteger(h) || f < 0 || h < 0) throw new Error('Las cantidades deben ser números enteros de 0 o más');
        const p = { cut_id: S.cut.id, worker_id: $('#mw', m).value, work_date: $('#md', m).value, full_count: f, half_count: h, absent: ab };
        if (!p.worker_id || !p.work_date) throw new Error('Elige trabajador y fecha');
        await q(r ? sb.from('daily_records').update(p).eq('id', r.id) : sb.from('daily_records').insert(p));
        await loadCut(); render(); toast('Registro guardado');
      }
    });
  },
  delrec: d => confirmar('Eliminar registro', '¿Eliminar este registro? No se puede deshacer.', 'Eliminar', async () => { await q(sb.from('daily_records').delete().eq('id', d.id)); await loadCut(); render(); toast('Registro eliminado'); }),
  cutw: () => modal('Trabajadores del corte', wchk(new Set(S.cw)), {
    async onOk(m) {
      const sel = new Set(checked(m)), add = [...sel].filter(x => !S.cw.includes(x)), rem = S.cw.filter(x => !sel.has(x));
      if (rem.some(id => S.recs.some(r => r.worker_id === id))) throw new Error('No puedes quitar a un trabajador que ya tiene registros en este corte');
      if (add.length) await q(sb.from('cut_workers').insert(add.map(worker_id => ({ cut_id: S.cut.id, worker_id }))));
      if (rem.length) await q(sb.from('cut_workers').delete().eq('cut_id', S.cut.id).in('worker_id', rem));
      await loadCut(); render(); toast('Trabajadores actualizados');
    }
  }),
  newcut: () => modal('Nuevo corte', `<label>Nombre<input id="cn" value="Corte ${today()}"></label><label>Fecha de inicio<input type="date" id="cs" value="${today()}"></label><p class="mut">Trabajadores del corte</p>${wchk(new Set(S.workers.filter(w => w.active).map(w => w.id)))}`, {
    async onOk(m) {
      const name = $('#cn', m).value.trim(); if (!name) throw new Error('Escribe un nombre');
      const cut = await q(sb.from('cuts').insert({ name, start_date: $('#cs', m).value, created_by: me.id }).select().single());
      const ids = checked(m); if (ids.length) await q(sb.from('cut_workers').insert(ids.map(worker_id => ({ cut_id: cut.id, worker_id }))));
      S.cut = cut; await refresh(); toast('Corte creado');
    }
  }),
  wadd: () => modal('Agregar trabajador', workerForm(), { async onOk(m) { await q(sb.from('workers').insert({ first_name: $('#wn', m).value.trim(), last_name: $('#wa', m).value.trim() })); await loadBase(); render(); toast('Trabajador agregado'); } }),
  wedit(d) { const w = S.workers.find(x => x.id === d.id); return modal('Editar trabajador', workerForm(w), { async onOk(m) { await q(sb.from('workers').update({ first_name: $('#wn', m).value.trim(), last_name: $('#wa', m).value.trim() }).eq('id', w.id)); await loadBase(); render(); toast('Trabajador actualizado'); } }); },
  async wtog(d) { const w = S.workers.find(x => x.id === d.id); await q(sb.from('workers').update({ active: !w.active }).eq('id', w.id)); await loadBase(); render(); toast(w.active ? 'Trabajador desactivado' : 'Trabajador reactivado'); },
  async whist(d) {
    const w = S.workers.find(x => x.id === d.id), rs = await q(sb.from('daily_records').select('work_date,full_count,half_count,absent,total_arrobas,cuts(name)').eq('worker_id', w.id).order('work_date', { ascending: false }));
    modal('Historial de ' + esc(w.full_name), tbl(['Fecha', 'Corte', 'Arrobas', 'Medias', 'Total'], rs.map(r => `<tr><td>${r.work_date}</td><td>${esc(r.cuts.name)}</td><td>${r.absent ? 'AUSENTE' : r.full_count}</td><td>${r.absent ? '—' : half(r.half_count)}</td><td>${r.total_arrobas}</td></tr>`).join(''), `<tr class="ft"><td colspan="4">Total</td><td>${rs.reduce((a, r) => a + Number(r.total_arrobas), 0)}</td></tr>`), { hideOk: true });
  },
  fin() {
    const pc = cents($('#price').value); if (isNaN(pc) || pc < 0) return toast('Escribe un precio válido', 'err');
    if (!S.sum.length) return toast('El corte no tiene trabajadores', 'err');
    const tm = S.sum.reduce((a, x) => a + money(x.full_total, x.half_total, pc), 0);
    return confirmar('Confirmar cierre del corte', `<ul class="kv"><li><span>Trabajadores</span><b>${S.sum.length}</b></li><li><span>Total de arrobas</span><b>${sumT()}</b></li><li><span>Precio por arroba</span><b>${fmtC(pc)}</b></li><li><span>Total de dinero</span><b>${fmtC(tm)}</b></li><li><span>Fecha del cierre</span><b>${today()}</b></li></ul><p class="mut">El precio quedará guardado en este corte y no cambiará con cortes futuros.</p>`, 'Finalizar corte', async () => { await api('finalize', { cut_id: S.cut.id, price: (pc / 100).toFixed(2) }); await refresh(); toast('Corte finalizado'); });
  },
  reopen: d => confirmar('Reabrir corte', 'Se borrarán el precio y el dinero calculados (quedan registrados en la bitácora de auditoría). ¿Reabrir este corte?', 'Reabrir', async () => { await api('reopen', { cut_id: d.id }); await refresh(); toast('Corte reabierto'); }),
  async ver(d) { S.cut = S.cuts.find(c => c.id === d.id); await loadCut(); view = 'registro'; render(); },
  async cpdf(d) { try { const keep = S.cut; S.cut = S.cuts.find(c => c.id === d.id); await loadCut(); pdf('completo'); S.cut = keep; await loadCut(); } catch (e) { toast(e.message, 'err'); } },
  pdf: d => { try { pdf(d.k); } catch (e) { toast(e.message, 'err'); } },
  cmp() {
    const o = S.hist.map((h, i) => `<option value="${i}">${esc(h.c.name)}</option>`).join('');
    return modal('Comparar cortes', `<div class="g2"><select id="ca">${o}</select><select id="cb2">${o}</select></div><div id="cmo" style="margin-top:.8rem"></div>`, {
      hideOk: true, init(m) {
        const u = () => { const a = S.hist[$('#ca', m).value], b = S.hist[$('#cb2', m).value]; if (!a || !b) return; const ids = new Map(); [...a.s, ...b.s].forEach(x => ids.set(x.worker_id, x.full_name)); const g = (h, id) => Number((h.s.find(x => x.worker_id === id) || {}).total_arrobas || 0);
          $('#cmo', m).innerHTML = tbl(['Trabajador', esc(a.c.name), esc(b.c.name), 'Diferencia'], [...ids].map(([id, n]) => `<tr><td>${esc(n)}</td><td>${g(a, id)}</td><td>${g(b, id)}</td><td>${g(b, id) - g(a, id)}</td></tr>`).join(''), `<tr class="ft"><td>Total arrobas</td><td>${a.a}</td><td>${b.a}</td><td>${b.a - a.a}</td></tr>${isA() ? `<tr class="ft"><td>Precio/arroba</td><td>${a.f ? fmtD(a.f.price_per_arroba) : '—'}</td><td>${b.f ? fmtD(b.f.price_per_arroba) : '—'}</td><td></td></tr><tr class="ft"><td>Total dinero</td><td>${a.f ? fmtD(a.f.total_money) : '—'}</td><td>${b.f ? fmtD(b.f.total_money) : '—'}</td><td></td></tr>` : ''}`); };
        m.addEventListener('change', u); if (S.hist[1]) $('#cb2', m).value = 1; u();
      }
    });
  },
  revoke: d => confirmar('Revocar acceso', `¿Revocar el acceso de ${esc(d.e)}?`, 'Revocar', async () => { await api('revoke', { email: d.e }); await go('invitar'); toast('Acceso revocado'); }),
  reply: d => modal('Responder comentario', '<label>Respuesta<textarea id="rb" rows="4" maxlength="2000"></textarea></label>', {
    ok: 'Enviar respuesta', async onOk(m) {
      const body = $('#rb', m).value.trim(); if (!body) throw new Error('Escribe una respuesta');
      await q(sb.from('replies').insert({ comment_id: d.id, author_id: me.id, body })); await q(sb.from('comments').update({ status: 'respondido' }).eq('id', d.id));
      await loadView(); render(); toast('Respuesta enviada');
    }
  }),
  async bell() {
    await loadNotifs();
    const html = S.notifs.map(n => `<div class="msg"><small>${new Date(n.created_at).toLocaleString('es')}</small><p>${esc(n.message)}</p></div>`).join('') || '<p class="mut">Sin notificaciones.</p>';
    await sb.from('notifications').update({ read: true }).eq('user_id', me.id).eq('read', false); $('#nc').textContent = '';
    modal('Notificaciones', html, { hideOk: true });
  },
  forgot: async () => { const e = $('#le').value.trim(); if (!e) return toast('Escribe tu correo primero', 'err'); await sb.auth.resetPasswordForEmail(e, { redirectTo: location.origin }); toast('Si el correo existe, recibirás un enlace'); }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; e.preventDefault(); Promise.resolve(A[b.dataset.a]?.(b.dataset)).catch(x => toast(friendly(x), 'err')); });
document.addEventListener('input', e => {
  const i = e.target.id;
  if (i === 'fq') { F.q = e.target.value; $('#rl').innerHTML = recList(); }
  if (i === 'wq') { F.wq = e.target.value; $('#wl').innerHTML = wList(); }
  if (i === 'hq') { F.hq = e.target.value; $('#hl').innerHTML = histList(); }
  if (i === 'price') { const pc = cents(e.target.value) || 0; $('#pricehalf').value = fmtC(pc / 2); $('#fp').innerHTML = finPrev(pc); }
});
document.addEventListener('change', async e => {
  const i = e.target.id;
  if (i === 'fw') { F.w = e.target.value; $('#rl').innerHTML = recList(); }
  if (i === 'fd') { F.d = e.target.value; $('#rl').innerHTML = recList(); }
  if (i === 'cutsel') { S.cut = S.cuts.find(c => c.id === e.target.value); await loadCut(); render(); }
});
document.addEventListener('submit', async e => {
  e.preventDefault(); const i = e.target.id;
  try {
    if (i === 'lf') {
      const { error } = await sb.auth.signInWithPassword({ email: $('#le').value.trim(), password: $('#lp').value });
      if (error) return toast('Correo o contraseña incorrectos', 'err'); enter();
    } else if (i === 'pf') {
      const p = $('#p1').value; if (p.length < 8) return toast('La contraseña debe tener al menos 8 caracteres', 'err'); if (p !== $('#p2').value) return toast('Las contraseñas no coinciden', 'err');
      const { error } = await sb.auth.updateUser({ password: p }); if (error) throw error; enter();
    } else if (i === 'gs') { F.qs = $('#gsi').value.trim(); if (F.qs) go('buscar'); }
    else if (i === 'inv') { await api('invite', { email: $('#ie').value, redirectTo: location.origin }); toast('Invitación enviada'); await go('invitar'); }
    else if (i === 'cf') {
      const cut = $('#cc').value || null, w = $('#cwk').value || null, dt = $('#cd').value || null, rec = cut === S.cut?.id && w && dt ? S.recs.find(r => r.worker_id === w && r.work_date === dt) : null;
      await q(sb.from('comments').insert({ author_id: me.id, cut_id: cut, worker_id: w, record_date: dt, record_id: rec?.id || null, body: $('#cb').value.trim() }));
      toast('Comentario enviado'); await go('mensajes');
    }
  } catch (x) { toast(friendly(x), 'err'); }
});

/* ---------- Sesión ---------- */
const loginScreen = msg => { document.body.innerHTML = `<div class="login"><form id="lf" class="card"><div class="brand big">${I('sum')}<span>Control de Arrobas</span></div>${msg ? `<p class="err">${esc(msg)}</p>` : '<p class="mut">Inicia sesión para continuar</p>'}<label>Correo<input type="email" id="le" required autocomplete="username"></label><label>Contraseña<input type="password" id="lp" required autocomplete="current-password"></label><button class="b pri w">${I('logout')}Entrar</button><p><a href="#" data-a="forgot">Olvidé mi contraseña</a></p></form><small>${FOOT}</small></div><div id="toasts"></div>`; };
const passScreen = () => { document.body.innerHTML = `<div class="login"><form id="pf" class="card"><div class="brand big">${I('sum')}<span>Crea tu contraseña</span></div><label>Nueva contraseña (mínimo 8 caracteres)<input type="password" id="p1" required autocomplete="new-password"></label><label>Repite la contraseña<input type="password" id="p2" required autocomplete="new-password"></label><button class="b pri w">Guardar y entrar</button></form><small>${FOOT}</small></div><div id="toasts"></div>`; };
async function enter() {
  const { data: { user } } = await sb.auth.getUser();
  const p = user && (await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()).data;
  if (!p || !p.active) { await sb.auth.signOut(); return loginScreen('Tu acceso no está activo. Contacta al administrador.'); }
  me = p; view = 'inicio'; shell();
  try { await loadBase(); await loadCut(); } catch (e) { toast(friendly(e), 'err'); }
  render(); loadNotifs(); setInterval(loadNotifs, 30000);
}
(async function boot() {
  try {
    const cfg = await (await fetch('/api/config')).json(); if (cfg.error) throw new Error(cfg.error);
    sb = supabase.createClient(cfg.url, cfg.key);
    const inv = /type=(invite|recovery)/.test(location.hash);
    const { data: { session } } = await sb.auth.getSession();
    if (session && inv) { history.replaceState(null, '', location.pathname); return passScreen(); }
    session ? enter() : loginScreen();
  } catch (e) { document.body.innerHTML = `<p class="err" style="padding:2rem">No se pudo iniciar: ${esc(e.message)}. Revisa las variables de entorno.</p>`; }
})();
