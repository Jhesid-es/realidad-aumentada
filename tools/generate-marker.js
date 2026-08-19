// Generador de marcador AR personalizado para AR.js
// Produce:
//   - marker.patt  (patrón en formato AR.js: 4 orientaciones x 3 canales BGR x 16x16)
//   - marker.png   (marcador imprimible: margen blanco + borde negro + símbolo)
//
// Uso:  node tools/generate-marker.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Diseño del símbolo: matriz 16x16 (true = negro, false = blanco)
//    "Gema" = diamante concéntrico + marca asimétrica abajo-derecha.
// ---------------------------------------------------------------------------
function buildSymbol() {
  const grid = [];
  for (let y = 0; y < 16; y++) {
    const row = [];
    for (let x = 0; x < 16; x++) {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      let black = false;
      if (d <= 6.5) {
        // anillo blanco entre diamante exterior y núcleo
        if (d <= 4.5 && d > 2.5) {
          black = false;
        } else {
          black = true; // diamante exterior + núcleo
        }
      }
      // asimetría: cúmulo de bloques en la esquina inferior-derecha
      if (x >= 11 && y >= 11 && x + y >= 27 && d > 6.5) {
        black = true;
      }
      row.push(black);
    }
    grid.push(row);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// 2. Formato .patt de AR.js (mismo que pattern-hiro.patt del repo oficial)
//    Sin cabecera. 4 orientaciones (0, -90, -180, -270). Por orientación:
//    3 canales en orden BGR, cada canal 16x16 valores 0-255 rellenados a 3.
// ---------------------------------------------------------------------------
function gridToPatt(grid) {
  const SIZE = 16;
  let out = '';
  let first = true;

  const rotate = (g, quarterTurns) => {
    let r = g;
    for (let i = 0; i < quarterTurns; i++) {
      const n = [];
      for (let y = 0; y < SIZE; y++) {
        const row = [];
        for (let x = 0; x < SIZE; x++) {
          row.push(r[SIZE - 1 - x][y]);
        }
        n.push(row);
      }
      r = n;
    }
    return r;
  };

  for (let orientation = 0; orientation < 4; orientation++) {
    const rotated = rotate(grid, orientation);
    if (!first) out += '\n';
    first = false;
    // canales en orden BGR (azul, verde, rojo) -> mismo valor (escala de grises)
    for (let channel = 0; channel < 3; channel++) {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (x !== 0) out += ' ';
          const value = rotated[y][x] ? 0 : 255;
          out += String(value).padStart(3);
        }
        out += '\n';
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. PNG en escala de grises sin dependencias (zlib + CRC32 a mano)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodeGrayPng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // color type: grayscale
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width);
    raw[rowStart] = 0; // filtro none
    for (let x = 0; x < width; x++) {
      raw[rowStart + 1 + x] = pixels[y][x];
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 4. Marcador imprimible (mismo layout que buildFullMarker de AR.js:
//    margen blanco 10%, borde negro 10-30%, símbolo 30-70%)
// ---------------------------------------------------------------------------
function buildMarkerPixels(grid, size) {
  const W = size;
  const H = size;
  const whiteMargin = 0.1;
  const blackMargin = (1 - 2 * whiteMargin) * ((1 - 0.5) / 2); // 0.2
  const innerStart = whiteMargin + blackMargin; // 0.3

  const px = [];
  for (let y = 0; y < H; y++) {
    const row = new Uint8Array(W);
    for (let x = 0; x < W; x++) {
      const nx = x / W;
      const ny = y / H;
      let v = 255; // blanco
      if (nx >= whiteMargin && nx < 1 - whiteMargin && ny >= whiteMargin && ny < 1 - whiteMargin) {
        v = 0; // borde negro
      }
      if (nx >= innerStart && nx < 1 - innerStart && ny >= innerStart && ny < 1 - innerStart) {
        const gx = Math.min(15, Math.floor(((nx - innerStart) / (1 - 2 * innerStart)) * 16));
        const gy = Math.min(15, Math.floor(((ny - innerStart) / (1 - 2 * innerStart)) * 16));
        v = grid[gy][gx] ? 0 : 255;
      }
      row[x] = v;
    }
    px.push(row);
  }
  return px;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const grid = buildSymbol();

// vista previa ASCII
console.log('Símbolo 16x16 (X = negro):');
for (const row of grid) {
  console.log(row.map((b) => (b ? 'X' : '.')).join(''));
}

const patt = gridToPatt(grid);
fs.writeFileSync(path.join(ROOT, 'marker.patt'), patt, 'utf8');
console.log('\nmarker.patt generado (' + patt.length + ' bytes)');

// pattern-data.js: patrón embebido en base64 para evitar el CORS/XHR.
// La página lo usa como data: URI; marker.patt queda como respaldo/referencia.
const b64 = Buffer.from(patt, 'utf8').toString('base64');
const patternDataJs =
  '// Generado por tools/generate-marker.js - NO EDITAR A MANO\n' +
  '// Patr\u00f3n del marcador en base64 (data: URI) para evitar CORS.\n' +
  'window.PATRON_MARCADOR_BASE64 = \'' + b64 + '\';\n';
fs.writeFileSync(path.join(ROOT, 'pattern-data.js'), patternDataJs, 'utf8');
console.log('pattern-data.js generado (' + patternDataJs.length + ' bytes)');

const pngSize = 1024;
const png = encodeGrayPng(pngSize, pngSize, buildMarkerPixels(grid, pngSize));
fs.writeFileSync(path.join(ROOT, 'marker.png'), png);
console.log('marker.png generado (' + png.length + ' bytes, ' + pngSize + 'x' + pngSize + ')');