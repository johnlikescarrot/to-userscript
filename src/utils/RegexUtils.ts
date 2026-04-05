export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function convertMatchPatternToRegExpString(pattern: string): string {
  if (typeof pattern !== 'string' || !pattern) {
    return '$.';
  }

  const schemeMatch = pattern.match(/^(\*|https?|file|ftp):\/\//);
  if (!schemeMatch) return '$.';
  const scheme = schemeMatch[1];
  const remaining = pattern.substring(schemeMatch[0].length);
  const schemeRegex = scheme === '*' ? 'https?|file|ftp' : scheme;

  if (scheme === 'file') {
    const pathPart = remaining.startsWith('/') ? remaining : '/' + remaining;
    const escapedPath = pathPart.substring(1).split('*').map(escapeRegex).join('.*').replace(/\//g, '\\/');
    return `^file:\\/\\/\\/${escapedPath}(?:[?#]|$)`;
  }

  const hostMatch = remaining.match(/^([^\/]+)/);
  if (!hostMatch) return '$.';
  const host = hostMatch[1];
  const pathPart = remaining.substring(host.length);

  let hostRegex: string;
  if (host === '*') {
    hostRegex = '[^/]+';
  } else if (host.startsWith('*.')) {
    hostRegex = '(?:[^\\/]+\\.)?' + escapeRegex(host.substring(2));
  } else {
    hostRegex = escapeRegex(host);
  }

  let pathRegex = pathPart;
  if (!pathRegex.startsWith('/')) {
    pathRegex = '/' + pathRegex;
  }
  pathRegex = pathRegex.split('*').map(escapeRegex).join('.*').replace(/\//g, '\\/');

  if (pathRegex === '\\/.*') {
    pathRegex = '(?:\\/.*)?';
  } else {
    pathRegex = pathRegex + '(?:[?#]|$)';
  }

  return `^${schemeRegex}:\\/\\/${hostRegex}${pathRegex}`;
}

export function convertMatchPatternToRegExp(pattern: string): RegExp {
  if (pattern === '<all_urls>') {
    return new RegExp('.*');
  }
  /* v8 ignore next 6 */ try {
    const s = convertMatchPatternToRegExpString(pattern);
    return new RegExp(s);
  } catch { /* v8 ignore next 2 */
    return new RegExp('$.');
  }
}

export function matchGlobPattern(pattern: string, testPath: string): boolean {
  if (!pattern || !testPath) return false;

  const normalizedPattern = pattern.replace(/\\/g, '/');
  const normalizedPath = testPath.replace(/\\/g, '/');

  if (normalizedPattern === normalizedPath) return true;

  let regexPattern = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__RECURSIVE__')
    .replace(/\*/g, '[^/]*')
    .replace(/__RECURSIVE__/g, '.*');

  regexPattern = '^' + regexPattern + '$';

  /* v8 ignore next 6 */ try {
    const regex = new RegExp(regexPattern);
    return regex.test(normalizedPath);
  } catch { /* v8 ignore next 2 */
    return false;
  }
}
