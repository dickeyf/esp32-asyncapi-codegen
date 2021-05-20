export function normalizeSchemaName(schemaName) {
  return schemaName.replace(/<|>/gm, '').replace(/-/gi, "_").replace(/\./gi, "_");
}
