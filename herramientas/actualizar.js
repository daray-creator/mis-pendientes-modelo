// Actualiza los datos que viajan dentro de ../index.html (no toca el diseño ni el código de la página).
// Fuentes (todas en ../cargas):
//   juntas/*.json            una por reunión o reporte: reunion, estatus, avances, items, cambios, semaforos, temasNuevos
//   calendario/*.json        lo que regresa Google Calendar (list_events)
//   minutas-enviadas.json    minutas encontradas en Gmail
//   config.json              ruta del archivo de KPIs y del Excel de dominós
// Uso:  node actualizar.js [plantilla.html]   (la plantilla solo se usa para cambiar el diseño)
// Es seguro correrlo varias veces: todo se suma por id y solo marca como "nuevo" lo que de verdad cambió.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const RAIZ = path.join(__dirname, '..'), CARGAS = path.join(RAIZ, 'cargas'), F = path.join(RAIZ, 'index.html');
const AHORA = Date.now(), HOY = new Date().toISOString().slice(0, 10);
const noon = d => new Date(d + 'T12:00:00').getTime();
const leer = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const log = { reuniones: 0, reunionesCal: 0, items: 0, estatus: 0, avances: 0, cambios: 0, semaforos: 0, minutas: 0, temas: 0 };
const faltan = [];

let html = fs.readFileSync(F, 'utf8');
const RX = /<script id="datos-incrustados" type="application\/json">([\s\S]*?)<\/script>/;
let D = JSON.parse(html.match(RX)[1]);
// Si en cargas/version-daray/ hay un archivo que ella descargó ("Descargar versión actual") más nuevo que lo último importado,
// sus datos pasan a ser la base: así lo que ella cerró, movió o borró nunca se vuelve a abrir.
(() => {
  const dir = path.join(CARGAS, 'version-daray'); if (!fs.existsSync(dir)) return;
  const fl = fs.readdirSync(dir).filter(x => /\.html?$/i.test(x)).map(x => path.join(dir, x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!fl.length) return;
  const U = JSON.parse(fs.readFileSync(fl[0], 'utf8').match(RX)[1]);
  if ((U.savedAt || 0) <= ((D.sync && D.sync.importadoDe) || 0)) return;
  const ap = D.sync && D.sync.aplicados, sr = D.sync && D.sync.semReporte;
  D = U; D.sync = D.sync || {}; if (ap) D.sync.aplicados = ap; if (sr) D.sync.semReporte = sr; D.sync.importadoDe = U.savedAt;
  log.importado = path.basename(fl[0]);
})();
D.version = 2; D.sync = D.sync || {}; D.lideres = D.lideres || [];
// Cada cambio de una junta se aplica una sola vez: si después ella lo modifica, no se le vuelve a imponer.
const primeraVez = !D.sync.aplicados; const APL = new Set(D.sync.aplicados || []);
// Para no duplicar: palabras clave de cada pendiente que ya existe (abierto o cerrado).
const VAC = new Set(['para', 'con', 'del', 'los', 'las', 'que', 'una', 'este', 'esta', 'sobre', 'cada']);
const clave = t => new Set(String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !VAC.has(w)));
const parecido = (a, b) => { const A = clave(a), B = clave(b); if (A.size < 2 || B.size < 2) return false; let c = 0; A.forEach(w => { if (B.has(w)) c++; }); return c >= 3 && c / Math.min(A.size, B.size) >= 0.6; };
log.duplicados = [];
const getR = id => D.reuniones.find(r => r.id === id), getI = id => D.items.find(i => i.id === id), getT = id => D.temas.find(t => t.id === id);

/* ---------- 1. juntas ---------- */
const juntas = fs.readdirSync(path.join(CARGAS, 'juntas')).filter(f => f.endsWith('.json')).map(f => leer(path.join(CARGAS, 'juntas', f)))
  .sort((a, b) => a.reunion.fecha.localeCompare(b.reunion.fecha));
