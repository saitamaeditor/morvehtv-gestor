# MorvehTV Cuentas

Panel para gestionar las cuentas del servidor de Emby (emby.morvehtv.com): crear cuentas con caducidad, pantallas a la vez y bibliotecas, renovarlas, desactivarlas, cambiar la contraseña, cortar lo que están viendo y borrarlas. Las cuentas caducadas se desactivan solas.

Web estática (HTML, CSS y JS sin compilar) publicada en GitHub Pages. Se conecta a la API del servidor de MorvehTV (`config.js`), que habla con Emby con su clave de API (EMBY_URL y EMBY_API_KEY, solo en el servidor). Solo pueden entrar las cuentas de MorvehTV que sean administradoras. No contiene ninguna clave.
