// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { expect, vi } from 'vitest';
import * as matchers from 'vitest-axe/matchers';
import type { AxeMatchers } from 'vitest-axe/matchers';

expect.extend(matchers);

declare module 'vitest' {
	interface Assertion extends AxeMatchers {
		toHaveNoViolations: AxeMatchers['toHaveNoViolations'];
	}
	interface AsymmetricMatchersContaining extends AxeMatchers {
		toHaveNoViolations: AxeMatchers['toHaveNoViolations'];
	}
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
	configurable: true,
	value: () => null,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

