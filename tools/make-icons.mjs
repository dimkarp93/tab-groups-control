import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SOURCE = "icons/icon.svg";
const SIZES = [16, 32, 48, 64, 96, 128];
const SAMPLES = 4;

function parseSvg(text) {
  const view = text.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!view) throw new Error(`${SOURCE}: не найден viewBox вида "0 0 W H"`);
  const rects = [];
  const re = /<rect\b([^>]*)\/>/g;
  let match;
  while ((match = re.exec(text))) {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
    );
    const fill = attrs.fill || "#000000";
    const hex = fill.match(/^#([0-9a-f]{6})$/i);
    if (!hex) throw new Error(`${SOURCE}: поддерживается только fill вида #rrggbb, получено "${fill}"`);
    const rgb = parseInt(hex[1], 16);
    rects.push({
      x: Number(attrs.x || 0),
      y: Number(attrs.y || 0),
      w: Number(attrs.width),
      h: Number(attrs.height),
      rx: Number(attrs.rx || 0),
      r: (rgb >> 16) & 0xff,
      g: (rgb >> 8) & 0xff,
      b: rgb & 0xff,
    });
  }
  if (!rects.length) throw new Error(`${SOURCE}: не найдено ни одного <rect .../>`);
  return { width: Number(view[1]), height: Number(view[2]), rects };
}

function covers(rect, px, py) {
  if (px < rect.x || px > rect.x + rect.w || py < rect.y || py > rect.y + rect.h) return false;
  const rx = Math.min(rect.rx, rect.w / 2, rect.h / 2);
  if (rx <= 0) return true;
  const cx = Math.min(Math.max(px, rect.x + rx), rect.x + rect.w - rx);
  const cy = Math.min(Math.max(py, rect.y + rx), rect.y + rect.h - rx);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rx * rx;
}

function render(svg, size) {
  const scale = svg.width / size;
  const pixels = Buffer.alloc(size * size * 4);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let hits = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        const py = (row + (sy + 0.5) / SAMPLES) * scale;
        for (let sx = 0; sx < SAMPLES; sx++) {
          const px = (col + (sx + 0.5) / SAMPLES) * scale;
          let top = null;
          for (const rect of svg.rects) if (covers(rect, px, py)) top = rect;
          if (!top) continue;
          hits++;
          r += top.r;
          g += top.g;
          b += top.b;
        }
      }
      const offset = (row * size + col) * 4;
      if (!hits) continue;
      pixels[offset] = Math.round(r / hits);
      pixels[offset + 1] = Math.round(g / hits);
      pixels[offset + 2] = Math.round(b / hits);
      pixels[offset + 3] = Math.round((hits / (SAMPLES * SAMPLES)) * 255);
    }
  }
  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let row = 0; row < size; row++) {
    raw[row * (size * 4 + 1)] = 0;
    pixels.copy(raw, row * (size * 4 + 1) + 1, row * size * 4, (row + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const svg = parseSvg(readFileSync(SOURCE, "utf8"));
for (const size of SIZES) {
  const file = `icons/icon-${size}.png`;
  writeFileSync(file, encodePng(render(svg, size), size));
  console.log(`${file} ${size}x${size}`);
}
