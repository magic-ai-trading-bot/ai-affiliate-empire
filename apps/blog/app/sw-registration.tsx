'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered successfully:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('🔄 New service worker available, refresh to update');
                    // Optionally notify user about update
                    if (confirm('A new version is available. Refresh to update?')) {
                      window.location.reload();
                    }
                  }
                });
              }
            });

            // Auto-update check every 5 minutes
            setInterval(() => {
              registration.update();
            }, 5 * 60 * 1000);
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
