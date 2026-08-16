import { deflateRawSync, gzipSync } from 'node:zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

/** Build a zip with top-level folder `dotodo/`. */
export function makeSkillZip(files) {
  const entries = Object.entries(files).map(([rel, text]) => ({
    name: `dotodo/${rel}`,
    data: Buffer.from(text),
  }));
  const parts = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const compressed = deflateRawSync(data);
    const useStore = compressed.length >= data.length;
    const payload = useStore ? data : compressed;
    const method = useStore ? 0 : 8;
    const crc = crc32(data);

    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      payload,
    ]);
    parts.push(local);

    central.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(method),
        u16(0),
        u16(0),
        u32(crc),
        u32(payload.length),
        u32(data.length),
        u16(nameBuf.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBuf,
      ])
    );
    offset += local.length;
  }

  const centralDir = Buffer.concat(central);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...parts, centralDir, end]);
}

/** Minimal ustar + gzip with path prefix like GitHub archives. */
export function makeSkillTarball(files, prefix = 'skills-main/skills/dotodo') {
  const chunks = [];
  for (const [rel, text] of Object.entries(files)) {
    const data = Buffer.from(text);
    const name = `${prefix}/${rel}`;
    const header = Buffer.alloc(512);
    Buffer.from(name).copy(header, 0);
    header.write('0000644\0', 100, 'utf8');
    header.write('0000000\0', 108, 'utf8');
    header.write('0000000\0', 116, 'utf8');
    const sizeOct = data.length.toString(8).padStart(11, '0');
    header.write(`${sizeOct}\0`, 124, 'utf8');
    header.write('00000000000\0', 136, 'utf8');
    header.write('        ', 148, 'utf8');
    header[156] = 48; // '0' file
    header.write('ustar\0', 257, 'utf8');
    header.write('00', 263, 'utf8');
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += header[i];
    header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 'utf8');
    chunks.push(header);
    const pad = Math.ceil(data.length / 512) * 512;
    const block = Buffer.alloc(pad);
    data.copy(block);
    chunks.push(block);
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks));
}
