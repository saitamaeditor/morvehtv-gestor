// MorvehTV Gestor: explorador de IDrive e2 con subidas directas. Habla con la API del panel del
// servidor de MorvehTV (/api/panel/…) con un token que se guarda en este navegador.
(() => {
  const API = window.MORVEHTV.api;
  const $ = (s) => document.querySelector(s);
  const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };
  const VIDEO = /\.(mp4|m4v|mkv|webm|mov|avi|ts|wmv|flv)$/i;
  const SUBIBLE = /\.(mp4|m4v|mkv|webm|mov|avi|ts|wmv|flv|srt|vtt|ass|jpe?g|png|webp)$/i;
  // Trozos que se envían a la vez por dirección (los navegadores abren hasta 6 conexiones por
  // servidor y e2 no habla HTTP/2). El servidor firma cada trozo para las dos direcciones del
  // bucket, así que se sube con 12 conexiones; si la segunda falla, se sigue solo con la primera.
  const CONCURRENCIA = 6;
  let segundaRota = false;
  // Lo más rápido: cada trozo al servidor de MorvehTV, que lo reenvía a e2 con muchas conexiones
  // (el navegador le habla por HTTP/2, así que van 16 trozos a la vez por una sola conexión). Si
  // el servidor falla varias veces seguidas, se vuelve a subir directo a e2 como antes.
  const POR_SERVIDOR = 16;
  let servidorRoto = false;
  let fallosServidor = 0;

  let token = null;
  try { token = localStorage.getItem('gestor-token'); } catch {}
  let actual = ''; // carpeta abierta
  let listado = { carpetas: [], archivos: [] };
  let secciones = []; // las carpetas principales, del último resumen
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
  // Se pueden apilar: un aviso («Ya existe…») sale encima de la ventana de «Añadir título» sin cerrarla
  const pila = [];
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pila.length) pila[pila.length - 1](null); });
  function ventana(montar, { grande = false, fija = false } = {}) {
    return new Promise((listo) => {
      const velo = el('div', 'velo');
      const v = el('div', `ventana${grande ? ' grande' : ''}`);
      v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
      velo.style.zIndex = 40 + pila.length;
      velo.append(v); document.body.append(velo);
      let hecho = false;
      const cerrar = (valor) => {
        if (hecho) return; hecho = true;
        velo.remove(); pila.splice(pila.indexOf(cerrar), 1); listo(valor);
      };
      pila.push(cerrar);
      // Las ventanas «fijas» solo se cierran con su botón (no al tocar fuera por descuido)
      if (!fija) velo.onclick = (e) => { if (e.target === velo) cerrar(null); };
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

  // Papel de quien entra: administrador (todo) o colaborador (subir en sus secciones)
  let soyAdmin = true;
  function arrancar(yo) {
    soyAdmin = yo.rol !== 'colaborador';
    document.documentElement.classList.toggle('colaborador', !soyAdmin);
    $('#usuario').textContent = (yo.nombre || yo.usuario) + (soyAdmin ? '' : ' · colaborador');
    // Lo que un colaborador no puede usar, ni se ve
    ['#b-papelera', '#b-registro', '#b-anuncios', '#b-usdc', '#b-colaboradores', '#sel-mover', '#sel-borrar'].forEach((s) => { const b = $(s); if (b) b.hidden = !soyAdmin; });
    $('#vista-entrar').hidden = true; $('#vista-panel').hidden = false;
    $('#ir-web').href = window.MORVEHTV.web;
    irA(decodeURIComponent(location.hash.slice(1)));
    resumen();
  }

  // ---------- Resumen (lateral) ----------
  async function resumen() {
    try {
      const d = await api('/api/panel/resumen');
      secciones = d.secciones;
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
    if (soyAdmin) {
      accion('✎', 'Renombrar', () => renombrar(key));
      accion('↗', 'Mover a otra carpeta', () => mover([key]));
      accion('🗑', 'Borrar', () => borrar([key]));
    }
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
  if ($('#b-carpeta')) $('#b-carpeta').onclick = async () => {
    const n = await pedirTexto(actual ? 'Nueva carpeta' : 'Nueva sección', actual ? `Dentro de ${actual}` : 'Una carpeta principal de e2: saldrá como categoría en la app y tendrá su tema en Telegram.', '', 'Crear');
    if (!n) return;
    try { await api('/api/panel/carpeta', { carpeta: `${actual}${n}/` }); aviso(`Carpeta «${n}» creada`, 'bien'); cargar(); resumen(); } catch (e) { aviso(e.message, 'mal'); }
  };
  if ($('#b-serie')) $('#b-serie').onclick = () => {
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
    const ok = await confirmar('Mandar a la papelera',
      `${carpetas ? 'Las carpetas van con todo lo que tienen dentro. ' : ''}Desaparece de MorvehTV, pero se puede recuperar desde 🗑 Papelera durante 30 días.`,
      claves.map((k) => `${k.endsWith('/') ? '📁' : icono(k)} ${k}`), `Borrar ${claves.length === 1 ? '' : claves.length}`.trim(), true);
    if (!ok) return;
    try {
      let r;
      try { r = await api('/api/panel/borrar', { claves }); } catch (e) {
        if (!e.datos?.confirmar) throw e;
        // Mucho de golpe: hay que escribir BORRAR
        const d = e.datos;
        const escrito = await pedirTexto('⚠ Borrado grande',
          `${d.seccion ? 'Vas a borrar una sección entera. ' : ''}Son ${d.archivos} archivos (${tam(d.tamano)}). Para confirmarlo, escribe BORRAR en mayúsculas.`, '', 'Borrar');
        if (escrito !== 'BORRAR') { if (escrito != null) aviso('No se ha borrado nada: había que escribir BORRAR', 'mal'); return; }
        r = await api('/api/panel/borrar', { claves, confirmacion: 'BORRAR' });
      }
      await seguirTrabajo(r.trabajo, `Moviendo ${r.borrados} archivo${r.borrados === 1 ? '' : 's'} a la papelera`);
      aviso(`${r.borrados} archivo${r.borrados === 1 ? '' : 's'} en la papelera`, 'bien');
    } catch (e) { aviso(e.message, 'mal'); }
    marcadas.clear(); cargar(); resumen();
  }

  // Borrar y recuperar van en segundo plano en el servidor: aquí se espera enseñando cómo va
  async function seguirTrabajo(id, texto) {
    if (!id) return;
    const a = el('div', 'aviso fijo', `${texto}…`);
    $('#avisos').append(a);
    try {
      for (;;) {
        const t = await api(`/api/panel/trabajo?id=${encodeURIComponent(id)}`);
        a.textContent = `${texto}… ${t.hechos} de ${t.total}`;
        if (t.estado === 'error') throw new Error(t.error);
        if (t.estado === 'hecho') return t;
        await new Promise((ok) => setTimeout(ok, 1200));
      }
    } finally { a.remove(); }
  }

  // ---------- Papelera ----------
  $('#b-papelera').onclick = () => ventana(async (v, cerrar) => {
    async function pintar() {
      v.innerHTML = '<div class="cargando">Cargando la papelera…</div>';
      let d;
      try { d = await api('/api/panel/papelera'); } catch (e) { v.innerHTML = ''; v.append(el('div', 'vacio', e.message)); return; }
      v.innerHTML = '';
      v.append(el('h2', null, '🗑 Papelera'),
        el('p', null, `Lo borrado se queda aquí ${d.dias} días y luego se elimina solo. Para eliminarlo antes hace falta tu contraseña, y solo pasadas ${d.horasAntesDeVaciar} horas (así, si alguien entrara con una cuenta robada, no podría destruir nada al momento).`));
      const lista = el('div', 'papelera');
      if (!d.lotes.length) lista.append(el('div', 'vacio', 'La papelera está vacía'));
      for (const l of d.lotes) {
        const f = el('div', 'lote');
        const info = el('div', 'info');
        const nombres = l.claves.length ? l.claves.map(nombreDe).slice(0, 3).join(', ') + (l.claves.length > 3 ? ` y ${l.claves.length - 3} más` : '') : l.lote;
        const t = el('b', null, nombres); t.title = l.claves.join('\n');
        info.append(t, el('small', null, `${l.motivo} por ${l.usuario} · ${fecha(l.fecha)} · ${l.objetos} archivo${l.objetos === 1 ? '' : 's'} · ${tam(l.tamano)} · se elimina sola el ${fecha(l.seVaciaSola)}`));
        const rec = el('button', 'boton primario', '↩ Recuperar');
        rec.onclick = async () => {
          rec.disabled = true;
          try {
            const r = await api('/api/panel/papelera/recuperar', { lote: l.lote });
            const t2 = await seguirTrabajo(r.trabajo, 'Recuperando');
            aviso(t2?.saltados ? `Recuperado; ${t2.saltados} no se ha puesto porque ya hay otro archivo con ese nombre` : 'Recuperado en su sitio', t2?.saltados ? 'mal' : 'bien');
            cargar(); resumen();
          } catch (e) { aviso(e.message, 'mal'); }
          pintar();
        };
        const del = el('button', 'boton peligro', 'Eliminar para siempre');
        del.onclick = async () => {
          const clave = await pedirClave(nombres);
          if (!clave) return;
          try { await api('/api/panel/papelera/vaciar', { lote: l.lote, clave }); aviso('Eliminado para siempre', 'bien'); } catch (e) { aviso(e.message, 'mal'); }
          pintar();
        };
        const bs = el('div', 'acciones'); bs.append(rec, del);
        f.append(info, bs);
        lista.append(f);
      }
      v.append(lista);
      const pie = el('div', 'botones'); const c = el('button', 'boton', 'Cerrar'); c.onclick = () => cerrar(null); pie.append(c); v.append(pie);
    }
    pintar();
  }, { grande: true });

  const pedirClave = (que) => ventana((v, cerrar) => {
    v.append(el('h2', null, 'Eliminar para siempre'), el('p', null, `«${que}» se borrará de IDrive e2 sin vuelta atrás. Escribe tu contraseña para confirmarlo.`));
    const i = el('input'); i.type = 'password'; i.autocomplete = 'current-password'; v.append(i);
    const si = botones(v, cerrar, 'Eliminar', 'peligro lleno', () => { if (i.value) cerrar(i.value); });
    i.onkeydown = (e) => { if (e.key === 'Enter') si.click(); };
    i.focus();
  });


  // ---------- Anuncios y planes ----------
  // Los anuncios propios los ve el plan Básico en la web y la app (con AdSense, si está puesto en
  // Render, la web usa AdSense; la app siempre los propios). Premium no ve ninguno.
  if ($('#b-anuncios')) $('#b-anuncios').onclick = () => ventana(async (v, cerrar) => {
    v.innerHTML = '<div class="cargando">Cargando…</div>';
    let d;
    try { d = await api('/api/panel/anuncios'); } catch (e) { v.innerHTML = ''; v.append(el('div', 'vacio', e.message)); return; }
    v.innerHTML = '';
    const pagosTexto = /^ok/.test(d.pagos) ? `Pagos con USDC activados ${d.pagos.replace(/^ok\s*/, '')}` : `Pagos con USDC sin activar (${d.pagos}): nadie puede hacerse Premium todavía`;
    v.append(el('h2', null, '📣 Anuncios y planes'),
      el('p', null, `${d.planes.cuentas} cuentas: ${d.planes.premium} Premium de pago, ${d.planes.basico} Básico (con anuncios) y ${d.planes.admins ?? 0} administradores (Premium de por vida). ${pagosTexto}. ${d.adsense ? 'Google AdSense activado en la web.' : 'Sin Google AdSense: se usan estos anuncios propios.'}`));
    const lista = el('div', 'lista-anuncios');
    const anuncios = d.anuncios.map((a) => ({ ...a }));
    function pintar() {
      lista.innerHTML = '';
      if (!anuncios.length) lista.append(el('div', 'vacio', 'Sin anuncios propios: en su hueco sale un aviso de Premium.'));
      anuncios.forEach((a, n) => {
        const f = el('div', 'anuncio-ed');
        const campo = (etq, clave, ph) => { const l = el('label', null, etq); const i = el('input'); i.value = a[clave] ?? ''; i.placeholder = ph; i.oninput = () => { a[clave] = i.value; }; l.append(i); return l; };
        const activo = el('label', 'check'); const c = el('input'); c.type = 'checkbox'; c.checked = a.activo !== false; c.onchange = () => { a.activo = c.checked; }; activo.append(c, document.createTextNode(' Activo'));
        const quitar = el('button', 'boton peligro', 'Quitar'); quitar.onclick = () => { anuncios.splice(n, 1); pintar(); };
        const pie = el('div', 'pie-anuncio'); pie.append(activo, quitar);
        // Vídeo para antes de reproducir: se sube aquí mismo (o una dirección https)
        const vid = el('div', 'video-anuncio');
        const estadoVid = el('span', null, a.video ? (a.video.startsWith('_morvehtv/') ? '🎬 Vídeo subido' : `🎬 ${a.video}`) : 'Sin vídeo (antes de reproducir saldrá la imagen 5 s)');
        const subirVid = el('button', 'boton', '⬆ Subir vídeo');
        subirVid.onclick = () => {
          const i = el('input'); i.type = 'file'; i.accept = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v';
          i.onchange = () => {
            const file = i.files[0]; if (!file) return;
            estadoVid.textContent = `⏳ Subiendo ${file.name}…`;
            encolar(file, '', file.name, { anuncio: true, alTerminar: (key) => { a.video = key; estadoVid.textContent = '✓ Vídeo subido: pulsa Guardar'; } });
          };
          i.click();
        };
        const quitarVid = el('button', 'boton', 'Quitar vídeo'); quitarVid.onclick = () => { a.video = null; pintar(); };
        vid.append(el('b', null, 'Vídeo antes de reproducir'), estadoVid, subirVid, ...(a.video ? [quitarVid] : []));
        f.append(campo('Título', 'titulo', 'Ej.: Tu tienda'), campo('Texto', 'texto', 'Una frase corta'),
          campo('Imagen (https://…)', 'imagen', 'https://…/banner.jpg'), campo('Enlace al pulsar (https://…)', 'enlace', 'https://…'), vid, pie);
        lista.append(f);
      });
    }
    pintar();
    const mas = el('button', 'boton', '+ Añadir anuncio'); mas.onclick = () => { anuncios.push({ titulo: '', texto: '', imagen: '', enlace: '', video: null, activo: true }); pintar(); };
    v.append(lista, mas);
    const fila = el('div', 'botones');
    const no = el('button', 'boton', 'Cerrar'); no.onclick = () => cerrar(null);
    const si = el('button', 'boton primario', 'Guardar');
    si.onclick = async () => {
      si.disabled = true;
      try { const r = await api('/api/panel/anuncios', { anuncios }); aviso(`Guardados ${r.anuncios.length} anuncios`, 'bien'); cerrar(true); } catch (e) { aviso(e.message, 'mal'); si.disabled = false; }
    };
    fila.append(no, si); v.append(fila);
  }, { grande: true });

  // ---------- Pagos en USDC ----------
  // Lo que se ha pagado (cada pago enlaza a basescan.org, el explorador público de Base) y los
  // pagos que llegaron con un importe que no era de ningún pedido, para dárselos a quien sea
  if ($('#b-usdc')) $('#b-usdc').onclick = () => ventana(async (v, cerrar) => {
    async function pintar() {
      v.innerHTML = '<div class="cargando">Cargando…</div>';
      let d;
      try { d = await api('/api/panel/cripto'); } catch (e) { v.innerHTML = ''; v.append(el('div', 'vacio', e.message)); return; }
      v.innerHTML = '';
      v.append(el('h2', null, '💰 Pagos USDC (red Base)'),
        el('p', null, d.direccion ? `Se reciben en ${d.direccion}. Opciones: ${d.opciones.map((o) => `${o.usdc} USDC = ${o.meses} ${o.meses === 1 ? 'mes' : 'meses'}`).join(' · ')}.` : `Sin activar: ${d.estado}`));
      const enlaceTx = (tx) => { const a = el('a', null, `${tx.slice(0, 10)}… ↗`); a.href = `https://basescan.org/tx/${tx}`; a.target = '_blank'; a.rel = 'noopener'; return a; };
      v.append(el('h3', null, 'Pagos sin identificar'));
      const s = el('div', 'registro');
      if (!d.sueltos.length) s.append(el('div', 'vacio', 'Ninguno: todos los pagos han llegado con su importe exacto'));
      for (const x of d.sueltos) {
        const f = el('div', 'fila-registro');
        const info = el('span', null, `${x.importe} USDC de ${x.de.slice(0, 8)}…${x.asignado ? ` · asignado (${x.asignado.meses} meses)` : ''}`);
        const tx = el('small'); tx.append(enlaceTx(x.tx));
        f.append(el('small', null, fecha(x.fecha)), tx, info);
        if (!x.asignado) {
          const b = el('button', 'boton fino', 'Asignar');
          b.onclick = async () => {
            const usuario = await pedirTexto('Asignar pago', `¿A qué usuario de MorvehTV le das estos ${x.importe} USDC?`, '', 'Siguiente');
            if (!usuario) return;
            const meses = await pedirTexto('Meses de Premium', `¿Cuántos meses le das a ${usuario}?`, '1', 'Asignar');
            if (!meses) return;
            try { await api('/api/panel/cripto/asignar', { tx: x.tx, usuario, meses: Number(meses) }); aviso('Asignado', 'bien'); } catch (e) { aviso(e.message, 'mal'); }
            pintar();
          };
          f.append(b);
        }
        s.append(f);
      }
      v.append(s, el('h3', null, 'Pedidos recientes'));
      const l = el('div', 'registro');
      if (!d.pedidos.length) l.append(el('div', 'vacio', 'Todavía no hay pedidos'));
      for (const x of d.pedidos) {
        const f = el('div', 'fila-registro');
        const est = el('small'); if (x.tx) est.append(enlaceTx(x.tx)); else est.textContent = Date.now() - x.creado > 3600000 ? 'sin pagar' : 'esperando';
        f.append(el('small', null, fecha(x.creado)), el('b', null, x.usuario), el('span', null, `${x.importe} USDC · ${x.meses} ${x.meses === 1 ? 'mes' : 'meses'}${x.tx ? ' · pagado ✓' : ''}`), est);
        l.append(f);
      }
      v.append(l);
      const pie = el('div', 'botones'); const c = el('button', 'boton', 'Cerrar'); c.onclick = () => cerrar(null); pie.append(c); v.append(pie);
    }
    pintar();
  }, { grande: true });

  // ---------- Colaboradores ----------
  // Cuentas de MorvehTV que pueden entrar al gestor para SUBIR contenido y crear carpetas, solo
  // en las secciones que se les den. No pueden borrar, mover ni ver la papelera, el registro, los
  // anuncios o los pagos. Se quitan cuando se quiera y dejan de poder al momento.
  $('#b-colaboradores').onclick = () => ventana(async (v, cerrar) => {
    async function pintar() {
      v.innerHTML = '<div class="cargando">Cargando…</div>';
      let d;
      try { d = await api('/api/panel/colaboradores'); } catch (e) { v.innerHTML = ''; v.append(el('div', 'vacio', e.message)); return; }
      v.innerHTML = '';
      v.append(el('h2', null, '👥 Colaboradores'),
        el('p', null, 'Pueden entrar en este gestor con su cuenta de MorvehTV para subir contenido y crear carpetas, solo en las secciones que elijas. No pueden borrar ni mover nada, ni ver la papelera, el registro, los anuncios o los pagos. Todo lo que suban queda en el registro con su nombre.'));
      const lista = el('div', 'registro');
      if (!d.colaboradores.length) lista.append(el('div', 'vacio', 'Todavía no hay colaboradores'));
      for (const x of d.colaboradores) {
        const f = el('div', 'fila-registro');
        const quitar = el('button', 'boton fino peligro', 'Quitar');
        quitar.onclick = async () => {
          if (!(await confirmar('Quitar colaborador', `${x.usuario} dejará de poder entrar en el gestor. Lo que ya subió se queda.`, null, 'Quitar', true))) return;
          try { await api('/api/panel/colaboradores/quitar', { usuario: x.usuario }); aviso(`${x.usuario} ya no es colaborador`, 'bien'); } catch (e) { aviso(e.message, 'mal'); }
          pintar();
        };
        const clave = el('button', 'boton fino', 'Contraseña');
        clave.title = 'Ponerle una contraseña nueva (cierra sus sesiones abiertas)';
        clave.onclick = async () => {
          const nueva = await pedirTexto(`Nueva contraseña para ${x.usuario}`, 'Mínimo 8 caracteres. Se cerrarán sus sesiones abiertas: tendrá que entrar con la nueva.', claveAlAzar(), 'Cambiar');
          if (!nueva) return;
          try { await api('/api/panel/colaboradores/clave', { usuario: x.usuario, clave: nueva }); mostrarDatos(x.usuario, nueva); } catch (e) { aviso(e.message, 'mal'); }
        };
        const botones = el('span', 'botones-colab'); botones.append(clave, quitar);
        f.append(el('b', null, x.usuario + (x.existe ? '' : ' (cuenta borrada)')), el('span', null, x.secciones.map((s) => s.replace(/\/$/, '')).join(' · ')), el('small', null, `desde ${fecha(x.creado)}`), botones);
        lista.append(f);
      }
      v.append(lista);
      // Crear la cuenta del colaborador (usuario, nombre y contraseña)
      v.append(el('h3', null, 'Crear colaborador'));
      const crea = el('div', 'colab-form');
      const cu = el('input'); cu.placeholder = 'Usuario (3 a 20: letras, números, . _ -)'; cu.autocapitalize = 'none'; cu.autocomplete = 'off'; cu.spellcheck = false;
      const cn = el('input'); cn.placeholder = 'Nombre (opcional)'; cn.autocomplete = 'off';
      const filaClave = el('div', 'fila-clave');
      const cc = el('input'); cc.placeholder = 'Contraseña (mínimo 8)'; cc.autocomplete = 'new-password'; cc.value = claveAlAzar();
      const otra = el('button', 'boton fino', '↻ Otra'); otra.title = 'Generar otra contraseña segura'; otra.onclick = () => { cc.value = claveAlAzar(); };
      filaClave.append(cc, otra);
      const casillasC = el('div', 'colab-secciones');
      const marcasC = d.secciones.map((s) => {
        const l = el('label', 'check'); const c = el('input'); c.type = 'checkbox'; c.value = s;
        l.append(c, document.createTextNode(' ' + s.replace(/\/$/, ''))); casillasC.append(l); return c;
      });
      const crear = el('button', 'boton primario', 'Crear cuenta de colaborador');
      crear.onclick = async () => {
        const secciones = marcasC.filter((c) => c.checked).map((c) => c.value);
        const usuario = cu.value.trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,20}$/.test(usuario)) return aviso('El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo', 'mal');
        if (cc.value.length < 8) return aviso('La contraseña debe tener al menos 8 caracteres', 'mal');
        if (!secciones.length) return aviso('Marca al menos una sección', 'mal');
        crear.disabled = true;
        try {
          await api('/api/panel/colaboradores/crear', { usuario, nombre: cn.value.trim(), clave: cc.value, secciones });
          mostrarDatos(usuario, cc.value);
        } catch (e) { aviso(e.message, 'mal'); crear.disabled = false; }
      };
      crea.append(cu, cn, filaClave, el('small', null, 'Secciones en las que puede subir:'), casillasC, crear);
      v.append(crea);

      // Añadir o cambiar (a alguien que ya tiene cuenta)
      v.append(el('h3', null, 'Dar permiso a una cuenta que ya existe'));
      const form = el('div', 'colab-form');
      const u = el('input'); u.placeholder = 'Usuario de MorvehTV (ya registrado)'; u.autocapitalize = 'none';
      const casillas = el('div', 'colab-secciones');
      const marcas = d.secciones.map((s) => {
        const l = el('label', 'check'); const c = el('input'); c.type = 'checkbox'; c.value = s;
        l.append(c, document.createTextNode(' ' + s.replace(/\/$/, ''))); casillas.append(l); return c;
      });
      const dar = el('button', 'boton primario', 'Dar permiso');
      dar.onclick = async () => {
        const secciones = marcas.filter((c) => c.checked).map((c) => c.value);
        if (!u.value.trim()) return aviso('Escribe el usuario', 'mal');
        if (!secciones.length) return aviso('Marca al menos una sección', 'mal');
        dar.disabled = true;
        try { await api('/api/panel/colaboradores', { usuario: u.value.trim().toLowerCase(), secciones }); aviso('Listo: ya puede entrar en el gestor', 'bien'); pintar(); }
        catch (e) { aviso(e.message, 'mal'); dar.disabled = false; }
      };
      form.append(u, el('small', null, 'Secciones en las que puede subir:'), casillas, dar);
      v.append(form);
      const pie = el('div', 'botones'); const c = el('button', 'boton', 'Cerrar'); c.onclick = () => cerrar(null); pie.append(c); v.append(pie);
    }
    // Los datos para entrar, para copiarlos y pasárselos al colaborador (solo se ven esta vez)
    function mostrarDatos(usuario, clave) {
      v.innerHTML = '';
      v.append(el('h2', null, '✅ Listo'), el('p', null, 'Pásale estos datos al colaborador (por ejemplo, por mensaje privado). La contraseña no se vuelve a mostrar: cópiala ahora.'));
      const caja = el('div', 'datos-colab');
      const texto = `Gestor de MorvehTV: ${location.origin}${location.pathname}\nUsuario: ${usuario}\nContraseña: ${clave}`;
      caja.append(el('pre', null, texto));
      const copiar = el('button', 'boton primario', 'Copiar datos');
      copiar.onclick = () => { navigator.clipboard.writeText(texto).then(() => { copiar.textContent = '✓ Copiado'; }, () => aviso('No se pudo copiar: selecciónalo a mano', 'mal')); };
      const volver = el('button', 'boton', 'Volver a colaboradores'); volver.onclick = pintar;
      const fila = el('div', 'botones'); fila.append(volver, copiar);
      v.append(caja, el('p', null, 'Con estos datos también puede entrar en la web y la app de MorvehTV.'), fila);
    }
    pintar();
  }, { grande: true });
  // Contraseña segura al azar (sin letras que se confunden: 0/O, 1/l/I)
  function claveAlAzar() {
    const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const n = new Uint32Array(12); crypto.getRandomValues(n);
    return [...n].map((x) => letras[x % letras.length]).join('');
  }

  // ---------- Registro: quién hizo qué ----------
  $('#b-registro').onclick = () => ventana(async (v, cerrar) => {
    v.append(el('h2', null, '📜 Registro'), el('p', null, 'Las últimas acciones hechas desde el gestor: quién y cuándo. No se guardan IPs ni otros datos personales.'));
    const caja = el('div', 'registro'); caja.innerHTML = '<div class="cargando">Cargando…</div>';
    v.append(caja);
    const pie = el('div', 'botones'); const c = el('button', 'boton', 'Cerrar'); c.onclick = () => cerrar(null); pie.append(c); v.append(pie);
    try {
      const lista = await api('/api/panel/registro');
      caja.innerHTML = '';
      if (!lista.length) caja.append(el('div', 'vacio', 'Aún no hay nada apuntado'));
      for (const x of lista) {
        const f = el('div', `fila-registro${/borra|elimina/.test(x.accion) ? ' peligro' : ''}`);
        const que = x.claves?.length ? `${x.claves.map(nombreDe).slice(0, 2).join(', ')}${x.total > 2 ? ` y ${x.total - 2} más` : ''}` : '';
        f.append(el('small', null, fecha(x.fecha)), el('b', null, x.usuario), el('span', null, `${x.accion}${que ? `: ${que}` : ''}${x.objetos != null ? ` (${x.objetos})` : ''}`));
        f.title = (x.claves ?? []).join('\n');
        caja.append(f);
      }
    } catch (e) { caja.innerHTML = ''; caja.append(el('div', 'vacio', e.message)); }
  }, { grande: true });

  // ---------- Añadir título: buscarlo (por nombre o IMDb), elegir carpeta y un archivo por capítulo ----------
  const seguro = (t) => String(t ?? '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
  const dos = (n) => String(n).padStart(2, '0');
  const ext = (n) => (n.match(/\.(\w+)$/)?.[1] ?? 'mp4').toLowerCase();
  // Número de capítulo que trae el nombre del archivo: «S01E02», «1x02», «E02», «Capítulo 2», «- 02 -»
  function capituloDe(nombre) {
    const sin = nombre.replace(/\.[^.]+$/, '');
    const m = sin.match(/S(\d{1,2})[ ._-]?E(\d{1,3})/i) || sin.match(/(?<!\d)(\d{1,2})x(\d{2,3})(?!\d)/i);
    if (m) return { t: Number(m[1]), e: Number(m[2]) };
    const e = sin.match(/(?:\bE|\bEP|Episodio|Cap[ií]tulo)[ ._-]*(\d{1,3})(?!\d)/i) || sin.match(/(?:^|[ ._-])(\d{1,3})(?=[ ._-]|$)/);
    return e ? { t: null, e: Number(e[1]) } : null;
  }
  function elegirArchivos(multiple) {
    return new Promise((listo) => {
      const i = el('input'); i.type = 'file'; i.multiple = multiple;
      i.accept = 'video/*,.mkv,.avi,.ts,.srt,.vtt,.ass';
      i.onchange = () => listo([...i.files]);
      i.click();
    });
  }

  $('#b-titulo').onclick = () => ventana(async (v, cerrar) => {
    let ficha = null;
    const asignados = new Map(); // 'pelicula' o 'T-E' → File
    let seccion = actual ? `${actual.split('/')[0]}/` : (secciones[0]?.prefijo ?? '');

    // --- Buscar ---
    function pintarBusqueda(texto = '') {
      v.innerHTML = '';
      v.append(el('h2', null, '🎬 Añadir película o serie'), el('p', null, 'Busca por nombre, o pega el enlace o el código de IMDb (tt…) o de TMDB (themoviedb.org/movie/… o /tv/…, o solo su número). Después eliges la carpeta y el archivo de cada capítulo: se suben con su nombre bien puesto.'));
      const fila = el('div', 'buscador');
      const q = el('input'); q.placeholder = 'Nombre, enlace de IMDb o TMDB, tt… o número de TMDB'; q.value = texto;
      const b = el('button', 'boton primario', 'Buscar');
      fila.append(q, b);
      const res = el('div', 'resultados');
      v.append(fila, res);
      const no = el('div', 'botones'); const c = el('button', 'boton', 'Cerrar'); c.onclick = () => cerrar(null); no.append(c); v.append(no);
      const buscar = async () => {
        if (q.value.trim().length < 2) return q.focus();
        res.innerHTML = '<div class="cargando">Buscando…</div>';
        try {
          const lista = await api(`/api/panel/titulos?q=${encodeURIComponent(q.value.trim())}`);
          res.innerHTML = '';
          if (!lista.length) res.append(el('div', 'vacio', 'No se ha encontrado nada. Prueba con otro nombre o con el enlace de IMDb o de TMDB.'));
          for (const r of lista) {
            const t = el('button', 'resultado');
            if (r.poster) { const im = el('img'); im.src = r.poster; im.alt = ''; im.loading = 'lazy'; t.append(im); } else t.append(el('div', 'sin', '🎞'));
            const info = el('div');
            info.append(el('span', `etiqueta ${r.tipo}`, r.tipo === 'serie' ? 'Serie' : 'Película'), el('small', null, r.anio || ''));
            t.append(el('b', null, r.titulo), info);
            t.onclick = () => abrirFicha(r, q.value);
            res.append(t);
          }
        } catch (e) { res.innerHTML = ''; res.append(el('div', 'vacio', e.message)); }
      };
      b.onclick = buscar;
      q.onkeydown = (e) => { if (e.key === 'Enter') buscar(); };
      q.focus();
      if (texto) buscar();
    }

    // --- Ficha, carpeta y archivos ---
    async function abrirFicha(r, busqueda) {
      v.innerHTML = '<div class="cargando">Cargando capítulos…</div>';
      try { ficha = await api(`/api/panel/titulo?tipo=${r.tipo}&id=${r.tmdbId}`); } catch (e) { aviso(e.message, 'mal'); return pintarBusqueda(busqueda); }
      asignados.clear();
      const serie = ficha.tipo === 'serie';
      const base = seguro(`${ficha.titulo}${ficha.anio ? ` - ${ficha.anio}` : ''}`);
      const carpetaDe = (t) => (serie ? `${seccion}${base}/Temporada ${t}/` : seccion);
      const nombreDe = (t, ep, file) => (serie
        ? `${seguro(ficha.titulo)} - S${dos(t)}E${dos(ep.numero)}${ep.titulo ? ` - ${seguro(ep.titulo)}` : ''}.${ext(file.name)}`
        : `${base}.${ext(file.name)}`);

      v.innerHTML = '';
      // Cabecera con el cartel
      const cab = el('div', 'ficha');
      if (ficha.poster) { const im = el('img'); im.src = ficha.poster; im.alt = ''; cab.append(im); }
      const txt = el('div');
      txt.append(el('h2', null, `${ficha.titulo}${ficha.anio ? ` (${ficha.anio})` : ''}`));
      const meta = el('div');
      meta.append(el('span', `etiqueta ${ficha.tipo}`, serie ? `Serie · ${ficha.temporadas.filter((t) => t.numero > 0).length} temporadas` : 'Película'));
      if (ficha.generos?.length) meta.append(el('small', null, ficha.generos.slice(0, 3).join(' · ')));
      txt.append(meta);
      if (ficha.sinopsis) txt.append(el('p', 'sinopsis', ficha.sinopsis));
      if (ficha.imdb) { const a = el('a', null, `IMDb ${ficha.imdb} ↗`); a.href = `https://www.imdb.com/title/${ficha.imdb}/`; a.target = '_blank'; a.rel = 'noopener'; txt.append(a); }
      { const a = el('a', null, `TMDB ${ficha.tmdbId} ↗`); a.href = `https://www.themoviedb.org/${serie ? 'tv' : 'movie'}/${ficha.tmdbId}`; a.target = '_blank'; a.rel = 'noopener'; if (ficha.imdb) txt.append(' · '); txt.append(a); }
      cab.append(txt);
      v.append(cab);

      // Carpeta de destino
      const dest = el('div', 'destino');
      const lsel = el('label', null, 'Carpeta donde se sube');
      const sel = el('select');
      for (const s of secciones) sel.append(new Option(s.nombre, s.prefijo));
      // Si no se estaba dentro de una sección, la que cuadre con el tipo («SERIES» o «PELICULAS»)
      if (!actual || !secciones.some((s) => s.prefijo === seccion)) {
        const tipoRe = serie ? /^series?\/$/i : /^pel[ií]culas?\/$/i;
        const parecida = serie ? /serie/i : /pel[ií]cula|estreno|cine/i;
        seccion = (secciones.find((s) => tipoRe.test(s.prefijo)) ?? secciones.find((s) => parecida.test(s.prefijo)) ?? secciones[0])?.prefijo ?? '';
      }
      sel.value = seccion;
      lsel.append(sel);
      const ruta = el('div');
      dest.append(lsel, ruta);
      v.append(dest);
      const pintarRuta = () => { ruta.innerHTML = ''; ruta.append(el('span', null, 'Quedará en: '), el('code', null, serie ? `${seccion}${base}/Temporada N/` : `${seccion}${base}.mp4`)); };
      sel.onchange = () => { seccion = sel.value; pintarRuta(); };
      pintarRuta();

      const pie = el('div', 'pie-titulo');
      const resumenTxt = el('span', 'resumen');
      const volver = el('button', 'boton', '← Buscar otro'); volver.onclick = () => pintarBusqueda(busqueda);
      const subir = el('button', 'boton primario', 'Subir');
      pie.append(resumenTxt, volver, subir);
      // Capítulos ya mandados a la cola (la ventana sigue abierta y enseña cómo va cada uno)
      const enviados = new Map(); // 'T-E' → elemento de la cola
      const activo = (x) => x && (x.estado === 'espera' || x.estado === 'subiendo');
      const actualizarPie = () => {
        const n = asignados.size;
        const env = [...enviados.values()];
        const hechos = env.filter((x) => x.estado === 'hecho').length;
        const enCurso = env.filter(activo).length;
        const fallos = env.filter((x) => x.estado === 'error').length;
        const partes = [];
        if (n) partes.push(`${n} elegido${n === 1 ? '' : 's'}`);
        if (enCurso) partes.push(`⬆ ${enCurso} subiendo`);
        if (hechos) partes.push(`✓ ${hechos} subido${hechos === 1 ? '' : 's'}`);
        if (fallos) partes.push(`✕ ${fallos} con error`);
        resumenTxt.textContent = partes.length ? partes.join(' · ') : (serie ? 'Elige el archivo de cada capítulo' : 'Elige el archivo de la película');
        subir.disabled = !n || !seccion;
        subir.textContent = n > 1 ? `Subir ${n} archivos` : 'Subir';
        // Mientras haya capítulos en cola no se cambia la carpeta (se partiría la serie en dos sitios)
        sel.disabled = env.length > 0;
        volver.textContent = enCurso ? '← Buscar otro (siguen subiendo)' : '← Buscar otro';
      };

      // Una fila por archivo a elegir
      function filaArchivo(clave, numero, titulo) {
        const f = el('div', 'episodio');
        const nombreF = el('span', 'f');
        const b = el('button', 'boton');
        const pintar = () => {
          const file = asignados.get(clave);
          const x = !file && enviados.get(clave);
          f.className = `episodio${file ? ' con' : ''}${x ? ` ${x.estado}` : ''}`;
          if (file) {
            nombreF.textContent = `✓ ${file.name} · ${tam(file.size)}`;
            b.textContent = '✕'; b.title = 'Quitar';
          } else if (x) {
            const pct = x.file.size ? Math.floor(100 * x.subido / x.file.size) : 0;
            nombreF.textContent = x.estado === 'subiendo' ? `⬆ Subiendo ${pct}%${x.velocidad ? ` · ${tam(x.velocidad)}/s` : ''}`
              : x.estado === 'espera' ? '⏳ En cola' : x.estado === 'hecho' ? '✓ Subido' : x.estado === 'error' ? `✕ ${x.error}` : 'Cancelado';
            f.style.setProperty('--pct', `${x.estado === 'hecho' ? 100 : pct}%`);
            b.textContent = activo(x) ? '✕' : x.estado === 'hecho' ? 'Cambiar' : 'Elegir';
            b.title = activo(x) ? 'Cancelar la subida' : 'Elegir otro archivo';
          } else {
            nombreF.textContent = 'Sin archivo';
            b.textContent = 'Elegir'; b.title = 'Elegir el archivo';
          }
          nombreF.title = file ? file.name : (x?.nombre ?? '');
          actualizarPie();
        };
        b.onclick = async () => {
          const x = enviados.get(clave);
          if (asignados.has(clave)) asignados.delete(clave);
          else if (activo(x)) cancelar(x);
          else { const [file] = await elegirArchivos(false); if (file) asignados.set(clave, file); }
          pintar();
        };
        const t = el('span', 't', titulo); t.title = titulo;
        f.append(el('span', 'n', numero), t, nombreF, b);
        f.pintar = pintar;
        pintar();
        return f;
      }

      const filas = new Map();
      if (!serie) {
        const caja = el('div', 'temporada');
        const f = filaArchivo('pelicula', '🎬', `${ficha.titulo}${ficha.anio ? ` (${ficha.anio})` : ''}`);
        caja.append(f);
        v.append(caja);
      } else {
        // Varios archivos a la vez: cada uno a su capítulo por el número del nombre
        const repartir = (files, temporada) => {
          const sinNumero = [];
          let colocados = 0;
          for (const file of files) {
            const c = capituloDe(file.name);
            const t = c?.t ?? temporada;
            const ep = t != null && c ? ficha.temporadas.find((x) => x.numero === t)?.episodios.find((x) => x.numero === c.e) : null;
            if (ep) { asignados.set(`${t}-${ep.numero}`, file); colocados++; } else sinNumero.push(file);
          }
          // Los que no dicen su número, en orden, en los capítulos libres de esa temporada
          // (libres: sin archivo elegido y sin subir o subiéndose ya)
          if (temporada != null && sinNumero.length) {
            const libres = ficha.temporadas.find((x) => x.numero === temporada).episodios.filter((e) => {
              const k = `${temporada}-${e.numero}`; const x = enviados.get(k);
              return !asignados.has(k) && !(x && (activo(x) || x.estado === 'hecho'));
            });
            sinNumero.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }))
              .forEach((file, i) => { if (libres[i]) { asignados.set(`${temporada}-${libres[i].numero}`, file); colocados++; } });
          }
          filas.forEach((f) => f.pintar());
          aviso(`${colocados} de ${files.length} archivo${files.length === 1 ? '' : 's'} colocado${files.length === 1 ? '' : 's'}${colocados < files.length ? ': elige a mano los demás' : ''}`, colocados ? 'bien' : 'mal');
        };
        const todos = el('div', 'buscador');
        const bt = el('button', 'boton', '📂 Elegir archivos de varios capítulos…');
        bt.title = 'Se colocan solos si el nombre lleva S01E02, 1x02…';
        bt.onclick = async () => { const files = await elegirArchivos(true); if (files.length) repartir(files, null); };
        todos.append(bt, el('span', 'resumen', 'Se colocan solos si el nombre trae «S01E02» o «1x02».'));
        v.append(todos);
        ficha.temporadas.forEach((t) => {
          const d = el('details', 'temporada');
          d.open = true; // todas abiertas, con todos sus capítulos (se pueden plegar)
          const s = el('summary');
          const bt2 = el('button', 'boton', 'Elegir archivos de esta temporada');
          bt2.onclick = async (e) => { e.preventDefault(); const files = await elegirArchivos(true); if (files.length) { d.open = true; repartir(files, t.numero); } };
          s.append(el('span', null, `${t.nombre} · ${t.episodios.length} capítulos`), el('span', 'hueco'), bt2);
          d.append(s);
          for (const ep of t.episodios) {
            const f = filaArchivo(`${t.numero}-${ep.numero}`, `E${dos(ep.numero)}`, ep.titulo || `Capítulo ${ep.numero}`);
            filas.set(`${t.numero}-${ep.numero}`, f);
            d.append(f);
          }
          v.append(d);
        });
      }
      v.append(pie);
      actualizarPie();

      // Subir: carpetas, vínculo con TMDB y todo a la cola
      subir.onclick = async () => {
        subir.disabled = true;
        try {
          const trabajos = [];
          if (!serie) {
            const file = asignados.get('pelicula');
            trabajos.push({ file, carpeta: carpetaDe(), nombre: nombreDe(null, null, file) });
            await api('/api/panel/vincular', { clave: `${seccion}${nombreDe(null, null, file)}`, tmdbId: ficha.tmdbId, tipo: 'pelicula' }).catch(() => {});
          } else {
            for (const [clave, file] of asignados) {
              const [t, n] = clave.split('-').map(Number);
              const ep = ficha.temporadas.find((x) => x.numero === t).episodios.find((x) => x.numero === n);
              trabajos.push({ clave, file, carpeta: carpetaDe(t), nombre: nombreDe(t, ep, file) });
            }
            const carpetas = [`${seccion}${base}/`, ...new Set(trabajos.map((x) => x.carpeta))];
            await api('/api/panel/carpeta', { carpetas });
            if (!enviados.size) await api('/api/panel/vincular', { clave: `${seccion}${base}/`, tmdbId: ficha.tmdbId, tipo: 'serie' }).catch(() => {});
            trabajos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
          }
          if (!serie) {
            cerrar(true);
            irA(seccion);
            for (const x of trabajos) encolar(x.file, x.carpeta, x.nombre);
          } else {
            // Serie: la ventana se queda abierta para seguir eligiendo capítulos mientras suben
            if (!enviados.size) irA(`${seccion}${base}/`);
            for (const x of trabajos) {
              const q = encolar(x.file, x.carpeta, x.nombre);
              enviados.set(x.clave, q);
              asignados.delete(x.clave);
              const fila = filas.get(x.clave);
              q.alPintar = () => { if (fila.isConnected) fila.pintar(); };
            }
            filas.forEach((f) => f.pintar());
          }
          aviso(`${trabajos.length} archivo${trabajos.length === 1 ? '' : 's'} a la cola de subida`, 'bien');
        } catch (e) { aviso(e.message, 'mal'); actualizarPie(); }
      };
    }

    pintarBusqueda();
  }, { grande: true, fija: true });

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
      encolar(file, actual, file.name);
    }
  }
  // Un archivo a la cola de subidas, con su carpeta y su nombre en e2
  function encolar(file, carpeta, nombre, extra = {}) {
    const x = { file, nombre, carpeta, estado: 'espera', subido: 0, xhrs: new Set(), ...extra };
    {
      x.li = el('li', 'sub');
      const linea = el('div', 'linea');
      x.quitar = el('button', null, '✕'); x.quitar.title = 'Cancelar';
      x.quitar.onclick = () => cancelar(x);
      const b = el('b', null, nombre); b.title = `${carpeta}${nombre}`;
      linea.append(b, x.quitar);
      x.dato = el('div', 'dato');
      x.barra = el('div', 'progreso'); x.barra.append(el('i'));
      x.li.append(linea, x.dato, x.barra);
      $('#sub-lista').append(x.li);
      cola.push(x);
      pintarSub(x);
    }
    $('#subidas').hidden = !cola.length;
    if (!subiendo) procesar();
    return x;
  }
  // Repintar la lista cuesta: mientras se sube, como mucho 4 veces por segundo por archivo (los
  // cambios de estado —empieza, termina, falla— se pintan al momento)
  function pintarSubLuego(x) {
    if (x.pintando) return;
    x.pintando = setTimeout(() => { x.pintando = null; pintarSub(x); }, 250);
  }
  function pintarSub(x) {
    if (x.pintando) { clearTimeout(x.pintando); x.pintando = null; }
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
    x.alPintar?.();
  }
  function cancelar(x) {
    if (x.estado === 'subiendo') { x.cancelado = true; x.xhrs.forEach((r) => r.abort()); return; }
    if (x.estado === 'espera') { x.estado = 'cancelado'; pintarSub(x); return; }
    cola.splice(cola.indexOf(x), 1); x.li.remove();
    $('#subidas').hidden = !cola.length;
  }
  // porServidor: el trozo va al servidor de MorvehTV (con la sesión) y este lo pasa a e2; el
  // servidor devuelve la huella del trozo en la respuesta en vez de en la cabecera ETag
  function put(url, blob, x, alAvanzar, porServidor) {
    return new Promise((ok, mal) => {
      const r = new XMLHttpRequest();
      x.xhrs.add(r);
      r.open('PUT', url);
      if (porServidor) { r.setRequestHeader('authorization', `Bearer ${token}`); r.setRequestHeader('content-type', 'application/octet-stream'); }
      r.upload.onprogress = (e) => alAvanzar(e.loaded);
      r.onload = () => {
        x.xhrs.delete(r);
        if (r.status >= 200 && r.status < 300) {
          let etag = null;
          if (porServidor) { try { etag = JSON.parse(r.responseText).etag; } catch {} return etag ? ok(etag) : mal(Object.assign(new Error('Respuesta rara del servidor'), { status: 502 })); }
          etag = r.getResponseHeader('ETag');
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
      ini = await api('/api/panel/subir/iniciar', { carpeta: x.carpeta, nombre: x.nombre, tamano: x.file.size, reemplazar: x.reemplazar, anuncio: x.anuncio });
    } catch (e) {
      if (e.datos?.existe && await confirmar('Ya existe', `«${x.nombre}» ya está en ${x.carpeta}. ¿Reemplazarlo?`, null, 'Reemplazar', true)) { x.reemplazar = true; return subirUno(x); }
      throw e;
    }
    const { key, uploadId, tamParte, partes } = ini;
    const urls = {}; const urls2 = {}; const pedidas = new Map();
    // segunda: el trozo va por la otra dirección del bucket (si la hay y no ha fallado)
    async function url(n, segunda) {
      if (urls[n]) return segunda && !segundaRota && urls2[n] ? urls2[n] : urls[n];
      // Las direcciones firmadas se piden de 200 en 200 (menos idas y vueltas al servidor)
      const tanda = Math.floor((n - 1) / 200);
      if (!pedidas.has(tanda)) {
        const numeros = [];
        for (let i = tanda * 200 + 1; i <= Math.min(partes, tanda * 200 + 200); i++) numeros.push(i);
        pedidas.set(tanda, api('/api/panel/subir/partes', { key, uploadId, numeros })
          .then((r) => { Object.assign(urls, r.urls); Object.assign(urls2, r.urls2 || {}); }).finally(() => pedidas.delete(tanda)));
      }
      await pedidas.get(tanda);
      return segunda && !segundaRota && urls2[n] ? urls2[n] : urls[n];
    }
    const etags = {};
    // Lo subido = trozos terminados (un total que solo suma) + lo que llevan los que están en
    // marcha (como mucho 12): no se recorre la lista entera de trozos en cada avance
    let terminado = 0; const enMarcha = new Map();
    const pendientes = Array.from({ length: partes }, (_, i) => i + 1);
    let muestra = { t: performance.now(), b: 0 };
    const avanzar = () => {
      let s = terminado;
      for (const b of enMarcha.values()) s += b;
      x.subido = s;
      const ahora = performance.now();
      if (ahora - muestra.t > 1500) {
        const v = (x.subido - muestra.b) / ((ahora - muestra.t) / 1000);
        x.velocidad = x.velocidad ? x.velocidad * 0.6 + v * 0.4 : v;
        muestra = { t: ahora, b: x.subido };
      }
      pintarSubLuego(x);
    };
    let roto = false; // un trozo falló del todo: los demás paran (sin reintentar)
    async function trabajador(segunda) {
      while (pendientes.length) {
        if (x.cancelado || roto) throw new Error('Cancelado');
        const n = pendientes.shift();
        const blob = x.file.slice((n - 1) * tamParte, Math.min(n * tamParte, x.file.size));
        for (let intento = 1; ; intento++) {
          const porServidor = !servidorRoto;
          const porSegunda = !porServidor && segunda && !segundaRota && !!urls2[n];
          try {
            const destino = porServidor
              ? `${API}/api/panel/subir/trozo?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&n=${n}`
              : await url(n, segunda);
            etags[n] = await put(destino, blob, x, (b) => { enMarcha.set(n, b); avanzar(); }, porServidor);
            if (porServidor) fallosServidor = 0;
            enMarcha.delete(n); terminado += blob.size; avanzar();
            break;
          } catch (e) {
            if (x.cancelado || roto) throw new Error('Cancelado');
            enMarcha.delete(n); avanzar();
            // Por el servidor: si no tiene la ruta (versión antigua) o falla 3 veces seguidas, se
            // deja y este trozo y los siguientes van directos a e2
            if (porServidor) {
              if (e.status === 401) throw new Error('La sesión ha caducado: vuelve a entrar');
              if (e.status === 404 || e.status === 405 || ++fallosServidor >= 3) servidorRoto = true;
              intento--; await espera(500); continue;
            }
            // La segunda dirección no funciona (conexión, CORS…): se deja y el trozo va por la primera
            if (porSegunda && (!e.status || e.status < 500)) { segundaRota = true; intento--; continue; }
            if (e.status === 403) { delete urls[n]; delete urls2[n]; }
            if (intento >= 5) throw e;
            await espera(1000 * 2 ** intento);
          }
        }
      }
    }
    try {
      let n;
      if (!servidorRoto) n = Math.min(POR_SERVIDOR, partes);
      else {
        await url(1); // la primera tanda de direcciones dice si hay segunda dirección
        n = Math.min(CONCURRENCIA * (!segundaRota && Object.keys(urls2).length > 0 ? 2 : 1), partes);
      }
      // (la mitad de los trabajadores usa la segunda dirección de e2 si hay que ir directo)
      await Promise.all(Array.from({ length: n }, (_, i) => trabajador(i % 2 === 1)));
      await api('/api/panel/subir/completar', { key, uploadId, partes: Object.entries(etags).map(([n, etag]) => ({ n: Number(n), etag })) });
      x.estado = 'hecho'; x.subido = x.file.size;
      if (x.alTerminar) x.alTerminar(key);
    } catch (e) {
      roto = true;
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

  // ---------- Al día ----------
  // GitHub Pages deja guardar los archivos 10 minutos: si hay una versión publicada más nueva que
  // la de esta página, se recarga con ella (la dirección con ?v=… obliga a pedirlo todo de nuevo)
  fetch(`version.txt?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((t) => {
    const nueva = t.trim();
    const mia = document.documentElement.dataset.version;
    if (nueva && nueva !== mia && new URLSearchParams(location.search).get('v') !== nueva && !subiendo) {
      location.replace(`${location.pathname}?v=${encodeURIComponent(nueva)}${location.hash}`);
    }
  }).catch(() => {});

  // ---------- Arranque ----------
  if (!token) return salir();
  api('/api/panel/yo').then(arrancar).catch((e) => { if (token) { $('#vista-entrar').hidden = false; $('#e-error').textContent = e.message; } });
})();
