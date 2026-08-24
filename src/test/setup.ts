import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(() => null),
})

vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
vi.stubGlobal('cancelAnimationFrame', vi.fn())
