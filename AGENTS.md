# Estándar universal de catálogos

- `jenny/index.html` es la referencia de diseño y comportamiento para las páginas principales de las bailarinas.
- Compartir la base visual en `assets/model-catalog-base.css`, la reproducción en `assets/catalog-preview-clock.js`, las fichas en `assets/catalog-card-info.js` y los ajustes en `assets/catalog-responsive.css`. No copiar controladores ni añadir variantes visuales por modelo para el reloj, las tarjetas o sus botones.
- Todas las tarjetas usan formato vertical 9:16, sin estirar la imagen, y muestran duración real del video completo, tanto sobre la portada como al lado del precio en monedas. El reloj de preview es el mismo componente para todos los modelos y limita el adelanto a 10 segundos; nunca limitar el reproductor original ya desbloqueado.
- Los cambios en los componentes comunes se verifican en todas las páginas de modelos, con los cinco idiomas. Solo varían nombre, archivos, cantidades, duración y precio según los datos reales.
- En Lolita los 80 productos completos conservan el orden 01–80. Mostrar precios de videos en monedas, sin equivalente USD en cada tarjeta. Una compra de un original dividido por transporte cubre todas sus partes.
- Las portadas usan fotogramas originales. No deformar, inventar duraciones, inventar pagos históricos ni promover mitades como productos distintos.
- La ruleta es gratuita: cinco resultados, cada uno con 20% de probabilidad (10/25/50/100 tokens o preview aleatorio de 10 segundos). Cinco giros por hora; nunca otorgar acceso al original completo por un preview.
- Publicar solo los archivos del cambio y verificar visualmente la versión publicada antes de afirmar que está lista.

- Las páginas exclusivas viven en `/abbi/`, `/jenny/`, `/lolita/`, `/tainara/`, `/vegan/` y `/camila/`; no incluir ni enlazar `/novinhas/`. Mantener el roster y los estados reales en `assets/twk-models-nav.js` y el tema común en `assets/catalog-responsive.css`.
- Vegan y Camila siguen sin catálogo publicado (0 videos): no mostrar precios, packs ni botones de compra hasta que haya material disponible. El roster de Jenny debe reflejar `functions/_lib/jenny-launch.js`; la pausa temporal fue cerrada y su bandera está desactivada.
- No ampliar las rutas protegidas de previews ni originals. Revisar como visitante sin gastar monedas y no declarar probado el acceso autenticado sin una sesión de prueba autorizada.

- Las fichas de videos de pago aparecen al pasar el mouse o tocar el botón de información. Mover las descripciones existentes allí y no duplicarlas en el pie de la tarjeta. Si no hay descripción editorial, usar solo datos reales del archivo; no inventar contenido ni actos.
