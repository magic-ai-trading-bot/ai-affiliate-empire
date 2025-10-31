/**
 * Image utilities for optimized loading and blur placeholders
 */

/**
 * Generate a shimmer placeholder for images
 */
export function shimmer(width: number, height: number): string {
  return `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f6f7f8" offset="0%" />
          <stop stop-color="#edeef1" offset="20%" />
          <stop stop-color="#f6f7f8" offset="40%" />
          <stop stop-color="#f6f7f8" offset="100%" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#f6f7f8" />
      <rect id="r" width="${width}" height="${height}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${width}" to="${width}" dur="1s" repeatCount="indefinite"  />
    </svg>`;
}

/**
 * Convert shimmer SVG to base64 data URL
 */
export function toBase64(str: string): string {
  return typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);
}

/**
 * Generate a blur placeholder data URL
 */
export function getBlurDataURL(width: number = 800, height: number = 450): string {
  return `data:image/svg+xml;base64,${toBase64(shimmer(width, height))}`;
}

/**
 * Generate optimized image props with blur placeholder
 */
export function getOptimizedImageProps(src: string, alt: string) {
  return {
    src,
    alt,
    placeholder: 'blur' as const,
    blurDataURL: getBlurDataURL(),
  };
}
