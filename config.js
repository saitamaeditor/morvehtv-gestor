// Servidor de MorvehTV al que se conecta el gestor (el mismo de la web de películas).
// Abierto desde este ordenador (localhost) usa el servidor de pruebas local.
window.MORVEHTV = {
  api: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:4012' : 'https://morvehtv.com',
  web: 'https://morvehtv.com',
};
