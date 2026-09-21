'use client';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
   useEffect(() => {
      console.error(error);
      // When a chunk fails to load (often due to an active deployment or cached older build in browser),
      // automatically reload once to fetch the latest assets from the server.
      const isChunkLoadError = 
         error.message?.includes('Failed to load chunk') || 
         error.message?.includes('Loading chunk') || 
         error.name === 'ChunkLoadError';

      if (isChunkLoadError && typeof window !== 'undefined') {
         const lastReload = sessionStorage.getItem('chunk_reload_ts');
         const now = Date.now();
         if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
            sessionStorage.setItem('chunk_reload_ts', String(now));
            window.location.href = window.location.pathname + (window.location.search ? window.location.search + '&' : '?') + '_r=' + now;
         }
      }
   }, [error]);

   return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }} className="flex flex-col items-center justify-center min-h-[50vh]">
         <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
         <p className="text-gray-500 mb-6 max-w-md">{error.message || 'An unexpected error occurred while loading this page.'}</p>
         <button 
            onClick={() => {
               if (typeof window !== 'undefined') {
                  const now = Date.now();
                  window.location.href = window.location.pathname + (window.location.search ? window.location.search + '&' : '?') + '_r=' + now;
               } else {
                  reset();
               }
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
         >
            Reload Page
         </button>
      </div>
   );
}