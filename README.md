# H³O PLUS SMART

Aplicación para registrar hábitos de consumo de agua. Angular 21 y TypeScript, Bootstrap 5, Chart.js, NestJS 11, PostgreSQL y Web Push VAPID. Interfaz en español adaptable a celulares, tablets y computadoras.

El porcentaje de la botella representa **consumo registrado / meta personal**, no un diagnóstico médico ni una medición fisiológica. Las recompensas son una demostración; no hay canjes comerciales reales.

## 1. Requisitos en Windows

- Node.js 24 LTS y npm, instalados desde https://nodejs.org/ . Reinicia la terminal después de instalar.
- Docker Desktop con motor Linux activo, o PostgreSQL 17 instalado por separado.
- PowerShell y Chrome/Edge actualizado para la prueba en computadora.
- Para Web Push móvil: dominio o túnel **HTTPS con certificado válido**, acceso a Internet y navegador/sistema compatible. No se necesita una cuenta de Apple Developer para Web Push.

Abre PowerShell **dentro de esta carpeta**, donde está `package.json`. Los comandos usan `npm.cmd` para evitar problemas con la política de scripts de PowerShell.

```powershell
node --version
npm.cmd --version
npm.cmd ci
Copy-Item .env.example .env
notepad .env
```

Si tu npm requiere una caché dentro del proyecto:

```powershell
npm.cmd ci --cache .npm-cache
```

## 2. Configurar las variables

En `.env`, cambia:

- `POSTGRES_PASSWORD`: una contraseña nueva para tu instancia local. Para simplificar la URL, usa letras y números; si usas caracteres especiales, codifícalos en `DATABASE_URL`.
- `DATABASE_URL`: la misma contraseña, usuario `h3o`, base `h3o`, servidor `localhost:5432`.
- `JWT_SECRET`: un valor aleatorio de 32 caracteres como mínimo. Puedes generarlo así y copiar el resultado en `.env`:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

- `DB_MEMORY=false` para utilizar PostgreSQL persistente.
- `PORT=3000` y `APP_URL=http://localhost:3000` en local. Si 3000 está ocupado o restringido, usa `4317` en ambos valores.
- `VAPID_SUBJECT=mailto:tu-correo@tu-dominio.com`.

Genera tus propias claves Web Push:

```powershell
npm.cmd run vapid
```

Copia `publicKey` en `VAPID_PUBLIC_KEY` y `privateKey` en `VAPID_PRIVATE_KEY`. No compartas `.env`, la clave privada ni el secreto JWT. `.env.example` no contiene claves válidas ni credenciales privadas. Mantén las claves VAPID estables: si las cambias, desactiva y vuelve a activar las suscripciones en cada dispositivo.

`APP_URL` documenta la dirección prevista del despliegue; el frontend y los enlaces de notificación usan el mismo origen que sirve la aplicación. El QR permite introducir explícitamente la dirección pública.

## 3. Iniciar PostgreSQL

Con Docker Desktop abierto y listo:

```powershell
docker compose up -d db
docker compose ps
```

El contenedor publica PostgreSQL solamente en `127.0.0.1:5432`. Los datos se guardan en un volumen. No ejecutes `docker compose down -v` si quieres conservarlos. Cambiar `POSTGRES_PASSWORD` después de crear el volumen no cambia automáticamente la contraseña de la base existente.

Si ya tienes PostgreSQL, crea una base y un usuario propios para este proyecto y ajusta `DATABASE_URL`; no necesitas Docker. El backend crea sus tablas e índices al arrancar mediante SQL idempotente. Para versiones futuras con cambios de esquema se deben agregar migraciones versionadas; `CREATE TABLE IF NOT EXISTS` no modifica tablas existentes.

## 4. Compilar y ejecutar

```powershell
npm.cmd run build
npm.cmd start
```

Abre http://localhost:3000 (o el puerto configurado). NestJS sirve el frontend compilado y `/api` desde el mismo origen: no necesitas configurar CORS.

El comando `build` utiliza Webpack de Angular para evitar las restricciones observadas con el binario esbuild en esta sesión de Windows. También puedes ejecutar sus pasos por separado:

```powershell
npm.cmd run build -w backend
npm.cmd run build:compat -w frontend
npm.cmd start
```

