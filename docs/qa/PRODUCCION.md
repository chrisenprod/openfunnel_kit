# Verificación de publicación — 2026-09-24

App: https://app.openfunnel.mocca.cl. Código integrado en main mediante PR #2;
primera release basada en `60b0cbf`, con CI aprobado. El archivo `RELEASE` del
servidor identifica la revisión operativa actual.

- Se construyeron web/API en el VPS y se restauró el snapshot consistente de la
  instalación detenida. Integridad/FK correctas y conteos coincidentes; los estados
  de canales, agente y datos se conservaron. Sesiones anteriores revocadas.
- Firewall específico persistente: probados tráfico directo, puerto de host y
  paquete externo destinado a loopback; los contadores de DROP confirman las
  reglas ejercitadas. Acceso local y HTTPS permitido. Puerto interno bloqueado
  desde un equipo externo; otros contenedores conservaron sus procesos.
- HTTPS válido, salud SQLite 200 y landing 200. Chromium comprobó login/logout,
  canales, escritorio/móvil, CSP sin violaciones, archivos privados 404, API sin
  sesión 401, registro no expuesto y rechazo de logout con Origin ajeno.
- Un único webhook OpenFunnel activo en el origen productivo, verificado con
  Zernio. Retirados backend local, watcher, ngrok y reenvío temporal. Estados IA
  conservados; no se enviaron mensajes sintéticos a personas.
- API Zernio y Chat Completions/tools de Azure/Luna validados desde el VPS.
- Respaldo diario ejecutado e integridad comprobada; restauración de una copia
  real en volumen aislado y copia privada inicial fuera del VPS verificadas.
- Certbot renovó correctamente en dry run; el hook de recarga se comprobó por
  separado (la versión instalada no ejecuta deploy hooks en dry run).
- Release operativa `7cba4a06857a1b2e335af616df7daaf420895d0d`, con volumen externo:
  recreación real de web/API aprobada, nueva identidad del contenedor API,
  integridad/FK correctas, datos y estados IA conservados, salud y respaldo
  posterior correctos. Ningún otro servicio Docker fue reiniciado.

Ubuntu se mantiene pendiente por decisión expresa del usuario. El aislamiento
de red no corrige ese riesgo. Exportación automática de respaldos fuera del VPS
y destinos de alertas aún requieren configuración. No se afirma una prueba nueva
de entrega real de Instagram/WhatsApp ni un reinicio completo del host.

Procedimientos y reversión en [PRODUCCION.md](../deploy/PRODUCCION.md).
