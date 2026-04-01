export function normalizePath(filePath: string): string {
  // Always convert backslashes to forward slashes first, then collapse duplicates
  return filePath.replace(/\\/g, '/').replace(/\/+/g, '/');
}
