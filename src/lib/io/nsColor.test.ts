import { describe, it, expect } from 'vitest';
import { nsColor } from './nsColor';

describe('nsColor', () => {
  it('returns a valid hex color', () => {
    expect(nsColor('faceplate')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is deterministic for the same namespace', () => {
    expect(nsColor('osc')).toBe(nsColor('osc'));
  });

  it('gives different namespaces different colors', () => {
    expect(nsColor('osc')).not.toBe(nsColor('amp'));
  });

  it('handles empty and single-char namespaces without throwing', () => {
    expect(nsColor('')).toMatch(/^#[0-9a-f]{6}$/i);
    expect(nsColor('x')).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
