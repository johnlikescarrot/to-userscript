export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function convertMatchPatternToRegExpString(pattern: string): string {
  if (pattern === '<all_urls>') return '.*';
  if (typeof pattern !== 'string' || !pattern) return '$.';

  const schemeMatch = pattern.match(/^(\*|https?|file|ftp):\/\//);
  if (!schemeMatch) return '$.';
  const scheme = schemeMatch[1];
  const remaining = pattern.substring(schemeMatch[0].length);
  const schemeRegex = scheme === '*' ? 'https?|file|ftp' : scheme;

  if (scheme === 'file') {
      const pathPart = remaining.startsWith('/') ? remaining : '/' + remaining;
      return `^file:\\/\\/${pathPart.split('*').map(escapeRegex).join('.*')}`;
  }

  const hostMatch = remaining.match(/^([^\/]+)/);
  if (!hostMatch) return '$.';
  const host = hostMatch[1];
  const pathPart = remaining.substring(host.length);

  const hostRegex = host === '*' ? '[^/]+' : host.startsWith('*.') ? '(?:[^\\/]+\\.)?' + escapeRegex(host.substring(2)) : escapeRegex(host);
  const pathPartBase = (pathPart.startsWith('/') ? pathPart : '/' + pathPart);
  let pathRegex = pathPartBase.split('*').map(escapeRegex).join('.*');

  if (pathRegex === '/.*') return `^${schemeRegex}:\\/\\/${hostRegex}(?:/.*)?`;
  return `^${schemeRegex}:\\/\\/${hostRegex}${pathRegex}(?:[?#]|$)`;
}

export function convertMatchPatternToRegExp(pattern: string): RegExp {
  if (pattern === '<all_urls>') return new RegExp('.*');
  try {
    const s = convertMatchPatternToRegExpString(pattern);
    if (s === '$.') return new RegExp('$.');
    return new RegExp(s.replace(/\\\\/g, '\\'));
  } catch { /* v8 ignore next */ return new RegExp('$.'); }
}

export function matchGlobPattern(pattern: string, testPath: string): boolean {
  if (!pattern || !testPath) return false;
  const np = pattern.replace(/\\/g, '/'), nt = testPath.replace(/\\/g, '/');
  if (np === nt) return true;
  try {
    let rStr = np.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                 .replace(/\\\*/g, '*')
                 .replace(/\*\*/g, '__DS__')
                 .replace(/\*/g, '[^/]*')
                 .replace(/__DS__/g, '.*');
    return new RegExp('^' + rStr + '$').test(nt);
  } catch { /* v8 ignore next */ return false; }
}
