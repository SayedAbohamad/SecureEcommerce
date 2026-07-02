import { useEffect, useRef, useState } from 'react';
import { authApi } from '../../api';

interface GoogleAuthButtonProps {
  mode: 'signin' | 'signup';
  onCredential: (credential: string) => Promise<void>;
  busy?: boolean;
}

let googleScriptPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
let activeCredentialHandler: ((credential: string) => void) | null = null;

const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    const handleReady = () => {
      if (window.google?.accounts?.id) resolve();
      else reject(new Error('Google Identity Services did not initialize.'));
    };

    if (existing) {
      existing.addEventListener('load', handleReady, { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Google Sign-In.')), {
        once: true,
      });
      window.setTimeout(handleReady, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = handleReady;
    script.onerror = () => reject(new Error('Unable to load Google Sign-In.'));
    document.head.appendChild(script);
  }).catch((error) => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
};

export const GoogleAuthButton = ({ mode, onCredential, busy = false }: GoogleAuthButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialHandlerRef = useRef(onCredential);
  const [status, setStatus] = useState<'loading' | 'ready' | 'disabled' | 'error'>('loading');
  const [message, setMessage] = useState('Loading Google Sign-In…');
  const [showConfigurationHint, setShowConfigurationHint] = useState(false);

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    const renderGoogleButton = async () => {
      try {
        const config = await authApi.getGoogleConfig();
        if (cancelled) return;

        if (!config.enabled || !config.clientId) {
          setStatus('disabled');
          setMessage('Add the Google OAuth Client ID to enable account selection.');
          return;
        }

        await loadGoogleIdentityScript();
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;

        activeCredentialHandler = (credential) => {
          void credentialHandlerRef.current(credential);
        };

        if (initializedClientId !== config.clientId) {
          window.google.accounts.id.initialize({
            client_id: config.clientId,
            callback: (response) => activeCredentialHandler?.(response.credential),
            ux_mode: 'popup',
            use_fedcm_for_prompt: true,
          });
          initializedClientId = config.clientId;
        }

        containerRef.current.replaceChildren();
        const buttonWidth = Math.min(Math.max(containerRef.current.clientWidth, 240), 360);
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: mode === 'signin' ? 'signin_with' : 'signup_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: buttonWidth,
        });
        setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to load Google Sign-In.');
      }
    };

    void renderGoogleButton();
    return () => {
      cancelled = true;
      activeCredentialHandler = null;
    };
  }, [mode]);

  return (
    <div className={`mk-google-auth ${busy ? 'is-busy' : ''}`}>
      <div
        ref={containerRef}
        className="mk-google-auth__button"
        aria-label={mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
      />
      {status === 'disabled' && (
        <>
          <button
            type="button"
            className="mk-google-auth__fallback"
            onClick={() => setShowConfigurationHint(true)}
          >
            <i className="fab fa-google" aria-hidden="true" />
            <span>Google</span>
          </button>
          {showConfigurationHint && (
            <div className="mk-google-auth__hint" role="alert">{message}</div>
          )}
        </>
      )}
      {status !== 'ready' && status !== 'disabled' && (
        <div className={`mk-google-auth__status is-${status}`} role={status === 'error' ? 'alert' : undefined}>
          {status === 'loading' && <span className="mk-login-spinner" aria-hidden="true" />}
          {status === 'error' && <i className="fas fa-exclamation-circle" aria-hidden="true" />}
          <span>{message}</span>
        </div>
      )}
      {busy && (
        <div className="mk-google-auth__busy" aria-live="polite">
          <span className="mk-login-spinner" aria-hidden="true" />
          Verifying Google account…
        </div>
      )}
    </div>
  );
};
