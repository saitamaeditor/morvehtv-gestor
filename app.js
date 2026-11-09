// MorvehTV Cuentas: panel para gestionar las cuentas del servidor de Emby. Habla con la API del
// servidor de MorvehTV (/api/panel/…) con un token que se guarda en este navegador; el servidor
// habla con Emby con su clave de API (aquí nunca se ve). Solo para administradores de MorvehTV.
(() => {
  const API = window.MORVEHTV.api;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };
  const DIA = 864e5;

  let token = null;
  try { token = localStorage.getItem('gestor-token'); } catch {}

  // ---------- Iconos (trazos de 24×24) ----------
  const TRAZOS = {
    resumen: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    cuentas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    directo: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m10 8.5 4 2.5-4 2.5z" fill="currentColor"/>',
    actividad: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    recargar: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
    salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    externo: '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    llave: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    pausa: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    play: '<path d="m6 4 14 8-14 8z"/>',
    papelera: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
    cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    copiar: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    ok: '<path d="M20 6 9 17l-5-5"/>',
    puntos: '<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
    renovar: '<path d="M3 12a9 9 0 0 1 15.36-6.36L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.36 6.36L3 16"/><path d="M3 21v-5h5"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alerta: '<path d="m10.3 3.9-8.1 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8.1-14a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    apagada: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    descargar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    pantalla: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    parar: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    flecha: '<path d="m6 9 6 6 6-6"/>',
    editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    red: '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="M12 8v3M12 11l-5.5 5.5M12 11l5.5 5.5"/>',
    moneda: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9A3 3 0 0 0 12 7.5c-1.7 0-3 1-3 2.3 0 3 6 1.5 6 4.4 0 1.3-1.3 2.3-3 2.3a3 3 0 0 1-2.8-1.5M12 6v1.5M12 16.5V18"/>',
    menos: '<path d="M5 12h14"/>',
  };
  const ico = (n, clase = '') => { const s = el('span', `ico ${clase}`); s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[n] ?? ''}</svg>`; return s; };
  const boton = (texto, clase = '', icono = null, titulo = null) => {
    const b = el('button', `boton ${clase}`); b.type = 'button';
    if (icono) b.append(ico(icono));
    if (texto) b.append(el('span', null, texto));
    if (titulo) { b.title = titulo; b.setAttribute('aria-label', titulo); }
    return b;
  };

  // ---------- Avisos ----------
  function aviso(texto, tipo = '') {
    const a = el('div', `aviso ${tipo}`);
    a.append(ico(tipo === 'mal' ? 'alerta' : 'ok'), el('span', null, texto));
    $('#avisos').append(a);
    setTimeout(() => a.classList.add('fuera'), 3200);
    setTimeout(() => a.remove(), 3600);
  }

  async function api(ruta, datos, metodo) {
    const r = await fetch(API + ruta, {
      method: metodo || (datos ? 'POST' : 'GET'),
      headers: { ...(datos && { 'content-type': 'application/json' }), ...(token && { authorization: `Bearer ${token}` }) },
      body: datos ? JSON.stringify(datos) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && ruta !== '/api/panel/entrar') { salir(); throw new Error(d.error || 'Vuelve a entrar'); }
    if (!r.ok) throw Object.assign(new Error(d.error || `Error ${r.status}`), { status: r.status, datos: d });
    return d;
  }

  // ---------- Ventanas y panel lateral ----------
  const pila = [];
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pila.length) pila[pila.length - 1](null); });
  // tipo: 'ventana' (centrada) o 'lateral' (se desliza desde la derecha)
  function capa(montar, { tipo = 'ventana', ancho = '', fija = false } = {}) {
    return new Promise((listo) => {
      const velo = el('div', `velo velo-${tipo}`);
      const v = el('div', `${tipo} ${ancho}`);
      v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
      velo.style.zIndex = 40 + pila.length;
      velo.append(v); document.body.append(velo);
      requestAnimationFrame(() => velo.classList.add('visible'));
      let hecho = false;
      const cerrar = (valor) => {
        if (hecho) return; hecho = true;
        pila.splice(pila.indexOf(cerrar), 1);
        velo.classList.remove('visible');
        setTimeout(() => velo.remove(), 180);
        listo(valor);
      };
      pila.push(cerrar);
      if (!fija) velo.addEventListener('mousedown', (e) => { if (e.target === velo) cerrar(null); });
      montar(v, cerrar);
    });
  }
  const ventana = (montar, op = {}) => capa(montar, { ...op, tipo: 'ventana' });
  const lateral = (montar, op = {}) => capa(montar, { ...op, tipo: 'lateral' });

  function pieBotones(v, cerrar, textoSi, clase, alSi) {
    const fila = el('div', 'botones');
    const no = boton('Cancelar'); no.onclick = () => cerrar(null);
    const si = boton(textoSi, clase); si.onclick = alSi;
    fila.append(no, si); v.append(fila);
    return si;
  }
  const pedirTexto = (titulo, explicacion, valor = '', textoSi = 'Aceptar') => ventana((v, cerrar) => {
    v.append(el('h2', null, titulo));
    if (explicacion) v.append(el('p', null, explicacion));
    const i = el('input'); i.value = valor; i.spellcheck = false; i.className = 'mono'; v.append(i);
    const si = pieBotones(v, cerrar, textoSi, 'primario', () => { if (i.value.trim()) cerrar(i.value.trim()); });
    i.onkeydown = (e) => { if (e.key === 'Enter') si.click(); };
    i.focus(); i.select();
  });
  const confirmar = (titulo, texto, textoSi, peligro) => ventana((v, cerrar) => {
    const cab = el('div', 'cab-confirmar');
    cab.append(ico(peligro ? 'alerta' : 'ok', peligro ? 'tono-mal' : 'tono-acento'), el('h2', null, titulo));
    v.append(cab, el('p', null, texto));
    pieBotones(v, cerrar, textoSi, peligro ? 'peligro lleno' : 'primario', () => cerrar(true)).focus();
  });
  // Contraseña segura al azar (sin letras que se confunden: 0/O, 1/l/I)
  function claveAlAzar() {
    const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const n = new Uint32Array(12); crypto.getRandomValues(n);
    return [...n].map((x) => letras[x % letras.length]).join('');
  }

  // ---------- Formato ----------
  const fechaCorta = (f) => new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  function haceCuanto(f) {
    if (!f) return 'Nunca';
    const s = (Date.now() - new Date(f).getTime()) / 1000;
    if (s < 90) return 'Ahora mismo';
    if (s < 3600) return `Hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `Hace ${Math.round(s / 3600)} h`;
    if (s < 86400 * 30) { const n = Math.round(s / 86400); return `Hace ${n} ${n === 1 ? 'día' : 'días'}`; }
    return fechaCorta(f);
  }
  const diasHasta = (f) => Math.ceil((new Date(f).getTime() - Date.now()) / DIA);
  function estadoDe(u) {
    if (u.admin) return { clave: 'admin', texto: 'Administrador', tono: 'morado' };
    if (u.caducada) return { clave: 'caducada', texto: 'Caducada', tono: 'mal' };
    if (u.desactivada) return { clave: 'desactivada', texto: 'Desactivada', tono: 'gris' };
    if (u.caduca && diasHasta(u.caduca) <= 7) return { clave: 'pronto', texto: 'Caduca pronto', tono: 'aviso' };
    return { clave: 'activa', texto: 'Activa', tono: 'bien' };
  }
  function textoCaducidad(u) {
    if (!u.caduca) return 'Sin caducidad';
    const n = diasHasta(u.caduca);
    if (n < 0) return `Caducó hace ${-n} ${-n === 1 ? 'día' : 'días'}`;
    if (n === 0) return 'Caduca hoy';
    if (n === 1) return 'Caduca mañana';
    return `Quedan ${n} días`;
  }
  // Lo que queda del periodo pagado (0 a 100), para la barra
  function restante(u) {
    if (!u.caduca) return null;
    const fin = new Date(u.caduca).getTime(); const ini = new Date(u.desde || u.creada || Date.now()).getTime();
    if (fin <= Date.now()) return 0;
    return Math.max(3, Math.min(100, Math.round(((fin - Date.now()) / Math.max(DIA, fin - ini)) * 100)));
  }
  const insignia = (e) => { const s = el('span', `insignia tono-${e.tono}`); s.append(el('i'), document.createTextNode(e.texto)); return s; };
  const colorDe = (n) => { let h = 0; for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h} 52% 46%)`; };
  function avatar(u, grande = false) {
    const a = el('div', `avatar${grande ? ' grande' : ''}`, (String(u.nombre).trim()[0] || '?').toUpperCase());
    a.style.setProperty('--c', colorDe(u.nombre));
    if (u.viendo?.length) a.append(el('i', 'punto viendo'));
    else if (u.conectado) a.append(el('i', 'punto'));
    return a;
  }
  function barraCaducidad(u) {
    const caja = el('div', 'caducidad');
    const e = estadoDe(u);
    const p = restante(u);
    const linea = el('div', 'caducidad-texto');
    linea.append(el('b', null, textoCaducidad(u)));
    if (u.caduca) linea.append(el('small', null, fechaCorta(u.caduca)));
    caja.append(linea);
    if (p != null) { const b = el('div', `barra tono-${e.clave === 'pronto' ? 'aviso' : e.clave === 'caducada' ? 'mal' : e.clave === 'desactivada' ? 'gris' : 'bien'}`); const r = el('i'); r.style.width = `${p}%`; b.append(r); caja.append(b); }
    return caja;
  }

  // ---------- Entrar y salir ----------
  function salir() {
    if (token?.startsWith('rv_')) fetch(`${API}/api/panel/emby/salir`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}' }).catch(() => {});
    token = null;
    try { localStorage.removeItem('gestor-token'); } catch {}
    pila.slice().forEach((c) => c(null));
    $('#vista-panel').hidden = true; $('#vista-entrar').hidden = false;
    $('#e-usuario').focus();
  }
  $('#salir').onclick = salir;
  $('#salir-movil').onclick = salir;
  $('#f-entrar').onsubmit = async (e) => {
    e.preventDefault();
    $('#e-error').textContent = '';
    const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Entrando…';
    try {
      const cred = { usuario: $('#e-usuario').value, clave: $('#e-clave').value };
      // Primero como administrador de MorvehTV; si no, como revendedor
      let r;
      try { r = await api('/api/panel/entrar', cred); } catch (e1) {
        if (![401, 403].includes(e1.status)) throw e1;
        try { r = await api('/api/panel/emby/entrar', cred); } catch (e2) { throw e2.status === 401 ? e1 : e2; }
      }
      token = r.token;
      try { localStorage.setItem('gestor-token', token); } catch {}
      $('#e-clave').value = '';
      arrancar(r);
    } catch (err) {
      $('#e-error').textContent = err.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor: prueba en unos segundos' : err.message;
    }
    b.disabled = false; b.textContent = 'Entrar';
  };

  // ---------- Estado del panel ----------
  let d = null;          // lo último que dijo el servidor
  let actividad = [];    // registro de acciones (administrador) o movimientos (revendedores)
  let revs = [];         // revendedores que puedo gestionar
  let vista = 'resumen';
  let rol = 'admin';     // admin, super o revendedor
  const filtros = { estado: 'todas', busca: '', orden: 'nombre', sube: true, dueno: '' };
  const TODAS_VISTAS = {
    resumen: { titulo: 'Resumen', sub: 'Cómo está tu servidor de un vistazo', icono: 'resumen' },
    cuentas: { titulo: 'Cuentas', sub: 'Crea, renueva y controla quién entra en tu Emby', icono: 'cuentas' },
    revendedores: { titulo: 'Revendedores', sub: 'Quién vende cuentas y cuántos créditos tiene', icono: 'red' },
    directo: { titulo: 'En directo', sub: 'Lo que se está viendo ahora mismo', icono: 'directo' },
    actividad: { titulo: 'Actividad', sub: 'Todo lo que se ha hecho desde este panel', icono: 'actividad' },
  };
  let VISTAS = TODAS_VISTAS;
  const NOMBRE_ROL = { admin: 'Administrador', super: 'Superrevendedor', revendedor: 'Revendedor' };
  const esRevendedor = () => rol !== 'admin';
  const creditos = () => d?.yo?.creditos ?? 0;
  const costeMes = () => d?.costeMes ?? 1;
  const textoCreditos = (n) => `${n} ${n === 1 ? 'crédito' : 'créditos'}`;

  function arrancar(yo) {
    if (!['admin', 'super', 'revendedor'].includes(yo.rol)) {
      salir();
      $('#e-error').textContent = 'Este panel es solo para administradores y revendedores';
      return;
    }
    rol = yo.rol;
    VISTAS = Object.fromEntries(Object.entries(TODAS_VISTAS).filter(([k]) => k !== 'revendedores' || rol !== 'revendedor'));
    if (rol !== 'admin') { VISTAS.cuentas = { ...VISTAS.cuentas, sub: 'Tus clientes: crea, renueva y controla sus cuentas' }; VISTAS.actividad = { ...VISTAS.actividad, sub: 'Tus movimientos de créditos y cuentas' }; }
    if (rol === 'super') VISTAS.revendedores = { ...VISTAS.revendedores, sub: 'Tus revendedores: dales créditos y controla lo que venden' };
    filtros.dueno = '';
    const nombre = yo.nombre || yo.usuario;
    $('#yo-nombre').textContent = nombre;
    $('#yo-rol').textContent = NOMBRE_ROL[rol];
    $('#yo-avatar').textContent = nombre[0].toUpperCase();
    $('#yo-avatar').style.setProperty('--c', colorDe(nombre));
    $('#vista-entrar').hidden = true; $('#vista-panel').hidden = false;
    d = null;
    irA(location.hash.slice(1) || 'resumen', false);
    cargar();
  }

  function pintarMenu() {
    const menu = $('#menu'); menu.innerHTML = '';
    for (const [k, x] of Object.entries(VISTAS)) {
      const a = el('a', vista === k ? 'activa' : ''); a.href = `#${k}`;
      a.append(ico(x.icono), el('span', null, x.titulo));
      if (d?.configurado && k === 'cuentas') a.append(el('small', 'contador', String(d.usuarios.filter((u) => !u.admin).length)));
      if (d?.configurado && k === 'directo') { const n = d.usuarios.reduce((t, u) => t + u.viendo.length, 0); if (n) a.append(el('small', 'contador vivo', String(n))); }
      if (k === 'revendedores' && revs.length) a.append(el('small', 'contador', String(revs.length)));
      a.onclick = (e) => { e.preventDefault(); irA(k); };
      menu.append(a);
    }
    // Saldo (revendedores)
    const sal = $('#saldo'); sal.innerHTML = '';
    sal.hidden = !esRevendedor() || !d;
    if (esRevendedor() && d) {
      const c = el('div', 'saldo-cab'); c.append(ico('moneda'), el('span', null, 'Tus créditos'));
      sal.append(c, el('b', creditos() ? null : 'tono-mal', String(creditos())), el('small', null, `${textoCreditos(costeMes())} = 1 mes de cuenta`));
      $('#saldo-movil').textContent = String(creditos());
    }
    $('#saldo-movil-caja').hidden = !esRevendedor() || !d;
    const s = $('#servidor'); s.innerHTML = '';
    if (d?.configurado) {
      const cab = el('div', 'servidor-cab'); cab.append(el('i', 'punto-vivo'), el('b', null, d.nombreServidor || 'Emby'));
      if (d.version) cab.append(el('small', null, `v${d.version}`));
      const enl = el('a', 'servidor-enlace'); enl.href = d.servidor; enl.target = '_blank'; enl.rel = 'noopener';
      enl.append(el('span', null, d.servidor.replace(/^https?:\/\//, '')), ico('externo'));
      s.append(cab, enl);
    } else if (d) {
      const cab = el('div', 'servidor-cab'); cab.append(el('i', 'punto-vivo apagado'), el('b', null, 'Emby sin conectar'));
      s.append(cab);
    }
  }

  function irA(k, cambiarUrl = true) {
    if (!VISTAS[k]) k = 'resumen';
    vista = k;
    if (cambiarUrl) history.replaceState(null, '', `#${k}`);
    pintarMenu();
    pintar(false);
  }
  window.addEventListener('hashchange', () => { const k = location.hash.slice(1); if (k && k !== vista) irA(k, false); });

  async function cargar(callado = false) {
    try {
      const [res, reg, rv] = await Promise.all([
        api('/api/panel/emby'),
        api(esRevendedor() ? '/api/panel/emby/movimientos' : '/api/panel/registro').catch(() => []),
        rol === 'revendedor' ? [] : api('/api/panel/emby/revendedores').catch(() => []),
      ]);
      d = res;
      actividad = (Array.isArray(reg) ? reg : []).filter((x) => esRevendedor() || /emby|revendedor|créditos/i.test(x.accion));
      revs = Array.isArray(rv) ? rv : [];
    } catch (e) {
      if (callado && d) return;
      const v = $('#vista'); v.innerHTML = ''; v.append(cabecera());
      const f = el('div', 'tarjeta fallo'); f.append(ico('alerta', 'tono-mal'));
      const t = el('div'); t.append(el('b', null, 'No se pudo conectar'), el('span', null, e.message)); f.append(t);
      const r = boton('Reintentar', '', 'recargar'); r.onclick = () => cargar();
      f.append(r);
      v.append(f);
      return;
    }
    pintarMenu();
    // Si estás escribiendo o con una ventana abierta, no se toca la vista (solo el menú)
    if (callado && (pila.length || document.activeElement?.matches('input, textarea') || menuAbierto)) return;
    pintar();
  }
  // Se actualiza solo: cada 15 s en «En directo», cada minuto en lo demás
  let pasos = 0;
  setInterval(() => {
    if (!token || $('#vista-panel').hidden || document.visibilityState !== 'visible' || !d?.configurado) return;
    pasos += 1;
    if (vista === 'directo' || pasos % 4 === 0) cargar(true);
  }, 15000);
  const actualizar = async () => { await cargar(true); pintar(); };

  // ---------- Cabecera de cada vista ----------
  function cabecera() {
    const x = VISTAS[vista];
    const c = el('header', 'cab-pagina');
    const t = el('div', 'cab-texto'); t.append(el('h1', null, x.titulo), el('p', null, x.sub));
    const acc = el('div', 'cab-acciones');
    const rec = boton(null, 'icono', 'recargar', 'Actualizar');
    rec.onclick = async () => { rec.classList.add('girando'); await actualizar(); };
    acc.append(rec);
    if (vista === 'revendedores') { const n = boton('Nuevo revendedor', 'primario', 'mas'); n.onclick = () => fichaRevendedor(); acc.append(n); }
    else if (d?.configurado) { const n = boton('Nueva cuenta', 'primario', 'mas'); n.onclick = () => fichaCuenta(null); acc.append(n); }
    c.append(t, acc);
    return c;
  }

  function pintar(mantenerScroll = true) {
    const v = $('#vista');
    const scroll = window.scrollY;
    v.innerHTML = '';
    v.append(cabecera());
    if (!d) { v.append(esqueleto()); return; }
    if (!d.configurado) { v.append(sinConfigurar()); return; }
    ({ resumen: vistaResumen, cuentas: vistaCuentas, revendedores: vistaRevendedores, directo: vistaDirecto, actividad: vistaActividad })[vista](v);
    window.scrollTo(0, mantenerScroll ? scroll : 0);
  }
  function esqueleto() {
    const c = el('div', 'esqueleto');
    const k = el('div', 'kpis'); for (let i = 0; i < 4; i++) k.append(el('div', 'kpi hueso'));
    c.append(k, el('div', 'tarjeta hueso alto'));
    return c;
  }
  function sinConfigurar() {
    const c = el('div', 'tarjeta vacia');
    c.append(ico('escudo', 'grande tono-acento'), el('h3', null, 'Falta conectar el panel con tu Emby'),
      el('p', null, 'En Emby, ve a Ajustes → Claves de API → Nueva clave. Después, en la VPS, añade EMBY_URL y EMBY_API_KEY al archivo /etc/morvehtv/visor.env y reinicia MorvehTV. La clave se queda solo en el servidor.'));
    return c;
  }

  const normales = () => d.usuarios.filter((u) => !u.admin);
  const cuenta = (k) => normales().filter((u) => estadoDe(u).clave === k).length;
  const sesiones = () => d.usuarios.flatMap((u) => u.viendo.map((x) => ({ u, x })));

  // ---------- Resumen ----------
  function vistaResumen(v) {
    const viendo = sesiones();
    const personas = new Set(viendo.map((x) => x.u.id)).size;
    const kpis = el('div', 'kpis');
    const kpi = (icono, tono, n, texto, detalle, alPulsar) => {
      const k = el('button', `kpi tono-${tono}`); k.type = 'button';
      const cab = el('div', 'kpi-cab'); cab.append(el('span', null, texto), ico(icono, 'kpi-ico'));
      k.append(cab, el('b', null, String(n)), el('small', null, detalle));
      k.onclick = alPulsar;
      return k;
    };
    const cajas = [
      kpi('cuentas', 'acento', cuenta('activa') + cuenta('pronto'), 'Cuentas activas', `de ${normales().length} en total`, () => { filtros.estado = 'activas'; irA('cuentas'); }),
      kpi('directo', 'vivo', viendo.length, 'Viendo ahora', viendo.length ? `${personas} ${personas === 1 ? 'persona' : 'personas'}` : 'Nadie en este momento', () => irA('directo')),
      kpi('reloj', 'aviso', cuenta('pronto'), 'Caducan en 7 días', cuenta('pronto') ? 'Renuévalas a tiempo' : 'Todo al día', () => { filtros.estado = 'pronto'; irA('cuentas'); }),
      kpi('apagada', 'mal', cuenta('caducada') + cuenta('desactivada'), 'Sin acceso', `${cuenta('caducada')} caducadas · ${cuenta('desactivada')} desactivadas`, () => { filtros.estado = 'apagadas'; irA('cuentas'); }),
    ];
    // Los revendedores ven primero su saldo
    if (esRevendedor()) cajas.splice(3, 1), cajas.unshift(kpi('moneda', 'morado', creditos(), 'Créditos', `${textoCreditos(costeMes())} = 1 mes de cuenta`, () => irA(rol === 'super' ? 'revendedores' : 'actividad')));
    else if (revs.length) cajas.splice(3, 1, kpi('red', 'morado', revs.length, 'Revendedores', `${revs.reduce((t, x) => t + x.creditos, 0)} créditos repartidos`, () => irA('revendedores')));
    kpis.append(...cajas);
    v.append(kpis);

    const rejilla = el('div', 'rejilla-resumen');
    const proximas = normales().filter((u) => u.caduca && (u.caducada || !u.desactivada) && diasHasta(u.caduca) <= 15)
      .sort((a, b) => new Date(a.caduca) - new Date(b.caduca)).slice(0, 6);
    const t1 = tarjeta('Próximas caducidades', 'reloj', proximas.length ? null : 'Ninguna cuenta caduca en los próximos 15 días.');
    for (const u of proximas) {
      const f = el('div', 'linea clicable');
      const q = el('div', 'linea-quien'); q.append(el('b', null, u.nombre), el('small', u.caducada ? 'tono-mal' : diasHasta(u.caduca) <= 7 ? 'tono-aviso' : null, u.caducada ? `Caducó el ${fechaCorta(u.caduca)}` : `${textoCaducidad(u)} · ${fechaCorta(u.caduca)}`));
      const r = boton('Renovar', 'fino', 'renovar'); r.onclick = (e) => { e.stopPropagation(); renovar(u); };
      f.append(avatar(u), q, r); f.onclick = () => fichaCuenta(u);
      t1.cuerpo.append(f);
    }
    const t2 = tarjeta('Viendo ahora', 'directo', viendo.length ? null : 'Nadie está viendo nada ahora mismo.');
    for (const { u, x } of viendo.slice(0, 5)) t2.cuerpo.append(lineaViendo(u, x, true));
    if (viendo.length > 5) { const m = boton(`Ver las ${viendo.length}`, 'enlace'); m.onclick = () => irA('directo'); t2.cuerpo.append(m); }
    const ultimas = normales().filter((u) => u.creada).sort((a, b) => new Date(b.creada) - new Date(a.creada)).slice(0, 5);
    const t3 = tarjeta('Últimas cuentas', 'cuentas', ultimas.length ? null : 'Todavía no hay cuentas.');
    for (const u of ultimas) {
      const f = el('div', 'linea clicable');
      const q = el('div', 'linea-quien'); q.append(el('b', null, u.nombre), el('small', null, `Creada ${haceCuanto(u.creada).toLowerCase()}`));
      f.append(avatar(u), q, insignia(estadoDe(u))); f.onclick = () => fichaCuenta(u);
      t3.cuerpo.append(f);
    }
    const t4 = tarjeta('Actividad reciente', 'actividad', actividad.length ? null : 'Aún no hay movimientos.');
    for (const x of actividad.slice(0, 6)) t4.cuerpo.append(lineaActividad(x));
    if (actividad.length > 6) { const m = boton('Ver toda la actividad', 'enlace'); m.onclick = () => irA('actividad'); t4.cuerpo.append(m); }
    rejilla.append(t1.caja, t2.caja, t3.caja, t4.caja);
    v.append(rejilla);
  }

  function tarjeta(titulo, icono, vacio) {
    const caja = el('section', 'tarjeta');
    const cab = el('div', 'tarjeta-cab'); cab.append(ico(icono), el('h3', null, titulo));
    const cuerpo = el('div', 'tarjeta-cuerpo');
    if (vacio) cuerpo.append(el('p', 'tarjeta-vacia', vacio));
    caja.append(cab, cuerpo);
    return { caja, cuerpo };
  }

  function lineaViendo(u, x, corta = false) {
    const f = el('div', 'linea viendo');
    const q = el('div', 'linea-quien');
    q.append(el('b', null, x.titulo || 'Reproduciendo'), el('small', null, `${u.nombre}${x.dispositivo ? ` · ${x.dispositivo}` : ''}`));
    if (x.progreso != null) { const b = el('div', 'barra tono-acento fina'); const r = el('i'); r.style.width = `${x.progreso}%`; b.append(r); q.append(b); }
    f.append(avatar(u), q, el('span', `chip ${x.pausado ? '' : 'vivo'}`, x.pausado ? 'En pausa' : 'En directo'));
    if (!corta && !u.admin) { const c = boton('Cortar', 'fino peligro', 'parar'); c.onclick = () => cortar(u); f.append(c); }
    return f;
  }

  function lineaActividad(x) {
    const f = el('div', 'linea-actividad');
    const texto = x.accion.replace(/ (la )?cuenta de Emby /, ' ').replace(/ la cuenta /, ' ').replace(/^./, (c) => c.toUpperCase());
    const tipo = /crédito/.test(x.accion) ? ['moneda', 'morado'] : /revendedor/.test(x.accion) && /crea/.test(x.accion) ? ['red', 'bien'] : /crea/.test(x.accion) ? ['mas', 'bien']
      : /borra/.test(x.accion) ? ['papelera', 'mal'] : /renueva/.test(x.accion) ? ['renovar', 'acento'] : /devolución/.test(x.accion) ? ['renovar', 'gris']
      : /contraseña/.test(x.accion) ? ['llave', 'morado'] : /desactiva|suspende/.test(x.accion) ? ['pausa', 'gris'] : /activa/.test(x.accion) ? ['play', 'bien'] : ['editar', 'acento'];
    f.append(ico(tipo[0], `act-ico tono-${tipo[1]}`));
    const t = el('div', 'act-texto'); t.append(el('span', null, texto), el('small', null, `${x.usuario} · ${haceCuanto(x.fecha)}`));
    f.append(t);
    if (x.creditos) f.append(el('span', `chip-creditos ${x.creditos > 0 ? 'mas' : 'menos'}`, `${x.creditos > 0 ? '+' : '−'}${Math.abs(x.creditos)}`));
    else if (x.ajeno) { const c = el('span', 'chip-creditos ajeno', `${x.ajeno > 0 ? '+' : '−'}${Math.abs(x.ajeno)}`); c.title = 'Créditos de otro, no de tu saldo'; f.append(c); }
    return f;
  }

  // ---------- Cuentas ----------
  function vistaCuentas(v) {
    const n = { todas: normales().length, activas: cuenta('activa') + cuenta('pronto'), pronto: cuenta('pronto'), caducadas: cuenta('caducada'), desactivadas: cuenta('desactivada'), apagadas: cuenta('caducada') + cuenta('desactivada') };
    const barra = el('div', 'barra-herramientas');
    const pestanas = el('div', 'segmentos');
    const opciones = [['todas', 'Todas'], ['activas', 'Activas'], ['pronto', 'Caducan pronto'], ['caducadas', 'Caducadas'], ['desactivadas', 'Desactivadas']];
    if (filtros.estado === 'apagadas') opciones.push(['apagadas', 'Sin acceso']);
    for (const [k, t] of opciones) {
      const b = el('button', filtros.estado === k ? 'activa' : ''); b.type = 'button';
      b.append(el('span', null, t), el('small', null, String(n[k])));
      b.onclick = () => { filtros.estado = k; pintar(); };
      pestanas.append(b);
    }
    const busca = el('label', 'buscador'); busca.append(ico('buscar'));
    const i = el('input'); i.type = 'search'; i.placeholder = 'Buscar por usuario o nota'; i.value = filtros.busca;
    busca.append(i);
    const exportar = boton('Exportar', '', 'descargar', 'Descargar la lista en CSV (se abre con Excel)'); exportar.onclick = exportarCsv;
    const herramientas = el('div', 'herramientas');
    // Filtrar por revendedor (administrador y superrevendedores)
    if (revs.length) {
      const sel = el('select', 'selector'); sel.setAttribute('aria-label', 'Revendedor');
      [['', 'Todos los vendedores'], ['propias', rol === 'admin' ? 'Solo las mías (sin revendedor)' : 'Solo las mías'], ...revs.map((x) => [x.id, `${x.nombre} (${x.rol === 'super' ? 'super' : 'revendedor'})`])]
        .forEach(([v2, t]) => { const o = el('option', null, t); o.value = v2; sel.append(o); });
      sel.value = filtros.dueno;
      sel.onchange = () => { filtros.dueno = sel.value; pintarFilas(); };
      herramientas.append(sel);
    }
    herramientas.append(busca, exportar);
    barra.append(pestanas, herramientas);
    v.append(barra);

    const tabla = el('div', 'tabla');
    const cols = [['nombre', 'Usuario'], ['estado', 'Estado'], ['caduca', 'Caducidad'], ['pantallas', 'Pantallas'], ['bibliotecas', 'Bibliotecas'], ['acceso', 'Último acceso'], [null, '']];
    const cab = el('div', 'fila cab');
    const pintarCab = () => {
      cab.innerHTML = '';
      for (const [k, t] of cols) {
        const c = el(k ? 'button' : 'div', `celda c-${k || 'acciones'}${k && filtros.orden === k ? ' ordenada' : ''}`);
        if (k) {
          c.type = 'button'; c.append(el('span', null, t));
          if (filtros.orden === k) c.append(ico('flecha', filtros.sube ? '' : 'girada'));
          c.onclick = () => { filtros.sube = filtros.orden === k ? !filtros.sube : true; filtros.orden = k; pintarCab(); pintarFilas(); };
        }
        cab.append(c);
      }
    };
    pintarCab();
    const cuerpo = el('div', 'tabla-cuerpo');
    tabla.append(cab, cuerpo);
    const pie = el('div', 'pie-tabla');
    v.append(tabla, pie);

    function pintarFilas() {
      cuerpo.innerHTML = '';
      const q = filtros.busca.trim().toLowerCase();
      const peso = { admin: 0, activa: 1, pronto: 2, desactivada: 3, caducada: 4 };
      const lista = d.usuarios.filter((u) => {
        const e = estadoDe(u).clave; const f = filtros.estado;
        if (f !== 'todas' && u.admin) return false;
        if (f === 'activas' && !['activa', 'pronto'].includes(e)) return false;
        if (f === 'pronto' && e !== 'pronto') return false;
        if (f === 'caducadas' && e !== 'caducada') return false;
        if (f === 'desactivadas' && e !== 'desactivada') return false;
        if (f === 'apagadas' && !['caducada', 'desactivada'].includes(e)) return false;
        if (filtros.dueno === 'propias' && (u.admin || (u.dueno && revs.some((x) => x.id === u.dueno)))) return false;
        if (filtros.dueno && filtros.dueno !== 'propias' && u.dueno !== filtros.dueno) return false;
        return !q || u.nombre.toLowerCase().includes(q) || (u.nota || '').toLowerCase().includes(q);
      });
      const val = {
        nombre: (u) => u.nombre.toLowerCase(),
        estado: (u) => peso[estadoDe(u).clave],
        caduca: (u) => (u.admin ? -Infinity : u.caduca ? new Date(u.caduca).getTime() : Infinity),
        pantallas: (u) => (u.admin ? -1 : u.pantallas || 99),
        bibliotecas: (u) => (u.todas || u.admin ? 999 : u.bibliotecas.length),
        acceso: (u) => (u.ultimoAcceso ? -new Date(u.ultimoAcceso).getTime() : Infinity),
      }[filtros.orden];
      lista.sort((a, b) => {
        if (filtros.orden === 'nombre' && a.admin !== b.admin) return a.admin ? -1 : 1;
        const x = val(a); const y = val(b);
        const r = x < y ? -1 : x > y ? 1 : a.nombre.localeCompare(b.nombre, 'es');
        return filtros.sube ? r : -r;
      });
      if (!lista.length) {
        const vacio = el('div', 'tabla-vacia');
        vacio.append(ico(normales().length ? 'buscar' : 'cuentas', 'grande'), el('b', null, normales().length ? 'Ninguna cuenta coincide' : 'Todavía no hay cuentas'),
          el('span', null, normales().length ? 'Prueba con otra búsqueda o cambia el filtro.' : 'Crea la primera para empezar.'));
        if (!normales().length) { const b = boton('Nueva cuenta', 'primario', 'mas'); b.onclick = () => fichaCuenta(null); vacio.append(b); }
        cuerpo.append(vacio);
      }
      for (const u of lista) cuerpo.append(filaCuenta(u));
      const total = normales().length;
      pie.textContent = `${lista.filter((u) => !u.admin).length} de ${total} ${total === 1 ? 'cuenta' : 'cuentas'} · ${d.bibliotecas.length} ${d.bibliotecas.length === 1 ? 'biblioteca' : 'bibliotecas'} en el servidor`;
    }
    i.oninput = () => { filtros.busca = i.value; pintarFilas(); };
    pintarFilas();
  }

  function filaCuenta(u) {
    const e = estadoDe(u);
    const f = el('div', `fila estado-${e.clave}`);
    const c1 = el('div', 'celda c-nombre');
    const q = el('div', 'linea-quien'); q.append(el('b', null, u.nombre));
    const vendedor = u.dueno && revs.some((x) => x.id === u.dueno) ? u.duenoNombre : null;
    if (u.viendo.length) q.append(el('small', 'tono-vivo', `▶ ${u.viendo[0].titulo}`));
    else if (vendedor || u.nota) {
      const s = el('small');
      if (vendedor) s.append(el('span', 'vendedor', vendedor));
      if (u.nota) s.append(document.createTextNode(u.nota));
      q.append(s);
    } else if (u.admin) q.append(el('small', null, 'Cuenta de administración'));
    else q.append(el('small', null, u.creada ? `Desde ${fechaCorta(u.creada)}` : ''));
    c1.append(avatar(u), q);
    const c2 = el('div', 'celda c-estado'); c2.append(insignia(e));
    const c3 = el('div', 'celda c-caduca'); if (u.admin) c3.append(el('span', 'tenue', '—')); else c3.append(barraCaducidad(u));
    const c4 = el('div', 'celda c-pantallas'); c4.append(el('span', 'etiqueta-movil', 'Pantallas'), el('span', null, u.admin ? '—' : u.pantallas ? String(u.pantallas) : 'Sin límite'));
    const c5 = el('div', 'celda c-bibliotecas'); c5.append(el('span', 'etiqueta-movil', 'Bibliotecas'), el('span', null, u.admin || u.todas ? 'Todas' : u.bibliotecas.join(', ') || '—'));
    const c6 = el('div', 'celda c-acceso'); c6.append(el('span', 'etiqueta-movil', 'Último acceso'), el('span', null, haceCuanto(u.ultimoAcceso)));
    const c7 = el('div', 'celda c-acciones');
    if (u.admin) c7.append(el('span', 'tenue', 'Se gestiona en Emby'));
    else {
      const r = boton(null, 'icono fino', 'renovar', 'Renovar'); r.onclick = (ev) => { ev.stopPropagation(); renovar(u); };
      const m = boton(null, 'icono fino', 'puntos', 'Más acciones'); m.onclick = (ev) => { ev.stopPropagation(); menuCuenta(u, m); };
      c7.append(r, m);
      f.tabIndex = 0;
      f.classList.add('clicable');
      f.onclick = () => fichaCuenta(u);
      f.onkeydown = (ev) => { if (ev.key === 'Enter' && ev.target === f) fichaCuenta(u); };
    }
    f.append(c1, c2, c3, c4, c5, c6, c7);
    return f;
  }

  // Menú de «más acciones» junto a un botón
  let menuAbierto = null;
  function cerrarMenu() { menuAbierto?.remove(); menuAbierto = null; }
  document.addEventListener('mousedown', (e) => { if (menuAbierto && !menuAbierto.contains(e.target)) cerrarMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });
  window.addEventListener('scroll', cerrarMenu, { passive: true });
  function menuCuenta(u, ancla) {
    cerrarMenu();
    const m = el('div', 'menu-flotante'); m.setAttribute('role', 'menu');
    const op = (icono, texto, accion, clase = '') => { const b = el('button', clase); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.append(ico(icono), el('span', null, texto)); b.onclick = () => { cerrarMenu(); accion(); }; m.append(b); };
    op('editar', 'Gestionar cuenta', () => fichaCuenta(u));
    op('renovar', u.caducada ? 'Renovar y reactivar' : 'Renovar', () => renovar(u));
    op('llave', 'Nueva contraseña', () => nuevaClave(u));
    if (!u.caducada) op(u.desactivada ? 'play' : 'pausa', u.desactivada ? 'Activar' : 'Desactivar', () => activar(u, u.desactivada));
    if (u.viendo.length) op('parar', 'Cortar reproducción', () => cortar(u));
    m.append(el('hr'));
    op('papelera', 'Borrar cuenta', () => borrar(u), 'peligro');
    document.body.append(m);
    const r = ancla.getBoundingClientRect();
    m.style.top = `${Math.max(10, Math.min(r.bottom + 6, innerHeight - m.offsetHeight - 10))}px`;
    m.style.left = `${Math.max(10, r.right - m.offsetWidth)}px`;
    menuAbierto = m;
    m.querySelector('button').focus();
  }

  // ---------- En directo ----------
  function vistaDirecto(v) {
    const viendo = sesiones();
    if (!viendo.length) {
      const c = el('div', 'tarjeta vacia'); c.append(ico('directo', 'grande tono-acento'), el('h3', null, 'Nadie está viendo nada'), el('p', null, 'Aquí verás cada reproducción en cuanto empiece. Esta página se actualiza sola cada 15 segundos.'));
      v.append(c); return;
    }
    const lista = el('div', 'rejilla-directo');
    for (const { u, x } of viendo) {
      const c = el('article', 'tarjeta reproduccion');
      const cab = el('div', 'repro-cab');
      cab.append(el('span', `chip ${x.pausado ? '' : 'vivo'}`, x.pausado ? 'En pausa' : 'En directo'), el('span', 'chip', x.tipo === 'pelicula' ? 'Película' : x.tipo === 'episodio' ? 'Serie' : 'Vídeo'));
      if (x.convertido) cab.append(el('span', 'chip tono-aviso', 'Convirtiendo vídeo'));
      c.append(cab, el('h3', null, x.titulo || 'Reproduciendo'));
      if (x.progreso != null) {
        const b = el('div', 'barra tono-acento'); const r = el('i'); r.style.width = `${x.progreso}%`; b.append(r);
        c.append(b, el('small', 'tenue', `${x.progreso} % visto`));
      }
      const pie = el('div', 'repro-pie');
      const q = el('div', 'linea-quien'); q.append(el('b', null, u.nombre), el('small', null, x.dispositivo || ''));
      pie.append(avatar(u), q);
      if (!u.admin) { const b = boton('Cortar', 'fino peligro', 'parar'); b.onclick = () => cortar(u); pie.append(b); }
      c.append(pie);
      lista.append(c);
    }
    v.append(lista);
  }

  // ---------- Actividad ----------
  function vistaActividad(v) {
    const t = tarjeta('Últimos movimientos', 'actividad', actividad.length ? null : 'Aún no se ha hecho nada desde el panel.');
    let dia = '';
    for (const x of actividad) {
      const este = new Date(x.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      if (este !== dia) { dia = este; t.cuerpo.append(el('div', 'separador-dia', este)); }
      const f = lineaActividad(x); f.append(el('time', null, new Date(x.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })));
      t.cuerpo.append(f);
    }
    v.append(t.caja);
  }

  // ---------- Acciones ----------
  async function renovar(u) {
    const dias = await ventana((w, fin) => {
      const cab = el('div', 'cab-confirmar'); cab.append(ico('renovar', 'tono-acento'), el('h2', null, `Renovar ${u.nombre}`));
      w.append(cab, el('p', null, u.caduca && !u.caducada ? `Ahora caduca el ${fechaCorta(u.caduca)}. El tiempo se suma a esa fecha.` : 'El tiempo se cuenta desde hoy y la cuenta se vuelve a activar.'));
      const caja = el('div', 'opciones-renovar');
      const base = u.caduca && !u.caducada ? new Date(u.caduca).getTime() : Date.now();
      [{ t: '1 mes', n: 30, m: 1 }, { t: '3 meses', n: 90, m: 3 }, { t: '6 meses', n: 180, m: 6 }, { t: '1 año', n: 365, m: 12 }].forEach((o) => {
        const b = el('button', 'opcion-renovar'); b.type = 'button';
        b.append(el('b', null, `+ ${o.t}`), el('small', null, `hasta el ${fechaCorta(base + o.n * DIA)}`));
        if (esRevendedor()) {
          const coste = o.m * costeMes();
          b.append(el('span', 'coste', textoCreditos(coste)));
          if (coste > creditos()) { b.disabled = true; b.title = 'No tienes créditos suficientes'; }
        }
        b.onclick = () => fin(o); caja.append(b);
      });
      w.append(caja);
      if (esRevendedor()) w.append(el('p', 'saldo-linea', `Tienes ${textoCreditos(creditos())}.`));
      const fila = el('div', 'botones'); const no = boton('Cancelar'); no.onclick = () => fin(null); fila.append(no); w.append(fila);
    });
    if (!dias) return;
    try {
      const r = await api('/api/panel/emby/renovar', { id: u.id, nombre: u.nombre, dias: dias.n, meses: dias.m });
      aviso(`${u.nombre}: activa hasta el ${fechaCorta(r.caduca)}${r.coste ? ` · −${textoCreditos(r.coste)}` : ''}`, 'bien');
    } catch (e) { aviso(e.message, 'mal'); }
    await actualizar();
  }
  async function activar(u, activa) {
    if (!activa && !(await confirmar(`Desactivar ${u.nombre}`, 'No podrá entrar en Emby hasta que la actives otra vez. No se borra nada.', 'Desactivar', true))) return false;
    try { await api('/api/panel/emby/activar', { id: u.id, nombre: u.nombre, activa }); aviso(activa ? `${u.nombre} activada` : `${u.nombre} desactivada`, 'bien'); }
    catch (e) { aviso(e.message, 'mal'); return false; }
    await actualizar(); return true;
  }
  async function borrar(u) {
    if (!(await confirmar(`Borrar ${u.nombre}`, 'Se borra de Emby con su historial y lo que tenía a medias. No se puede deshacer. Si solo quieres cortarle el acceso un tiempo, desactívala.', 'Borrar cuenta', true))) return false;
    try { await api('/api/panel/emby/borrar', { id: u.id }); aviso(`${u.nombre} borrada`, 'bien'); }
    catch (e) { aviso(e.message, 'mal'); return false; }
    await actualizar(); return true;
  }
  async function cortar(u) {
    try { const r = await api('/api/panel/emby/cortar', { id: u.id }); aviso(r.cortadas ? `Reproducción de ${u.nombre} cortada` : 'Ya no estaba viendo nada', 'bien'); }
    catch (e) { aviso(e.message, 'mal'); }
    await actualizar();
  }
  async function nuevaClave(u) {
    const clave = await pedirTexto(`Nueva contraseña para ${u.nombre}`, 'Mínimo 6 caracteres. Las sesiones abiertas siguen hasta que vuelva a entrar.', claveAlAzar(), 'Cambiar contraseña');
    if (!clave) return false;
    try { await api('/api/panel/emby/clave', { id: u.id, nombre: u.nombre, clave }); datosDeAcceso(u.nombre, clave, u.caduca, true); return true; }
    catch (e) { aviso(e.message, 'mal'); return false; }
  }

  function exportarCsv() {
    const filas = [['Usuario', 'Estado', 'Caduca', 'Pantallas', 'Bibliotecas', 'Descargas', 'Último acceso', 'Creada', 'Nota']];
    for (const u of normales()) {
      filas.push([u.nombre, estadoDe(u).texto, u.caduca ? new Date(u.caduca).toLocaleDateString('es-ES') : 'Sin caducidad', u.pantallas || 'Sin límite',
        u.todas ? 'Todas' : u.bibliotecas.join(' / '), u.descargas ? 'Sí' : 'No', u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-ES') : 'Nunca',
        u.creada ? new Date(u.creada).toLocaleDateString('es-ES') : '', u.nota || '']);
    }
    // Sin fórmulas: lo que empiece por = + - @ se guarda como texto
    const celda = (x) => { let s = String(x); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
    const a = el('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `cuentas-emby-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    aviso('Lista descargada', 'bien');
  }

  // ---------- Ficha de cuenta (crear o gestionar), en el panel lateral ----------
  const DURACIONES = [
    { texto: '1 mes', dias: 30 }, { texto: '3 meses', dias: 90 }, { texto: '6 meses', dias: 180 },
    { texto: '1 año', dias: 365 }, { texto: 'Sin caducidad', dias: 0 }, { texto: 'Elegir fecha', dias: -1 },
  ];
  function pildoras(opciones, elegida, alCambiar) {
    const caja = el('div', 'pildoras'); caja.setAttribute('role', 'radiogroup');
    opciones.forEach((o) => {
      const b = el('button', `pildora${o.valor === elegida ? ' activa' : ''}`, o.texto); b.type = 'button'; b.setAttribute('role', 'radio');
      b.onclick = () => { caja.querySelectorAll('.pildora').forEach((x) => x.classList.toggle('activa', x === b)); alCambiar(o.valor); };
      caja.append(b);
    });
    return caja;
  }
  const campo = (titulo, control, ayuda, icono) => {
    const c = el('div', 'campo');
    const t = el('div', 'campo-titulo'); if (icono) t.append(ico(icono)); t.append(el('span', null, titulo));
    c.append(t, control);
    if (ayuda) c.append(el('small', 'ayuda', ayuda));
    return c;
  };
  const interruptor = (texto, ayuda, marcado) => {
    const l = el('label', 'interruptor');
    const i = el('input'); i.type = 'checkbox'; i.checked = marcado;
    const t = el('span', 'interruptor-texto'); t.append(el('b', null, texto)); if (ayuda) t.append(el('small', null, ayuda));
    l.append(t, i, el('i', 'interruptor-pista'));
    return { caja: l, input: i };
  };

  function fichaCuenta(u) {
    const nueva = !u;
    cerrarMenu();
    lateral((w, fin) => {
      const cab = el('header', 'lateral-cab');
      if (nueva) { const t = el('div', 'lateral-titulo'); t.append(el('h2', null, 'Nueva cuenta'), el('p', null, 'Crea un acceso a tu servidor de Emby')); cab.append(t); }
      else {
        const t = el('div', 'lateral-quien'); const q = el('div');
        q.append(el('h2', null, u.nombre), insignia(estadoDe(u)));
        t.append(avatar(u, true), q); cab.append(t);
      }
      const x = boton(null, 'icono', 'cerrar', 'Cerrar'); x.onclick = () => fin(null);
      cab.append(x);
      const cuerpo = el('div', 'lateral-cuerpo');
      w.append(cab, cuerpo);

      if (!nueva) {
        const datos = el('div', 'datos-cuenta');
        const dato = (icono, titulo, valor) => { const c = el('div', 'dato'); c.append(ico(icono), el('span', null, titulo), el('b', null, valor)); return c; };
        datos.append(
          dato('calendario', 'Caduca', u.caduca ? fechaCorta(u.caduca) : 'Nunca'),
          dato('reloj', 'Último acceso', haceCuanto(u.ultimoAcceso)),
          dato('mas', 'Creada', u.creada ? fechaCorta(u.creada) : '—'),
        );
        cuerpo.append(datos);
        if (u.caduca) cuerpo.append(barraCaducidad(u));
        for (const v of u.viendo) cuerpo.append(lineaViendo(u, v));
      }

      const seccion = (titulo) => { const s = el('section', 'seccion-form'); s.append(el('h3', null, titulo)); cuerpo.append(s); return s; };
      const sAcceso = seccion('Acceso');
      const usuario = el('input'); usuario.value = u?.nombre ?? ''; usuario.placeholder = 'Por ejemplo: maria.lopez'; usuario.autocomplete = 'off'; usuario.spellcheck = false; usuario.autocapitalize = 'none';
      sAcceso.append(campo('Usuario', usuario, 'No aparece en la pantalla de inicio de Emby: tendrá que escribirlo.'));
      let clave = null;
      if (nueva) {
        const fila = el('div', 'fila-clave');
        clave = el('input'); clave.value = claveAlAzar(); clave.autocomplete = 'new-password'; clave.spellcheck = false; clave.className = 'mono';
        const otra = boton(null, 'icono', 'renovar', 'Generar otra contraseña'); otra.onclick = () => { clave.value = claveAlAzar(); };
        fila.append(clave, otra);
        sAcceso.append(campo('Contraseña', fila, 'Se muestra una sola vez al terminar, para que se la pases.'));
      }

      const sPlan = seccion('Plan');
      let dias = nueva ? 30 : null;
      const fecha = el('input'); fecha.type = 'date'; fecha.hidden = true; fecha.className = 'fecha';
      fecha.min = new Date(Date.now() + DIA).toISOString().slice(0, 10);
      if (u?.caduca) fecha.value = new Date(u.caduca).toISOString().slice(0, 10);
      const opcionesDur = nueva ? DURACIONES : [{ texto: 'No cambiar', dias: null }, ...DURACIONES.map((o) => (o.dias > 0 ? { ...o, texto: `${o.texto} desde hoy` } : o))];
      const dur = el('div', 'grupo');
      let meses = 1;
      const coste = el('div', 'coste-resumen');
      const pintarCoste = () => {
        if (!esRevendedor() || !nueva) return;
        const n = meses * costeMes(); const queda = creditos() - n;
        coste.innerHTML = '';
        coste.classList.toggle('falta', queda < 0);
        coste.append(ico('moneda'), el('span', null, 'Coste'), el('b', null, textoCreditos(n)),
          el('small', null, queda < 0 ? `te faltan ${-queda}` : `te ${queda === 1 ? 'queda' : 'quedan'} ${queda}`));
      };
      if (esRevendedor()) {
        // Los revendedores pagan por meses (con créditos) y la fecha solo cambia al renovar
        if (nueva) {
          dur.append(pildoras([1, 3, 6, 12].map((m) => ({ texto: `${m === 12 ? '1 año' : m === 1 ? '1 mes' : `${m} meses`} · ${m * costeMes()} cr.`, valor: m })), meses, (val) => { meses = val; pintarCoste(); }));
          sPlan.append(campo('Duración', dur, 'Al caducar se desactiva sola; luego puedes renovarla.', 'calendario'));
        } else sPlan.append(campo('Caducidad', el('div', 'nota-campo', `${u.caduca ? `Caduca el ${fechaCorta(u.caduca)}.` : 'Sin caducidad.'} Para alargarla, usa «Renovar».`), null, 'calendario'));
      } else {
        dur.append(pildoras(opcionesDur.map((o) => ({ texto: o.texto, valor: o.dias })), dias, (val) => { dias = val; fecha.hidden = val !== -1; if (val === -1) fecha.focus(); }), fecha);
        sPlan.append(campo(nueva ? 'Duración' : 'Caducidad', dur, nueva ? 'Al caducar se desactiva sola; luego puedes renovarla.' : null, 'calendario'));
      }
      let pantallas = u ? (esRevendedor() ? Math.max(1, Math.min(4, u.pantallas || 4)) : u.pantallas) : 1;
      sPlan.append(campo('Pantallas a la vez', pildoras((esRevendedor() ? [1, 2, 3, 4] : [1, 2, 3, 4, 0]).map((k) => ({ texto: k ? String(k) : 'Sin límite', valor: k })), pantallas, (val) => { pantallas = val; }),
        'Cuántos dispositivos pueden ver a la vez.', 'pantalla'));
      // El administrador puede crear la cuenta a nombre de un revendedor (sin gastar sus créditos)
      let dueno = '';
      if (nueva && rol === 'admin' && revs.length) {
        const sel = el('select', 'selector ancho');
        [['', 'Mía (sin revendedor)'], ...revs.map((x) => [x.id, `${x.nombre} · ${x.rol === 'super' ? 'superrevendedor' : 'revendedor'}`])].forEach(([v2, t2]) => { const o = el('option', null, t2); o.value = v2; sel.append(o); });
        sel.onchange = () => { dueno = sel.value; };
        sPlan.append(campo('Vendida por', sel, 'Aparecerá en el panel de ese revendedor. No gasta sus créditos.', 'red'));
      }

      const sCont = seccion('Contenido');
      const todas = interruptor('Todas las bibliotecas', 'Incluye las que crees más adelante', u ? u.todas : true);
      const sueltas = el('div', 'lista-bibliotecas');
      const marcas = d.bibliotecas.map((b) => {
        const l = el('label', 'casilla'); const c = el('input'); c.type = 'checkbox'; c.value = b.id; c.checked = u ? u.todas || u.bibliotecasIds.includes(b.id) : true;
        l.append(c, el('span', null, b.nombre)); sueltas.append(l); return c;
      });
      const sincro = () => { sueltas.hidden = todas.input.checked; };
      todas.input.onchange = sincro; sincro();
      sCont.append(todas.caja);
      if (marcas.length) sCont.append(sueltas);
      else sCont.append(el('small', 'ayuda', 'Aún no hay bibliotecas en Emby: créalas en Emby → Ajustes → Biblioteca.'));
      const desc = interruptor('Permitir descargas', 'Para ver sin conexión en la app de Emby', u ? u.descargas : false);
      sCont.append(desc.caja);

      const sNota = seccion('Nota interna');
      const nota = el('textarea'); nota.value = u?.nota ?? ''; nota.placeholder = 'Solo la ves tú: cómo pagó, de quién es…'; nota.maxLength = 200; nota.rows = 2;
      sNota.append(nota);

      if (!nueva) {
        const sAcc = seccion('Acciones');
        const fila = el('div', 'acciones-cuenta');
        const a1 = boton('Nueva contraseña', '', 'llave'); a1.onclick = async () => { if (await nuevaClave(u)) fin(true); };
        const a2 = boton('Renovar', '', 'renovar'); a2.onclick = () => { fin(true); renovar(u); };
        const activa = !u.desactivada && !u.caducada;
        const a3 = boton(activa ? 'Desactivar' : u.caducada ? 'Reactivar' : 'Activar', '', activa ? 'pausa' : 'play');
        a3.onclick = async () => { if (u.caducada) { fin(true); renovar(u); return; } if (await activar(u, !activa)) fin(true); };
        fila.append(a1, a2, a3);
        if (u.viendo.length) { const a4 = boton('Cortar reproducción', '', 'parar'); a4.onclick = async () => { await cortar(u); fin(true); }; fila.append(a4); }
        const zona = el('div', 'zona-peligro');
        const t = el('div'); t.append(el('b', null, 'Borrar cuenta'), el('small', null, 'Se elimina de Emby con su historial. No se puede deshacer.'));
        const a5 = boton('Borrar', 'peligro', 'papelera'); a5.onclick = async () => { if (await borrar(u)) fin(true); };
        zona.append(t, a5);
        sAcc.append(fila, zona);
      }

      const pie = el('footer', 'lateral-pie');
      const no = boton('Cancelar'); no.onclick = () => fin(null);
      const si = boton(nueva ? 'Crear cuenta' : 'Guardar cambios', 'primario', nueva ? 'mas' : 'ok');
      si.onclick = async () => {
        const bibliotecas = todas.input.checked ? null : marcas.filter((c) => c.checked).map((c) => c.value);
        if (bibliotecas && !bibliotecas.length) return aviso('Marca al menos una biblioteca', 'mal');
        if (dias === -1 && !fecha.value) return aviso('Elige la fecha de caducidad', 'mal');
        if (esRevendedor() && nueva && meses * costeMes() > creditos()) return aviso(`No tienes créditos suficientes: tienes ${creditos()}`, 'mal');
        const caduca = esRevendedor() ? (nueva ? new Date(Date.now() + (meses === 12 ? 365 : meses * 30) * DIA).toISOString() : undefined)
          : dias === -1 ? fecha.value : dias === 0 ? null : dias ? new Date(Date.now() + dias * DIA).toISOString() : undefined;
        si.disabled = true; si.querySelector('span').textContent = nueva ? 'Creando…' : 'Guardando…';
        try {
          if (nueva) {
            const r = await api('/api/panel/emby/crear', { usuario: usuario.value, clave: clave.value, caduca, meses, pantallas, bibliotecas, descargas: desc.input.checked, nota: nota.value, ...(dueno && { dueno }) });
            fin(true);
            if (r.coste) aviso(`−${textoCreditos(r.coste)}`, 'bien');
            datosDeAcceso(r.usuario, clave.value, caduca);
          } else {
            const cambios = { nombre: usuario.value, pantallas, bibliotecas, descargas: desc.input.checked, nota: nota.value, ...(caduca !== undefined && { caduca }) };
            await api('/api/panel/emby/editar', { id: u.id, nombre: u.nombre, cambios });
            aviso('Cambios guardados', 'bien');
            fin(true);
          }
          await actualizar();
        } catch (er) { aviso(er.message, 'mal'); si.disabled = false; si.querySelector('span').textContent = nueva ? 'Crear cuenta' : 'Guardar cambios'; }
      };
      if (esRevendedor() && nueva) { pintarCoste(); pie.append(coste); }
      pie.append(no, si);
      w.append(pie);
      if (nueva) setTimeout(() => usuario.focus(), 60);
    }, { fija: true });
  }

  // ---------- Revendedores ----------
  function vistaRevendedores(v) {
    if (!revs.length) {
      const c = el('div', 'tarjeta vacia');
      c.append(ico('red', 'grande tono-morado'), el('h3', null, rol === 'admin' ? 'Todavía no hay revendedores' : 'Todavía no tienes revendedores'),
        el('p', null, rol === 'admin'
          ? 'Crea superrevendedores (que a su vez crean revendedores) o revendedores directos. Les das créditos y con ellos crean y renuevan cuentas: 1 crédito = 1 mes.'
          : 'Crea revendedores y pásales créditos de tu saldo. Verás sus cuentas en «Cuentas».'));
      const b = boton('Nuevo revendedor', 'primario', 'mas'); b.onclick = () => fichaRevendedor(); c.append(b);
      v.append(c); return;
    }
    const tabla = el('div', 'tabla tabla-revendedores');
    const cab = el('div', 'fila cab');
    for (const t of ['Revendedor', 'Tipo', 'Créditos', 'Cuentas', 'Último acceso', '']) cab.append(el('div', 'celda', t));
    tabla.append(cab);
    for (const r of revs) {
      const f = el('div', `fila ${r.activo ? '' : 'estado-desactivada'}`);
      const c1 = el('div', 'celda c-nombre');
      const q = el('div', 'linea-quien'); q.append(el('b', null, r.nombre), el('small', null, `@${r.usuario}${r.padreNombre && rol === 'admin' ? ` · de ${r.padreNombre}` : ''}`));
      c1.append(avatar({ nombre: r.nombre, viendo: [] }), q);
      const c2 = el('div', 'celda');
      c2.append(insignia(!r.activo ? { tono: 'gris', texto: 'Suspendido' } : r.rol === 'super' ? { tono: 'morado', texto: 'Superrevendedor' } : { tono: 'acento', texto: 'Revendedor' }));
      const c3 = el('div', 'celda c-creditos'); c3.append(el('b', r.creditos ? null : 'tono-mal', String(r.creditos)), el('small', null, 'créditos'));
      const c4 = el('div', 'celda c-cuentas-rev'); c4.append(el('b', null, `${r.activas}`), el('small', null, `activas de ${r.cuentas}${r.hijos ? ` · ${r.hijos} revendedores` : ''}`));
      const c5 = el('div', 'celda c-acceso'); c5.append(el('span', null, haceCuanto(r.ultimoAcceso)));
      const c6 = el('div', 'celda c-acciones');
      const dar = boton('Créditos', 'fino', 'moneda', 'Dar o quitar créditos'); dar.onclick = (e) => { e.stopPropagation(); darCreditos(r); };
      const mas = boton(null, 'icono fino', 'puntos', 'Más acciones'); mas.onclick = (e) => { e.stopPropagation(); menuRevendedor(r, mas); };
      c6.append(dar, mas);
      f.append(c1, c2, c3, c4, c5, c6);
      tabla.append(f);
    }
    v.append(tabla);
    const total = revs.reduce((t, x) => t + x.creditos, 0);
    v.append(el('div', 'pie-tabla', `${revs.length} ${revs.length === 1 ? 'revendedor' : 'revendedores'} · ${textoCreditos(total)} repartidos · 1 crédito = 1 mes de cuenta`));
  }

  function menuRevendedor(r, ancla) {
    cerrarMenu();
    const m = el('div', 'menu-flotante'); m.setAttribute('role', 'menu');
    const op = (icono, texto, accion, clase = '') => { const b = el('button', clase); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.append(ico(icono), el('span', null, texto)); b.onclick = () => { cerrarMenu(); accion(); }; m.append(b); };
    op('moneda', 'Dar o quitar créditos', () => darCreditos(r));
    op('cuentas', 'Ver sus cuentas', () => { filtros.dueno = r.id; filtros.estado = 'todas'; irA('cuentas'); });
    op('llave', 'Nueva contraseña', async () => {
      const clave = await pedirTexto(`Nueva contraseña para ${r.nombre}`, 'Mínimo 8 caracteres. Se cerrarán sus sesiones abiertas.', claveAlAzar(), 'Cambiar contraseña');
      if (!clave) return;
      try { await api('/api/panel/emby/revendedores/clave', { id: r.id, clave }); datosRevendedor(r, clave, true); } catch (e) { aviso(e.message, 'mal'); }
    });
    op(r.activo ? 'pausa' : 'play', r.activo ? 'Suspender' : 'Reactivar', async () => {
      if (r.activo && !(await confirmar(`Suspender a ${r.nombre}`, 'No podrá entrar en el panel (ni sus revendedores, si tiene). Las cuentas que ha vendido siguen funcionando.', 'Suspender', true))) return;
      try { await api('/api/panel/emby/revendedores/activar', { id: r.id, activo: !r.activo }); aviso(r.activo ? `${r.nombre} suspendido` : `${r.nombre} reactivado`, 'bien'); } catch (e) { aviso(e.message, 'mal'); }
      actualizar();
    });
    m.append(el('hr'));
    op('papelera', 'Borrar revendedor', async () => {
      const a = rol === 'admin' && !r.padre ? 'pasarán a ser tuyas' : `pasarán a ${r.padreNombre || 'quien lo creó'}`;
      if (!(await confirmar(`Borrar a ${r.nombre}`, `Ya no podrá entrar. Sus ${r.cuentas} cuentas siguen funcionando y ${a}${r.padre ? `, igual que sus ${r.creditos} créditos` : ''}.`, 'Borrar revendedor', true))) return;
      try { await api('/api/panel/emby/revendedores/borrar', { id: r.id }); aviso(`${r.nombre} borrado`, 'bien'); } catch (e) { aviso(e.message, 'mal'); }
      actualizar();
    }, 'peligro');
    document.body.append(m);
    const rr = ancla.getBoundingClientRect();
    m.style.top = `${Math.max(10, Math.min(rr.bottom + 6, innerHeight - m.offsetHeight - 10))}px`;
    m.style.left = `${Math.max(10, rr.right - m.offsetWidth)}px`;
    menuAbierto = m;
    m.querySelector('button').focus();
  }

  async function darCreditos(r) {
    const cantidad = await ventana((w, fin) => {
      const cab = el('div', 'cab-confirmar'); cab.append(ico('moneda', 'tono-morado'), el('h2', null, `Créditos de ${r.nombre}`));
      w.append(cab, el('p', null, `Ahora tiene ${textoCreditos(r.creditos)}.${rol === 'super' ? ` Se descuentan de tu saldo (tienes ${creditos()}).` : ''}`));
      let modo = 1;
      const modos = pildoras([{ texto: 'Dar', valor: 1 }, { texto: 'Quitar', valor: -1 }], 1, (val) => { modo = val; pintar2(); });
      const n = el('input'); n.type = 'number'; n.min = '1'; n.step = '1'; n.value = '10'; n.className = 'numero';
      const rapidos = el('div', 'pildoras');
      [5, 10, 25, 50, 100].forEach((k) => { const b = el('button', 'pildora', String(k)); b.type = 'button'; b.onclick = () => { n.value = String(k); pintar2(); }; rapidos.append(b); });
      const res = el('div', 'coste-resumen');
      const pintar2 = () => {
        const k = Math.max(0, Math.floor(Number(n.value) || 0)) * modo;
        const despues = r.creditos + k;
        res.innerHTML = '';
        res.classList.toggle('falta', despues < 0 || (rol === 'super' && k > creditos()));
        res.append(ico('moneda'), el('span', null, 'Quedará con'), el('b', null, textoCreditos(Math.max(0, despues))),
          el('small', null, rol === 'super' ? `tú: ${creditos() - k}` : ''));
      };
      n.oninput = pintar2;
      w.append(modos, n, rapidos, res);
      pintar2();
      pieBotones(w, fin, 'Aplicar', 'primario', () => {
        const k = Math.floor(Number(n.value) || 0);
        if (k < 1) return aviso('Pon cuántos créditos', 'mal');
        fin(k * modo);
      });
      n.focus(); n.select();
    });
    if (!cantidad) return;
    try {
      const x = await api('/api/panel/emby/revendedores/creditos', { id: r.id, cantidad });
      aviso(`${r.nombre}: ${textoCreditos(x.creditos)}`, 'bien');
    } catch (e) { aviso(e.message, 'mal'); }
    actualizar();
  }

  function fichaRevendedor() {
    lateral((w, fin) => {
      const cab = el('header', 'lateral-cab');
      const t = el('div', 'lateral-titulo'); t.append(el('h2', null, 'Nuevo revendedor'), el('p', null, 'Podrá entrar en este panel y vender cuentas con sus créditos'));
      const x = boton(null, 'icono', 'cerrar', 'Cerrar'); x.onclick = () => fin(null);
      cab.append(t, x);
      const cuerpo = el('div', 'lateral-cuerpo');
      w.append(cab, cuerpo);
      const seccion = (titulo) => { const s = el('section', 'seccion-form'); s.append(el('h3', null, titulo)); cuerpo.append(s); return s; };
      const s1 = seccion('Datos');
      const nombre = el('input'); nombre.placeholder = 'Nombre que verás (por ejemplo: Juan Tienda)';
      const usuario = el('input'); usuario.placeholder = 'Usuario para entrar (por ejemplo: juan.tienda)'; usuario.autocapitalize = 'none'; usuario.spellcheck = false; usuario.autocomplete = 'off';
      const fila = el('div', 'fila-clave');
      const clave = el('input'); clave.value = claveAlAzar(); clave.className = 'mono'; clave.spellcheck = false; clave.autocomplete = 'new-password';
      const otra = boton(null, 'icono', 'renovar', 'Generar otra contraseña'); otra.onclick = () => { clave.value = claveAlAzar(); };
      fila.append(clave, otra);
      s1.append(campo('Nombre', nombre), campo('Usuario', usuario, '3 a 20 caracteres: letras, números, punto o guion.'), campo('Contraseña', fila, 'Se muestra una sola vez al terminar.'));
      let tipo = 'revendedor';
      if (rol === 'admin') {
        const s2 = seccion('Tipo');
        const op = el('div', 'tipos-revendedor');
        const tarjetaTipo = (valor, titulo, texto, icono) => {
          const b = el('button', `tipo-rev${valor === tipo ? ' activa' : ''}`); b.type = 'button';
          b.append(ico(icono), el('b', null, titulo), el('small', null, texto));
          b.onclick = () => { tipo = valor; op.querySelectorAll('.tipo-rev').forEach((y) => y.classList.toggle('activa', y === b)); };
          return b;
        };
        op.append(tarjetaTipo('revendedor', 'Revendedor', 'Crea y renueva cuentas con sus créditos.', 'cuentas'),
          tarjetaTipo('super', 'Superrevendedor', 'Además crea sus propios revendedores y les pasa créditos.', 'red'));
        s2.append(op);
      }
      const s3 = seccion('Créditos iniciales');
      const n = el('input'); n.type = 'number'; n.min = '0'; n.step = '1'; n.value = '0'; n.className = 'numero';
      s3.append(campo('Créditos', n, rol === 'super' ? `Se descuentan de tu saldo (tienes ${creditos()}). 1 crédito = 1 mes de cuenta.` : '1 crédito = 1 mes de cuenta. Puedes darle más cuando quieras.', 'moneda'));
      const pie = el('footer', 'lateral-pie');
      const no = boton('Cancelar'); no.onclick = () => fin(null);
      const si = boton('Crear revendedor', 'primario', 'mas');
      si.onclick = async () => {
        const k = Math.max(0, Math.floor(Number(n.value) || 0));
        si.disabled = true;
        try {
          const r = await api('/api/panel/emby/revendedores/crear', { nombre: nombre.value, usuario: usuario.value, clave: clave.value, rol: tipo, creditos: k });
          fin(true);
          datosRevendedor({ nombre: nombre.value.trim() || r.usuario, usuario: r.usuario, rol: tipo, creditos: k }, clave.value);
          actualizar();
        } catch (e) { aviso(e.message, 'mal'); si.disabled = false; }
      };
      pie.append(no, si);
      w.append(pie);
      setTimeout(() => nombre.focus(), 60);
    }, { fija: true });
  }

  // Datos para que el revendedor entre en el panel
  function datosRevendedor(r, clave, soloClave) {
    ventana((w, fin) => {
      const cab = el('div', 'cab-confirmar'); cab.append(ico('ok', 'tono-bien'), el('h2', null, soloClave ? 'Contraseña cambiada' : 'Revendedor creado'));
      w.append(cab, el('p', null, 'Pásale estos datos por mensaje privado. La contraseña no se vuelve a mostrar.'));
      const panel = `${location.origin}${location.pathname}`;
      const raya = '━━━━━━━━━━━━━━━━━━';
      const texto = [
        `🧾  TU PANEL DE ${r.rol === 'super' ? 'SUPERREVENDEDOR' : 'REVENDEDOR'}`, raya, '',
        '🌐  Panel', `      ${panel}`, '',
        '👤  Usuario', `      ${r.usuario}`, '',
        '🔑  Contraseña', `      ${clave}`, '',
        ...(soloClave ? [] : ['💰  Créditos', `      ${r.creditos} (1 crédito = 1 mes de cuenta)`, '']),
        raya, '',
        '📲  CÓMO EMPEZAR', '',
        '▸ Entra en el panel con tu usuario y contraseña.',
        '▸ Pulsa «Nueva cuenta» para crear la cuenta de un cliente.',
        '▸ Cada mes de cuenta gasta un crédito.',
        '', raya,
      ].join('\n');
      const t = el('div', 'credencial');
      const linea = (titulo, valor, mono) => {
        const x = el('div', 'credencial-linea');
        const c = boton(null, 'icono fino', 'copiar', `Copiar ${titulo.toLowerCase()}`);
        c.onclick = () => navigator.clipboard.writeText(valor).then(() => aviso(`${titulo} copiado`, 'bien'), () => {});
        x.append(el('span', null, titulo), el('b', mono ? 'mono' : null, valor), c);
        return x;
      };
      t.append(linea('Panel', panel.replace(/^https?:\/\//, '')), linea('Usuario', r.usuario, true), linea('Contraseña', clave, true));
      w.append(t);
      const copiar = boton('Copiar mensaje completo', 'primario', 'copiar');
      copiar.onclick = () => navigator.clipboard.writeText(texto).then(() => { copiar.querySelector('span').textContent = 'Copiado'; }, () => aviso('No se pudo copiar: selecciónalo a mano', 'mal'));
      const vista = el('details', 'mensaje'); vista.append(el('summary', null, 'Ver el mensaje'), el('pre', null, texto));
      const fila = el('div', 'botones'); const ok = boton('Hecho'); ok.onclick = () => fin(null); fila.append(ok, copiar);
      w.append(vista, fila);
      copiar.focus();
    }, { fija: true, ancho: 'mediana' });
  }

  // Los datos para entrar, listos para copiar y mandar (la contraseña no se vuelve a ver)
  function datosDeAcceso(usuario, clave, caduca, soloClave) {
    ventana((w, fin) => {
      const cab = el('div', 'cab-confirmar'); cab.append(ico('ok', 'tono-bien'), el('h2', null, soloClave ? 'Contraseña cambiada' : 'Cuenta creada'));
      w.append(cab, el('p', null, 'Pásale estos datos por mensaje privado. La contraseña no se vuelve a mostrar.'));
      const servidor = d.servidor.replace(/^https?:\/\//, '');
      const raya = '━━━━━━━━━━━━━━━━━━';
      const texto = [
        `📺  TU CUENTA DE ${(d.nombreServidor || 'Emby').toUpperCase()}`,
        raya,
        '',
        '🌐  Servidor',
        `      ${d.servidor}`,
        '',
        '👤  Usuario',
        `      ${usuario}`,
        '',
        '🔑  Contraseña',
        `      ${clave}`,
        '',
        caduca ? '📅  Válida hasta' : '📅  Caducidad',
        `      ${caduca ? fechaCorta(caduca) : 'Sin caducidad'}`,
        '',
        raya,
        '',
        '📲  CÓMO ENTRAR',
        '',
        '▸ Desde el navegador:',
        `      ${d.servidor}`,
        '',
        '▸ Con la app de Emby',
        '   (móvil, Smart TV, Fire TV…):',
        `      Servidor:  ${servidor}`,
        '      Puerto:  443',
        '',
        raya,
        '¡Disfruta! 🍿',
      ].join('\n');
      const t = el('div', 'credencial');
      const linea = (titulo, valor, mono) => {
        const x = el('div', 'credencial-linea');
        const c = boton(null, 'icono fino', 'copiar', `Copiar ${titulo.toLowerCase()}`);
        c.onclick = () => navigator.clipboard.writeText(valor).then(() => aviso(`${titulo} copiado`, 'bien'), () => {});
        x.append(el('span', null, titulo), el('b', mono ? 'mono' : null, valor), c);
        return x;
      };
      t.append(linea('Servidor', servidor), linea('Usuario', usuario, true), linea('Contraseña', clave, true));
      const vence = el('div', 'credencial-linea'); vence.append(el('span', null, 'Caducidad'), el('b', null, caduca ? fechaCorta(caduca) : 'Sin caducidad'), el('i'));
      t.append(vence);
      w.append(t);
      const copiar = boton('Copiar mensaje completo', 'primario', 'copiar');
      copiar.onclick = () => navigator.clipboard.writeText(texto).then(() => { copiar.querySelector('span').textContent = 'Copiado'; }, () => aviso('No se pudo copiar: selecciónalo a mano', 'mal'));
      const vista = el('details', 'mensaje'); vista.append(el('summary', null, 'Ver el mensaje'), el('pre', null, texto));
      const fila = el('div', 'botones'); const ok = boton('Hecho'); ok.onclick = () => fin(null); fila.append(ok, copiar);
      w.append(vista, fila);
      copiar.focus();
    }, { fija: true, ancho: 'mediana' });
  }

  // ---------- Arranque ----------
  if (!token) return salir();
  api('/api/panel/yo').then(arrancar).catch((e) => { if (token) { $('#vista-entrar').hidden = false; $('#e-error').textContent = e.message; } });
})();