Este build hace compilación AOT sin minificar y genera `frontend/dist/browser`. Los archivos son mayores. Para producción, en un entorno que permita ejecutar esbuild normalmente, usa `npm.cmd run build:optimized` (Angular application builder con optimización); el Dockerfile usa ese comando. No exige desactivar protecciones del sistema.

Para editar el frontend con recarga automática:

```powershell
npm.cmd run dev
```

Abre http://localhost:4200 . El proxy apunta al backend en 3000; ajusta `frontend/proxy.json` si cambiaste el puerto. `start:dev` compila el backend y observa su salida JavaScript. Después de editar TypeScript del backend, vuelve a ejecutar `npm.cmd run build -w backend` en otra terminal. Para comprobar la PWA usa la aplicación compilada servida por NestJS.

### Prueba rápida sin PostgreSQL

Después de compilar, puedes ejecutar:

```powershell
powershell -NoProfile -File scripts/start-demo.ps1
```

Abre http://localhost:4317 . Este modo usa **pg-mem**, con un aviso visible en pantalla: pierde todos los datos al reiniciar y está prohibido con `NODE_ENV=production`. No sustituye la validación con PostgreSQL real. El secreto de sesión se genera en memoria para cada ejecución. Si tu política de PowerShell impide el script, ejecuta sus comandos manualmente en la terminal sin cambiar la política global.

## 5. Probar desde la computadora, paso a paso

1. Arranca la aplicación y abre su dirección local.
2. Pulsa **Crear cuenta**. Usa un nombre, correo de prueba y contraseña de al menos 10 caracteres. No hay correo de confirmación ni recuperación de contraseña en esta versión.
3. En **Mi perfil**, configura por ejemplo una meta de 2.000 ml y guarda.
4. Registra 250 ml: verás 12% y botella roja. Registra otros 250 ml: 25%, naranja. Otros 500 ml: 50%, amarillo. Otros 500 ml: 75%, verde. Otros 500 ml: 100%, azul.
5. Prueba 600 ml y una cantidad personalizada. Puedes eliminar registros erróneos.
6. Abre **Historial** y alterna 7 y 30 días. Los días sin registros muestran cero. La línea corresponde a la meta actual, no a metas históricas. Las fechas se agrupan en la zona del perfil; las horas del detalle usan la zona del dispositivo. Se recuperan hasta 10.000 registros recientes.
7. Mira **Recompensas**: los puntos se calculan con registros reales (10 puntos por cada 250 ml acumulados en el día, máximo 100 puntos/día), con catálogo de demostración. Eliminar consumos recalcula los puntos.
8. Cierra sesión y entra de nuevo para comprobar persistencia. Registra una segunda cuenta y comprueba que sus consumos no incluyen los de la primera.
9. Si tienes VAPID configurado, entra en **Recordatorios**, activa notificaciones, acepta el permiso y pulsa **Probar envío real**. Confirma visualmente que recibiste el aviso; una respuesta «aceptado» del proveedor no basta para confirmar recepción.
10. Activa los avisos de agua y configura un horario y frecuencia. La comprobación se ejecuta al segundo 0 de cada minuto. El agua se recuerda únicamente si el consumo registrado está por debajo del avance proporcional de la meta. Al inicio del horario se esperan 0 ml, por lo que no hay aviso inmediato. Para probar, configura una ventana que ya haya comenzado y espera al próximo intervalo con un consumo inferior al previsto.
11. Cierra la pestaña, deja el backend encendido y espera al horario configurado. Verifica el aviso. Cerrar la página y forzar la detención del navegador o del sistema no son equivalentes.

Cerrar sesión desactiva primero la suscripción de **ese dispositivo** para evitar avisos vinculados a una cuenta anterior en navegadores compartidos. «Desactivar» elimina la suscripción local y de la base. Los interruptores de agua y pausas son independientes y afectan a la cuenta en todos sus dispositivos. Los envíos de prueba son manuales y no dependen del horario.

## 6. Probar desde el celular

### Ver la interfaz en la red local

