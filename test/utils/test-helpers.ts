/**
 * Test helper utilities
 */

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate a random string
 */
export const randomString = (length: number = 10): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

/**
 * Generate a random number within range
 */
export const randomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a random price
 */
export const randomPrice = (): number => {
  return parseFloat((Math.random() * 500 + 10).toFixed(2));
};

/**
 * Generate a random commission percentage
 */
export const randomCommission = (): number => {
  return parseFloat((Math.random() * 15 + 1).toFixed(2));
};

/**
 * Create a mock function that tracks calls
 */
export const createMockFunction = <T = any>() => {
  const calls: any[] = [];
  const mockFn = jest.fn((...args: any[]) => {
    calls.push(args);
  });
  return { mockFn, calls };
};

/**
 * Assert that a value is defined
 */
export const assertDefined = <T>(value: T | undefined | null, message?: string): T => {
  if (value === undefined || value === null) {
    throw new Error(message || 'Value is undefined or null');
  }
  return value;
};

/**
 * Assert that an async function throws an error
 */
export const expectToThrow = async (fn: () => Promise<any>, expectedError?: string) => {
  let error: Error | undefined;
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeDefined();
  if (expectedError) {
    expect(error?.message).toContain(expectedError);
  }
};
