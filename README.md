# Landing personal de saxofonista

Landing estática lista para publicar en GitHub Pages.

## Personalización rápida

1. Rellena tus datos, textos, email y enlaces en `contenido.js`.
2. Edita las traducciones dentro de `idiomas.es`, `idiomas.en` e `idiomas.fr`.
3. Mantén la foto principal en `assets/hero-personal.png` o sustitúyela por otra con el mismo nombre.
4. Publica el repositorio en GitHub Pages usando la rama principal y la carpeta raíz.

## Medicion de trafico y SEO

La web incluye `analytics.js`, un cargador comun para Google Analytics 4. Mientras el ID sea `G-XXXXXXXXXX`, no se carga nada.

1. Crea una propiedad en Google Analytics 4.
2. Entra en Flujo de datos > Web y copia el ID de medicion, con formato `G-XXXXXXXXXX`.
3. Abre `analytics.js` y sustituye `G-XXXXXXXXXX` por tu ID real.
4. Publica los cambios en GitHub Pages.
5. Entra en Google Analytics > Informes > Adquisicion > Adquisicion de trafico para ver si las visitas vienen de Google, Instagram, enlaces directos, etc.
6. Entra en Google Search Console, registra `https://delalama.github.io/landing_sax/` y verifica la propiedad usando Google Analytics.
7. En Search Console, envia `https://delalama.github.io/landing_sax/sitemap.xml`.

Notas:
- La medicion empieza desde el momento en que publicas el ID real; no recupera visitas anteriores.
- El script solo carga Analytics si el visitante acepta el aviso de analitica.
- Ademas de paginas vistas, se envia el evento `lead_click` cuando alguien pulsa enlaces de WhatsApp, email, telefono, Instagram o YouTube.
