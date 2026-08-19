# AR — Modelo 3D con marcador personalizado (AR.js)

Página web de realidad aumentada lista para publicar en **GitHub Pages**.
Al escanear el **marcador personalizado** (`marker.png`) con la cámara del
celular, se muestra el modelo 3D (`modelo.glb`).

## Archivos

```
RA/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml  # Publica en GitHub Pages automáticamente
├── index.html        # Página AR (cámara + marcador + modelo 3D)
├── modelo.glb        # Tu modelo 3D (reemplázalo por el tuyo)
├── marker.png        # MARCADOR PARA IMPRIMIR / ESCANEAR
├── marker.patt       # Patrón del marcador (respaldo / referencia)
├── pattern-data.js   # Patrón embebido en base64 (lo usa la página en vez del .patt)
└── tools/
    └── generate-marker.js  # Script que regenera marker.patt, marker.png y pattern-data.js
```

## Cómo publicar en GitHub Pages

### Opción A — Con workflow (recomendado)

El repositorio ya incluye `.github/workflows/deploy-pages.yml`, que publica el
sitio automáticamente con cada `push` a `main`/`master` (y regenera el marcador).

1. Sube esta carpeta a un repositorio de GitHub.
2. En el repositorio ve a **Settings → Pages**.
3. En **Source** elige **GitHub Actions**.
4. Sube un cambio a la rama principal (o ve a **Actions** y ejecuta
   *"Deploy a GitHub Pages"* manualmente con **Run workflow**).
5. GitHub te dará una URL tipo
   `https://tu-usuario.github.io/nombre-del-repo/`.
6. Abre esa URL en el **celular** (debe abrirse en **HTTPS**, requisito de la cámara).

### Opción B — Sin workflow (rama)

1. En **Settings → Pages** elige **Source → Deploy from a branch**.
2. Selecciona la rama `main` (o `master`) con la carpeta `/` (root).
3. Guarda. GitHub te dará una URL tipo
   `https://tu-usuario.github.io/nombre-del-repo/`.
4. Abre esa URL en el **celular** (HTTPS).

> En la Opción B el `pattern-data.js` ya está generado en el repo, así que la
> página funciona igual; solo no se regenera automáticamente con cada push.

## Cómo usarla

1. Imprime **`marker.png`** (a tamaño real, sin deformar) o muéstralo en otra
   pantalla.
2. Abre la URL de GitHub Pages en el celular.
3. Toca **"📷 Iniciar cámara"** y acepta el permiso de cámara.
4. Apunta la cámara al marcador. Cuando lo detecte, aparecerá el modelo 3D encima.

## Probarlo en tu PC (antes de publicar)

La cámara y el modelo 3D **no funcionan abriendo `index.html` con doble clic**
(protocolo `file://`): el navegador bloquea esas peticiones y verás errores de
**CORS** en `modelo.glb` y `marker.patt`. Usa un servidor local:

```bash
npx serve .
```

y entra a `http://localhost:3000`. Ojo: el permiso de cámara solo funciona en
**HTTPS** o `localhost` (localhost está permitido).

> La página ya incluye el patrón del marcador embebido (`pattern-data.js`),
> por lo que el `marker.patt` ya no se descarga por red; el único archivo que
> sí requiere HTTP(S) es `modelo.glb`. En GitHub Pages ambos funcionan sin
> problemas por ser el mismo origen.

## Cambiar el modelo 3D

Reemplaza `modelo.glb` por tu archivo (GLB/GLTF). El modelo se centra y se
ajusta automáticamente sobre el marcador. Si aparece girado, edita en
`index.html` la constante:

```js
var MODELO_ROTACION = { x: 0, y: 0, z: 0 };
```

> **Nota:** `modelo.glb` pesa ~44 MB, lo que hace lenta la carga. Se recomienda
> comprimirlo (con Blender o `gltf-transform`) a menos de 10 MB para una mejor
> experiencia.

## Crear tu propio símbolo / marcador

Edita la función `buildSymbol()` en `tools/generate-marker.js` (matriz de 16×16,
`true` = negro) y regenera con:

```bash
node tools/generate-marker.js
```

Esto genera `marker.patt` (patrón), `pattern-data.js` (patrón embebido en
base64 que usa la página) y `marker.png` (el marcador imprimible). El símbolo
debe ser simple y de alto contraste: evita detalles finos, ya que se muestrea
a 16×16.

## Solución de problemas

- **CORS en `modelo.glb` o `marker.patt`**: la página se está abriendo con
  doble clic (`file://`) o en una vista previa de otro dominio. Publica en
  GitHub Pages o usa un servidor local. En GitHub Pages no hay CORS porque
  todo se sirve desde el mismo origen.
- **"No se pudo acceder a la cámara"**: el sitio debe estar en HTTPS o
  localhost. Revisa los permisos de cámara del navegador para el sitio.
- **iOS (iPhone)**: usa el botón "Iniciar cámara" (el permiso requiere un toque).
  Safari exige que el sitio sea HTTPS.
- **No detecta el marcador**: imprime `marker.png` con buena luz y sin
  reflejos; mantén la cámara enfocada y a una distancia de ~20-50 cm.

## Tecnología

- [A-Frame](https://aframe.io/) (1.6.0)
- [AR.js](https://github.com/AR-js-org/AR.js) (3.4.8) — marcadores
  (pattern-based) en el navegador."# realidad-aumentada" 
# realidad-aumentada
