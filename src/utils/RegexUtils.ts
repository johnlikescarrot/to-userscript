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
  let pathPart = remaining.substring(host.length);

  let hostRegex: string;
  if (host === '*') {
    hostRegex = '[^/]+';
  } else if (host.startsWith('*.')) {
    // Note: Reflecting instruction to NOT match bare domain with *.
    hostRegex = '[^\\/]+\\.' + escapeRegex(host.substring(2));
  } else {
    hostRegex = escapeRegex(host);
  }

  if (!pathPart) {
    pathPart = '/';
  }
  if (!pathPart.startsWith('/')) {
    pathPart = '/' + pathPart;
  }

  // Collapse consecutive wildcards to prevent ReDoS and ensure clean Regex
  let pathRegex = pathPart.split('*')
    .map(escapeRegex)
    .join('.*')
    .replace(/(\.\*)+/g, '.*'); // Collapse multiple .* runs

  if (pathRegex === '/.*') {
    pathRegex = '(?:/.*)?';
  } else {
    if (pathRegex.endsWith('/')) {
        pathRegex = pathRegex.slice(0, -1) + '[/]?(?:[?#]|$)';
    } else {
        pathRegex = pathRegex + '[/]?(?:[?#]|$)';
    }
  }

  return `^${schemeRegex}:\\/\\/${hostRegex}${pathRegex}`;
}

export function convertMatchPatternToRegExp(pattern: string): RegExp {
  if (pattern === '<all_urls>') {
    return new RegExp('.*');
  }
  try {
    const res = convertMatchPatternToRegExpString(pattern);
    return new RegExp(res);
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
    .replace(/__DOUBLESTAR__/g, '.*')
    .replace(/(\.\*)+/g, '.*'); // Prevent ReDoS here too

  regexPattern = '^' + regexPattern + '$';

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(normalizedPath);
  } catch {
    return false;
  }
}
