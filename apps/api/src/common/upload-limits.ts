// Upload routes accept one file and flat metadata (currently only `lang`).
// Bound multipart metadata as well as file bytes: fileSize alone does not
// prevent CPU/memory exhaustion through crafted multipart field names.
export function uploadLimits(fileSize: number) {
  return {
    fileSize,
    files: 1,
    fields: 4,
    parts: 5,
    fieldNameSize: 100,
    fieldSize: 64 * 1024,
    fieldNestingDepth: 0,
    fieldArrayIndexLimit: 0
  };
}
