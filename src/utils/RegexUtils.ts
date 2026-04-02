export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function convertMatchPatternToRegExpString(pattern: string): string {
  if (typeof pattern !== 'string') {
      return '$.';
  }
  if (!pattern) {
    return '$.';
  }

  const schemeMatch = pattern.match(/^(\*|https?|file|ftp):\/\//);
  if (!schemeMatch) {
      return '$.';
  }
  const scheme = schemeMatch[1];
  const remaining = pattern.substring(schemeMatch[0].length);

  let schemeRegex: string;
  if (scheme === '*') {
      schemeRegex = 'https?|file|ftp';
  } else {
      schemeRegex = scheme;
  }

  const hostMatch = remaining.match(/^([^\/]+)/);
  if (!hostMatch) {
      /* v8 ignore next 2 */
      return '$.';
  }
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
  pathRegex = pathRegex.split('*').map(escapeRegex).join('.*');

  if (pathRegex === '/.*') {
    pathRegex = '(?:/.*)?';
  } else {
    pathRegex = pathRegex + '(?:[?#]|$)';
  }

  return `^${schemeRegex}:\\/\\/${hostRegex}${pathRegex}`;
}

export function convertMatchPatternToRegExp(pattern: string): RegExp {
  if (pattern === '<all_urls>') {
    return new RegExp('.*');
  }
  try {
    const str = convertMatchPatternToRegExpString(pattern);
    const singleEscapedPattern = str.replace(/\\\\/g, '\\');
    return new RegExp(singleEscapedPattern);
  } /* v8 ignore start */
  catch {
    return new RegExp('$.');
  }
  /* v8 ignore stop */
}

export function matchGlobPattern(pattern: string, testPath: string): boolean {
  if (!pattern) return false;
  if (!testPath) return false;

  const normalizedPattern = pattern.replace(/\\/g, '/');
  const normalizedPath = testPath.replace(/\\/g, '/');

  if (normalizedPattern === normalizedPath) {
      return true;
  }

  let regexPattern = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__/g, '.*');

  regexPattern = '^' + regexPattern + '$';

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(normalizedPath);
  } /* v8 ignore start */
  catch {
    return false;
  }
  /* v8 ignore stop */
}
