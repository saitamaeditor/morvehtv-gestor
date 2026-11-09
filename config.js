// Servidor del panel (MorvehTV Cuentas): panel.morvehtv.com, en la VPS junto a Emby.
// Abierto desde este ordenador (localhost) usa el servidor de pruebas local.
window.MORVEHTV = {
  api: /^(localhost|127.0.0.1)$/.test(location.hostname) ? 'http://localhost:4012' : 'https://panel.morvehtv.com',
};