1. Conecta computadora y teléfono a la misma Wi-Fi.
2. Obtén la IPv4 de la computadora con `ipconfig`.
3. Mantén NestJS encendido: escucha en `0.0.0.0`.
4. En el teléfono abre `http://TU-IP:3000` o `http://TU-IP:4317`.
5. Si Windows pregunta por firewall, permite el acceso solo en tu red privada de confianza. No hace falta exponer PostgreSQL ni abrir el router.
6. Registra consumos y revisa el diseño móvil. Puedes introducir esa dirección en **Mi perfil → QR** y escanear el QR desde la botella.

**La IP local por HTTP sirve para revisar la interfaz, pero no habilita Web Push ni la instalación PWA completa.** `localhost` en el QR del teléfono apunta al propio teléfono.

### Web Push móvil con HTTPS

1. Publica la aplicación en un servidor Node con PostgreSQL y HTTPS, o utiliza un túnel HTTPS de confianza hacia el puerto local. La URL debe tener certificado válido y alcanzar frontend, `/api`, `/sw.js` y manifest desde el mismo origen.
2. No desactives la validación de certificados. El backend debe seguir encendido mientras pruebas; en un túnel también la computadora y el túnel.
3. Configura VAPID y `APP_URL` con tu URL HTTPS; reinicia el backend. En producción utiliza `NODE_ENV=production` y `DB_MEMORY=false`.
4. Abre la URL en el teléfono, crea una cuenta o inicia sesión y genera un QR con esa misma URL si lo necesitas.
5. En Android usa Chrome u otro navegador compatible. En iPhone/iPad usa iOS/iPadOS 16.4 o posterior: abre en Safari, toca **Compartir → Agregar a pantalla de inicio**, y abre la aplicación desde el icono instalado. Entonces toca **Activar notificaciones**. El permiso se solicita mediante una acción explícita.
6. Permite los avisos y pulsa **Probar envío real**. Comprueba visualmente la recepción.
7. Configura un inicio próximo y una ventana horaria activa; guarda, cierra la web y espera. Comprueba la recepción con la aplicación cerrada y también con pantalla bloqueada.
8. Prueba **Desactivar** y verifica que ese dispositivo ya no recibe avisos. Prueba apagar el interruptor automático y verifica que no se generan avisos programados nuevos.

Los modos de concentración, permisos revocados, ahorro de batería, conectividad, políticas del sistema y cierres forzados pueden retrasar o impedir los avisos. No se garantiza una hora exacta de entrega. La notificación caduca a los 300 segundos para evitar avisos antiguos. Si se deniega el permiso, restablécelo desde los ajustes del navegador/sistema; no se puede forzar desde JavaScript.