const semFinal = {};
for (const j of juntas) {
  (j.temasNuevos || []).forEach(t => { if (!getT(t.id)) { D.temas.push(Object.assign({ estatus: [], upd: AHORA }, t)); log.temas++; } });
  const r = j.reunion;
  const ya = getR(r.id);
  if (!ya) { D.reuniones.push(Object.assign({ upd: AHORA }, r)); log.reuniones++; }
  else if (r.notas && !ya.notas) { ya.notas = r.notas; ya.upd = AHORA; log.reuniones++; } // reunión del calendario: solo se le agregan las notas si no tiene
  (j.estatus || []).forEach(s => {
    const t = getT(s.tema); if (!t) { faltan.push('tema ' + s.tema); return; }
    t.estatus = t.estatus || [];
    if (!t.estatus.some(x => x.id === s.id) && !(D.borrados || []).includes(s.id)) { t.estatus.push({ id: s.id, fecha: s.fecha || r.fecha, texto: s.texto, reunion: r.id }); log.estatus++; }
  });
  Object.entries(j.semaforos || {}).forEach(([id, est]) => { semFinal[id] = est; }); // solo cuenta el reporte más reciente
  if (j.semana) { // ciclo de 17 semanas: tipo "plan" (lunes, Yuri) o "cierre" (viernes, avance presentado)
    const w0 = j.semana; D.semanas = D.semanas || [];
    let w = D.semanas.find(x => x.n === w0.n); if (!w) { w = { n: w0.n }; D.semanas.push(w); }
    if (w0.desde) w.desde = w0.desde; if (w0.hasta) w.hasta = w0.hasta;
    const b = { fecha: w0.fecha || r.fecha, reunion: r.id, fuente: w0.fuente || '', senales: {} };
    Object.entries(w0.senales || {}).forEach(([tid, x]) => { b.senales[tid] = Object.assign({}, x, x.pasos ? { pasos: x.pasos.map((t, k) => ({ id: 's' + w0.n + '-' + tid + '-' + k, texto: t })) } : {}); });
    if (JSON.stringify(w[w0.tipo]) !== JSON.stringify(b)) { w[w0.tipo] = b; log.semanas = (log.semanas || 0) + 1; }
  }
  (j.items || []).forEach(i => {
    if (getI(i.id) || (D.borrados || []).includes(i.id)) return;
    const dup = !i.nuevoAunque && D.items.find(x => x.id !== i.id && parecido(x.titulo, i.titulo));
    if (dup) { log.duplicados.push(i.id + ' ≈ ' + dup.id + ' (' + dup.estado + ') ' + dup.titulo); return; }
    const it = Object.assign({ reunion: r.id, creado: noon(r.fecha), upd: AHORA }, i);
    if (it.hechoFecha) { it.hechoEn = noon(it.hechoFecha); delete it.hechoFecha; }
    D.items.push(it); log.items++;
  });
  (j.avances || []).forEach(a => {
    const it = getI(a.item); if (!it) { faltan.push('item ' + a.item); return; }
    it.avances = it.avances || [];
    if (!it.avances.some(x => x.id === a.id) && !(D.borrados || []).includes(a.id)) { it.avances.push({ id: a.id, fecha: a.fecha, texto: a.texto }); log.avances++; }
  });
  (j.cambios || []).forEach(c => { // pendientes que la reunión o el reporte dieron por cumplidos (o movieron)
    const k = r.id + '|' + c.item + '|' + JSON.stringify(c);
    if (APL.has(k)) return; APL.add(k); if (primeraVez) return; // la primera vez solo se registran (ya estaban aplicados)
    const it = getI(c.item); if (!it) { faltan.push('item ' + c.item); return; }
    let cambio = false;
    if (c.estado && it.estado !== c.estado) { it.estado = c.estado; if (c.estado === 'hecho') it.hechoEn = noon(c.hechoFecha || r.fecha); cambio = true; }
    if (c.fecha && it.fecha !== c.fecha) { it.fecha = c.fecha; it.revisar = ''; cambio = true; }
    Object.entries(c.set || {}).forEach(([k, v]) => { if (JSON.stringify(it[k]) !== JSON.stringify(v)) { it[k] = v; cambio = true; } });
    if (c.avance) { const id = 'a-' + c.item + '-' + r.id.slice(2); it.avances = it.avances || []; if (!it.avances.some(x => x.id === id)) { it.avances.push({ id, fecha: c.hechoFecha || r.fecha, texto: c.avance }); log.avances++; } }
    if (cambio) { it.upd = AHORA; log.cambios++; }
  });
}
const repSem = juntas.filter(j => j.semaforos).map(j => j.reunion.id).pop();
if (primeraVez || repSem === D.sync.semReporte) Object.keys(semFinal).forEach(k => delete semFinal[k]);
D.sync.semReporte = repSem;
Object.entries(semFinal).forEach(([id, est]) => {
  const t = getT(id); if (!t) { faltan.push("tema " + id); return; }
  if (t.estado !== est) { t.estado = est; t.upd = AHORA; log.semaforos++; }
});

