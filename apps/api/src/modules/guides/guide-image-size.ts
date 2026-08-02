import fs from "fs/promises";

export type ImageSize = { width: number; height: number };

// Размеры нужны в двух местах: в DOCX — чтобы картинка не растянулась, на
// странице — чтобы забронировать под неё место до загрузки. Без брони блоки
// «прыгают» по мере подгрузки, и переход по оглавлению промахивается.
export function readImageSize(buffer: Buffer): ImageSize | null {
  if (buffer.length > 24 && buffer.toString("ascii", 12, 16) === "IHDR") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

// Файлы не меняются под тем же именем (загруженные получают уникальное имя,
// встроенные приезжают с новой сборкой), поэтому кэш не протухает.
const cache = new Map<string, ImageSize | null>();

export async function getImageSize(filePath: string): Promise<ImageSize | null> {
  if (cache.has(filePath)) return cache.get(filePath) ?? null;
  let size: ImageSize | null = null;
  try {
    const handle = await fs.open(filePath, "r");
    try {
      const header = Buffer.alloc(65536);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      size = readImageSize(header.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
  } catch {
    size = null;
  }
  cache.set(filePath, size);
  return size;
}