Documentación oficial de compatibilidad: [Web Push en iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) y [Apple: envío de Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

## 7. Administración

Registra primero tu cuenta y, desde la carpeta raíz y con PostgreSQL configurado, ejecuta:

```powershell
node scripts/make-admin.mjs tu-correo@ejemplo.com
```

Vuelve a iniciar sesión. Aparecerá **Administración**: listado de usuarios, metas, preferencias de recordatorios, cantidad de consumos y suscripciones, y estados del planificador. El backend comprueba el rol en la base en cada petición; ocultar el menú no es la protección. No existe contraseña maestra ni ruta pública de promoción de administradores. El panel de esta versión es de consulta.

## 8. Cómo funcionan las notificaciones

- `sw.js` escucha el evento `push` y usa `showNotification`. El clic enfoca o abre la plataforma. No se utilizan avisos simulados con temporizadores en la página.
- El frontend llama a Push API, obtiene `endpoint`, `p256dh` y `auth`, y los envía a la API autenticada. La clave privada VAPID solo se usa en el servidor.
- PostgreSQL guarda varias suscripciones por usuario. Un endpoint no se puede transferir silenciosamente a otra cuenta.
- Nest Schedule ejecuta el planificador cada minuto, usa la zona IANA del usuario y compara la hora con los intervalos guardados. La ventana debe estar dentro del mismo día.
- Los avisos de agua comparan lo registrado con `meta × fracción transcurrida del horario`, redondeado hacia abajo a ml enteros. Se omiten si el usuario va al ritmo previsto, está por encima o completó la meta. Una clave única `(user_id, slot)` evita reclamar el mismo recordatorio desde varias instancias.
- Las pausas activas se pueden activar por separado: exactamente dos horas diarias, inicialmente 10:00 y 16:00, ajustables en la zona horaria del perfil. Cada una propone cinco minutos de caminata y movimientos suaves. No dependen del avance del agua. Si coinciden con un aviso de agua, ambos se combinan en una notificación. El sistema no mide actividad física ni confirma que la pausa se realizó.
- Los errores 404/410 eliminan suscripciones caducadas. Los errores restantes se registran sin imprimir endpoints ni claves.
- Se aceptan endpoints HTTPS de FCM, Mozilla, Apple y Windows; otros proveedores necesitan revisión y ampliar la lista permitida para evitar SSRF.
- La semántica del planificador es **como máximo un intento por intervalo**: registra `claimed`, después `accepted` o `failed`. Una caída después de reclamar puede dejar `claimed`. No hay reintentos ni recuperación de intervalos perdidos; iniciar el servidor tarde no envía avisos retroactivos. No es una cola de entrega garantizada.
- La tabla de entregas necesita una política de retención para despliegues prolongados. Conviene agregar cola, monitorización, copias de seguridad y migraciones antes de una operación a gran escala.

## 9. Organización

```text
frontend/src/app/     Componente principal, servicio API, botella animada, gráfico
frontend/public/      Service Worker, manifest e iconos PWA
backend/src/          Módulos de base de datos, autenticación, hábitos y notificaciones
backend/test/         Pruebas de umbrales, zona horaria y planificador
scripts/              Prueba HTTP, modo temporal y promoción administrativa
compose.yaml          PostgreSQL persistente
Dockerfile            Build y ejecución Linux con Node 24
Caddyfile.example     Ejemplo de proxy HTTPS
.env.example          Variables sin secretos válidos
```

Contraseñas con bcrypt, JWT de 12 horas, validación estricta de DTO, SQL parametrizado, aislamiento por usuario, límites de peticiones (90/minuto/IP) y Helmet. El token se guarda en `sessionStorage` de la pestaña. No hay formularios de pago ni integración con sensores de una botella física: cada consumo se registra manualmente y el QR abre la web.

## 10. Comprobaciones automatizadas

```powershell
npm.cmd test
```

Para la prueba HTTP, arranca una instancia temporal en 4317 en otra terminal; después:

```powershell
node scripts/smoke.mjs
```

La prueba HTTP solo acepta localhost y exige `storage=temporary`, para no crear datos en producción. Genera dos usuarios de prueba y registros temporales. Comprueba autenticación, validación, aislamiento, metas, autorización y archivos PWA. El planificador se prueba con proveedor push sustituido por un doble de prueba: eso **no confirma recepción en teléfonos**.

Consulta `VERIFICACION.md` para los resultados observados y límites de este entorno. La validación física Android/iPhone y la validación con PostgreSQL persistente deben completarse donde esos recursos estén disponibles.

## 11. Producción con HTTPS

El Dockerfile construye ambos proyectos y sirve Angular desde NestJS. Puedes construir `docker build -t h3o-smart .` y ejecutar la imagen con `--env-file .env`, vinculando `127.0.0.1:3000:3000` detrás de Caddy/Nginx. Desde un contenedor, `localhost` no apunta a la base del host: usa una red Docker con nombre de servicio `db`, una base administrada o `host.docker.internal` según tu instalación. Configura TLS de PostgreSQL según tu proveedor sin desactivar validación de certificados.

El archivo Caddy de ejemplo automatiza HTTPS para un dominio cuyo DNS apunte a tu servidor. Caddy requiere acceso a los puertos 80/443 y una configuración del servidor adecuada. Mantén PostgreSQL en red privada, guarda secretos fuera del repositorio, conserva el volumen, configura backups y ejecuta el backend como servicio con reinicio automático. Si sitúas un proxy delante, configura `trust proxy` de Express solo para el proxy concreto y ajusta el rate limiting: de lo contrario todos los visitantes pueden compartir el límite de la IP del proxy.

La app no se ha publicado automáticamente: la plataforma Sites no aloja directamente este conjunto NestJS/PostgreSQL, y no se han proporcionado servidor, dominio ni credenciales de despliegue.
