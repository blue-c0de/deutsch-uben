# Karteikasten

Web para practicar alemán con tu propio vocabulario: tarjetas con repaso espaciado (cajas Leitner),
tests de opción múltiple, ejercicios de escritura, buscador de palabras y gramática (Aktiv/Passiv y Deklination).
Funciona en el móvil y en el ordenador, y no necesita servidor.

El vocabulario sale del Excel `data/Vocabulario_Aleman_Unificado.xlsx`.

## Usarla en tu ordenador

Necesitas [Node.js](https://nodejs.org) 20.19 o superior (recomendado 22).

```bash
npm install
npm start
```

Abre http://localhost:4200.

## Cambiar o ampliar el vocabulario

1. Edita la hoja `Vocabulario` de `data/Vocabulario_Aleman_Unificado.xlsx`.
   Mantén la fila 1 con los nombres de columna y un `id` único en cada fila (hoja `LEEME` del Excel explica las columnas).
2. Ejecuta `npm run datos`. Esto regenera los JSON de `public/data/`.
3. Comprueba el resultado con `npm start`.

Si publicas con GitHub Actions (ver abajo), el paso 2 se hace solo: basta con subir el Excel.

## Publicarla en GitHub Pages

1. Crea un repositorio en GitHub (el nombre que quieras) y sube este proyecto:

   ```bash
   git init
   git add .
   git commit -m "Primera versión"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

2. En GitHub entra en **Settings → Pages**, y en **Build and deployment → Source** elige **GitHub Actions**.
3. Abre la pestaña **Actions** y espera a que termine «Publicar en GitHub Pages» (1 o 2 minutos).
4. Tu web estará en `https://TU_USUARIO.github.io/TU_REPOSITORIO/`.

Cada vez que hagas `git push` a `main`, la web se actualiza sola.

## Cosas que conviene saber

- **El progreso se guarda en el navegador de cada dispositivo.** Para pasarlo de un dispositivo a otro,
  usa **Exportar progreso** en el inicio y **Importar progreso** en el otro.
- **Instalarla en el móvil:** abre la web en Chrome o Safari y elige «Añadir a la pantalla de inicio».
- **Pronunciación:** usa las voces alemanas del dispositivo. Si no suena, instala una voz alemana en los ajustes del sistema.
- Las rutas usan `#` (por ejemplo `/#/tarjetas`) para que la web funcione en GitHub Pages sin configuración extra.

## Estructura

```
data/                  Excel con el vocabulario (fuente de verdad)
scripts/               excel-to-json.mjs: convierte el Excel en JSON
public/data/           JSON que lee la web (se generan con npm run datos)
src/app/services/      datos, progreso (cajas Leitner), ajustes, voz
src/app/pages/         inicio, tarjetas, test, escribir, palabras, gramática
src/app/utils/text.ts  comparación tolerante de respuestas (ä/ae, ß/ss, artículos, erratas)
.github/workflows/     publicación automática en GitHub Pages
```
