import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { AxiosError } from 'axios';
import { authApi } from '../../api/auth';
import { executeRecaptcha } from '../../utils/recaptcha';
import './LoginPage.css';

export const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      await Swal.fire({
        title: 'Email Required',
        text: 'Please enter your email address.',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    try {
      const recaptchaToken = await executeRecaptcha('forgot_password');
      await authApi.forgotPassword(email.trim(), recaptchaToken);
      setStatus({ type: 'success', message: t('auth.forgotSuccess') });
      setEmail('');
    } catch (err) {
      console.error(err);
      let errorMessage = t('auth.forgotError');

      if (err instanceof AxiosError) {
        if (!err.response) {
          errorMessage = 'Failed to connect to the server. Please check your internet connection and try again.';
        } else if (err.response?.data) {
          const responseData = err.response.data;
          if (typeof responseData === 'string') {
            errorMessage = responseData;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mk-login-shell mk-forgot-shell">
      <div className="mk-login-grid" aria-hidden="true" />
      <div className="mk-login-orb mk-login-orb--violet" aria-hidden="true" />
      <div className="mk-login-orb mk-login-orb--blue" aria-hidden="true" />

      <section className="mk-login-hero" aria-label="Password reset">
        <header className="mk-login-brand">
          <span className="mk-login-brand__mark" aria-hidden="true">
            <img className="mk-login-logo-image" src="/Marketylogo.jpeg" alt="" />
          </span>
          <span className="mk-login-brand__copy">
            <strong>MARKETY</strong>
            <small>shop smart, live better</small>
          </span>
        </header>

        <div className="mk-login-hero__intro">
          <span className="mk-login-eyebrow">
            <i className="fas fa-key" aria-hidden="true" />
            Password reset
          </span>
          <h1>
            Secure account <span>recovery</span>
          </h1>
          <p>
            Enter your account email and we will send a short-lived reset link protected by reCAPTCHA.
          </p>
        </div>

        <div className="mk-login-features mt-5">
          {[
            ['fas fa-shield-alt', 'Protected by reCAPTCHA', 'We verify reset requests before sending mail.'],
            ['fas fa-clock', 'Short-lived reset link', 'Reset links expire quickly to protect your account.'],
            ['fas fa-envelope-open-text', 'Email-only recovery', 'Instructions are sent to the registered inbox.'],
          ].map(([icon, title, description]) => (
            <article className="mk-login-feature" key={title}>
              <span className="mk-login-feature__icon">
                <i className={icon} aria-hidden="true" />
              </span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-login-panel">
        <motion.div
          className="mk-login-card mk-signin-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="mk-login-card__shine" aria-hidden="true" />

          <header className="mk-login-card__header">
            <motion.div
              className="mk-login-card__logo mk-login-card__logo--brand"
              initial={{ scale: 0.9, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <img className="mk-login-logo-image" src="/Marketylogo.jpeg" alt="Markety" />
            </motion.div>
            <h2>{t('auth.forgotTitle')}</h2>
            <p>{t('auth.forgotCopy')}</p>
          </header>

          {status && (
            <div className={status.type === 'success' ? 'mk-login-success' : 'mk-login-error'} role="alert">
              <i className={status.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} aria-hidden="true" />
              <span>{status.message}</span>
            </div>
          )}

          <form className="mk-login-form" onSubmit={handleSubmit}>
            <div className="mk-login-field">
              <label htmlFor="forgot-email">{t('auth.email')}</label>
              <div className="mk-login-input">
                <i className="far fa-envelope" aria-hidden="true" />
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button className="mk-login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="mk-login-spinner" aria-hidden="true" />
                  {t('auth.sendingReset')}
                </>
              ) : (
                <>
                  <span>{t('auth.sendReset')}</span>
                  <i className="fas fa-paper-plane" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mk-login-register">
            Remember your password? <Link to="/login">Sign in here</Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
};