/* ---------- 2. calendario ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/l00ps/g, 'loops').replace(/[^a-z0-9 ]+/g, ' ');
const VACIAS = new Set(['para', 'semana', 'desarrollo', 'estructura', 'reunion', 'junta', 'sesion', 'inicio', 'mensual', 'parte']);
const palabras = s => new Set(norm(s).split(/\s+/).filter(w => w.length >= 4 && !VACIAS.has(w)));
const calDir = path.join(CARGAS, 'calendario');
const eventos = [];
fs.readdirSync(calDir).filter(f => f.endsWith('.json')).forEach(f => (leer(path.join(calDir, f)).events || []).forEach(e => { if (!eventos.some(x => x.id === e.id)) eventos.push(e); }));
const emparejados = [];
eventos.forEach(e => {
  if (e.status === 'cancelled' || /🍕|🍔|🥗/.test(e.summary || '')) return;
  const ini = (e.start && (e.start.dateTime || e.start.date)) || '', fin = (e.end && (e.end.dateTime || e.end.date)) || '';
  const fecha = ini.slice(0, 10), hora = ini.length > 10 ? ini.slice(11, 16) : '', hfin = fin.length > 10 ? fin.slice(11, 16) : '';
  const asist = (e.attendees || []).length, org = (e.organizer || {}).email || '';
  const bloque = e.eventType === 'FOCUS_TIME' || asist === 0;
  const lleva = !bloque && /^daray@/.test(org) && asist >= 3 && !/revision de pendientes|recordatorio/i.test(norm(e.summary));
  const campos = { hora, fin: hfin, calId: e.id, asist, tipo: bloque ? 'bloque' : 'junta' };
  let r = D.reuniones.find(x => x.calId === e.id);
  if (!r) { // ¿es una reunión que ya existe por su transcript?
    const pw = palabras(e.summary); let best = null, bs = 0;
    D.reuniones.filter(x => x.fecha === fecha && !x.calId && x.tipo !== 'reporte').forEach(x => { const s = [...palabras(x.titulo)].filter(w => pw.has(w)).length; if (s > bs) { bs = s; best = x; } });
    if (best && bs >= 1) { r = best; emparejados.push(fecha + '  ' + e.summary + '  →  ' + best.titulo); }
  }
  if (r) {
    if (r.id.startsWith('c-')) { campos.fecha = fecha; campos.titulo = (e.summary || 'Reunión').trim(); } // si se movió de día o cambió de nombre en el calendario
    let cambio = false; Object.entries(campos).forEach(([k, v]) => { if (r[k] !== v) { r[k] = v; cambio = true; } });
    if (!r.minuta) { r.minuta = lleva ? 'pendiente' : 'no'; cambio = true; }
    if (cambio) r.upd = AHORA;
  } else {
    D.reuniones.push(Object.assign({ id: 'c-' + e.id, titulo: (e.summary || 'Reunión').trim(), fecha, notas: '', minuta: lleva ? 'pendiente' : 'no', upd: AHORA }, campos));
    log.reunionesCal++;
  }
});
// reuniones del calendario que ya no aparecen (se cancelaron o se movieron a otro evento): se ocultan, no se borran
const rangos = fs.readdirSync(calDir).filter(f => f.endsWith(".json")).map(f => { const fs2 = (leer(path.join(calDir, f)).events || []).map(e => ((e.start && (e.start.dateTime || e.start.date)) || "").slice(0, 10)).filter(Boolean).sort(); return [fs2[0], fs2[fs2.length - 1]]; });
const vivos = new Set(eventos.map(e => e.id));
D.reuniones.forEach(r => {
  if (!r.calId) return;
  const cubierta = rangos.some(([a, b]) => r.fecha >= a && r.fecha <= b), sigue = vivos.has(r.calId) && !eventos.find(e => e.id === r.calId && e.status === "cancelled");
  if (cubierta && !sigue && !r.cancelada) { r.cancelada = true; r.upd = AHORA; log.canceladas = (log.canceladas || 0) + 1; }
  if (sigue && r.cancelada) { r.cancelada = false; r.upd = AHORA; }
});
// reuniones que solo vienen de transcript (sin calendario): desde el 14-sep se les pide minuta
D.reuniones.forEach(r => { if (!r.minuta) { r.minuta = r.tipo === 'reporte' ? 'no' : r.fecha >= '2026-09-14' ? 'pendiente' : ''; } });

/* ---------- 3. minutas enviadas (Gmail) ---------- */
const mf = path.join(CARGAS, 'minutas-enviadas.json');
if (fs.existsSync(mf)) {
  const M = leer(mf);
  M.minutas.forEach(m => { const r = getR(m.reunion); if (!r) { faltan.push('reunión ' + m.reunion); return; } if (r.minuta !== 'enviada') { r.minuta = 'enviada'; r.minutaFecha = m.enviada; r.minutaTs = AHORA; log.minutas++; } });
  (M.noLlevan || []).forEach(id => { const r = getR(id); if (r && r.minuta !== 'no' && r.minuta !== 'enviada') { r.minuta = 'no'; r.minutaTs = AHORA; } });
  D.sync.gmail = M.revisadoHasta || HOY;
}
if (eventos.length) D.sync.calendario = HOY;
D.sync.drive = HOY;

