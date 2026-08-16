import { gunzipSync } from 'node:zlib';

/**
 * Extract files from a gzipped ustar/pax archive.
 * Returns { name: Buffer } using archive-relative paths.
 */
export function untarGzFiles(buf) {
  const tar = gunzipSync(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
  const files = new Map();
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const name = readTarName(header);
    const size = parseInt(header.subarray(124, 136).toString('utf8').trim(), 8);
    const type = header[156];
    offset += 512;

    if (!Number.isFinite(size) || size < 0) {
      throw new Error('Invalid tar header');
    }

    const data = tar.subarray(offset, offset + size);
    const blocks = Math.ceil(size / 512) * 512;
    offset += blocks;

    if ((type === 0 || type === 48) && name && !name.endsWith('/')) {
      files.set(name, Buffer.from(data));
    }
  }

  return files;
}

function readTarName(header) {
  const prefix = cstr(header.subarray(345, 500));
  const name = cstr(header.subarray(0, 100));
  return prefix ? `${prefix}/${name}` : name;
}

function cstr(buf) {
  const end = buf.indexOf(0);
  return buf.subarray(0, end === -1 ? buf.length : end).toString('utf8').trim();
}
