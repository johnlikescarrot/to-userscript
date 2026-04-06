import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('CLI Integration', () => {
  const binPath = 'node dist/cli/index.js';

  it('should show help message', () => {
    const output = execSync(`${binPath} --help`).toString();
    expect(output).toContain('to-userscript <command> [options]');
  });
});
