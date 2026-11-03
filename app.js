// MorvehTV Gestor: explorador de IDrive e2 con subidas directas. Habla con la API del panel del
// servidor de MorvehTV (/api/panel/…) con un token que se guarda en este navegador.
(() => {
  const API = window.MORVEHTV.api;
  const $ = (s) => document.querySelector(s);
  const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };
  const VIDEO = /\.(mp4|m4v|mkv|webm|mov|avi|ts|wmv|flv)$/i;
  const SUBIBLE = /\.(mp4|m4v|mkv|webm|mov|avi|ts|wmv|flv|srt|vtt|ass|jpe?g|png|webp)$/i;
  const CONCURRENCIA = 4;

  let token = null;
  try { token = localStorage.getItem('gestor-token'); } catch {}
  let actual = ''; // carpeta abierta
  let listado = { carpetas: [], archivos: [] };
  const marcadas = new Set();

  // ---------- Utilidades ----------
  const tam = (n) => { if (!n) return '—'; const u = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.min(4, Math.floor(Math.log(n) / Math.log(1024))); return `${(n / 1024 ** i).toFixed(i >= 3 ? 2 : 0)} ${u[i]}`; };
  const fecha = (f) => (f ? new Date(f).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const tiempo = (s) => (!isFinite(s) ? '—' : s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
  const nombreDe = (k) => k.replace(/\/$/, '').split('/').pop();
  const padreDe = (k) => { const p = k.replace(/\/$/, '').split('/'); p.pop(); return p.length ? `${p.join('/')}/` : ''; };
  const icono = (n) => (VIDEO.test(n) ? '🎬' : /\.(srt|vtt|ass)$/i.test(n) ? '💬' : /\.(jpe?g|png|webp|gif)$/i.test(n) ? '🖼️' : '📄');
  const limpiar = (n) => n.trim().replace(/[\\/]/g, ' ').replace(/^[_.]+/, '').replace(/\s+/g, ' ');

  function aviso(texto, tipo = '') {
    const a = el('div', `aviso ${tipo}`, texto);
    $('#avisos').append(a);
    setTimeout(() => a.remove(), 3500);
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

  // ---------- Ventanas (en vez de alert/prompt/confirm) ----------
  function ventana(montar) {
    return new Promise((listo) => {
      const v = $('#ventana');
      v.innerHTML = '';
      $('#velo').hidden = false;
      const cerrar = (valor) => { $('#velo').hidden = true; v.innerHTML = ''; document.removeEventListener('keydown', esc); listo(valor); };
      const esc = (e) => { if (e.key === 'Escape') cerrar(null); };
      document.addEventListener('keydown', esc);
      $('#velo').onclick = (e) => { if (e.target === $('#velo')) cerrar(null); };
      montar(v, cerrar);
    });
  }
  function botones(v, cerrar, textoSi, clase, alSi) {
    const fila = el('div', 'botones');
    const no = el('button', 'boton', 'Cancelar'); no.onclick = () => cerrar(null);
    const si = el('button', `boton ${clase}`, textoSi); si.onclick = alSi;
    fila.append(no, si); v.append(fila);
    return si;
  }
  const pedirTexto = (titulo, explicacion, valor = '', textoSi = 'Aceptar') => ventana((v, cerrar) => {
    v.append(el('h2', null, titulo));
    if (explicacion) v.append(el('p', null, explicacion));
    const i = el('input'); i.value = valor; v.append(i);
    const si = botones(v, cerrar, textoSi, 'primario', () => { if (limpiar(i.value)) cerrar(limpiar(i.value)); });
    i.onkeydown = (e) => { if (e.key === 'Enter') si.click(); };
    i.focus(); i.setSelectionRange(0, valor.replace(/\.[^.]+$/, '').length || valor.length);
  });
  const confirmar = (titulo, texto, lista, textoSi, peligro) => ventana((v, cerrar) => {
    v.append(el('h2', null, titulo), el('p', null, texto));
    if (lista?.length) { const ul = el('ul', 'lista'); lista.slice(0, 50).forEach((x) => ul.append(el('li', null, x))); if (lista.length > 50) ul.append(el('li', null, `y ${lista.length - 50} más`)); v.append(ul); }
    botones(v, cerrar, textoSi, peligro ? 'peligro lleno' : 'primario', () => cerrar(true)).focus();
  });

  // ---------- Entrar y salir ----------
  function salir() {
    token = null;
    try { localStorage.removeItem('gestor-token'); } catch {}
    $('#vista-panel').hidden = true; $('#vista-entrar').hidden = false;
    $('#e-usuario').focus();
  }
  $('#salir').onclick = salir;
  $('#f-entrar').onsubmit = async (e) => {
    e.preventDefault();
    $('#e-error').textContent = '';
    const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Entrando…';
    try {
      const d = await api('/api/panel/entrar', { usuario: $('#e-usuario').value, clave: $('#e-clave').value });
      token = d.token;
      try { localStorage.setItem('gestor-token', token); } catch {}
      $('#e-clave').value = '';
      arrancar(d);
    } catch (err) {
      $('#e-error').textContent = err.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor (si llevaba rato sin usarse, se está despertando: prueba en unos segundos)' : err.message;
    }
    b.disabled = false; b.textContent = 'Entrar';
  };

  function arrancar(yo) {
    $('#usuario').textContent = yo.nombre || yo.usuario;
    $('#vista-entrar').hidden = true; $('#vista-panel').hidden = false;
    $('#ir-web').href = window.MORVEHTV.web;
    irA(decodeURIComponent(location.hash.slice(1)));
    resumen();
  }

  // ---------- Resumen (lateral) ----------
  async function resumen() {
    try {
      const d = await api('/api/panel/resumen');
      const nav = $('#secciones');
      nav.innerHTML = '';
      const raiz = el('a', actual === '' ? 'activa' : '');
      raiz.append(el('span', null, '🗂 Todo e2'), el('small', null, tam(d.tamano)));
      raiz.onclick = () => irA('');
      nav.append(raiz);
      for (const s of d.secciones) {
        const a = el('a', actual.startsWith(s.prefijo) ? 'activa' : '');
        a.append(el('span', null, s.nombre), el('small', null, s.archivos ? `${s.archivos} · ${tam(s.tamano)}` : 'vacía'));
        a.onclick = () => irA(s.prefijo);
        nav.append(a);
      }
      $('#uso').innerHTML = '';
      $('#uso').append(el('b', null, tam(d.tamano)), el('span', null, `${d.archivos} archivos en ${d.secciones.length} secciones`));
    } catch {}
  }

  // ---------- Explorador ----------
  window.addEventListener('hashchange', () => { const p = decodeURIComponent(location.hash.slice(1)); if (p !== actual) irA(p); });
  function irA(prefijo) {
    actual = prefijo;
    if (decodeURIComponent(location.hash.slice(1)) !== prefijo) history.replaceState(null, '', prefijo ? `#${encodeURIComponent(prefijo)}` : location.pathname);
    marcadas.clear();
    document.querySelectorAll('#secciones a').forEach((a, i) => a.classList.toggle('activa', i === 0 ? !prefijo : a.onclick && prefijo.startsWith(`${a.firstChild.textContent}/`)));
    cargar();
  }
  async function cargar() {
    pintarMigas();
    const t = $('#tabla');
    t.innerHTML = '<div class="cargando">Cargando…</div>';
    try {
      listado = await api(`/api/panel/listar?prefijo=${encodeURIComponent(actual)}`);
      pintarTabla();
    } catch (e) {
      t.innerHTML = '';
      t.append(el('div', 'vacio', `No se pudo abrir: ${e.message}`));
    }
  }
  function pintarMigas() {
    const m = $('#migas');
    m.innerHTML = '';
    const partes = actual.replace(/\/$/, '').split('/').filter(Boolean);
    const inicio = el(partes.length ? 'a' : 'span', partes.length ? '' : 'actual', '🗂 e2');
    if (partes.length) inicio.onclick = () => irA('');
    m.append(inicio);
    partes.forEach((p, i) => {
      m.append(el('span', 'sep', '›'));
      const ultimo = i === partes.length - 1;
      const a = el(ultimo ? 'span' : 'a', ultimo ? 'actual' : '', p);
      if (!ultimo) { const destino = `${partes.slice(0, i + 1).join('/')}/`; a.onclick = () => irA(destino); }
      m.append(a);
    });
    $('#soltar-dest').textContent = actual || 'e2 (elige antes una sección)';
  }
  function pintarTabla() {
    const t = $('#tabla');
    t.innerHTML = '';
    const cab = el('div', 'fila cab');
    const todas = el('input'); todas.type = 'checkbox'; todas.title = 'Seleccionar todo';
    todas.onchange = () => { [...listado.carpetas.map((c) => c.prefijo), ...listado.archivos.map((a) => a.key)].forEach((k) => (todas.checked ? marcadas.add(k) : marcadas.delete(k))); pintarTabla(); };
    cab.append(todas, el('span', null, 'Nombre'), el('span', 'num', 'Tamaño'), el('span', 'num', 'Modificado'), el('span'));
    t.append(cab);
    if (!listado.carpetas.length && !listado.archivos.length) {
      const v = el('div', 'vacio');
      v.append(el('b', null, 'Carpeta vacía'), el('span', null, actual ? 'Arrastra aquí vídeos o usa «Subir archivos».' : 'Crea una sección con «Nueva carpeta».'));
      t.append(v);
    }
    for (const c of listado.carpetas) t.append(fila(c.prefijo, c.nombre, true));
    for (const a of listado.archivos) t.append(fila(a.key, a.nombre, false, a));
    todas.checked = marcadas.size > 0 && marcadas.size === listado.carpetas.length + listado.archivos.length;
    pintarSeleccion();
  }
  function fila(key, nombre, esCarpeta, a) {
    const f = el('div', `fila${marcadas.has(key) ? ' marcada' : ''}`);
    const ch = el('input'); ch.type = 'checkbox'; ch.checked = marcadas.has(key);
    ch.onchange = () => { ch.checked ? marcadas.add(key) : marcadas.delete(key); f.classList.toggle('marcada', ch.checked); pintarSeleccion(); };
    const n = el('div', 'nombre');
    n.append(el('span', 'ico', esCarpeta ? '📁' : icono(nombre)));
    const txt = el(esCarpeta ? 'a' : 'span', 'txt', nombre);
    txt.title = nombre;
    if (esCarpeta) txt.onclick = () => irA(key);
    n.append(txt);
    const acc = el('div', 'acciones-fila');
    const accion = (ico, titulo, fn) => { const b = el('button', null, ico); b.title = titulo; b.onclick = fn; acc.append(b); };
    if (!esCarpeta) {
      accion('▶', 'Ver o escuchar', () => abrirEnlace(key, false));
      accion('⬇', 'Descargar', () => abrirEnlace(key, true));
    }
    accion('✎', 'Renombrar', () => renombrar(key));
    accion('↗', 'Mover a otra carpeta', () => mover([key]));
    accion('🗑', 'Borrar', () => borrar([key]));
    f.append(ch, n, el('span', 'num tam', esCarpeta ? '' : tam(a.tamano)), el('span', 'num', esCarpeta ? '' : fecha(a.fecha)), acc);
    return f;
  }
  function pintarSeleccion() {
    $('#seleccion').hidden = !marcadas.size;
    $('#sel-n').textContent = `${marcadas.size} seleccionado${marcadas.size === 1 ? '' : 's'}`;
  }
  $('#sel-borrar').onclick = () => borrar([...marcadas]);
  $('#sel-mover').onclick = () => mover([...marcadas]);
  $('#b-actualizar').onclick = () => { cargar(); resumen(); };

  async function abrirEnlace(key, descargar) {
    const w = window.open('', '_blank');
    try {
      const { url } = await api(`/api/panel/enlace?key=${encodeURIComponent(key)}${descargar ? '&descargar=1' : ''}`);
      if (w) w.location = url; else location.href = url;
    } catch (e) { if (w) w.close(); aviso(e.message, 'mal'); }
  }

  // ---------- Carpetas ----------
  $('#b-carpeta').onclick = async () => {
    const n = await pedirTexto(actual ? 'Nueva carpeta' : 'Nueva sección', actual ? `Dentro de ${actual}` : 'Una carpeta principal de e2: saldrá como categoría en la app y tendrá su tema en Telegram.', '', 'Crear');
    if (!n) return;
    try { await api('/api/panel/carpeta', { carpeta: `${actual}${n}/` }); aviso(`Carpeta «${n}» creada`, 'bien'); cargar(); resumen(); } catch (e) { aviso(e.message, 'mal'); }
  };
  $('#b-serie').onclick = () => {
    if (!actual) return aviso('Entra primero en una sección (p. ej. SERIES)', 'mal');
    ventana((v, cerrar) => {
      v.append(el('h2', null, 'Nueva serie'), el('p', null, `Se crea en ${actual} con sus carpetas de temporada.`));
      const ln = el('label', null, 'Nombre (mejor con el año: «Nombre - 2026»)'); const n = el('input'); ln.append(n);
      const lt = el('label', null, 'Número de temporadas'); const t = el('input'); t.type = 'number'; t.min = 0; t.max = 50; t.value = 1; lt.append(t);
      v.append(ln, lt, el('p', null, '0 temporadas = solo la carpeta de la serie.'));
      botones(v, cerrar, 'Crear serie', 'primario', async () => {
        const nombre = limpiar(n.value);
        if (!nombre) return n.focus();
        const base = `${actual}${nombre}/`;
        const total = Math.max(0, Math.min(50, Math.floor(Number(t.value) || 0)));
        const carpetas = total ? Array.from({ length: total }, (_, i) => `${base}Temporada ${i + 1}/`) : [base];
        try { await api('/api/panel/carpeta', { carpetas }); cerrar(true); aviso(`Serie «${nombre}» creada`, 'bien'); irA(base); } catch (e) { aviso(e.message, 'mal'); }
      });
      n.focus();
    });
  };

  // ---------- Renombrar, mover y borrar ----------
  async function renombrar(key) {
    const esCarpeta = key.endsWith('/');
    const n = await pedirTexto(esCarpeta ? 'Renombrar carpeta' : 'Renombrar archivo', esCarpeta ? 'Se renombra con todo lo que tiene dentro.' : null, nombreDe(key), 'Renombrar');
    if (!n || n === nombreDe(key)) return;
    await moverUno(key, `${padreDe(key)}${n}${esCarpeta ? '/' : ''}`);
    cargar(); resumen();
  }
  async function moverUno(de, a, reemplazar) {
    try {
      const r = await api('/api/panel/mover', { de, a, reemplazar });
      aviso(r.movidos > 1 ? `Hecho (${r.movidos} archivos)` : 'Hecho', 'bien');
      return true;
    } catch (e) {
      if (e.datos?.existe && await confirmar('Ya existe', `En el destino ya hay algo llamado «${nombreDe(a)}». ¿Reemplazarlo?`, null, 'Reemplazar', true)) return moverUno(de, a, true);
      if (!e.datos?.existe) aviso(e.message, 'mal');
      return false;
    }
  }
  async function mover(claves) {
    const destino = await elegirCarpeta(claves);
    if (destino == null) return;
    for (const k of claves) {
      const a = `${destino}${nombreDe(k)}${k.endsWith('/') ? '/' : ''}`;
      if (a !== k) await moverUno(k, a);
    }
    marcadas.clear(); cargar(); resumen();
  }
  // Selector de carpeta de destino, navegando por e2
  const elegirCarpeta = (claves) => ventana(async (v, cerrar) => {
    let donde = actual;
    v.append(el('h2', null, `Mover ${claves.length === 1 ? `«${nombreDe(claves[0])}»` : `${claves.length} elementos`}`), el('p', null, 'Elige la carpeta de destino:'));
    const arbol = el('div', 'arbol'); v.append(arbol);
    const si = botones(v, cerrar, 'Mover aquí', 'primario', () => cerrar(donde));
    async function pintar() {
      arbol.innerHTML = '<div class="cargando">Cargando…</div>';
      const d = await api(`/api/panel/listar?prefijo=${encodeURIComponent(donde)}`).catch(() => ({ carpetas: [] }));
      arbol.innerHTML = '';
      const ruta = el('div', 'ruta');
      if (donde) { const sube = el('button', null, '↑'); sube.title = 'Subir un nivel'; sube.onclick = () => { donde = padreDe(donde); pintar(); }; ruta.append(sube); }
      ruta.append(el('span', null, donde || '🗂 e2 (raíz)'));
      arbol.append(ruta);
      const ul = el('ul');
      for (const c of d.carpetas.filter((c) => !claves.some((k) => k.endsWith('/') && c.prefijo.startsWith(k)))) {
        const li = el('li', null, `📁 ${c.nombre}`);
        li.onclick = () => { donde = c.prefijo; pintar(); };
        ul.append(li);
      }
      if (!ul.children.length) ul.append(el('li', null, 'Sin subcarpetas'));
      arbol.append(ul);
      si.disabled = !donde && claves.some((k) => !k.endsWith('/'));
    }
    pintar();
  });
  async function borrar(claves) {
    const carpetas = claves.filter((k) => k.endsWith('/')).length;
    const ok = await confirmar('Borrar definitivamente',
      `${carpetas ? 'Las carpetas se borran con todo lo que tienen dentro. ' : ''}No se puede deshacer: IDrive e2 no guarda copias.`,
      claves.map((k) => `${k.endsWith('/') ? '📁' : icono(k)} ${k}`), `Borrar ${claves.length === 1 ? '' : claves.length}`.trim(), true);
    if (!ok) return;
    try {
      const r = await api('/api/panel/borrar', { claves });
      aviso(`Borrado (${r.borrados} objeto${r.borrados === 1 ? '' : 's'})`, 'bien');
    } catch (e) { aviso(e.message, 'mal'); }
    marcadas.clear(); cargar(); resumen();
  }

  // ---------- Subidas: directas a e2 por trozos firmados ----------
  const cola = [];
  let subiendo = false;
  $('#elegir').onchange = (e) => { añadir(e.target.files); e.target.value = ''; };
  let arrastres = 0;
  document.addEventListener('dragenter', (e) => { if ([...e.dataTransfer.types].includes('Files') && !$('#vista-panel').hidden) { arrastres++; $('#soltar').classList.add('visible'); } });
  document.addEventListener('dragleave', () => { if (--arrastres <= 0) { arrastres = 0; $('#soltar').classList.remove('visible'); } });
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault(); arrastres = 0; $('#soltar').classList.remove('visible');
    if (!$('#vista-panel').hidden && e.dataTransfer.files.length) añadir(e.dataTransfer.files);
  });
  $('#sub-plegar').onclick = () => { $('#subidas').classList.toggle('plegada'); $('#sub-plegar').textContent = $('#subidas').classList.contains('plegada') ? '▴' : '▾'; };

  function añadir(lista) {
    if (!actual) return aviso('Entra primero en la carpeta donde quieres subir', 'mal');
    for (const file of lista) {
      if (!SUBIBLE.test(file.name)) { aviso(`«${file.name}»: solo vídeos, subtítulos o imágenes`, 'mal'); continue; }
      const x = { file, nombre: file.name, carpeta: actual, estado: 'espera', subido: 0, xhrs: new Set() };
      x.li = el('li', 'sub');
      const linea = el('div', 'linea');
      x.quitar = el('button', null, '✕'); x.quitar.title = 'Cancelar';
      x.quitar.onclick = () => cancelar(x);
      linea.append(el('b', null, file.name), x.quitar);
      x.dato = el('div', 'dato');
      x.barra = el('div', 'progreso'); x.barra.append(el('i'));
      x.li.append(linea, x.dato, x.barra);
      $('#sub-lista').append(x.li);
      cola.push(x);
      pintarSub(x);
    }
    $('#subidas').hidden = !cola.length;
    if (!subiendo) procesar();
  }
  function pintarSub(x) {
    x.li.className = `sub ${x.estado}`;
    const pct = x.file.size ? (100 * x.subido / x.file.size) : 0;
    x.barra.firstChild.style.width = `${pct.toFixed(1)}%`;
    x.dato.textContent = x.estado === 'subiendo'
      ? `${pct.toFixed(0)}% de ${tam(x.file.size)} · ${x.velocidad ? `${tam(x.velocidad)}/s · quedan ${tiempo((x.file.size - x.subido) / x.velocidad)}` : 'empezando…'}`
      : x.estado === 'hecho' ? `✓ Subido a ${x.carpeta}` : x.estado === 'error' ? `✕ ${x.error}` : x.estado === 'cancelado' ? 'Cancelado' : `En espera · ${tam(x.file.size)} → ${x.carpeta}`;
    const quedan = cola.filter((y) => y.estado === 'espera' || y.estado === 'subiendo').length;
    $('#sub-titulo').textContent = quedan ? `Subiendo ${quedan} archivo${quedan === 1 ? '' : 's'}…` : 'Subidas terminadas';
    x.quitar.textContent = x.estado === 'espera' || x.estado === 'subiendo' ? '✕' : '–';
    x.quitar.title = x.estado === 'espera' || x.estado === 'subiendo' ? 'Cancelar' : 'Quitar de la lista';
  }
  function cancelar(x) {
    if (x.estado === 'subiendo') { x.cancelado = true; x.xhrs.forEach((r) => r.abort()); return; }
    if (x.estado === 'espera') { x.estado = 'cancelado'; pintarSub(x); return; }
    cola.splice(cola.indexOf(x), 1); x.li.remove();
    $('#subidas').hidden = !cola.length;
  }
  function put(url, blob, x, alAvanzar) {
    return new Promise((ok, mal) => {
      const r = new XMLHttpRequest();
      x.xhrs.add(r);
      r.open('PUT', url);
      r.upload.onprogress = (e) => alAvanzar(e.loaded);
      r.onload = () => {
        x.xhrs.delete(r);
        if (r.status >= 200 && r.status < 300) {
          const etag = r.getResponseHeader('ETag');
          return etag ? ok(etag) : mal(new Error('e2 no deja leer la respuesta (reglas CORS del bucket)'));
        }
        mal(Object.assign(new Error(`e2 respondió ${r.status}`), { status: r.status }));
      };
      r.onerror = () => { x.xhrs.delete(r); mal(new Error('Se cortó la conexión')); };
      r.onabort = () => { x.xhrs.delete(r); mal(new Error('Cancelado')); };
      r.send(blob);
    });
  }
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  async function subirUno(x) {
    x.estado = 'subiendo'; x.subido = 0; x.velocidad = 0; pintarSub(x);
    let ini;
    try {
      ini = await api('/api/panel/subir/iniciar', { carpeta: x.carpeta, nombre: x.nombre, tamano: x.file.size, reemplazar: x.reemplazar });
    } catch (e) {
      if (e.datos?.existe && await confirmar('Ya existe', `«${x.nombre}» ya está en ${x.carpeta}. ¿Reemplazarlo?`, null, 'Reemplazar', true)) { x.reemplazar = true; return subirUno(x); }
      throw e;
    }
    const { key, uploadId, tamParte, partes } = ini;
    const urls = {}; const pedidas = new Map();
    async function url(n) {
      if (urls[n]) return urls[n];
      const tanda = Math.floor((n - 1) / 50);
      if (!pedidas.has(tanda)) {
        const numeros = [];
        for (let i = tanda * 50 + 1; i <= Math.min(partes, tanda * 50 + 50); i++) numeros.push(i);
        pedidas.set(tanda, api('/api/panel/subir/partes', { key, uploadId, numeros }).then((r) => Object.assign(urls, r.urls)).finally(() => pedidas.delete(tanda)));
      }
      await pedidas.get(tanda);
      return urls[n];
    }
    const etags = {}; const porParte = {};
    const pendientes = Array.from({ length: partes }, (_, i) => i + 1);
    let muestra = { t: performance.now(), b: 0 };
    const avanzar = () => {
      x.subido = Object.values(porParte).reduce((a, b) => a + b, 0);
      const ahora = performance.now();
      if (ahora - muestra.t > 1500) {
        const v = (x.subido - muestra.b) / ((ahora - muestra.t) / 1000);
        x.velocidad = x.velocidad ? x.velocidad * 0.6 + v * 0.4 : v;
        muestra = { t: ahora, b: x.subido };
      }
      pintarSub(x);
    };
    async function trabajador() {
      while (pendientes.length) {
        if (x.cancelado) throw new Error('Cancelado');
        const n = pendientes.shift();
        const blob = x.file.slice((n - 1) * tamParte, Math.min(n * tamParte, x.file.size));
        for (let intento = 1; ; intento++) {
          try {
            etags[n] = await put(await url(n), blob, x, (b) => { porParte[n] = b; avanzar(); });
            porParte[n] = blob.size; avanzar();
            break;
          } catch (e) {
            if (x.cancelado) throw new Error('Cancelado');
            porParte[n] = 0;
            if (e.status === 403) delete urls[n];
            if (intento >= 5) throw e;
            await espera(1000 * 2 ** intento);
          }
        }
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, partes) }, trabajador));
      await api('/api/panel/subir/completar', { key, uploadId, partes: Object.entries(etags).map(([n, etag]) => ({ n: Number(n), etag })) });
      x.estado = 'hecho'; x.subido = x.file.size;
    } catch (e) {
      x.xhrs.forEach((r) => r.abort());
      api('/api/panel/subir/cancelar', { key, uploadId }).catch(() => {});
      throw e;
    }
  }
  async function procesar() {
    subiendo = true;
    let bloqueo = null;
    try { bloqueo = await navigator.wakeLock?.request('screen'); } catch {}
    let x;
    while ((x = cola.find((y) => y.estado === 'espera'))) {
      try { await subirUno(x); } catch (e) { x.estado = x.cancelado ? 'cancelado' : 'error'; x.error = e.message; }
      pintarSub(x);
      if (x.estado === 'hecho' && x.carpeta === actual) cargar();
    }
    subiendo = false;
    bloqueo?.release().catch(() => {});
    resumen();
  }
  window.addEventListener('beforeunload', (e) => { if (subiendo) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- Arranque ----------
  if (!token) return salir();
  api('/api/panel/yo').then(arrancar).catch((e) => { if (token) { $('#vista-entrar').hidden = false; $('#e-error').textContent = e.message; } });
})();
