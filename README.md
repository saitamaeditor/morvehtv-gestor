# MorvehTV Cuentas

Panel para gestionar las cuentas del servidor de Emby (emby.morvehtv.com): crear cuentas con caducidad, pantallas a la vez y bibliotecas, renovarlas, desactivarlas, cambiar la contraseña, cortar lo que están viendo y borrarlas. Las cuentas caducadas se desactivan solas.

Web estática (HTML, CSS y JS sin compilar) publicada en GitHub Pages. Se conecta a su servidor, panel.morvehtv.com (`config.js`; el código está en `cuentas-api/` del repositorio morvehtv-visor), que habla con Emby con su clave de API (solo en el servidor). Entran los administradores del panel (se crean desde la VPS) y los revendedores. No contiene ninguna clave.
