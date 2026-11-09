// MorvehTV · Cuentas: panel para gestionar las cuentas del servidor de Emby. Habla con la API del
// servidor de MorvehTV (/api/panel/…) con un token que se guarda en este navegador; el servidor
// habla con Emby con su clave de API (aquí nunca se ve). Solo para administradores de MorvehTV.
(() => {
  const API = window.MORVEHTV.api;
  const $ = (s) => document.querySelector(s);
  const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };

  let token = null;
  try { token = localStorage.getItem('gestor-token'); } catch {}

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
    const i = el('input'); i.value = valor; i.spellcheck = false; v.append(i);
    const si = botones(v, cerrar, textoSi, 'primario', () => { if (i.value.trim()) cerrar(i.value.trim()); });
    i.onkeydown = (e) => { if (e.key === 'Enter') si.click(); };
    i.focus(); i.select();
  });
  const confirmar = (titulo, texto, lista, textoSi, peligro) => ventana((v, cerrar) => {
    v.append(el('h2', null, titulo), el('p', null, texto));
    botones(v, cerrar, textoSi, peligro ? 'peligro lleno' : 'primario', () => cerrar(true)).focus();
  });
  // Contraseña segura al azar (sin letras que se confunden: 0/O, 1/l/I)
  function claveAlAzar() {
    const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const n = new Uint32Array(12); crypto.getRandomValues(n);
    return [...n].map((x) => letras[x % letras.length]).join('');
  }

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
      $('#e-error').textContent = err.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor: prueba en unos segundos' : err.message;
    }
    b.disabled = false; b.textContent = 'Entrar';
  };

  let recargarEmby = null;
  function arrancar(yo) {
    if (yo.rol !== 'admin') {
      salir();
      $('#e-error').textContent = 'Este panel es solo para administradores';
      return;
    }
    $('#usuario').textContent = yo.nombre || yo.usuario;
    $('#vista-entrar').hidden = true; $('#vista-panel').hidden = false;
    if (recargarEmby) recargarEmby(); else recargarEmby = panelEmby();
  }

  // ---------- Cuentas de Emby ----------
  // Crear, renovar, editar y borrar las cuentas del servidor de Emby. El servidor de MorvehTV
  // habla con Emby con su clave de API (aquí nunca se ve); la caducidad la lleva MorvehTV y
  // desactiva sola las cuentas vencidas.
  const DIA = 864e5;
  const DURACIONES = [
    { texto: '1 mes', dias: 30 }, { texto: '3 meses', dias: 90 }, { texto: '6 meses', dias: 180 },
    { texto: '1 año', dias: 365 }, { texto: 'Sin caducidad', dias: 0 }, { texto: 'Fecha…', dias: -1 },
  ];
  const fechaCorta = (f) => new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  function haceCuanto(f) {
    if (!f) return 'Nunca';
    const s = (Date.now() - new Date(f).getTime()) / 1000;
    if (s < 90) return 'Ahora mismo';
    if (s < 3600) return `Hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `Hace ${Math.round(s / 3600)} h`;
    if (s < 86400 * 30) return `Hace ${Math.round(s / 86400)} días`;
    return fechaCorta(f);
  }
  // Estado de una cuenta: para la insignia, el filtro y el orden
  function estadoEmby(u) {
    if (u.admin) return { clave: 'admin', texto: 'Administrador', clase: 'admin' };
    if (u.caducada) return { clave: 'caducada', texto: 'Caducada', clase: 'mal' };
    if (u.desactivada) return { clave: 'desactivada', texto: 'Desactivada', clase: 'apagada' };
    if (u.caduca && new Date(u.caduca).getTime() - Date.now() < 7 * DIA) return { clave: 'pronto', texto: 'Caduca pronto', clase: 'aviso' };
    return { clave: 'activa', texto: 'Activa', clase: 'bien' };
  }
  function textoCaducidad(u) {
    if (!u.caduca) return 'Sin caducidad';
    const d = Math.ceil((new Date(u.caduca).getTime() - Date.now()) / DIA);
    if (d < 0) return `Caducó hace ${-d} ${-d === 1 ? 'día' : 'días'}`;
    if (d === 0) return 'Caduca hoy';
    if (d === 1) return 'Caduca mañana';
    return d <= 60 ? `Caduca en ${d} días` : `Hasta el ${fechaCorta(u.caduca)}`;
  }
  const inicial = (n) => (String(n).trim()[0] || '?').toUpperCase();
  const colorDe = (n) => { let h = 0; for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h} 55% 42%)`; };
  // Botones de opción tipo «píldora» (uno elegido)
  function pildoras(opciones, elegida, alCambiar) {
    const caja = el('div', 'pildoras');
    const marcar = (b) => { caja.querySelectorAll('button').forEach((x) => x.classList.toggle('activa', x === b)); };
    opciones.forEach((o) => {
      const b = el('button', 'pildora', o.texto); b.type = 'button';
      if (o.valor === elegida) b.classList.add('activa');
      b.onclick = () => { marcar(b); alCambiar(o.valor); };
      caja.append(b);
    });
    return caja;
  }
  const campo = (titulo, control, ayuda) => {
    const c = el('div', 'campo-emby'); c.append(el('span', 'campo-titulo', titulo), control);
    if (ayuda) c.append(el('small', null, ayuda));
    return c;
  };

  function panelEmby() {
    const v = $('#emby');
    let d = null; let filtro = 'todas'; let busca = '';

    async function cargar(callado) {
      if (!callado) v.innerHTML = '<div class="cargando">Conectando con Emby…</div>';
      try { d = await api('/api/panel/emby'); } catch (e) {
        if (callado) return;
        v.innerHTML = '';
        v.append(cabecera(), el('div', 'emby-fallo', e.message));
        return;
      }
      pintar();
    }

    function cabecera() {
      const cab = el('div', 'emby-cab');
      const tit = el('div', 'emby-titulo');
      tit.append(el('h2', null, 'Cuentas de Emby'));
      const sub = el('div', 'emby-servidor');
      if (d?.configurado) {
        const punto = el('i', 'punto-vivo'); punto.title = 'Conectado';
        const enlace = el('a', null, d.servidor.replace(/^https?:\/\//, '')); enlace.href = d.servidor; enlace.target = '_blank'; enlace.rel = 'noopener';
        sub.append(punto, el('span', null, d.nombreServidor || 'Emby'), el('span', 'sep', '·'), enlace);
        if (d.version) sub.append(el('span', 'sep', '·'), el('span', null, `v${d.version}`));
      } else sub.append(el('span', null, 'Servidor de Emby'));
      tit.append(sub);
      const acciones = el('div', 'emby-acciones');
      const recargar = el('button', 'boton icono-solo', '↻'); recargar.title = 'Actualizar'; recargar.onclick = cargar;
      if (d?.configurado) {
        const nueva = el('button', 'boton primario', '＋ Nueva cuenta'); nueva.onclick = () => formulario(null);
        acciones.append(nueva);
      }
      acciones.append(recargar);
      cab.append(tit, acciones);
      return cab;
    }

    function sinConfigurar() {
      const caja = el('div', 'emby-config');
      caja.append(el('b', null, 'Falta conectar el gestor con tu Emby'),
        el('p', null, 'En Emby, ve a Ajustes → Claves de API → Nueva clave (nómbrala «MorvehTV Gestor»). Después, en la VPS, añade EMBY_URL y EMBY_API_KEY al archivo /etc/morvehtv/visor.env y reinicia MorvehTV. La clave se queda solo en el servidor: nunca la pegues aquí.'));
      return caja;
    }

    function pintar() {
      const scroll = window.scrollY;
      v.innerHTML = '';
      v.append(cabecera());
      if (!d.configurado) { v.append(sinConfigurar()); return; }
      const normales = d.usuarios.filter((u) => !u.admin);
      const cuenta = (k) => normales.filter((u) => estadoEmby(u).clave === k).length;
      const viendo = d.usuarios.filter((u) => u.viendo.length).length;

      // Cifras
      const cifras = el('div', 'emby-cifras');
      const cifra = (n, texto, clase, f) => {
        const b = el('button', `cifra ${clase || ''}${filtro === f ? ' activa' : ''}`); b.type = 'button';
        b.append(el('b', null, String(n)), el('span', null, texto));
        b.onclick = () => { filtro = filtro === f ? 'todas' : f; pintar(); };
        return b;
      };
      cifras.append(
        cifra(normales.length, 'Cuentas', '', 'todas'),
        cifra(cuenta('activa') + cuenta('pronto'), 'Activas', 'bien', 'activas'),
        cifra(viendo, 'Viendo ahora', 'vivo', 'viendo'),
        cifra(cuenta('pronto'), 'Caducan en 7 días', 'aviso', 'pronto'),
        cifra(cuenta('caducada') + cuenta('desactivada'), 'Caducadas o desactivadas', 'mal', 'apagadas'),
      );
      v.append(cifras);

      // Buscador
      const barra = el('div', 'emby-barra');
      const b = el('input'); b.placeholder = 'Buscar por usuario o nota…'; b.value = busca; b.type = 'search';
      b.oninput = () => { busca = b.value; pintarLista(); };
      barra.append(b);
      v.append(barra);

      const lista = el('div', 'emby-lista');
      v.append(lista);
      function pintarLista() {
        lista.innerHTML = '';
        const q = busca.trim().toLowerCase();
        const vistos = d.usuarios.filter((u) => {
          const e = estadoEmby(u).clave;
          if (filtro === 'activas' && !['activa', 'pronto'].includes(e)) return false;
          if (filtro === 'viendo' && !u.viendo.length) return false;
          if (filtro === 'pronto' && e !== 'pronto') return false;
          if (filtro === 'apagadas' && !['caducada', 'desactivada'].includes(e)) return false;
          return !q || u.nombre.toLowerCase().includes(q) || (u.nota || '').toLowerCase().includes(q);
        });
        if (!vistos.length) {
          const vacio = el('div', 'vacio');
          vacio.append(el('b', null, d.usuarios.length ? 'Ninguna cuenta coincide' : 'Todavía no hay cuentas'), document.createTextNode(d.usuarios.length ? 'Prueba con otra búsqueda o quita el filtro.' : 'Crea la primera con «＋ Nueva cuenta».'));
          lista.append(vacio);
          return;
        }
        for (const u of vistos) lista.append(filaEmby(u));
      }
      pintarLista();
      window.scrollTo(0, scroll);
    }

    function filaEmby(u) {
      const e = estadoEmby(u);
      const f = el('div', `fila-emby estado-${e.clave}`);
      const avatar = el('div', 'avatar-emby', inicial(u.nombre)); avatar.style.background = colorDe(u.nombre);
      if (u.conectado || u.viendo.length) avatar.append(el('i', 'en-linea'));
      const quien = el('div', 'quien-emby');
      const nombre = el('div', 'nombre-emby'); nombre.append(el('b', null, u.nombre), el('span', `insignia ${e.clase}`, e.texto));
      quien.append(nombre);
      if (u.viendo.length) quien.append(el('small', 'viendo', `▶ ${u.viendo[0].titulo}${u.viendo[0].dispositivo ? ` — ${u.viendo[0].dispositivo}` : ''}`));
      else if (u.nota) quien.append(el('small', null, u.nota));
      else quien.append(el('small', null, `Último acceso: ${haceCuanto(u.ultimoAcceso)}`));

      const datos = el('div', 'datos-emby');
      const dato = (titulo, valor, clase) => { const x = el('div', `dato ${clase || ''}`); x.append(el('span', null, titulo), el('b', null, valor)); return x; };
      if (u.admin) datos.append(dato('Acceso', 'Total'), dato('Último acceso', haceCuanto(u.ultimoAcceso)));
      else {
        datos.append(
          dato('Caducidad', textoCaducidad(u), e.clave === 'pronto' ? 'aviso' : e.clave === 'caducada' ? 'mal' : ''),
          dato('Pantallas', u.pantallas ? String(u.pantallas) : 'Sin límite'),
          dato('Bibliotecas', u.todas ? 'Todas' : u.bibliotecas.join(', ') || '—'),
        );
      }
      const acciones = el('div', 'acciones-emby');
      if (u.admin) acciones.append(el('small', null, 'Se gestiona en Emby'));
      else {
        const renovar = el('button', 'boton fino', '⟳ Renovar'); renovar.onclick = (ev) => { ev.stopPropagation(); renovarCuenta(u); };
        const editar = el('button', 'boton fino', 'Gestionar'); editar.onclick = (ev) => { ev.stopPropagation(); formulario(u); };
        acciones.append(renovar, editar);
        f.tabIndex = 0;
        f.onclick = () => formulario(u);
        f.onkeydown = (ev) => { if (ev.key === 'Enter' && ev.target === f) formulario(u); };
      }
      f.append(avatar, quien, datos, acciones);
      return f;
    }

    // Renovar rápido: suma tiempo (desde la caducidad si aún no ha llegado) y la reactiva
    async function renovarCuenta(u) {
      const dias = await ventana((w, fin) => {
        w.append(el('h2', null, `Renovar «${u.nombre}»`),
          el('p', null, `${textoCaducidad(u)}. El tiempo se suma ${u.caduca && !u.caducada ? 'a la fecha actual de caducidad' : 'desde hoy'} y la cuenta se vuelve a activar.`));
        const caja = el('div', 'renovar-opciones');
        [{ t: '+1 mes', n: 30 }, { t: '+3 meses', n: 90 }, { t: '+6 meses', n: 180 }, { t: '+1 año', n: 365 }].forEach((o) => {
          const b = el('button', 'boton', o.t); b.onclick = () => fin(o.n); caja.append(b);
        });
        w.append(caja);
        const fila = el('div', 'botones'); const no = el('button', 'boton', 'Cancelar'); no.onclick = () => fin(null); fila.append(no); w.append(fila);
      });
      if (!dias) return;
      try {
        const r = await api('/api/panel/emby/renovar', { id: u.id, nombre: u.nombre, dias });
        aviso(`${u.nombre}: renovada hasta el ${fechaCorta(r.caduca)}`, 'bien');
      } catch (e) { aviso(e.message, 'mal'); }
      cargar();
    }

    // Crear (u = null) o gestionar una cuenta
    function formulario(u) {
      const nueva = !u;
      ventana((w, fin) => {
        w.classList.add('form-emby');
        w.append(el('h2', null, nueva ? 'Nueva cuenta de Emby' : `Gestionar «${u.nombre}»`));
        if (!nueva) {
          const e = estadoEmby(u);
          const resumenC = el('div', 'resumen-emby');
          resumenC.append(el('span', `insignia ${e.clase}`, e.texto), el('span', null, textoCaducidad(u)), el('span', null, `Último acceso: ${haceCuanto(u.ultimoAcceso)}`));
          if (u.creada) resumenC.append(el('span', null, `Creada el ${fechaCorta(u.creada)}${u.por ? ` por ${u.por}` : ''}`));
          w.append(resumenC);
          if (u.viendo.length) {
            const viendo = el('div', 'viendo-ahora');
            u.viendo.forEach((x) => viendo.append(el('div', null, `▶ ${x.titulo}${x.dispositivo ? ` — ${x.dispositivo}` : ''}`)));
            const cortar = el('button', 'boton fino', '■ Cortar reproducción');
            cortar.onclick = async () => {
              try { const r = await api('/api/panel/emby/cortar', { id: u.id }); aviso(r.cortadas ? 'Reproducción cortada' : 'Ya no estaba viendo nada', 'bien'); } catch (er) { aviso(er.message, 'mal'); }
            };
            viendo.append(cortar);
            w.append(viendo);
          }
        }

        const usuario = el('input'); usuario.value = u?.nombre ?? ''; usuario.placeholder = 'Por ejemplo: maria.lopez'; usuario.autocomplete = 'off'; usuario.spellcheck = false; usuario.autocapitalize = 'none';
        w.append(campo('Usuario', usuario, 'Con esto entra en Emby. Las cuentas no salen en la pantalla de inicio: tiene que escribirlo.'));

        let clave = null;
        if (nueva) {
          const fila = el('div', 'fila-clave');
          clave = el('input'); clave.value = claveAlAzar(); clave.autocomplete = 'new-password'; clave.spellcheck = false;
          const otra = el('button', 'boton fino', '↻ Otra'); otra.type = 'button'; otra.onclick = () => { clave.value = claveAlAzar(); };
          fila.append(clave, otra);
          w.append(campo('Contraseña', fila, 'Mínimo 6 caracteres. Se muestra una sola vez al terminar, para que se la pases.'));
        }

        // Duración
        let dias = nueva ? 30 : null; // en una cuenta existente, null = no tocar la fecha
        const fecha = el('input'); fecha.type = 'date'; fecha.hidden = true; fecha.className = 'fecha-emby';
        fecha.min = new Date(Date.now() + DIA).toISOString().slice(0, 10);
        if (u?.caduca) fecha.value = new Date(u.caduca).toISOString().slice(0, 10);
        const opcionesDur = nueva ? DURACIONES : [{ texto: 'Mantener', dias: null }, ...DURACIONES.map((x) => (x.dias > 0 ? { ...x, texto: `${x.texto} desde hoy` } : x))];
        const dur = el('div');
        dur.append(pildoras(opcionesDur.map((o) => ({ texto: o.texto, valor: o.dias })), dias, (val) => { dias = val; fecha.hidden = val !== -1; if (val === -1) fecha.focus(); }), fecha);
        w.append(campo(nueva ? 'Duración' : 'Caducidad', dur, nueva ? 'Al caducar, la cuenta se desactiva sola. Luego puedes renovarla.' : `Ahora: ${textoCaducidad(u)}.`));

        // Pantallas a la vez
        let pantallas = u ? u.pantallas : 1;
        w.append(campo('Pantallas a la vez', pildoras([1, 2, 3, 4, 0].map((n) => ({ texto: n ? String(n) : 'Sin límite', valor: n })), pantallas, (val) => { pantallas = val; }),
          'Cuántos dispositivos pueden ver a la vez con esta cuenta.'));

        // Bibliotecas
        const bibl = el('div', 'bibliotecas-emby');
        const todas = el('label', 'check'); const cTodas = el('input'); cTodas.type = 'checkbox'; cTodas.checked = u ? u.todas : true;
        todas.append(cTodas, document.createTextNode(' Todas (también las que crees más adelante)'));
        const sueltas = el('div', 'colab-secciones');
        const marcas = d.bibliotecas.map((b) => {
          const l = el('label', 'check'); const c = el('input'); c.type = 'checkbox'; c.value = b.id; c.checked = u ? u.todas || u.bibliotecasIds.includes(b.id) : true;
          l.append(c, document.createTextNode(' ' + b.nombre)); sueltas.append(l); return c;
        });
        const sincro = () => { sueltas.classList.toggle('apagadas', cTodas.checked); marcas.forEach((c) => { c.disabled = cTodas.checked; if (cTodas.checked) c.checked = true; }); };
        cTodas.onchange = sincro; sincro();
        bibl.append(todas);
        if (marcas.length) bibl.append(sueltas);
        else bibl.append(el('small', null, 'Aún no hay bibliotecas en Emby: créalas en Emby → Ajustes → Biblioteca.'));
        w.append(campo('Bibliotecas que puede ver', bibl));

        // Descargas y nota
        const descL = el('label', 'check'); const desc = el('input'); desc.type = 'checkbox'; desc.checked = u ? u.descargas : false;
        descL.append(desc, document.createTextNode(' Permitir descargar para ver sin conexión'));
        w.append(descL);
        const nota = el('input'); nota.value = u?.nota ?? ''; nota.placeholder = 'Opcional: para qué es, cómo pagó…'; nota.maxLength = 200;
        w.append(campo('Nota (solo la ves tú)', nota));

        // Guardar
        const pie = el('div', 'botones');
        const no = el('button', 'boton', 'Cancelar'); no.onclick = () => fin(null);
        const si = el('button', 'boton primario', nueva ? 'Crear cuenta' : 'Guardar cambios');
        si.onclick = async () => {
          const bibliotecas = cTodas.checked ? null : marcas.filter((c) => c.checked).map((c) => c.value);
          if (bibliotecas && !bibliotecas.length) return aviso('Marca al menos una biblioteca', 'mal');
          if (dias === -1 && !fecha.value) return aviso('Elige la fecha de caducidad', 'mal');
          const caduca = dias === -1 ? fecha.value : dias === 0 ? null : dias ? new Date(Date.now() + dias * DIA).toISOString() : undefined;
          si.disabled = true; si.textContent = nueva ? 'Creando…' : 'Guardando…';
          try {
            if (nueva) {
              const r = await api('/api/panel/emby/crear', { usuario: usuario.value, clave: clave.value, caduca, pantallas, bibliotecas, descargas: desc.checked, nota: nota.value });
              fin(true);
              datosDeAcceso(r.usuario, clave.value, caduca);
            } else {
              const cambios = { nombre: usuario.value, pantallas, bibliotecas, descargas: desc.checked, nota: nota.value, ...(caduca !== undefined && { caduca }) };
              await api('/api/panel/emby/editar', { id: u.id, nombre: u.nombre, cambios });
              aviso('Cambios guardados', 'bien');
              fin(true);
            }
            cargar();
          } catch (er) { aviso(er.message, 'mal'); si.disabled = false; si.textContent = nueva ? 'Crear cuenta' : 'Guardar cambios'; }
        };
        pie.append(no, si);

        // Acciones de una cuenta que ya existe
        if (!nueva) {
          const zona = el('div', 'zona-emby');
          zona.append(el('span', 'campo-titulo', 'Acciones'));
          const fila = el('div', 'acciones-cuenta');
          const cClave = el('button', 'boton fino', '🔑 Nueva contraseña');
          cClave.onclick = async () => {
            const nuevaClave = await pedirTexto(`Nueva contraseña para ${u.nombre}`, 'Mínimo 6 caracteres. Las sesiones abiertas siguen funcionando hasta que vuelva a entrar.', claveAlAzar(), 'Cambiar');
            if (!nuevaClave) return;
            try { await api('/api/panel/emby/clave', { id: u.id, nombre: u.nombre, clave: nuevaClave }); fin(true); datosDeAcceso(u.nombre, nuevaClave, u.caduca, true); }
            catch (er) { aviso(er.message, 'mal'); }
          };
          const activa = !u.desactivada && !u.caducada;
          const cAct = el('button', 'boton fino', activa ? '⏸ Desactivar' : '▶ Activar');
          cAct.onclick = async () => {
            if (u.caducada) { fin(true); return renovarCuenta(u); }
            try { await api('/api/panel/emby/activar', { id: u.id, nombre: u.nombre, activa: !activa }); aviso(activa ? `${u.nombre} desactivada: ya no puede entrar` : `${u.nombre} activada`, 'bien'); fin(true); cargar(); }
            catch (er) { aviso(er.message, 'mal'); }
          };
          const cBorrar = el('button', 'boton fino peligro', '🗑 Borrar cuenta');
          cBorrar.onclick = async () => {
            if (!(await confirmar('Borrar cuenta de Emby', `Se borra «${u.nombre}» de Emby con su historial y lo que tenía a medias. No se puede deshacer. (Para cortarle el acceso un tiempo, mejor desactívala.)`, null, 'Borrar', true))) return;
            try { await api('/api/panel/emby/borrar', { id: u.id }); aviso(`${u.nombre} borrada`, 'bien'); fin(true); cargar(); }
            catch (er) { aviso(er.message, 'mal'); }
          };
          fila.append(cClave, cAct, cBorrar);
          zona.append(fila);
          w.append(zona);
        }
        w.append(pie);
        if (nueva) usuario.focus(); else w.scrollTop = 0;
      }, { fija: true });
    }

    // Los datos para entrar, listos para copiar y mandar (la contraseña no se vuelve a ver)
    function datosDeAcceso(usuario, clave, caduca, soloClave) {
      ventana((w, fin) => {
        w.classList.add('form-emby');
        w.append(el('h2', null, soloClave ? '🔑 Contraseña cambiada' : '✅ Cuenta creada'),
          el('p', null, 'Pásale estos datos (por mensaje privado). La contraseña no se vuelve a mostrar: cópiala ahora.'));
        const vence = caduca ? `Válida hasta: ${fechaCorta(caduca)}` : 'Sin caducidad';
        const texto = `📺 Tu cuenta de ${d.nombreServidor || 'Emby'}\n\nServidor: ${d.servidor}\nUsuario: ${usuario}\nContraseña: ${clave}\n${vence}\n\nEntra desde el navegador en ${d.servidor} o con la app de Emby (móvil, Smart TV, Fire TV…): pon el servidor ${d.servidor.replace(/^https?:\/\//, '')} y el puerto 443.`;
        const tarjeta = el('div', 'acceso-emby');
        const linea = (t, valor, mono) => { const x = el('div', 'linea-acceso'); x.append(el('span', null, t), el('b', mono ? 'mono' : null, valor)); return x; };
        tarjeta.append(linea('Servidor', d.servidor.replace(/^https?:\/\//, '')), linea('Usuario', usuario, true), linea('Contraseña', clave, true), linea('Caducidad', caduca ? fechaCorta(caduca) : 'Sin caducidad'));
        w.append(tarjeta);
        const copiar = el('button', 'boton primario', '📋 Copiar mensaje');
        copiar.onclick = () => navigator.clipboard.writeText(texto).then(() => { copiar.textContent = '✓ Copiado'; }, () => aviso('No se pudo copiar: selecciónalo a mano', 'mal'));
        const vista = el('details', 'mensaje-emby'); vista.append(el('summary', null, 'Ver el mensaje que se copia'), el('pre', null, texto));
        const fila = el('div', 'botones'); const ok = el('button', 'boton', 'Hecho'); ok.onclick = () => fin(null); fila.append(ok, copiar);
        w.append(vista, fila);
        copiar.focus();
      }, { fija: true });
    }

    cargar();
    // Se actualiza solo cada minuto (quién está viendo, últimos accesos), si no estás escribiendo ni con una ventana abierta
    setInterval(() => {
      if (document.visibilityState !== 'visible' || pila.length || document.activeElement?.matches('input') || !d?.configurado) return;
      cargar(true);
    }, 60000);
    return cargar;
  }


  // ---------- Arranque ----------
  if (!token) return salir();
  api('/api/panel/yo').then(arrancar).catch((e) => { if (token) { $('#vista-entrar').hidden = false; $('#e-error').textContent = e.message; } });
})();
