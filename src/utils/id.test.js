import { describe, it, expect } from 'vitest';
import { encodeId, decodeId } from './id';

describe('id obfuscation (encodeId / decodeId)', () => {
  it('encodes and decodes positive integers reversibly', () => {
    const testIds = [1, 2, 3, 42, 100, 9999, 123456, 1000000];
    for (const id of testIds) {
      const encoded = encodeId(id);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThanOrEqual(6);
      expect(decodeId(encoded)).toBe(id);
    }
  });

  it('produces non-sequential output for sequential numbers', () => {
    const enc1 = encodeId(1);
    const enc2 = encodeId(2);
    const enc3 = encodeId(3);
    expect(enc1).not.toBe(enc2);
    expect(enc2).not.toBe(enc3);
    // Should not share common prefixes or look sequential
    expect(enc1.slice(0, 3)).not.toBe(enc2.slice(0, 3));
  });

  it('handles backwards-compatible numeric strings and numbers', () => {
    expect(decodeId('123')).toBe(123);
    expect(decodeId(456)).toBe(456);
    expect(decodeId('0')).toBe(null);
    expect(decodeId('')).toBe(null);
    expect(decodeId(null)).toBe(null);
    expect(decodeId(undefined)).toBe(null);
  });
});
