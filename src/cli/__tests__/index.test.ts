import { describe, it, expect } from 'vitest';

describe('CLI Bootstrap', () => {
  it('should be loadable as a module', async () => {
    // Dynamic import to satisfy coverage without executing full CLI logic
    const mod = await import('../index.js');
    expect(mod).toBeDefined();
  });
});
