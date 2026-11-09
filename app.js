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
    subir: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    carpeta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    archivo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    nube: '<path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 9a4 4 0 0 1 0 9z"/><path d="m9.5 13.5 2.5-2.5 2.5 2.5M12 11v5"/>',
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
    if (u.demo) return { clave: 'activa', texto: 'En prueba', tono: 'acento' };
    if (u.caduca && diasHasta(u.caduca) <= 7) return { clave: 'pronto', texto: 'Caduca pronto', tono: 'aviso' };
    return { clave: 'activa', texto: 'Activa', tono: 'bien' };
  }
  const fechaHora = (f) => new Date(f).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  function textoCaducidad(u) {
    if (!u.caduca) return 'Sin caducidad';
    // Demos: en horas y minutos
    const ms = new Date(u.caduca).getTime() - Date.now();
    if (u.demo && ms > 0 && ms < 3 * DIA) { const total = Math.ceil(ms / 60000); const h = Math.floor(total / 60); const m = total % 60; return h ? `Quedan ${h} h${m ? ` ${m} min` : ''}` : `Quedan ${m} min`; }
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
    return Math.max(3, Math.min(100, Math.round(((fin - Date.now()) / Math.max(u.demo ? 60000 : DIA, fin - ini)) * 100)));
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
    if (u.caduca) linea.append(el('small', null, u.demo ? fechaHora(u.caduca) : fechaCorta(u.caduca)));
    caja.append(linea);
    if (p != null) { const b = el('div', `barra tono-${e.clave === 'pronto' ? 'aviso' : e.clave === 'caducada' ? 'mal' : e.clave === 'desactivada' ? 'gris' : 'bien'}`); const r = el('i'); r.style.width = `${p}%`; b.append(r); caja.append(b); }
    return caja;
  }

  // ---------- Entrar y salir ----------
  function salir() {
    if (token) fetch(`${API}${token.startsWith('rv_') ? '/api/panel/emby/salir' : '/api/panel/salir'}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}' }).catch(() => {});
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
      // Primero como administrador del panel; si no, como revendedor
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
  let e2Activo = false;  // el servidor tiene las claves de e2 (para «Subir»)
  const filtros = { estado: 'todas', busca: '', orden: 'nombre', sube: true, dueno: '' };
  const TODAS_VISTAS = {
    resumen: { titulo: 'Resumen', corto: 'Inicio', sub: 'Cómo está tu servidor de un vistazo', icono: 'resumen' },
    cuentas: { titulo: 'Cuentas', sub: 'Crea, renueva y controla quién entra en tu Emby', icono: 'cuentas' },
    revendedores: { titulo: 'Revendedores', corto: 'Revend.', sub: 'Quién vende cuentas y cuántos créditos tiene', icono: 'red' },
    directo: { titulo: 'En directo', corto: 'Directo', sub: 'Lo que se está viendo ahora mismo', icono: 'directo' },
    subir: { titulo: 'Subir', sub: 'Sube películas y series a e2, ya con el nombre que entiende Emby', icono: 'subir' },
    equipo: { titulo: 'Subidores', corto: 'Equipo', sub: 'Personas que pueden subir contenido a e2, sin poder tocar nada más', icono: 'nube' },
    actividad:{ titulo: 'Actividad', corto: 'Registro', sub: 'Todo lo que se ha hecho desde este panel', icono: 'actividad' },
  };
  let VISTAS = TODAS_VISTAS;
  const NOMBRE_ROL = { admin: 'Administrador', super: 'Superrevendedor', revendedor: 'Revendedor', subidor: 'Subidor' };
  const esRevendedor = () => rol !== 'admin';
  const creditos = () => d?.yo?.creditos ?? 0;
  const costeMes = () => d?.costeMes ?? 1;
  const textoCreditos = (n) => `${n} ${n === 1 ? 'crédito' : 'créditos'}`;

  function arrancar(yo) {
    if (!['admin', 'super', 'revendedor', 'subidor'].includes(yo.rol)) {
      salir();
      $('#e-error').textContent = 'Este panel es solo para administradores, revendedores y subidores';
      return;
    }
    rol = yo.rol;
    // «Subir» y «Subidores» son solo para administradores; un subidor solo ve «Subir» (el servidor
    // también lo comprueba todo)
    VISTAS = rol === 'subidor' ? { subir: { ...TODAS_VISTAS.subir, sub: 'Sube películas y series nuevas a la nube, ya con el nombre que entiende Emby' } }
      : Object.fromEntries(Object.entries(TODAS_VISTAS).filter(([k]) => (k !== 'revendedores' || rol !== 'revendedor') && ((k !== 'subir' && k !== 'equipo') || rol === 'admin')));
    e2Activo = Boolean(yo.e2);
    if (rol === 'subidor') {
      const nombre = yo.nombre || yo.usuario;
      $('#yo-nombre').textContent = nombre; $('#yo-rol').textContent = NOMBRE_ROL.subidor;
      $('#yo-avatar').textContent = nombre[0].toUpperCase(); $('#yo-avatar').style.setProperty('--c', colorDe(nombre));
      $('#vista-entrar').hidden = true; $('#vista-panel').hidden = false;
      d = null; sub.raiz = null;
      irA('subir', true);
      return; // nada de Emby: un subidor no tiene acceso
    }
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
      // En el móvil, el menú de abajo usa el nombre corto (caben los 7 sin cortarse)
      a.append(ico(x.icono), el('span', 'largo', x.titulo), el('span', 'corto', x.corto ?? x.titulo));
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
    if (!VISTAS[k]) k = VISTAS.resumen ? 'resumen' : Object.keys(VISTAS)[0];
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
      actividad = (Array.isArray(reg) ? reg : []).filter((x) => esRevendedor() || /emby|revendedor|créditos|e2|subidor/i.test(x.accion + ' ' + x.usuario));
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
    if (callado && (pila.length || document.activeElement?.matches('input, textarea, select') || menuAbierto || vista === 'subir')) return;
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
    rec.onclick = async () => { rec.classList.add('girando'); if (vista === 'subir') { sub.raiz = null; sub.subcarpetas = {}; pintar(); return; } await actualizar(); };
    acc.append(rec);
    if (vista === 'subir') { /* sin botón de nueva cuenta */ }
    else if (vista === 'equipo') { const n = boton('Nuevo subidor', 'primario', 'mas'); n.onclick = () => fichaSubidor(); acc.append(n); }
    else if (vista === 'revendedores') { const n = boton('Nuevo revendedor', 'primario', 'mas'); n.onclick = () => fichaRevendedor(); acc.append(n); }
    else if (d?.configurado) {
      if (d.demo) { const dm = boton('Demo', '', 'reloj', 'Crear una cuenta de prueba de unas horas'); dm.onclick = () => fichaDemo(); acc.append(dm); }
      const n = boton('Nueva cuenta', 'primario', 'mas'); n.onclick = () => fichaCuenta(null); acc.append(n);
    }
    c.append(t, acc);
    return c;
  }

  function pintar(mantenerScroll = true) {
    const v = $('#vista');
    const scroll = window.scrollY;
    v.innerHTML = '';
    v.append(cabecera());
    if (vista === 'subir') { vistaSubir(v); window.scrollTo(0, mantenerScroll ? scroll : 0); return; }
    if (vista === 'equipo') { vistaEquipo(v); window.scrollTo(0, mantenerScroll ? scroll : 0); return; }
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
    const q = el('div', 'linea-quien');
    const nom = el('b', null, u.nombre); if (u.demo) nom.append(el('span', 'chip-demo', 'Demo'));
    q.append(nom);
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

  // ---------- Subir a e2 (solo administradores) ----------
  // El archivo va por trozos directamente del navegador a e2: el servidor solo firma la dirección
  // de cada trozo. Los nombres se ponen como los entiende Emby:
  //   Película → CARPETA/Título (Año)/Título (Año).mkv
  //   Serie    → CARPETA/Serie (Año)/Temporada 1/Serie - S01E02 - Título.mkv
  const sub = { tipo: 'pelicula', carpeta: '', titulo: '', ano: '', serie: '', temporada: '1', otra: '', archivos: [], cola: [], raiz: null, subcarpetas: {}, error: '',
    ficha: null, busca: '', resultados: null, buscando: false, errorFicha: '', detectado: null, eps: null, manual: {} };
  // Código para el nombre de la carpeta: con él Emby acierta siempre la ficha
  const etiquetaId = (f) => (f?.imdb ? `[imdbid=${f.imdb}]` : f?.tmdb ? `[tmdbid=${f.tmdb}]` : '');
  const sinEtiquetas = (s) => String(s).replace(/\s*\[(imdbid|tmdbid|tvdbid)[=-][^\]]*\]/gi, '').replace(/\s*\((19|20)\d{2}\)$/, '').trim();
  const VIDEO = /\.(mkv|mp4|m4v|avi|mov|webm|ts|m2ts|wmv|mpg|mpeg)$/i;
  const SUBTITULO = /\.(srt|ass|ssa|vtt|sub|idx|sup)$/i;
  const extension = (n) => (/\.[^.]+$/.exec(n)?.[0] ?? '').toLowerCase();
  const sinExt = (n) => n.replace(/\.[^.]+$/, '');
  // Quita lo que no admiten las rutas (y lo que confunde a Emby) y deja un solo espacio
  const limpio = (s) => String(s ?? '').normalize('NFC').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '');
  const gb = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${Math.max(0.1, b / 1048576).toFixed(1)} MB`);

  // Desde la primera etiqueta de calidad o idioma hasta el final sobra («1080p.WEB-DL.x264»…)
  const CALIDAD = /\b(2160p|1080p|720p|480p|4k|uhd|x264|x265|h\.?264|h\.?265|hevc|web-?dl|web-?rip|bluray|bdrip|brrip|hdrip|dvdrip|hdtv|tvrip|amzn|castellano|latino|dual|vose?)\b.*$/i;
  // «La mangosta - 2026 [castellano].mkv», «The.Bow.2005.1080p.mkv»… → { titulo, ano }
  function leerPelicula(nombre) {
    let t = sinExt(nombre).replace(/\[[^\]]*\]/g, ' ');
    if (!/\s/.test(t)) t = t.replace(/[._]+/g, ' ');
    const anos = [...t.matchAll(/(?:^|[\s(.\-])((?:19|20)\d{2})(?=$|[\s).\-])/g)];
    const m = anos.at(-1);
    const ano = m ? m[1] : '';
    if (m) t = t.slice(0, m.index + m[0].indexOf(m[1]));
    t = t.replace(CALIDAD, '').replace(/[\s(\-–]+$/, '');
    // «La mangosta (The Mongoose)» → «La mangosta»: el título alternativo estorba a la búsqueda de Emby
    t = t.replace(/\s*\([^()]*\)\s*$/, '');
    return { titulo: limpio(t.replace(/[\s(\-–]+$/, '')), ano };
  }
  // Episodio en el nombre del archivo → { s (o null si no lo dice), e, e2 (episodio doble), resto, serie, fuerte }
  //   «Fernando - S01E02 - Título.mp4», «serie.1x02.mkv», «Serie T2 Cap 5», «Serie Cap.102», «Capítulo 12»,
  //   «Episodio 3», «Ep 03», «[Grupo] Frieren - 05 [1080p]», y con suelto=true también «Serie 03.mkv»
  // «fuerte» = lleva una marca clara de episodio (no un número suelto)
  const IDIOMA_SUB = /\.(es|spa|esp|lat|en|eng|forced)$/i;
  const PATRONES_EP = [
    { re: /[Ss](\d{1,2})[ ._-]?[Ee](\d{1,4})(?:[ ._-]?-?[Ee](\d{1,4}))?/, s: 1, e: 2, e2: 3 },
    { re: /(?:^|[^\dA-Za-z])(\d{1,2})[xX](\d{2,3})(?!\d)/, s: 1, e: 2 },
    { re: /\b(?:Temporada|Season|Temp|T)[ ._-]?(\d{1,2})[ ._-]*(?:Episodio|Episode|Cap[ií]tulo|Cap|Ep|E)[ ._-]?(\d{1,4})\b/i, s: 1, e: 2 },
    { re: /\bCap\.(\d)(\d{2})\b/i, s: 1, e: 2 },
    { re: /\b(?:Episodio|Episode|Cap[ií]tulo|Cap|Ep|E)[ ._-]*(\d{1,4})\b/i, e: 1 },
    { re: /\s[-–]\s(?!(?:19|20)\d{2}\b)(\d{1,4})(?:v\d)?(?=\s*(?:$|[[(]|[-–]\s))/, e: 1 },
  ];
  function leerEpisodio(nombre, suelto = false) {
    const t = sinExt(nombre).replace(IDIOMA_SUB, '');
    let m = null; let p = null;
    for (const x of PATRONES_EP) { m = x.re.exec(t); if (m) { p = x; break; } }
    let fuerte = true;
    if (!m && suelto) {
      // Número suelto («Serie 03»), sin contar años ni calidades
      // (se tapa con espacios para que las posiciones sigan valiendo en el nombre original)
      const tapa = (x) => ' '.repeat(x.length);
      const sinCal = t.replace(/\[[^\]]*\]|\([^)]*\)/g, tapa).replace(CALIDAD, tapa);
      m = /(?:^|[\s._-])(\d{1,3})(?=$|[\s._-])/.exec(sinCal); p = { e: 1 }; fuerte = false;
    }
    if (!m) return null;
    const s = p.s ? Number(m[p.s]) : null; const e = Number(m[p.e]); const e2 = p.e2 && m[p.e2] ? Number(m[p.e2]) : null;
    if (Number.isNaN(e)) return null;
    let resto = t.slice(m.index + m[0].length).replace(/\[[^\]]*\]/g, ' ');
    if (!/\s/.test(resto.trim())) resto = resto.replace(/[._]+/g, ' ');
    resto = limpio(resto.replace(/\((?:\d{3,4}p|[^()]*(?:x26|hevc|aac)[^()]*)\)/gi, ' ').replace(CALIDAD, '').replace(/^[\s._\-–]+|[\s._\-–]+$/g, ''));
    // Lo de antes es la serie: sin el [grupo] del principio, sin «Temporada 1» y sin calidades
    let serie = t.slice(0, m.index).replace(/^\s*\[[^\]]*\]\s*/, '');
    if (!/\s/.test(serie.trim())) serie = serie.replace(/[._]+/g, ' ');
    serie = serie.replace(/[._]+(?=\s|$)/g, ' ').replace(CALIDAD, '').replace(/\b(Temporada|Season|Temp)\s*\d{1,2}\s*$/i, '');
    serie = limpio(serie.replace(/[\s\-–._]+$/, ''));
    return { s, e, e2, resto, serie, fuerte };
  }
  // Temporada y serie a partir de las carpetas («Frieren/Temporada 2/…», «Serie.S02/…»)
  const TEMP_CARPETA = /^(?:Temporada|Season|Temp|T|S)[\s._-]*(\d{1,2})$/i;
  function leerCarpetas(dir = []) {
    let temporada = null; let serie = '';
    for (const d of dir) {
      const m = TEMP_CARPETA.exec(d.trim());
      if (m) { temporada = Number(m[1]); continue; }
      const s = /^(.*?)[\s._-]+(?:Temporada|Season|S|T)[\s._-]?(\d{1,2})(?:\b.*)?$/i.exec(d);
      if (s && s[1].trim()) { temporada = Number(s[2]); if (!serie) serie = s[1]; continue; }
      if (!serie) serie = d;
    }
    if (serie) { serie = /\s/.test(serie) ? serie : serie.replace(/[._]+/g, ' '); serie = limpio(serie.replace(/\[[^\]]*\]/g, ' ').replace(CALIDAD, '')); }
    return { temporada, serie };
  }
  // Episodio de un archivo de la lista, con lo que digan sus carpetas
  function epDe(a, suelto = sub.tipo === 'serie') {
    if (a.fijo) return { s: a.fijo.s, e: a.fijo.e, e2: null, resto: '', serie: '', fuerte: true };
    const ep = leerEpisodio(a.file.name, suelto);
    if (!ep) return null;
    const c = leerCarpetas(a.dir);
    return { ...ep, s: ep.s ?? c.temporada, serie: ep.serie || c.serie };
  }
  const dos = (n) => String(n).padStart(2, '0');
  // Carpeta de series que corresponde a una de películas («PELICULAS ANIME» → «SERIES ANIME»…)
  function carpetaDeSeries(c) {
    const raiz = sub.raiz ?? [];
    if (!/PEL[IÍ]CULA|ESTRENO|DOCUMENTAL/i.test(c)) return c;
    const n = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const prueba = [n(c).replace(/PELICULAS?/, 'SERIES'), n(c).replace(/DOCUMENTALES?/, 'DOCUSERIES'), 'SERIES'];
    for (const p of prueba) { const x = raiz.find((r) => n(r) === p && r !== c); if (x) return x; }
    return raiz.find((r) => /^SERIES?$/i.test(n(r))) ?? raiz.find((r) => /SERIE/i.test(r) && !/ANIME|DOCU/i.test(r)) ?? c;
  }
  const normal = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  // La ruta en e2 de cada archivo según lo que hay en el formulario
  function rutaDe(a) {
    if (a.editada) return a.ruta;
    const c = sub.carpeta; const ext = extension(a.file.name);
    if (!c) return '';
    if (sub.tipo === 'pelicula') {
      // Carpeta «Título (Año) [imdbid=tt…]» y archivo «Título (Año).mkv»
      const base = `${limpio(sub.titulo) || 'Sin título'}${/^\d{4}$/.test(sub.ano) ? ` (${sub.ano})` : ''}`;
      const dir = `${c}/${base}${sub.ficha ? ` ${etiquetaId(sub.ficha)}` : ''}`;
      if (VIDEO.test(a.file.name)) return `${dir}/${base}${ext}`;
      if (SUBTITULO.test(a.file.name)) { const idioma = /\.(es|spa|en|eng|forced)\.[^.]+$/i.exec(a.file.name)?.[1]; return `${dir}/${base}${idioma ? `.${idioma.toLowerCase()}` : ''}${ext}`; }
      return `${dir}/${limpio(a.file.name)}`;
    }
    if (sub.tipo === 'serie') {
      // Carpeta «Serie (Año) [imdbid=tt…]» (o la que ya había) y episodios «Serie - S01E02 - Título.mkv»
      const carpetaSerie = limpio(sub.serie) || 'Sin nombre';
      const nombreSerie = sinEtiquetas(carpetaSerie) || carpetaSerie;
      const ep = epDe(a);
      const temp = ep?.s ?? leerCarpetas(a.dir).temporada ?? (Number(sub.temporada) || 1);
      const idioma = SUBTITULO.test(a.file.name) ? IDIOMA_SUB.exec(sinExt(a.file.name))?.[1] : null;
      const archivo = ep ? `${nombreSerie} - S${dos(temp)}E${dos(ep.e)}${ep.e2 ? `-E${dos(ep.e2)}` : ''}${ep.resto ? ` - ${ep.resto}` : ''}${idioma ? `.${idioma.toLowerCase()}` : ''}${ext}` : limpio(a.file.name);
      return `${c}/${carpetaSerie}/Temporada ${temp}/${archivo}`;
    }
    return [c, ...String(sub.otra).split('/').map(limpio).filter(Boolean), limpio(a.file.name)].join('/');
  }

  async function cargarCarpetas() {
    try {
      sub.raiz = (await api('/api/panel/e2/carpetas')).carpetas;
      if (!sub.carpeta || !sub.raiz.includes(sub.carpeta)) sub.carpeta = sub.raiz.find((c) => /^PELICULAS$/i.test(c)) ?? sub.raiz[0] ?? '';
      sub.error = '';
    } catch (e) { sub.raiz = []; sub.error = e.message; }
    if (vista === 'subir') pintar();
  }
  const pidiendoSub = {};
  function cargarSubcarpetas(c) {
    if (!c) return Promise.resolve();
    if (sub.subcarpetas[c]) return pidiendoSub[c] ?? Promise.resolve();
    sub.subcarpetas[c] = [];
    return (pidiendoSub[c] = (async () => {
      try { sub.subcarpetas[c] = (await api(`/api/panel/e2/carpetas?en=${encodeURIComponent(c)}`)).carpetas; } catch {}
      delete pidiendoSub[c];
      const dl = $('#series-e2'); if (dl && sub.carpeta === c) { dl.innerHTML = ''; for (const x of sub.subcarpetas[c]) { const o = el('option'); o.value = x; dl.append(o); } }
    })());
  }

  // ---- Archivos elegidos: detecta si son episodios y lo prepara todo ----
  const PERMITIDO = /\.(mkv|mp4|m4v|avi|mov|webm|ts|m2ts|wmv|mpg|mpeg|srt|ass|ssa|vtt|sub|idx|sup|jpg|jpeg|png|nfo)$/i;
  // «Frieren/Temporada 1/x.mkv» → ['Frieren', 'Temporada 1']
  const carpetasDe = (rel) => String(rel ?? '').split('/').slice(0, -1).filter(Boolean);
  // Lo que se suelta en la zona: archivos sueltos o carpetas enteras (se recorren con sus subcarpetas)
  async function soltados(dt) {
    const entradas = [...(dt.items ?? [])].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
    if (!entradas.length) return [...dt.files].map((file) => ({ file, dir: [] }));
    const fuera = [];
    const leer = async (en, dir) => {
      if (en.isFile) { const file = await new Promise((ok, mal) => en.file(ok, mal)).catch(() => null); if (file) fuera.push({ file, dir }); return; }
      if (!en.isDirectory) return;
      const lector = en.createReader();
      for (;;) {
        const lote = await new Promise((ok) => lector.readEntries(ok, () => ok([])));
        if (!lote.length) break;
        for (const x of lote) await leer(x, [...dir, en.name]);
      }
    };
    for (const en of entradas) await leer(en, []);
    return fuera;
  }
  // Nombre de la serie más repetido entre los episodios
  function masRepetido(lista) {
    const cuenta = new Map();
    for (const x of lista) { if (!x) continue; const k = normal(sinEtiquetas(x)); const v = cuenta.get(k) ?? { n: 0, x }; v.n++; cuenta.set(k, v); }
    return [...cuenta.values()].sort((a, b) => b.n - a.n).map((v) => v.x);
  }
  async function anadirArchivos(lista) {
    const fresco = !sub.archivos.length;
    for (const { file, dir } of lista) {
      if (!PERMITIDO.test(file.name) || /^\./.test(file.name)) continue;
      if (sub.archivos.some((a) => a.file.name === file.name && a.file.size === file.size)) continue;
      sub.archivos.push({ file, dir: dir ?? [], editada: false, ruta: '' });
    }
    const videos = sub.archivos.filter((a) => VIDEO.test(a.file.name));
    if (!videos.length) { pintar(); return; }
    let buscar = false;

    // ¿Son episodios? Con marca clara (S01E02, 1x02, Capítulo…) o en una carpeta de temporada,
    // o al menos 3 vídeos con el mismo nombre y distinto número («Serie 01», «Serie 02»…)
    const claros = videos.filter((a) => leerEpisodio(a.file.name)?.fuerte || leerCarpetas(a.dir).temporada !== null);
    const sueltos = videos.map((a) => leerEpisodio(a.file.name, true)).filter(Boolean);
    const porPrefijo = new Map(); for (const x of sueltos) { const k = normal(x.serie); porPrefijo.set(k, new Set([...(porPrefijo.get(k) ?? []), x.e])); }
    const secuencia = [...porPrefijo.values()].some((s) => s.size >= 3);
    const sonEpisodios = claros.length * 2 >= videos.length || secuencia;

    if (sub.tipo !== 'otro' && (sonEpisodios || sub.tipo === 'serie')) {
      if (sub.tipo !== 'serie') {
        sub.tipo = 'serie'; sub.ficha = null; sub.resultados = null; sub.errorFicha = ''; sub.titulo = ''; sub.ano = ''; sub.busca = '';
      }
      // Si estaba en una carpeta de películas, pasa a la de series que le toca
      const c = carpetaDeSeries(sub.carpeta);
      if (c !== sub.carpeta) { sub.carpeta = c; sub.archivos.forEach((a) => { a.editada = false; }); }
      await cargarSubcarpetas(sub.carpeta);
      const eps = videos.map((a) => epDe(a, true));
      const nombres = masRepetido(eps.map((x, i) => x?.serie || leerCarpetas(videos[i].dir).serie || leerPelicula(videos[i].file.name).titulo));
      const nombre = nombres[0] ?? '';
      const temps = [...new Set(eps.map((x) => x?.s).filter((x) => x != null))].sort((a, b) => a - b);
      sub.detectado = { episodios: eps.filter(Boolean).length, sinNumero: eps.filter((x) => !x).length, temporadas: temps, series: nombres };
      if (temps.length) sub.temporada = String(temps[0]);
      // La serie: la carpeta que ya hay en e2 con ese nombre o una nueva; y su ficha se busca sola
      if (nombre && !sub.ficha && (fresco || !limpio(sub.serie))) {
        const n = normal(sinEtiquetas(nombre));
        const ya = (sub.subcarpetas[sub.carpeta] ?? []).find((x) => normal(sinEtiquetas(x)) === n);
        sub.serie = ya ?? nombre; sub.ficha = null; sub.resultados = null; sub.errorFicha = '';
        const tt = /tt\d{6,10}/i.exec(ya ?? '')?.[0] ?? /tt\d{6,10}/i.exec(videos[0].file.name)?.[0];
        sub.busca = tt ?? nombre.replace(/\s*\[[^\]]*\]/g, '');
        buscar = true;
      }
      // Ordena por temporada y episodio (los subtítulos detrás de su vídeo)
      const clave = (a) => { const x = epDe(a); return x ? [x.s ?? leerCarpetas(a.dir).temporada ?? 0, x.e] : [999, 0]; };
      sub.archivos.sort((a, b) => { const x = clave(a); const y = clave(b);
        return x[0] - y[0] || x[1] - y[1] || (VIDEO.test(b.file.name) - VIDEO.test(a.file.name)) || a.file.name.localeCompare(b.file.name); });
    } else if (sub.tipo === 'pelicula') {
      sub.detectado = null;
      // Rellena título y año con el nombre del primer vídeo, si aún está vacío
      const primero = videos[0].file.name;
      if (!sub.titulo) Object.assign(sub, leerPelicula(primero));
      // …y deja preparada la búsqueda de la ficha (o la busca ya, si el nombre lleva el código de IMDb)
      if (!sub.ficha && !sub.busca) {
        const tt = /tt\d{6,10}/i.exec(primero)?.[0];
        sub.busca = tt ?? `${sub.titulo}${sub.ano ? ` ${sub.ano}` : ''}`;
        if (tt) buscar = true;
      }
    }
    pintar();
    if (buscar) buscarFicha(true);
  }
  // ---- Episodios de la serie: cada uno con su hueco para elegir el archivo ----
  // Temporada y episodio de un vídeo de la lista (null si no se sabe)
  function posDe(a) {
    if (!VIDEO.test(a.file.name)) return null;
    const x = epDe(a); if (!x) return null;
    return { s: x.s ?? leerCarpetas(a.dir).temporada ?? (Number(sub.temporada) || 1), e: x.e, e2: x.e2 };
  }
  const archivoDe = (s, e) => sub.archivos.find((a) => { const p = posDe(a); return p && p.s === s && (p.e === e || (p.e2 && p.e <= e && e <= p.e2)); });
  function paramsEpisodios() {
    const x = sub.ficha;
    const ano = x?.ano ?? /\((\d{4})\)/.exec(sub.serie)?.[1] ?? '';
    const imdb = x?.imdb ?? /tt\d{6,10}/i.exec(sub.serie)?.[0] ?? '';
    const tmdb = x?.tmdb ?? /tmdbid=(\d+)/i.exec(sub.serie)?.[1] ?? '';
    return { tmdb, imdb, nombre: x?.nombre ?? sinEtiquetas(sub.serie), ano: ano ? String(ano) : '', carpeta: sub.carpeta, serie: limpio(sub.serie) };
  }
  async function cargarEpisodios(forzar = false) {
    const p = paramsEpisodios(); const clave = JSON.stringify(p);
    if (!forzar && sub.eps?.clave === clave) return;
    sub.eps = { clave, cargando: true, datos: null, error: '', temp: sub.eps?.clave === clave ? sub.eps.temp : null };
    try {
      const d = await api(`/api/panel/e2/episodios?${new URLSearchParams(p)}`);
      if (sub.eps?.clave !== clave) return;
      sub.eps.datos = d;
    } catch (e) { if (sub.eps?.clave === clave) sub.eps.error = e.message; }
    if (sub.eps?.clave === clave) sub.eps.cargando = false;
    if (vista === 'subir') pintar();
  }
  function bloqueEpisodios() {
    const caja = el('div', 'bloque-eps');
    const clave = JSON.stringify(paramsEpisodios());
    if (sub.eps?.clave !== clave) { cargarEpisodios(); }
    const eps = sub.eps;
    const cab = el('div', 'eps-cab');
    cab.append(ico('directo', 'tono-acento'), el('b', null, 'Episodios'));
    const recargar = boton(null, 'icono fino', 'recargar', 'Volver a mirar'); recargar.onclick = () => cargarEpisodios(true);
    caja.append(cab);
    if (!eps || eps.cargando) { caja.append(el('p', 'ayuda', 'Buscando los episodios de la serie…')); return caja; }
    cab.append(recargar);
    if (eps.error) { caja.append(el('p', 'ayuda tono-mal', eps.error)); return caja; }
    let temps = eps.datos.temporadas;
    if (!temps.length) {
      // Sin lista: se ponen los huecos a mano (cuántos episodios tiene cada temporada), más lo que ya
      // está subido en la nube
      const ya = eps.datos.ya ?? [];
      const total = {};
      for (const k of ya) { const [s, e] = k.split('x').map(Number); total[s] = Math.max(total[s] ?? 0, e); }
      for (const [s, n] of Object.entries(sub.manual[eps.clave] ?? {})) total[s] = Math.max(total[s] ?? 0, n);
      temps = Object.entries(total).map(([s, n]) => ({ n: Number(s), episodios: Array.from({ length: n }, (_, i) => ({ e: i + 1, titulo: '', fecha: null, ya: ya.includes(`${s}x${i + 1}`) })) }))
        .sort((a, b) => a.n - b.n);
      caja.append(el('p', 'ayuda', `No se ha encontrado la lista de episodios de esta serie${!eps.datos.tmdb && rol !== 'subidor' ? ' (sin clave de TMDB en la VPS solo se mira TVmaze, que tiene poco contenido español)' : ''}. Pon cuántos episodios tiene la temporada y te pongo los huecos:`));
      const f = el('div', 'fila-manual');
      const campoN = (txt, v, ph) => { const l = el('label', 'corto', txt); const i = el('input'); i.value = v; i.inputMode = 'numeric'; i.placeholder = ph; i.oninput = () => { i.value = i.value.replace(/\D/g, '').slice(0, 3); }; l.append(i); return [l, i]; };
      const [lt, it] = campoN('Temporada', String(eps.temp ?? (Number(sub.temporada) || 1)), '1');
      const [le, ie] = campoN('Episodios', String(total[Number(it.value)] || ''), '8');
      const poner = boton('Poner huecos', 'fino', 'mas');
      poner.onclick = () => {
        const t = Number(it.value); const n = Math.min(Number(ie.value) || 0, 500);
        if (!it.value || !n) { ie.focus(); return; }
        sub.manual[eps.clave] = { ...(sub.manual[eps.clave] ?? {}), [t]: n };
        sub.eps.temp = t; sub.temporada = String(t); pintar();
      };
      ie.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); poner.click(); } };
      f.append(lt, le, poner); caja.append(f);
      if (!temps.length) return caja;
    }
    // Temporada que se muestra: la elegida, la del campo «Temporada» o la primera a la que le falte algo
    const nums = temps.map((t) => t.n);
    const falta = (t) => t.episodios.some((x) => !x.ya);
    let n = eps.temp ?? (nums.includes(Number(sub.temporada)) && sub.archivos.length ? Number(sub.temporada) : null) ?? temps.find(falta)?.n ?? nums.at(-1);
    if (!nums.includes(n)) n = nums[0];
    const t = temps.find((x) => x.n === n);
    if (temps.length > 1) {
      const seg = el('div', 'segmentos temps');
      for (const x of temps) {
        const b = el('button', x.n === n ? 'activa' : '', x.n === 0 ? 'Especiales' : `T${x.n}`); b.type = 'button';
        b.title = `${x.episodios.filter((y) => y.ya).length} de ${x.episodios.length} en la nube`;
        b.onclick = () => { sub.eps.temp = x.n; sub.temporada = String(x.n); pintar(); };
        seg.append(b);
      }
      caja.append(seg);
    }
    const enNube = t.episodios.filter((x) => x.ya).length;
    const elegidos = t.episodios.filter((x) => archivoDe(n, x.e)).length;
    const faltan = t.episodios.filter((x) => !x.ya && !archivoDe(n, x.e));
    caja.append(el('small', 'tenue', `Temporada ${n}: ${t.episodios.length} episodios · ${enNube} en la nube · ${elegidos} elegido${elegidos === 1 ? '' : 's'}${faltan.length ? ` · faltan ${faltan.length}` : ''}`));

    const hoy = new Date().toISOString().slice(0, 10);
    const lista = el('div', 'lista-eps');
    for (const x of t.episodios) {
      const fila = el('div', `fila-ep${x.ya ? ' ya' : ''}`);
      const tx = el('div', 'linea-subir-texto');
      tx.append(el('b', null, x.titulo || `Episodio ${x.e}`));
      const a = archivoDe(n, x.e);
      if (a) tx.append(el('small', 'mono', a.file.name));
      else if (x.fecha) tx.append(el('small', 'tenue', x.fecha > hoy ? `Se estrena el ${fechaCorta(x.fecha)}` : fechaCorta(x.fecha)));
      fila.append(el('span', 'chip chip-ep', `E${dos(x.e)}`), tx);
      if (a) {
        fila.append(el('span', 'chip tono-acento', 'Elegido'));
        const q = boton(null, 'icono fino', 'cerrar', 'Quitar este archivo');
        q.onclick = () => { sub.archivos.splice(sub.archivos.indexOf(a), 1); pintar(); };
        fila.append(q);
      } else if (x.ya) {
        fila.append(el('span', 'chip tono-bien', 'En la nube'));
      } else {
        const b = boton('Elegir archivo', 'fino', 'archivo');
        b.onclick = () => elegirArchivos(false, (files) => {
          sub.archivos.push({ file: files[0], dir: [], fijo: { s: n, e: x.e }, editada: false, ruta: '' });
          sub.temporada = String(n); pintar();
        });
        fila.append(b);
      }
      lista.append(fila);
    }
    caja.append(lista);
    // Varios a la vez: los que traen su número van a su sitio y el resto rellena los que faltan, en orden
    if (faltan.length > 1) {
      const b = boton(`Elegir varios para los ${faltan.length} que faltan`, 'fino', 'subir');
      b.onclick = () => elegirArchivos(true, async (files) => {
        const antes = new Set(sub.archivos);
        sub.temporada = String(n); sub.eps.temp = n;
        await anadirArchivos([...files].sort((p, q) => p.name.localeCompare(q.name, 'es', { numeric: true })).map((file) => ({ file, dir: [] })));
        const huecos = t.episodios.filter((y) => !y.ya && !archivoDe(n, y.e)).map((y) => y.e);
        for (const a of sub.archivos) if (!antes.has(a) && VIDEO.test(a.file.name) && !posDe(a) && huecos.length) a.fijo = { s: n, e: huecos.shift() };
        pintar();
      });
      caja.append(b);
    }
    return caja;
  }
  // Abre el selector de archivos del sistema
  function elegirArchivos(varios, alElegir) {
    const i = el('input'); i.type = 'file'; i.multiple = varios; i.hidden = true;
    i.accept = varios ? '.mkv,.mp4,.m4v,.avi,.mov,.webm,.ts,.m2ts,.wmv,.mpg,.mpeg,.srt,.ass,.ssa,.vtt' : '.mkv,.mp4,.m4v,.avi,.mov,.webm,.ts,.m2ts,.wmv,.mpg,.mpeg';
    i.onchange = () => { if (i.files.length) alElegir([...i.files]); i.remove(); };
    document.body.append(i); i.click();
  }

  // Resumen de lo detectado encima de la lista
  function avisoDetectado() {
    const d = sub.detectado; const caja = el('div', 'aviso-detectado');
    if (sub.tipo !== 'serie' || !d) return caja;
    const temps = d.temporadas.length ? ` · ${d.temporadas.length > 1 ? `temporadas ${d.temporadas.join(', ')}` : `temporada ${d.temporadas[0]}`}` : '';
    const t = el('div', 'linea-subir-texto');
    t.append(el('b', null, `${d.episodios} episodio${d.episodios === 1 ? '' : 's'} detectado${d.episodios === 1 ? '' : 's'}${temps}`),
      el('small', null, `Serie: ${d.series[0] ?? sub.serie}. Se suben a «${sub.carpeta}» con el nombre que entiende Emby.`));
    if (d.sinNumero) t.append(el('small', 'tono-aviso', `${d.sinNumero} vídeo${d.sinNumero === 1 ? '' : 's'} sin número de episodio: revísalo${d.sinNumero === 1 ? '' : 's'} abajo.`));
    caja.append(ico('directo', 'tono-acento'), t);
    // Varias series a la vez: solo se puede subir una por tanda
    if (d.series.length > 1) {
      const otras = el('div', 'linea-subir-texto');
      otras.append(el('small', 'tono-aviso', `Hay episodios de varias series (${d.series.join(', ')}). Sube cada serie por separado:`));
      const bs = el('div', 'botones-series');
      for (const s of d.series) {
        const b = boton(`Quedarme con «${s}»`, 'fino'); b.onclick = () => {
          const n = normal(sinEtiquetas(s));
          sub.archivos = sub.archivos.filter((a) => { const ep = epDe(a); const k = ep?.serie || leerCarpetas(a.dir).serie; return !k || normal(sinEtiquetas(k)) === n; });
          sub.detectado = null; const resto = sub.archivos; sub.archivos = []; sub.serie = ''; anadirArchivos(resto.map((a) => ({ file: a.file, dir: a.dir })));
        };
        bs.append(b);
      }
      otras.append(bs); caja.append(otras);
      caja.classList.add('varias');
    }
    return caja;
  }

  function vistaSubir(v) {
    if (!e2Activo) {
      const c = el('div', 'tarjeta vacia');
      c.append(ico('subir', 'grande tono-acento'), el('h3', null, 'La subida a e2 no está activada'),
        el('p', null, 'El servidor del panel todavía no tiene las claves de e2. Se cogen solas del montaje de rclone de la VPS al volver a lanzar el instalador de MorvehTV Cuentas.'));
      v.append(c); return;
    }
    if (sub.raiz === null) { v.append(esqueleto()); cargarCarpetas(); return; }
    if (sub.error) {
      const f = el('div', 'tarjeta fallo'); f.append(ico('alerta', 'tono-mal'));
      const t = el('div'); t.append(el('b', null, 'No se pudo leer e2'), el('span', null, sub.error)); f.append(t);
      const r = boton('Reintentar', '', 'recargar'); r.onclick = () => { sub.raiz = null; pintar(); }; f.append(r);
      v.append(f); return;
    }
    const rejilla = el('div', 'rejilla-subir');
    rejilla.append(formularioSubir(), colaSubir());
    v.append(rejilla);
  }

  function formularioSubir() {
    const t = tarjeta('Qué vas a subir', 'subir');
    const f = t.cuerpo; f.classList.add('form-subir');
    const tipos = el('div', 'segmentos');
    for (const [k, txt] of [['pelicula', 'Película'], ['serie', 'Serie'], ['otro', 'Otro']]) {
      const b = el('button', sub.tipo === k ? 'activa' : '', txt); b.type = 'button';
      b.onclick = () => { if (sub.tipo !== k) { sub.ficha = null; sub.resultados = null; sub.errorFicha = ''; } sub.tipo = k; pintar(); };
      tipos.append(b);
    }
    f.append(tipos);

    const carpeta = el('select');
    for (const c of sub.raiz) { const o = el('option', null, c); o.value = c; o.selected = c === sub.carpeta; carpeta.append(o); }
    carpeta.onchange = () => { sub.carpeta = carpeta.value; sub.archivos.forEach((a) => { a.editada = false; }); pintar(); };
    const lc = el('label', null, 'Carpeta de e2 (biblioteca)'); lc.append(carpeta); f.append(lc);

    const campo = (texto, valor, alCambiar, op = {}) => {
      const l = el('label', op.clase ?? null, texto); const i = el('input');
      i.value = valor; i.spellcheck = false; if (op.placeholder) i.placeholder = op.placeholder; if (op.lista) i.setAttribute('list', op.lista);
      if (op.modo) i.inputMode = op.modo;
      i.oninput = () => { alCambiar(i.value); repintarRutas(); };
      l.append(i); return l;
    };
    if (sub.tipo !== 'otro') f.append(bloqueFicha());
    if (sub.tipo === 'pelicula') {
      const fila = el('div', 'fila-campos');
      fila.append(campo('Título', sub.titulo, (x) => { sub.titulo = x; }, { placeholder: 'Como en TMDB: La mangosta' }),
        campo('Año', sub.ano, (x) => { sub.ano = x.replace(/\D/g, '').slice(0, 4); }, { placeholder: '2026', modo: 'numeric', clase: 'corto' }));
      f.append(fila);
    } else if (sub.tipo === 'serie') {
      cargarSubcarpetas(sub.carpeta);
      const dl = el('datalist'); dl.id = 'series-e2';
      for (const x of sub.subcarpetas[sub.carpeta] ?? []) { const o = el('option'); o.value = x; dl.append(o); }
      const fila = el('div', 'fila-campos');
      fila.append(campo('Serie', sub.serie, (x) => { sub.serie = x; }, { placeholder: 'Nombre (Año), o elige una que ya está', lista: 'series-e2' }),
        campo('Temporada', sub.temporada, (x) => { sub.temporada = x.replace(/\D/g, '').slice(0, 2); }, { placeholder: '1', modo: 'numeric', clase: 'corto' }));
      f.append(fila, dl, el('p', 'ayuda', 'La temporada y el episodio se sacan del nombre (S01E02, 1x02, T1 Cap 2, Capítulo 2…) o de la carpeta «Temporada 2». Esta temporada solo se usa para los que no la dicen.'));
      if (sub.ficha || limpio(sub.serie)) f.append(bloqueEpisodios());
    } else {
      f.append(campo('Subcarpeta (opcional)', sub.otra, (x) => { sub.otra = x; }, { placeholder: 'Por ejemplo: Fernando (2020)/Temporada 1' }),
        el('p', 'ayuda', 'Se sube con el nombre original del archivo.'));
    }

    // Elegir o soltar archivos
    const zona = el('label', 'zona-subir');
    const input = el('input'); input.type = 'file'; input.multiple = true; input.hidden = true;
    input.accept = '.mkv,.mp4,.m4v,.avi,.mov,.webm,.ts,.m2ts,.wmv,.mpg,.mpeg,.srt,.ass,.ssa,.vtt,.sub,.idx,.sup,.jpg,.jpeg,.png,.nfo';
    zona.append(ico('archivo', 'grande tono-acento'), el('b', null, 'Elige o arrastra aquí los archivos o carpetas'),
      el('small', null, 'Vídeos, subtítulos o imágenes. Los episodios (S01E02, 1x02, Capítulo 5…) se detectan solos, también arrastrando la carpeta de una serie o temporada.'), input);
    input.onchange = () => { anadirArchivos([...input.files].map((file) => ({ file, dir: carpetasDe(file.webkitRelativePath) }))); input.value = ''; };
    // Una carpeta entera (con sus subcarpetas de temporadas)
    const inputCarpeta = el('input'); inputCarpeta.type = 'file'; inputCarpeta.hidden = true; inputCarpeta.webkitdirectory = true;
    inputCarpeta.onchange = () => { anadirArchivos([...inputCarpeta.files].map((file) => ({ file, dir: carpetasDe(file.webkitRelativePath) }))); inputCarpeta.value = ''; };
    zona.ondragover = (e) => { e.preventDefault(); zona.classList.add('encima'); };
    zona.ondragleave = () => zona.classList.remove('encima');
    zona.ondrop = async (e) => { e.preventDefault(); zona.classList.remove('encima'); anadirArchivos(await soltados(e.dataTransfer)); };
    const elegirCarpeta = el('button', 'enlace-carpeta', 'o elige una carpeta entera'); elegirCarpeta.type = 'button';
    elegirCarpeta.onclick = () => inputCarpeta.click();
    f.append(zona, elegirCarpeta, inputCarpeta);
    if (sub.detectado && sub.tipo === 'serie') f.append(avisoDetectado());

    // Cómo quedará cada archivo
    const lista = el('div', 'lista-subir'); lista.id = 'rutas-subir';
    f.append(lista);
    const pie = el('div', 'botones');
    const vaciar = boton('Quitar todos'); vaciar.onclick = () => { sub.archivos = []; sub.detectado = null; pintar(); };
    const ir = boton(sub.archivos.length > 1 ? `Subir ${sub.archivos.length} archivos` : 'Subir', 'primario', 'subir');
    ir.id = 'boton-subir';
    ir.onclick = () => ponerEnCola();
    if (sub.archivos.length) pie.append(vaciar);
    pie.append(ir); f.append(pie);
    repintarRutas(lista);
    ir.disabled = !puedeSubir();
    return t.caja;
  }

  function repintarRutas(lista = $('#rutas-subir')) {
    if (!lista) return;
    lista.innerHTML = '';
    for (const a of sub.archivos) a.ruta = rutaDe(a);
    if (!sub.archivos.length) { lista.append(el('p', 'tarjeta-vacia', 'Aún no has elegido ningún archivo.')); }
    for (const a of sub.archivos) {
      const fila = el('div', 'linea-subir');
      const txt = el('div', 'linea-subir-texto');
      const ep = sub.tipo === 'serie' && !a.editada ? epDe(a) : null;
      const cab = el('div', 'linea-subir-cab');
      if (ep) cab.append(el('span', 'chip tono-acento chip-ep', `T${ep.s ?? leerCarpetas(a.dir).temporada ?? (Number(sub.temporada) || 1)} · E${dos(ep.e)}${ep.e2 ? `-${dos(ep.e2)}` : ''}`));
      cab.append(el('b', null, a.dir?.length ? `${a.dir.join('/')}/${a.file.name}` : a.file.name));
      txt.append(cab, el('small', 'mono', `→ ${a.ruta}`));
      const avisoEp = sub.tipo === 'serie' && VIDEO.test(a.file.name) && !ep && !a.editada;
      if (avisoEp) txt.append(el('small', 'tono-aviso', 'No se ve el número de episodio: Emby puede no reconocerlo. Cambia el nombre con el lápiz.'));
      const tam = el('span', 'tenue', gb(a.file.size));
      const ed = boton(null, 'icono fino', 'editar', 'Cambiar la ruta');
      ed.onclick = async () => { const r = await pedirTexto('Ruta en e2', 'Carpeta de la biblioteca / subcarpetas / nombre del archivo.', a.ruta, 'Guardar'); if (r) { a.ruta = r.replace(/^\/+/, ''); a.editada = true; repintarRutas(); } };
      const q = boton(null, 'icono fino', 'cerrar', 'Quitar');
      q.onclick = () => { sub.archivos.splice(sub.archivos.indexOf(a), 1); pintar(); };
      fila.append(ico(VIDEO.test(a.file.name) ? 'directo' : 'archivo', 'tono-acento'), txt, tam, ed, q);
      lista.append(fila);
    }
    const b = $('#boton-subir'); if (b) b.disabled = !puedeSubir();
  }
  const puedeSubir = () => sub.archivos.length > 0 && Boolean(sub.carpeta) && !(sub.tipo === 'serie' && !limpio(sub.serie)) && !(sub.tipo === 'pelicula' && !limpio(sub.titulo));

  // ---- Ficha de IMDb / TMDB ----
  // auto = la ha lanzado la detección de episodios: si el título coincide con un solo resultado, se elige solo
  async function buscarFicha(auto = false) {
    const q = sub.busca.trim();
    if (!q) return;
    const tipoAntes = sub.tipo;
    sub.buscando = true; sub.errorFicha = ''; sub.resultados = null; pintar();
    try {
      const r = await api(`/api/panel/e2/ficha?tipo=${sub.tipo}&q=${encodeURIComponent(q)}`);
      if (auto && (sub.tipo !== tipoAntes || sub.busca.trim() !== q || sub.ficha)) { sub.buscando = false; if (vista === 'subir') pintar(); return; }
      // Un enlace de TMDB de serie con «Película» elegido (o al revés): se cambia solo
      if (r.tipo !== sub.tipo) { sub.tipo = r.tipo; sub.ficha = null; }
      sub.resultados = r.resultados;
      const conAno = /^(.*?)[\s(]+((?:19|20)\d{2})\)?$/.exec(q);
      const iguales = r.resultados.filter((x) => normal(x.nombre) === normal(conAno ? conAno[1] : q) && (!conAno || !x.ano || String(x.ano) === conAno[2]));
      // Con un código (IMDb o TMDB) y un solo resultado, se elige directamente
      if (r.por !== 'titulo' && r.resultados.length === 1) elegirFicha(r.resultados[0]);
      else if (auto && r.por === 'titulo' && iguales.length === 1) elegirFicha(iguales[0]);
      else if (!r.resultados.length) sub.errorFicha = r.por === 'titulo' ? 'No se ha encontrado nada con ese título' : 'No se ha encontrado nada con ese código';
    } catch (e) { sub.errorFicha = e.message; }
    sub.buscando = false;
    if (vista === 'subir') pintar();
  }
  function elegirFicha(x) {
    sub.ficha = x; sub.resultados = null; sub.errorFicha = '';
    if (sub.tipo === 'pelicula') { sub.titulo = x.nombre; sub.ano = x.ano ? String(x.ano) : ''; }
    else {
      // Si la serie ya tiene carpeta en e2 (con o sin código), se usa esa; si no, una nueva con el código
      const ya = (sub.subcarpetas[sub.carpeta] ?? []).find((c) => (x.imdb && c.includes(x.imdb)) || (x.tmdb && c.includes(`tmdbid=${x.tmdb}`))
        || sinEtiquetas(c).toLowerCase() === x.nombre.toLowerCase());
      sub.serie = ya ?? `${limpio(x.nombre)}${x.ano ? ` (${x.ano})` : ''} ${etiquetaId(x)}`;
    }
    sub.archivos.forEach((a) => { a.editada = false; });
    if (vista === 'subir') pintar();
  }
  function bloqueFicha() {
    const caja = el('div', 'bloque-ficha');
    if (sub.ficha) {
      const x = sub.ficha;
      const fila = el('div', 'ficha-elegida');
      const img = el('div', 'mini-cartel'); if (x.cartel) img.style.backgroundImage = `url("${x.cartel}")`;
      const tx = el('div', 'linea-subir-texto');
      tx.append(el('b', null, `${x.nombre}${x.ano ? ` (${x.ano})` : ''}`), el('small', 'mono', [x.imdb && `IMDb ${x.imdb}`, x.tmdb && `TMDB ${x.tmdb}`].filter(Boolean).join(' · ')),
        el('small', 'tono-bien', 'Vinculada: Emby reconocerá la ficha por su código'));
      const q = boton('Cambiar', 'fino'); q.onclick = () => { sub.ficha = null; pintar(); };
      fila.append(img, tx, q); caja.append(fila);
      return caja;
    }
    const l = el('label', null, sub.tipo === 'serie' ? 'Ficha de la serie: IMDb, TMDB o título' : 'Ficha de la película: IMDb, TMDB o título');
    const fila = el('div', 'fila-busca');
    const i = el('input'); i.value = sub.busca; i.spellcheck = false; i.placeholder = 'tt1234567, enlace de imdb.com o themoviedb.org, o el título';
    i.oninput = () => { sub.busca = i.value; };
    i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); buscarFicha(); } };
    const b = boton(sub.buscando ? 'Buscando…' : 'Buscar', 'primario', 'buscar'); b.disabled = sub.buscando; b.onclick = () => buscarFicha();
    fila.append(i, b); l.append(fila); caja.append(l);
    if (sub.errorFicha) caja.append(el('p', 'ayuda tono-mal', sub.errorFicha));
    if (sub.resultados?.length) {
      const lista = el('div', 'resultados-ficha');
      for (const x of sub.resultados) {
        const r = el('button', 'resultado-ficha'); r.type = 'button';
        const img = el('div', 'mini-cartel'); if (x.cartel) img.style.backgroundImage = `url("${x.cartel}")`;
        const tx = el('div', 'linea-subir-texto');
        tx.append(el('b', null, `${x.nombre}${x.ano ? ` (${x.ano})` : ''}`), el('small', 'mono', [x.imdb, x.tmdb && `TMDB ${x.tmdb}`].filter(Boolean).join(' · ')));
        if (x.resumen) tx.append(el('small', 'tenue resumen-ficha', x.resumen));
        r.append(img, tx); r.onclick = () => elegirFicha(x);
        lista.append(r);
      }
      caja.append(lista);
    }
    return caja;
  }

  // ---- Cola de subidas ----
  function ponerEnCola() {
    for (const a of sub.archivos) sub.cola.push({ file: a.file, ruta: a.ruta, subido: 0, estado: 'esperando', error: '', xhrs: new Set(), id: null });
    sub.archivos = []; sub.detectado = null;
    if (sub.tipo === 'pelicula') { sub.titulo = ''; sub.ano = ''; sub.ficha = null; }
    sub.busca = ''; sub.resultados = null;
    pintar();
    trabajar();
  }
  let trabajando = false;
  async function trabajar() {
    if (trabajando) return; trabajando = true;
    try {
      let x;
      while ((x = sub.cola.find((i) => i.estado === 'esperando'))) await subirUno(x);
    } finally {
      trabajando = false;
      // Los episodios recién subidos pasan a «En la nube»
      if (sub.eps && sub.tipo === 'serie' && vista === 'subir') cargarEpisodios(true);
    }
  }
  window.addEventListener('beforeunload', (e) => { if (sub.cola.some((i) => i.estado === 'subiendo' || i.estado === 'esperando')) { e.preventDefault(); e.returnValue = ''; } });

  function putTrozo(item, url, blob, alAvanzar) {
    return new Promise((ok, mal) => {
      const x = new XMLHttpRequest(); item.xhrs.add(x);
      x.open('PUT', url);
      x.upload.onprogress = (e) => alAvanzar(e.loaded);
      x.onload = () => { item.xhrs.delete(x); const et = x.getResponseHeader('ETag'); if (x.status >= 200 && x.status < 300 && et) ok(et.replace(/"/g, '')); else mal(Object.assign(new Error(x.status >= 200 && x.status < 300 ? 'e2 no devuelve la marca del trozo (CORS)' : `e2 respondió ${x.status}`), { status: x.status })); };
      x.onerror = () => { item.xhrs.delete(x); mal(new Error('Se cortó la conexión')); };
      x.onabort = () => { item.xhrs.delete(x); mal(Object.assign(new Error('Cancelada'), { cancelada: true })); };
      x.send(blob);
    });
  }

  async function subirUno(item) {
    item.estado = 'subiendo'; item.inicio = Date.now(); item.error = ''; pintarItem(item);
    try {
      let a;
      try { a = await api('/api/panel/e2/abrir', { ruta: item.ruta, tamano: item.file.size, tipo: item.file.type }); } catch (e) {
        if (e.status !== 409) throw e;
        if (rol === 'subidor') throw new Error('Ya existe en la nube y tu cuenta no puede reemplazar nada: cámbiale el nombre con el lápiz');
        if (!(await confirmar('Ese archivo ya existe', `En e2 ya hay «${item.ruta}». ¿Quieres reemplazarlo por el nuevo?`, 'Reemplazar', true))) { item.estado = 'cancelada'; pintarItem(item); return; }
        a = await api('/api/panel/e2/abrir', { ruta: item.ruta, tamano: item.file.size, tipo: item.file.type, reemplazar: true });
      }
      item.id = a.id;
      const etags = new Array(a.partes);
      const hechos = new Array(a.partes).fill(0);
      const urls = {};
      const pendientes = Array.from({ length: a.partes }, (_, i) => i + 1);
      // Direcciones firmadas de 20 en 20 (la que falta y las siguientes que aún no se han empezado)
      const pedirUrls = async (n) => {
        const numeros = [n, ...pendientes.slice(0, 19)].filter((x) => !urls[x]);
        Object.assign(urls, (await api('/api/panel/e2/trozos', { id: a.id, numeros })).urls);
      };
      const hilo = async () => {
        let n;
        while ((n = pendientes.shift()) !== undefined) {
          if (item.estado !== 'subiendo') return;
          const blob = item.file.slice((n - 1) * a.tamParte, n * a.tamParte);
          for (let intento = 1; ; intento++) {
            try {
              if (!urls[n]) await pedirUrls(n);
              etags[n - 1] = await putTrozo(item, urls[n], blob, (b) => { hechos[n - 1] = b; item.subido = hechos.reduce((s, x) => s + x, 0); pintarItem(item); });
              hechos[n - 1] = blob.size; break;
            } catch (e) {
              if (e.cancelada || item.estado !== 'subiendo') return;
              hechos[n - 1] = 0;
              if (e.status === 403) delete urls[n]; // la dirección caducó: se pide otra
              if (intento >= 5) throw e;
              await new Promise((r) => setTimeout(r, 2000 * intento));
            }
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, a.partes) }, hilo));
      if (item.estado !== 'subiendo') return;
      if (etags.some((x) => !x)) throw new Error('Faltan trozos por subir');
      item.estado = 'juntando'; pintarItem(item);
      await api('/api/panel/e2/cerrar', { id: a.id, etags });
      item.estado = 'hecho'; item.subido = item.file.size; item.fin = Date.now();
      aviso(`Subido: ${item.ruta.split('/').pop()}`, 'bien');
    } catch (e) {
      if (item.estado === 'cancelada') return;
      item.estado = 'error'; item.error = e.message;
      item.xhrs.forEach((x) => x.abort());
      if (item.id) api('/api/panel/e2/cancelar', { id: item.id }).catch(() => {});
    }
    pintarItem(item);
  }

  function cancelarItem(item) {
    if (item.estado === 'esperando') { item.estado = 'cancelada'; pintarItem(item); return; }
    if (item.estado !== 'subiendo') return;
    item.estado = 'cancelada';
    item.xhrs.forEach((x) => x.abort());
    if (item.id) api('/api/panel/e2/cancelar', { id: item.id }).catch(() => {});
    pintarItem(item);
  }

  function colaSubir() {
    const t = tarjeta('Subidas', 'subir', sub.cola.length ? null : 'Lo que subas aparecerá aquí con su progreso. Puedes cambiar de sección en el panel mientras tanto, pero no cierres esta pestaña.');
    t.cuerpo.id = 'cola-subir';
    for (const item of [...sub.cola].reverse()) t.cuerpo.append(filaItem(item));
    const hechos = sub.cola.filter((i) => ['hecho', 'cancelada', 'error'].includes(i.estado));
    if (hechos.length) {
      const b = boton('Limpiar la lista', 'fino'); b.onclick = () => { sub.cola = sub.cola.filter((i) => !hechos.includes(i)); pintar(); };
      const fila = el('div', 'botones'); fila.append(b); t.cuerpo.append(fila);
    }
    if (sub.cola.some((i) => i.estado === 'hecho')) t.cuerpo.append(el('p', 'ayuda', 'Emby lo verá solo en unos minutos (escanea las bibliotecas al terminar cada subida).'));
    return t.caja;
  }
  const TEXTO_ESTADO = { esperando: 'En espera', subiendo: 'Subiendo', juntando: 'Terminando…', hecho: 'Subido', error: 'Error', cancelada: 'Cancelada' };
  function filaItem(item) {
    const f = el('div', 'item-subida'); item.el = f;
    const cab = el('div', 'item-cab');
    const txt = el('div', 'linea-subir-texto'); txt.append(el('b', null, item.ruta.split('/').pop()), el('small', 'mono tenue', item.ruta));
    const tono = { hecho: 'bien', error: 'mal', cancelada: 'gris', subiendo: 'acento', juntando: 'acento', esperando: 'gris' }[item.estado];
    cab.append(txt, el('span', `chip tono-${tono}`, TEXTO_ESTADO[item.estado]));
    if (['esperando', 'subiendo'].includes(item.estado)) { const c = boton(null, 'icono fino', 'cerrar', 'Cancelar'); c.onclick = () => cancelarItem(item); cab.append(c); }
    if (item.estado === 'error') { const r = boton(null, 'icono fino', 'recargar', 'Reintentar'); r.onclick = () => { item.estado = 'esperando'; item.subido = 0; item.id = null; pintarItem(item); trabajar(); }; cab.append(r); }
    f.append(cab);
    const p = item.file.size ? Math.min(100, (item.subido / item.file.size) * 100) : 0;
    const barra = el('div', `barra ${item.estado === 'hecho' ? 'tono-bien' : item.estado === 'error' ? 'tono-mal' : 'tono-acento'}`); const r = el('i'); r.style.width = `${p}%`; barra.append(r);
    let detalle = `${gb(item.subido)} de ${gb(item.file.size)}`;
    if (item.estado === 'subiendo' && item.subido > 0) {
      const seg = (Date.now() - item.inicio) / 1000; const vel = item.subido / Math.max(1, seg);
      const queda = (item.file.size - item.subido) / Math.max(1, vel);
      detalle += ` · ${(vel / 1048576).toFixed(1)} MB/s · quedan ${queda > 3600 ? `${Math.floor(queda / 3600)} h ${Math.round((queda % 3600) / 60)} min` : queda > 60 ? `${Math.round(queda / 60)} min` : `${Math.round(queda)} s`}`;
    }
    if (item.estado === 'error') detalle = item.error;
    f.append(barra, el('small', item.estado === 'error' ? 'tono-mal' : 'tenue', `${Math.floor(p)} % · ${detalle}`));
    return f;
  }
  // Repinta solo la fila (como mucho 4 veces por segundo); si no está en pantalla, no hace nada
  function pintarItem(item) {
    const ahora = Date.now();
    if (item.estado === 'subiendo' && item.pintado && ahora - item.pintado < 250) return;
    item.pintado = ahora;
    const viejo = item.el;
    if (viejo?.isConnected) viejo.replaceWith(filaItem(item));
    // Al cambiar de estado (hecho, error…) se repinta la tarjeta entera para los botones del pie
    if (item.estado !== 'subiendo' && vista === 'subir' && $('#cola-subir') && !pila.length) { const c = colaSubir(); $('#cola-subir').closest('.tarjeta').replaceWith(c); }
  }

  // ---------- Subidores (solo administradores) ----------
  // Cuentas que solo pueden subir contenido NUEVO a e2: no reemplazan ni borran nada y no ven nada más
  let subidores = null;
  async function cargarSubidores() {
    try { subidores = await api('/api/panel/subidores'); } catch (e) { subidores = { error: e.message }; }
    if (vista === 'equipo') pintar();
  }
  const textoCarpetas = (c) => (c?.length ? c.join(' · ') : 'Todas las carpetas');
  function vistaEquipo(v) {
    if (subidores === null) { v.append(esqueleto()); cargarSubidores(); return; }
    if (subidores.error) {
      const f = el('div', 'tarjeta fallo'); f.append(ico('alerta', 'tono-mal'));
      const t = el('div'); t.append(el('b', null, 'No se pudo cargar'), el('span', null, subidores.error)); f.append(t);
      const r = boton('Reintentar', '', 'recargar'); r.onclick = () => { subidores = null; pintar(); }; f.append(r);
      v.append(f); return;
    }
    const info = el('div', 'tarjeta aviso-equipo');
    info.append(ico('escudo', 'tono-acento'), el('p', null, 'Un subidor entra en este mismo panel y solo ve «Subir»: puede subir películas y series nuevas (con su ficha de IMDb/TMDB), pero no puede reemplazar ni borrar nada, ni ver cuentas, revendedores o la actividad. Si quieres, solo en las carpetas que elijas.'));
    v.append(info);
    const t = tarjeta('Subidores', 'nube', subidores.length ? null : 'Todavía no hay ninguno. Pulsa «Nuevo subidor» para crear el primero.');
    for (const x of subidores) {
      const f = el('div', 'linea linea-subidor');
      const a = el('div', 'avatar', x.usuario[0].toUpperCase()); a.style.setProperty('--c', colorDe(x.usuario));
      const tx = el('div', 'linea-subir-texto');
      tx.append(el('b', null, x.usuario), el('small', null, textoCarpetas(x.carpetas)),
        el('small', 'tenue', `${x.subidas ? `${x.subidas} ${x.subidas === 1 ? 'subida' : 'subidas'} · última ${haceCuanto(x.ultimo).toLowerCase()}` : 'Sin subidas todavía'} · creado ${fechaCorta(x.creado)}`));
      const est = insignia(x.activo ? { tono: 'bien', texto: 'Activo' } : { tono: 'gris', texto: 'Suspendido' });
      const acc = el('div', 'acciones-subidor');
      const car = boton(null, 'icono fino', 'carpeta', 'Carpetas'); car.onclick = () => fichaSubidor(x);
      const cl = boton(null, 'icono fino', 'llave', 'Nueva contraseña'); cl.onclick = () => claveSubidor(x);
      const ac = boton(null, 'icono fino', x.activo ? 'pausa' : 'play', x.activo ? 'Suspender' : 'Reactivar'); ac.onclick = () => activarSubidor(x);
      const br = boton(null, 'icono fino peligro', 'papelera', 'Borrar'); br.onclick = () => borrarSubidor(x);
      acc.append(car, cl, ac, br);
      f.append(a, tx, est, acc);
      t.cuerpo.append(f);
    }
    v.append(t.caja);
  }
  async function carpetasE2() {
    try { return (await api('/api/panel/e2/carpetas')).carpetas; } catch { return []; }
  }
  // Crear (sin x) o cambiar las carpetas de uno que ya existe
  async function fichaSubidor(x = null) {
    const lista = await carpetasE2();
    const r = await ventana((w, fin) => {
      const cab = el('div', 'cab-confirmar'); cab.append(ico('nube', 'tono-acento'), el('h2', null, x ? `Carpetas de ${x.usuario}` : 'Nuevo subidor'));
      w.append(cab);
      let usuario = null; let clave = null;
      if (!x) {
        w.append(el('p', null, 'Podrá subir películas y series nuevas desde este panel. No podrá reemplazar ni borrar nada.'));
        const lu = el('label', null, 'Usuario'); usuario = el('input'); usuario.placeholder = 'de 3 a 20 letras o números'; usuario.autocapitalize = 'none'; usuario.spellcheck = false; lu.append(usuario);
        const lc = el('label', null, 'Contraseña'); clave = el('input'); clave.className = 'mono'; clave.value = claveAlAzar(); lc.append(clave);
        w.append(lu, lc);
      }
      const todas = el('label', 'opcion-check'); const ct = el('input'); ct.type = 'checkbox'; ct.checked = !x?.carpetas?.length; todas.append(ct, el('span', null, 'Puede subir a todas las carpetas'));
      const caja = el('div', 'lista-carpetas');
      const marcas = lista.map((c) => { const l = el('label', 'opcion-check'); const i = el('input'); i.type = 'checkbox'; i.value = c; i.checked = Boolean(x?.carpetas?.includes(c)); l.append(i, el('span', null, c)); caja.append(l); return i; });
      const pinta = () => { caja.hidden = ct.checked; };
      ct.onchange = pinta; pinta();
      w.append(el('h3', 'sub-ventana', 'Dónde puede subir'), todas, caja);
      const error = el('p', 'error'); w.append(error);
      pieBotones(w, fin, x ? 'Guardar' : 'Crear subidor', 'primario', () => {
        const carpetas = ct.checked ? null : marcas.filter((i) => i.checked).map((i) => i.value);
        if (carpetas && !carpetas.length) { error.textContent = 'Elige al menos una carpeta (o marca «todas»)'; return; }
        fin({ usuario: usuario?.value.trim().toLowerCase(), clave: clave?.value, carpetas });
      });
      (usuario ?? ct).focus();
    }, { fija: true, ancho: 'mediana' });
    if (!r) return;
    try {
      if (x) { await api('/api/panel/subidores/editar', { usuario: x.usuario, carpetas: r.carpetas }); aviso(`Carpetas de ${x.usuario} guardadas`, 'bien'); }
      else { const n = await api('/api/panel/subidores/crear', r); datosSubidor(n, r.clave, false); }
    } catch (e) { aviso(e.message, 'mal'); }
    subidores = null; pintar();
  }
  async function claveSubidor(x) {
    const clave = await pedirTexto(`Nueva contraseña para ${x.usuario}`, 'Se cerrarán sus sesiones abiertas.', claveAlAzar(), 'Cambiar');
    if (!clave) return;
    try { await api('/api/panel/subidores/editar', { usuario: x.usuario, clave }); datosSubidor(x, clave, true); } catch (e) { aviso(e.message, 'mal'); }
  }
  async function activarSubidor(x) {
    if (x.activo && !(await confirmar(`Suspender a ${x.usuario}`, 'No podrá entrar ni subir nada hasta que lo reactives. Lo que ya subió se queda.', 'Suspender', true))) return;
    try { await api('/api/panel/subidores/editar', { usuario: x.usuario, activo: !x.activo }); aviso(x.activo ? `${x.usuario} suspendido` : `${x.usuario} reactivado`, 'bien'); } catch (e) { aviso(e.message, 'mal'); }
    subidores = null; pintar();
  }
  async function borrarSubidor(x) {
    if (!(await confirmar(`Borrar a ${x.usuario}`, 'Se borra la cuenta y no podrá volver a entrar. Lo que ya subió a la nube NO se borra.', 'Borrar', true))) return;
    try { await api('/api/panel/subidores/borrar', { usuario: x.usuario }); aviso(`${x.usuario} borrado`, 'bien'); } catch (e) { aviso(e.message, 'mal'); }
    subidores = null; pintar();
  }
  function datosSubidor(x, clave, soloClave) {
    ventana((w, fin) => {
      const cab = el('div', 'cab-confirmar'); cab.append(ico('ok', 'tono-bien'), el('h2', null, soloClave ? 'Contraseña cambiada' : 'Subidor creado'));
      w.append(cab, el('p', null, 'Pásale estos datos por mensaje privado. La contraseña no se vuelve a mostrar.'));
      const panel = `${location.origin}${location.pathname}`;
      const raya = '━━━━━━━━━━━━━━━━━━';
      const texto = ['☁️  SUBIR CONTENIDO A MORVEHTV', raya, '', '🌐  Panel', `      ${panel}`, '', '👤  Usuario', `      ${x.usuario}`, '', '🔑  Contraseña', `      ${clave}`, '',
        '📁  Carpetas', `      ${textoCarpetas(x.carpetas)}`, '', raya, '', '▸ Entra en el panel y ve a «Subir».', '▸ Busca la ficha por IMDb o TMDB y arrastra los archivos.',
        '▸ No se puede reemplazar ni borrar nada de lo que ya hay.', '', raya].join('\n');
      const t = el('div', 'credencial');
      const linea = (titulo, valor, mono) => {
        const f = el('div', 'credencial-linea'); const c = boton(null, 'icono fino', 'copiar', `Copiar ${titulo.toLowerCase()}`);
        c.onclick = () => navigator.clipboard.writeText(valor).then(() => aviso(`${titulo} copiado`, 'bien'), () => {});
        f.append(el('span', null, titulo), el('b', mono ? 'mono' : null, valor), c); return f;
      };
      t.append(linea('Panel', panel.replace(/^https?:\/\//, '')), linea('Usuario', x.usuario, true), linea('Contraseña', clave, true));
      w.append(t);
      const copiar = boton('Copiar mensaje completo', 'primario', 'copiar');
      copiar.onclick = () => navigator.clipboard.writeText(texto).then(() => { copiar.querySelector('span').textContent = 'Copiado'; }, () => aviso('No se pudo copiar: selecciónalo a mano', 'mal'));
      const vistaMsg = el('details', 'mensaje'); vistaMsg.append(el('summary', null, 'Ver el mensaje'), el('pre', null, texto));
      const fila = el('div', 'botones'); const ok = boton('Hecho'); ok.onclick = () => fin(null); fila.append(ok, copiar);
      w.append(vistaMsg, fila); copiar.focus();
    }, { fija: true, ancho: 'mediana' });
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

  // ---------- Demo: cuenta de prueba de unas horas, gratis y con 1 pantalla ----------
  const textoHoras = (h) => (h === 1 ? '1 hora' : h % 24 === 0 && h > 24 ? `${h / 24} días` : `${h} horas`);
  function fichaDemo() {
    cerrarMenu();
    const conf = d.demo;
    lateral((w, fin) => {
      const cab = el('header', 'lateral-cab');
      const t = el('div', 'lateral-titulo'); t.append(el('h2', null, 'Nueva demo'), el('p', null, 'Una cuenta de prueba gratis, de unas horas'));
      const x = boton(null, 'icono', 'cerrar', 'Cerrar'); x.onclick = () => fin(null);
      cab.append(t, x);
      const cuerpo = el('div', 'lateral-cuerpo');
      w.append(cab, cuerpo);
      const seccion = (titulo) => { const s2 = el('section', 'seccion-form'); s2.append(el('h3', null, titulo)); cuerpo.append(s2); return s2; };
      // Límites del revendedor
      let sinCupo = false;
      if (conf.alDiaMax) {
        const quedan = Math.max(0, conf.alDiaMax - (conf.hoy ?? 0));
        const activas = normales().filter((u) => u.demo && !u.caducada).length;
        sinCupo = !quedan || activas >= conf.activasMax;
        const c = el('div', `coste-resumen${sinCupo ? ' falta' : ''}`);
        c.append(ico('reloj'), el('span', null, 'Demos'), el('b', null, `te ${quedan === 1 ? 'queda' : 'quedan'} ${quedan} hoy · ${activas} de ${conf.activasMax} activas`));
        cuerpo.append(c);
      }
      const sAcceso = seccion('Acceso');
      const usuario = el('input'); usuario.value = `demo${Math.floor(1000 + Math.random() * 9000)}`; usuario.autocomplete = 'off'; usuario.spellcheck = false; usuario.autocapitalize = 'none';
      sAcceso.append(campo('Usuario', usuario, 'Puedes cambiarlo. No aparece en la pantalla de inicio de Emby.'));
      const fila = el('div', 'fila-clave');
      const clave = el('input'); clave.value = claveAlAzar(); clave.autocomplete = 'new-password'; clave.spellcheck = false; clave.className = 'mono';
      const otra = boton(null, 'icono', 'renovar', 'Generar otra contraseña'); otra.onclick = () => { clave.value = claveAlAzar(); };
      fila.append(clave, otra);
      sAcceso.append(campo('Contraseña', fila, 'Se muestra una sola vez al terminar, para que se la pases.'));
      const sPlan = seccion('Prueba');
      let horas = conf.horas.includes(24) ? 24 : conf.horas[0];
      sPlan.append(campo('Duración', pildoras(conf.horas.map((h) => ({ texto: textoHoras(h), valor: h })), horas, (val) => { horas = val; }),
        'Gratis, 1 pantalla y sin descargas. Al acabar se desactiva sola y al día siguiente se borra. Si el cliente paga, «Renovar» la convierte en una cuenta normal.', 'reloj'));
      const sNota = seccion('Nota interna');
      const nota = el('textarea'); nota.placeholder = 'Para quién es la demo…'; nota.maxLength = 200; nota.rows = 2;
      sNota.append(nota);
      const pie = el('footer', 'lateral-pie');
      const no = boton('Cancelar'); no.onclick = () => fin(null);
      const si = boton('Crear demo', 'primario', 'reloj');
      si.onclick = async () => {
        si.disabled = true; si.querySelector('span').textContent = 'Creando…';
        try {
          const r = await api('/api/panel/emby/demo', { usuario: usuario.value, clave: clave.value, horas, nota: nota.value || `Demo de ${textoHoras(horas)}` });
          fin(true);
          datosDeAcceso(r.usuario, clave.value, r.caduca, false, horas);
          await actualizar();
        } catch (er) { aviso(er.message, 'mal'); si.disabled = false; si.querySelector('span').textContent = 'Crear demo'; }
      };
      if (sinCupo) si.disabled = true;
      pie.append(no, si);
      w.append(pie);
      setTimeout(() => usuario.select(), 60);
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
  function datosDeAcceso(usuario, clave, caduca, soloClave, demoHoras = 0) {
    ventana((w, fin) => {
      const cab = el('div', 'cab-confirmar'); cab.append(ico('ok', 'tono-bien'), el('h2', null, soloClave ? 'Contraseña cambiada' : demoHoras ? 'Demo creada' : 'Cuenta creada'));
      w.append(cab, el('p', null, 'Pásale estos datos por mensaje privado. La contraseña no se vuelve a mostrar.'));
      const servidor = d.servidor.replace(/^https?:\/\//, '');
      const raya = '━━━━━━━━━━━━━━━━━━';
      const texto = [
        demoHoras ? `🎁  TU DEMO DE ${(d.nombreServidor || 'Emby').toUpperCase()} · ${textoHoras(demoHoras).toUpperCase()}` : `📺  TU CUENTA DE ${(d.nombreServidor || 'Emby').toUpperCase()}`,
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
        `      ${caduca ? (demoHoras ? fechaHora(caduca) : fechaCorta(caduca)) : 'Sin caducidad'}`,
        ...(demoHoras ? ['', '      1 pantalla. Si te gusta, pídenos tu cuenta completa.'] : []),
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
      const vence = el('div', 'credencial-linea'); vence.append(el('span', null, 'Caducidad'), el('b', null, caduca ? (demoHoras ? fechaHora(caduca) : fechaCorta(caduca)) : 'Sin caducidad'), el('i'));
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