/* ---------- 4. KPIs de líderes ---------- */
const cfgF = path.join(CARGAS, 'config.json'), cfg = fs.existsSync(cfgF) ? leer(cfgF) : {};
if (cfg.kpisHtml && fs.existsSync(cfg.kpisHtml)) {
  const K = JSON.parse(fs.readFileSync(cfg.kpisHtml, 'utf8').match(/<script type="application\/json" id="__DATA__">([\s\S]*?)<\/script>/)[1]);
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const ratio = k => { if (k.resultado == null || k.resultado === '') return null; const o = num(k.objetivo), r = num(k.resultado); let x = o === 0 ? (r <= 0 ? 1 : 0) : k.tipoMeta === 'meta_max' ? (r <= 0 ? 1 : o / r) : r / o; return Math.max(0, Math.min(1, x)); };
  const total = ks => ks.reduce((s, k) => { const x = ratio(k); return s + (x == null ? 0 : x * num(k.peso)); }, 0);
  const capt = ks => ks.filter(k => ratio(k) != null).length;
  const meses = K.meses, iUlt = Math.max(...meses.map((m, i) => K.leaders.some(l => capt(l.meses[m] || []) > 0) ? i : -1));
  const mUlt = meses[iUlt], mAct = meses[Math.min(iUlt + 1, meses.length - 1)];
  const EXTRA = { comercial: ['💼', ['Raúl', 'Raul'], 't-d-com'], mkt: ['📣', ['Carel', 'Karel'], 't-d-mkt'], contenido: ['🎬', ['Rafa', 'Rafael'], 't-d-mkt'], agencia: ['🔧', ['Campillo'], 't-d-agen'],
    rh: ['🧑‍🤝‍🧑', ['Rocha', 'Edgar'], 't-d-rh'], log: ['🚚', ['Jaime'], 't-d-log'], admin: ['📁', ['Perla'], 't-d-admin'], proy: ['🗂️', [], 't-s1'], asistente: ['🗒️', ['Majo', 'María José'], 't-s1'], gg: ['🏆', ['Gabriel'], ''] };
  const mesSig = (K.mesesLabel[meses[Math.min(meses.indexOf(mAct) + 1, meses.length - 1)]] || '').slice(0, 3).toLowerCase();
  D.lideres = K.leaders.map(l => { const u = l.meses[mUlt] || [], a = l.meses[mAct] || [], t = total(u), x = EXTRA[l.id] || ['●', [], ''];
    return { id: l.id, puesto: l.puesto, nombre: l.nombre, ico: x[0], alias: x[1], tema: x[2],
      ult: { mes: K.mesesLabel[mUlt], pct: capt(u) ? t : null, bono: t >= 0.7 ? Math.round(l.monto * t) : 0 },
      act: { mes: K.mesesLabel[mAct], capt: capt(a), total: a.length, revision: '1–7 ' + mesSig },
      califDaray: a.filter(k => /daray/i.test(k.calificador || '')).map(k => k.nombre.replace(/\s*\(.*?\)\s*/g, ' ').trim()) }; })
    .sort((a, b) => (b.ult.pct || 0) - (a.ult.pct || 0));
  D.sync.kpis = new Date(fs.statSync(cfg.kpisHtml).mtime).toISOString().slice(0, 10);
}

