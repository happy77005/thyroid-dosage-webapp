const GOOGLE_CHARTS_URL = 'https://www.gstatic.com/charts/loader.js';

let loaderPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}

export function loadGoogleCharts(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Charts cannot load in a non-browser environment.'));
  }

  // If already loaded and ready, return immediately
  const existingGoogle = (window as any).google;
  if (existingGoogle?.charts?.load && existingGoogle?.visualization?.ComboChart) {
    return Promise.resolve(existingGoogle);
  }

  // If a load is already in progress, return that promise
  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise(async (resolve, reject) => {
    try {
      // Load the Google Charts loader script
      await loadScript(GOOGLE_CHARTS_URL);

      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      const googleObj = (window as any).google;
      if (!googleObj?.charts) {
        reject(new Error('Google Charts loader script loaded but google.charts is not available.'));
        loaderPromise = null;
        return;
      }

      // Load the corechart package
      googleObj.charts.load('current', { packages: ['corechart'] });

      let resolved = false;

      const checkAndResolve = () => {
        if (resolved) return;
        if ((window as any).google?.visualization?.ComboChart) {
          resolved = true;
          resolve(googleObj);
        }
      };

      // Wait for the charts to be ready
      googleObj.charts.setOnLoadCallback(() => {
        // Give it a moment for visualization to be available
        setTimeout(() => {
          checkAndResolve();
          if (!resolved) {
            reject(new Error('Google Charts packages loaded but ComboChart is not available.'));
            loaderPromise = null;
          }
        }, 100);
      });

      // Add a timeout fallback in case setOnLoadCallback doesn't fire
      setTimeout(() => {
        checkAndResolve();
        if (!resolved) {
          reject(new Error('Google Charts failed to load within timeout period.'));
          loaderPromise = null;
        }
      }, 10000); // 10 second timeout
    } catch (error) {
      loaderPromise = null;
      reject(error);
    }
  });

  return loaderPromise;
}

