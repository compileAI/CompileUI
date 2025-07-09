// Load testing-library/jest-dom only for jsdom environment
if (typeof window !== 'undefined') {
  require('@testing-library/jest-dom')
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: jest.fn((fn) => fn),
    reset: jest.fn(),
    formState: { errors: {} },
    watch: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(),
  }),
}))

// Mock Supabase
jest.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}))

// Mock fetch
global.fetch = jest.fn()

// Set up Next.js globals for API testing - only for Node.js environment
if (typeof window === 'undefined') {
  // Mock Next.js web globals for API route testing
  const { NextRequest, NextResponse } = require('next/server')
  
  // Set up globals if they don't exist
  global.NextRequest = NextRequest
  global.NextResponse = NextResponse
  
  // Also ensure standard web APIs are available
  if (!global.Request) {
    try {
      const { fetch, Request, Response, Headers } = require('undici')
      global.fetch = fetch
      global.Request = Request
      global.Response = Response
      global.Headers = Headers
      global.URL = global.URL || URL
    } catch (e) {
      console.warn('Could not import undici globals:', e.message)
    }
  }
}

// Suppress console warnings in tests
const originalConsoleWarn = console.warn
const originalConsoleError = console.error
beforeEach(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterEach(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
}) 