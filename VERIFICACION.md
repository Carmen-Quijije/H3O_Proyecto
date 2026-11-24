# Verificación realizada

## Actualización del 24 de noviembre de 2026: metas y pausas activas

- Backend compilado; `npm test`: 13 pruebas aprobadas, 0 fallos.
- Frontend compilado con `npm run build:compat -w frontend`.
- `scripts/smoke.mjs`: 36 comprobaciones HTTP aprobadas con base temporal, incluidas persistencia de dos horas de pausa y validación de preferencias inválidas.
- Avisos de agua probados por debajo, exactamente al nivel y por encima del avance proporcional; sin aviso al inicio del horario ni fuera de él.
- Dos pausas programadas por día local, independientes del consumo de agua; propuestas de cinco minutos; comprobación de duplicados y combinación con aviso de agua coincidente mediante dobles de prueba.
- Migración aditiva probada en PostgreSQL real dentro de una transacción revertida: conserva el número de usuarios. La base publicada no se alteró en esta comprobación.
- Navegador local: ambos interruptores, guardado de 10:30/16:30 y persistencia tras recargar comprobados. Captura incluida como evidencia de la versión local.
- Los campos nuevos se añaden al arrancar el backend actualizado (`active_breaks`, `break_first_min`, `break_second_min`), sin borrar datos. Las pausas empiezan desactivadas y con horarios iniciales 10:00/16:00.
- Pendientes: publicación de esta actualización en Render y verificación de recepción física de sus notificaciones. No se enviaron Web Push reales en estas pruebas.

---

Fecha local: 23 de noviembre de 2026, America/Guayaquil.

## Resultados observados

| Comprobación | Resultado |
| --- | --- |
| Instalación de dependencias npm | Correcta; se incluye package-lock.json |
| `npm run build` completo | Correcto: TypeScript de NestJS y Angular AOT con Webpack |
| `npm test` | 7 pruebas aprobadas, 0 fallos |
| `node scripts/smoke.mjs` | 31 comprobaciones HTTP aprobadas |
| Sintaxis de Service Worker | `node --check frontend/public/sw.js` sin errores |
| Navegador de escritorio | Registro, sesión, dashboard, consumo de 500 ml, historial de 7/30 días, perfil y cambio de meta observados |
| Diseño móvil | Inspección visual con viewport 390 × 844; no equivale a un dispositivo físico |
| Diseño de escritorio | Inspección con viewport 1280 × 900 y captura completa del dashboard |
| QR | Generación mostrada en presentación y perfil; escaneo físico pendiente |

La API se ejecutó con NestJS en `http://localhost:4317` y el adaptador temporal pg-mem. El puerto 3000 fue rechazado por el entorno; 4317 funcionó. No se modificaron otros proyectos.

Las comprobaciones HTTP verificaron registro/login, duplicación de correo, rechazo de contraseñas incorrectas, validación de cantidades y campos extra, separación de consumos entre cuentas, protección frente a borrado por otra cuenta, guardado de metas y horarios, rechazo de zona/ventana inválidas, rechazo de administración sin rol, puntos y disponibilidad de manifest, Service Worker e iconos.

Las siete pruebas verificaron los límites exactos de los cinco colores, conversión de fecha local y horarios, un único envío por intervalo, omisión al completar la meta, limpieza de endpoints expirados, rechazo de destinos ajenos a proveedores permitidos y autorización del panel administrativo. Los envíos en estas pruebas utilizaron dobles de prueba: no se enviaron avisos reales a teléfonos.

## Errores corregidos

- Se corrigió una llamada a un getter en la plantilla Angular.
- Se corrigió el orden/alcance del fallback SPA que interceptaba las rutas API.
- Se ajustó la ubicación de Bootstrap en el workspace npm.
- Se incluyó un build Angular con Webpack que evita la restricción de lectura del binario nativo esbuild en esta sesión.
- Se añadieron iconos PNG de 192/512 px para el manifest y pantalla de inicio.
- Se corrigió el retorno al historial semanal al volver al dashboard y el desplazamiento al cambiar de sección.

## Pendiente de validar fuera de esta sesión

- **PostgreSQL real y persistencia tras reinicio:** Docker estaba instalado pero su API/named pipe no era accesible en la sesión. Se incluye configuración PostgreSQL, pero las pruebas se ejecutaron con pg-mem. Ejecutar los pasos del README con PostgreSQL antes de usar datos importantes.
- **Web Push físico en Android y iPhone:** no había un teléfono de prueba, permisos móviles, origen HTTPS desplegado ni suscripciones físicas. El código integra Web Push real, pero no se afirma recepción real en esos dispositivos.
- **Envío VAPID a un proveedor real:** no se suministraron claves privadas ni suscripciones; la aceptación HTTP del proveedor y la recepción en dispositivo deben verificarse siguiendo el README.
- **Instalación PWA y apertura offline en teléfono:** pendientes; el Service Worker cachea el shell y assets públicos, no respuestas de API ni escrituras offline.
- **Build optimizado y Dockerfile:** se proporcionan, pero no pudieron ejecutarse aquí. `build:optimized` falla por acceso denegado del binario esbuild; `build` con Webpack sí pasó. No se construyó una imagen Docker ni se publicó una URL de producción.
- **Pruebas de carga, recuperación ante caídas y servicios de producción:** no realizadas. El planificador usa un intento por intervalo y no reenvía recordatorios perdidos durante una caída.

El build verificado sin minificar pesa aproximadamente 2,77 MB inicialmente. La advertencia de CommonJS de `qrcode` es informativa y no impidió compilar o mostrar el QR. La instalación informó de scripts opcionales nativos bloqueados por la configuración de npm del entorno; el build Webpack y las pruebas indicadas finalizaron correctamente.

Consulta README.md para las pruebas desde Windows, Android/iPhone y el proceso de HTTPS. La captura de pantalla incluida refleja datos temporales de una cuenta de prueba, no información de una persona real.
