const SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
let loaderPromise: Promise<void> | null = null;

function ensureRecaptchaScript(): Promise<void> {
  if (!SITE_KEY) {
    return Promise.reject(new Error('Missing REACT_APP_RECAPTCHA_SITE_KEY environment variable.'));
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('reCAPTCHA can only run in the browser.'));
      return;
    }

    if (window.grecaptcha) {
      resolve();
      return;
    }

    const timeoutId = window.setTimeout(
      () => reject(new Error('reCAPTCHA took too long to load.')),
      15_000,
    );
    const resolveWhenReady = () => {
      window.clearTimeout(timeoutId);
      if (window.grecaptcha) resolve();
      else reject(new Error('reCAPTCHA loaded but is unavailable.'));
    };
    const rejectLoad = () => {
      window.clearTimeout(timeoutId);
      reject(new Error('Failed to load reCAPTCHA script.'));
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src^="https://www.google.com/recaptcha/api.js?render="]`);
    if (existing) {
      existing.addEventListener('load', resolveWhenReady, { once: true });
      existing.addEventListener('error', rejectLoad, { once: true });
      window.setTimeout(() => {
        if (window.grecaptcha) resolveWhenReady();
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
    script.async = true;
    script.defer = true;
    script.onload = resolveWhenReady;
    script.onerror = rejectLoad;
    document.head.appendChild(script);
  }).catch((error) => {
    loaderPromise = null;
    throw error;
  });

  return loaderPromise;
}

export function prepareRecaptcha(): Promise<void> {
  return ensureRecaptchaScript();
}

export async function executeRecaptcha(action: string): Promise<string> {
  await ensureRecaptchaScript();

  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) {
    throw new Error('reCAPTCHA is not available in the browser.');
  }

  return new Promise((resolve, reject) => {
    grecaptcha.ready(() => {
      grecaptcha.execute(SITE_KEY!, { action })
        .then((token) => {
          if (!token) {
            reject(new Error('reCAPTCHA execution returned an empty token.'));
            return;
          }
          resolve(token);
        })
        .catch(reject);
    });
  });
}
