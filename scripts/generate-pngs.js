import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(crcData), 8 + len);
  return buf;
}

function generatePNG(width, height, isMaskable = false) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter type 0 byte at start of each scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.38 : 0.44);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base background: Dark navy/slate #020617
      let r = 2;
      let g = 6;
      let b = 23;
      let a = 255;

      // Outer border circle / squircle
      if (!isMaskable && dist > radius && dist < radius + width * 0.02) {
        r = 16;
        g = 185;
        b = 129;
      }

      // Emerald central circle / logo mark
      if (dist <= radius) {
        // Subtle emerald glow gradient towards center
        const factor = 1 - (dist / radius);
        r = Math.floor(2 + factor * 20);
        g = Math.floor(18 + factor * 70);
        b = Math.floor(28 + factor * 40);

        // Render Stylized "A" in the center
        const nx = (x - cx) / (width * 0.35); // -1 to 1
        const ny = (y - cy) / (height * 0.35); // -1 to 1

        // Triangle shape of "A"
        const inAOutline = (ny > -0.7 && ny < 0.6 && Math.abs(nx) < (ny + 0.8) * 0.55);
        const inAHole = (ny > -0.2 && ny < 0.25 && Math.abs(nx) < (ny + 0.4) * 0.35);
        const inACrossbar = (ny >= 0.1 && ny <= 0.25 && Math.abs(nx) < (ny + 0.8) * 0.55);

        if (inAOutline && (!inAHole || inACrossbar)) {
          // Vibrant Emerald #10b981 to Mint #34d399
          r = 16 + Math.floor((1 - ny) * 18);
          g = 185 + Math.floor((1 - ny) * 35);
          b = 129 + Math.floor((1 - ny) * 20);
        }

        // Purple accent curved swoosh in corner
        const swooshDist = Math.sqrt((dx - width * 0.2) ** 2 + (dy + height * 0.15) ** 2);
        if (swooshDist > width * 0.18 && swooshDist < width * 0.24 && dx > 0 && dy < 0) {
          r = 168; // #a855f7
          g = 85;
          b = 247;
        }
      }

      rawData[pxOffset] = Math.min(255, Math.max(0, r));
      rawData[pxOffset + 1] = Math.min(255, Math.max(0, g));
      rawData[pxOffset + 2] = Math.min(255, Math.max(0, b));
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePNG(192, 192, false));
console.log('Created public/pwa-192x192.png');

// Generate 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePNG(512, 512, false));
console.log('Created public/pwa-512x512.png');

// Generate 512x512 maskable (with safe zone padding)
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePNG(512, 512, true));
console.log('Created public/pwa-maskable-512x512.png');

// Generate 180x180 apple touch icon
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePNG(180, 180, false));
console.log('Created public/apple-touch-icon.png');

// Generate favicon (64x64 PNG used as favicon)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePNG(64, 64, false));
console.log('Created public/favicon.ico');