/* ---------- 5. dominós (Excel de Monday) ---------- */
// Cada registro de Monday entra como "elemento" de su dominó, con su nombre y su lugar originales, SIN clasificar
// (no se inventa si es proyecto, acción, etc.). Lo estancado o mixto queda "Requiere revisión". Se puede correr varias veces.
if (cfg.dominosXlsx && fs.existsSync(cfg.dominosXlsx)) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dom-'));
  const tarWin = path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe');
  cp.execFileSync(fs.existsSync(tarWin) ? tarWin : 'tar', ['-xf', cfg.dominosXlsx, '-C', tmp]);
  const x = fs.readFileSync(path.join(tmp, 'xl', 'worksheets', 'sheet1.xml'), 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  const dec = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
  const filas = [...x.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(r => { const o = {}; [...r[1].matchAll(/<c r="([A-Z]+)\d+"[^>]*>([\s\S]*?)<\/c>/g)].forEach(c => { o[c[1]] = dec((c[2].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('') || (c[2].match(/<v>([\s\S]*?)<\/v>/) || [])[1] || ''); }); return o; });
  const MAPA = { 1: 't-d-admin', 2: 't-d-exp', 3: 't-d-com', 4: 't-d-mkt', 5: 't-d-mkp', 6: 't-d-sou', 7: 't-d-rh', 8: 't-d-ti', 9: 't-d-log' };
  const MESN = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const limpia = s => String(s || '').replace(/[^\p{L}\p{N}\p{P}\p{S}\p{Zs}]/gu, '').replace(/\s+/g, ' ').trim();
  const slug = s => norm(s).trim().replace(/\s+/g, '-').slice(0, 40);
  const fechaG = g => { const m = /([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/.exec(g || ''); return m ? m[3] + '-' + MESN[m[1]] + '-' + m[2].padStart(2, '0') : ''; };
  const estado = c => ({ 'Completado': 'Completado', 'Cancelado': 'Cancelado', 'En proceso': 'En proceso', 'Stand By': 'Stand By' })[String(c || '').trim()] || 'Requiere revisión';
  D.elementos = D.elementos || [];
  const getE = id => D.elementos.find(e => e.id === id);
  let dom = 0, grupo = '', q = '', padre = null, nuevos = 0; const vistos = {}, info = {};
  filas.forEach(o => {
    const m = /^(\d+)\. Domin[oó]\s*(.*)$/.exec(o.A || ''); if (m && !o.C) { dom = +m[1]; info[dom] = { nombre: limpia(m[2]), coord: {}, act: '' }; padre = null; return; }
    if (!o.A || o.A === 'Name' || !dom || !MAPA[dom]) return;
    const act = fechaG(o.G); if (act > info[dom].act) info[dom].act = act;
    if (/^Dom\d+_Q\d/.test(o.A)) { grupo = o.A.trim(); q = /_Q(\d)/.exec(o.A)[1]; padre = null; info[dom].coord['Q' + q] = o.D || ''; return; }
    const nombre = limpia(o.A), esSub = !!(padre && padre.B && limpia(padre.B).includes(nombre));
    const base = 'el-' + dom + '-q' + q + '-' + (esSub ? slug(padre.nombre) + '--' : '') + slug(nombre);
    let id = base, k = 2; while (vistos[id]) id = base + '-' + k++; vistos[id] = 1;
    const [ini, fin] = (o.E || '').split(' - ').map(s => (s || '').trim());
    const mon = { grupo, nombre: String(o.A).trim(), padre: esSub ? padre.nombre : '', estado: o.C || '(sin estado)', dueno: o.D || '', crono: o.E || '', ctx: String(o.F || '').replace(/\s+/g, ' ').trim().slice(0, 700), act: o.G || '' };
    const ya = getE(id);
    if (ya) ya.mon = mon;
    else { D.elementos.push({ id, dom: MAPA[dom], nombre, tipo: '', padre: esSub ? padre.id : '', periodo: 'Q' + q + ' 2026', estado: estado(o.C),
      fechas: { inicio: /^\d{4}-\d\d-\d\d$/.test(ini) ? ini : '', compromiso: /^\d{4}-\d\d-\d\d$/.test(fin) ? fin : '' },
      origen: { tipo: 'Otro', notas: 'Importado de Monday (Dominos General Q4 2026)' }, mon, upd: AHORA }); nuevos++; }
    if (!esSub) padre = { id, nombre, B: o.B || '' };
  });
  log.elementos = nuevos;
  Object.entries(info).forEach(([n, i]) => { // la ficha del dominó: número y nombre oficiales; dueño y coordinador quedan por definir
    const t = getT(MAPA[n]); if (!t) return;
    t.mon = { coord: i.coord, act: i.act };
    t.proyectos = []; t.fuente = '';
    if (!t.ficha) { t.ficha = { numero: String(n), depto: i.nombre, proposito: '', dueno: '', coord: '', periodo: 'Q4 2026', inicio: '', objetivo: '', riesgos: '', obs: '' }; t.nombre = i.nombre; t.orden = +n; }
  });
  const agen = getT('t-d-agen'); // Agencia y Taller no es uno de los 9 dominós de Monday: pasa a temas comunes
  if (agen && agen.grupo === 'domino') agen.grupo = 'tema';
}

/* ---------- 6. dueños de dominó y sugerencias de IA ---------- */
// Daray coordina todos los dominós; el dueño es el líder del departamento (el último "Dueño / Coordinador" de Monday).
(D.temas || []).filter(t => t.grupo === 'domino' && t.ficha).forEach(t => {
  const c = t.mon && t.mon.coord ? Object.keys(t.mon.coord).sort().reverse().map(q => t.mon.coord[q]).find(Boolean) : '';
  if (!t.ficha.dueno && c) t.ficha.dueno = c;
  if (!t.ficha.coord) t.ficha.coord = 'Daray';
});
// Sugerencias: nunca se aplican solas; Daray las acepta en el sistema. Se identifican por dominó + nombre.
const sugDir = path.join(CARGAS, 'sugerencias-ia');
if (fs.existsSync(sugDir)) fs.readdirSync(sugDir).filter(f => f.endsWith('.json')).forEach(f => {
  const Sg = leer(path.join(sugDir, f)), fecha = new Date(Sg.fecha || HOY + 'T12:00:00').getTime();
  (Sg.sugerencias || []).forEach(s => {
    const cands = (D.elementos || []).filter(e => e.dom === s.dom && (e.nombre === s.nombre || (s.id && e.id === s.id)));
    const el = cands.find(e => !['Completado', 'Cancelado'].includes(e.estado)) || cands[0]; // si hay dos con el mismo nombre, el abierto
    cands.filter(e => e !== el && e.ia && e.ia.fecha === fecha).forEach(e => { delete e.ia; });
    if (!el) { faltan.push('elemento ' + s.nombre); return; }
    if (el.tipo || (el.ia && el.ia.fecha >= fecha)) return;
    el.ia = Object.assign({}, s, { fecha, estado: 'pendiente' }); delete el.ia.dom; delete el.ia.nombre; delete el.ia.id;
    log.sugerencias = (log.sugerencias || 0) + 1;
  });
});

/* ---------- dominós en pausa (config.json → domCongelados) ---------- */
(() => { const cfg = fs.existsSync(path.join(CARGAS, 'config.json')) ? leer(path.join(CARGAS, 'config.json')) : {}, dc = cfg.domCongelados; if (!dc) return;
  const k = JSON.stringify(dc); if (D.sync.domCongCfg === k) return; // solo cuando cambia la lista: si ella reactiva uno a mano, se respeta
  D.domCong = { ids: dc.ids, ts: AHORA, nota: dc.nota || '' }; D.sync.domCongCfg = k; log.domCongelados = dc.ids.length; })();
/* ---------- borradores de minuta (cargas/minutas-borrador/*.json) ---------- */
(() => { const dir = path.join(CARGAS, 'minutas-borrador'); if (!fs.existsSync(dir)) return; D.minutas = D.minutas || [];
  fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort().forEach(n => { const m = leer(path.join(dir, n));
    if (D.minutas.some(x => x.id === m.id) || (D.borrados || []).includes('min:' + m.id)) return; // nunca se pisa lo que ella ya editó
    m.upd = m.upd || AHORA; m.estado = 'borrador'; D.minutas.push(m); log.minutasBorrador = (log.minutasBorrador || 0) + 1; }); })();
/* ---------- guardar ---------- */
D.savedAt = 0; D.sync.aplicados = [...APL];
const json = JSON.stringify(D).replace(/</g, '\\u003c');
if (process.argv[2]) { // cambio de diseño: se usa la plantilla nueva con los estilos base del archivo actual
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].split('/* ================= v4')[0].trim();
  fs.copyFileSync(F, path.join(RAIZ, 'cargas', 'index-antes-' + HOY + '.html'));
  html = fs.readFileSync(process.argv[2], 'utf8').replace('__CSS_BASE__', () => css);
}
html = html.replace(RX, () => '<script id="datos-incrustados" type="application/json">' + json + '</script>');
fs.writeFileSync(F, html);
fs.writeFileSync(path.join(CARGAS, 'respaldo-datos.json'), JSON.stringify(D, null, 1));
console.log('Listo:', log);
if (emparejados.length) console.log('Calendario ↔ transcript:\n  ' + emparejados.join('\n  '));
if (faltan.length) console.log('No encontrados:', faltan);
if (log.duplicados.length) console.log('No se agregaron por parecerse a uno que ya existe (revisar):\n  ' + log.duplicados.join('\n  '));
