export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^$${}()|[\]\\]/g, '\\$&');
}

export function convertMatchPatternToRegExpString(pattern: string): string {
  if (typeof pattern !== 'string' || !pattern) {
    return '$.';
  }

  const schemeMatch = pattern.match(/^(\*|https?|file|ftp):\/\//);
  if (!schemeMatch) return '$.';
  const scheme = schemeMatch[1];
  let remaining = pattern.substring(schemeMatch[0].length);
  const schemeRegex = scheme === '*' ? 'https?|file|ftp' : scheme;

  if (scheme === "file") {
    let cleanPath = remaining.startsWith("/") ? remaining.substring(1) : remaining;
    return `^file:\\\/\\\/\\\/${cleanPath.split("*").map(escapeRegex).join(".*")}(?:[?#]|$)`;
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
    .replace(/[.+?^$${}()|[\]\\]/g, '\\$&')
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
