import { inflateRawSync } from 'node:zlib';

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;

/**
 * Unpack a zip buffer. Returns { name: Buffer } for files only.
 * Supports store (0) and deflate (8).
 */
export function unzipFiles(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const files = new Map();
  let offset = 0;

  while (offset + 30 <= b.length) {
    const sig = b.readUInt32LE(offset);
    if (sig === CENTRAL_SIG) break;
    if (sig !== LOCAL_SIG) {
      throw new Error('Invalid zip: expected local file header');
    }

    const method = b.readUInt16LE(offset + 8);
    const compSize = b.readUInt32LE(offset + 18);
    const uncompSize = b.readUInt32LE(offset + 22);
    const nameLen = b.readUInt16LE(offset + 26);
    const extraLen = b.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = b.subarray(nameStart, nameStart + nameLen).toString('utf8');
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > b.length) throw new Error(`Invalid zip: truncated ${name}`);

    if (!name.endsWith('/')) {
      const payload = b.subarray(dataStart, dataEnd);
      let data;
      if (method === 0) data = Buffer.from(payload);
      else if (method === 8) data = inflateRawSync(payload);
      else throw new Error(`Unsupported zip method ${method} for ${name}`);
      if (uncompSize && data.length !== uncompSize) {
        throw new Error(`Zip size mismatch for ${name}`);
      }
      files.set(name, data);
    }

    offset = dataEnd;
  }

  return files;
}
