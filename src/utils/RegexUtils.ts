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
    const singleEscapedPattern = convertMatchPatternToRegExpString(pattern).replace(/\\\\/g, '\\');
    return new RegExp(singleEscapedPattern);
  } catch {
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
    .replace(/\*\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__/g, '.*');

  regexPattern = '^' + regexPattern + '$';

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(normalizedPath);
  } catch {
    return false;
  }
}

export function globToRegex(pattern: string): RegExp {
  const normalizedPattern = pattern.replace(/\\/g, '/');
  let regexPattern = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__/g, '.*');

  return new RegExp('^' + regexPattern + '$');
}

export function dnrUrlFilterToRegex(filter: string, isCaseSensitive: boolean = false): RegExp {
  let pattern = escapeRegex(filter);

  if (pattern.startsWith('\\|\\|')) {
    pattern = '^(?:https?|file|ftp):\\/\\/(?:[^\\/]+\\.)?' + pattern.substring(4);
  } else if (pattern.startsWith('\\|')) {
    pattern = '^' + pattern.substring(2);
  }

  if (pattern.endsWith('\\|')) {
    pattern = pattern.substring(0, pattern.length - 2) + '$';
  }

  pattern = pattern.replace(/\\\*/g, '.*');
  pattern = pattern.replace(/\\\^/g, '(?:[^a-zA-Z0-9_\\-\\.\\%]|$)');

  try {
    return new RegExp(pattern, isCaseSensitive ? '' : 'i');
  } catch (e) {
    return new RegExp('$.');
  }
}
