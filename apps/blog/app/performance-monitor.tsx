'use client';

import { useEffect } from 'react';

/**
 * Performance monitoring component
 * Tracks Web Vitals and custom metrics
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Web Vitals monitoring
    const reportWebVitals = (metric: any) => {
      const body = JSON.stringify(metric);
      const url = '/api/analytics/vitals';

      // Use sendBeacon if available for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
      } else {
        fetch(url, { body, method: 'POST', keepalive: true });
      }
    };

    // Import web-vitals dynamically
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(reportWebVitals);
      onFID(reportWebVitals);
      onFCP(reportWebVitals);
      onLCP(reportWebVitals);
      onTTFB(reportWebVitals);
      onINP(reportWebVitals);
    });

    // Custom performance marks
    performance.mark('app-mounted');

    // Navigation timing
    if (performance.getEntriesByType) {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigationTiming) {
        console.log('Navigation Timing:', {
          dns: navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart,
          tcp: navigationTiming.connectEnd - navigationTiming.connectStart,
          request: navigationTiming.responseStart - navigationTiming.requestStart,
          response: navigationTiming.responseEnd - navigationTiming.responseStart,
          domLoad: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
          totalLoad: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
        });
      }
    }

    // Resource timing (images, scripts, etc)
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const slowResources = resources.filter(r => r.duration > 1000);

    if (slowResources.length > 0) {
      console.warn('Slow resources detected:', slowResources.map(r => ({
        name: r.name,
        duration: r.duration,
        size: r.transferSize,
      })));
    }

    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory usage:', {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
      });
    }

    // Long task detection (if available)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn('Long task detected:', {
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime,
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task API not supported
      }
    }
  }, []);

  return null;
}

/**
 * Export a function to manually report custom metrics
 */
export function reportMetric(name: string, value: number, unit?: string) {
  if (typeof window === 'undefined') return;

  const metric = {
    name,
    value,
    unit: unit || 'ms',
    timestamp: Date.now(),
    url: window.location.pathname,
  };

  // Send to analytics
  fetch('/api/analytics/custom', {
    method: 'POST',
    body: JSON.stringify(metric),
    keepalive: true,
  }).catch(() => {
    // Fail silently
  });

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Custom metric: ${name} = ${value}${unit || 'ms'}`);
  }
}
