import { describe, it, expect, vi } from 'vitest';

describe('CLI Bootstrap', () => {
  it('should be valid and loadable', async () => {
    const mod = await import('../index.js');
    expect(mod).toBeDefined();
  });
});
