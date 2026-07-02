import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { LoginPayload } from '../../types';
import { GoogleAuthButton } from '../../components/common/GoogleAuthButton';
import './LoginPage.css';

const features = [
  {
    icon: 'fas fa-chart-line',
    title: 'Real-time analytics & insights',
    description: 'Track performance and make data-driven decisions.',
  },
  {
    icon: 'fas fa-box-open',
    title: 'Seamless order management',
    description: 'Process orders, manage inventory, and ship faster.',
  },
  {
    icon: 'fas fa-users',
    title: 'Customer relationship tools',
    description: 'Build stronger relationships and boost loyalty.',
  },
];

const stats = [
  { value: '10K+', label: 'Products' },
  { value: '25K+', label: 'Happy Customers' },
  { value: '99.9%', label: 'Uptime' },
];

export const LoginPage = () => {
  const { login, googleLogin, verify2FA, resend2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formState, setFormState] = useState<LoginPayload>({ email: '', password: '', rememberMe: false });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    try {
      await resend2FA(formState.email);
      setResendTimer(60);
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await login(formState);

      setFailedAttempts(0);

      if (response.requires2FA) {
        setRequires2FA(true);
        setError(null);
        return;
      }

      if (formState.email.toLowerCase() === 'admin@gmail.com') {
        navigate('/admin', { replace: true });
      } else {
        const redirectTo = (location.state as { from?: string })?.from ?? '/';
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      const serverMessage = err.response?.data?.message || err.response?.data?.errors || err.message;
      setError(typeof serverMessage === 'string' ? serverMessage : 'Invalid credentials. Please try again.');
      setFailedAttempts((prev) => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await verify2FA(formState.email, otpCode, formState.rememberMe ?? false);
      if (formState.email.toLowerCase() === 'admin@gmail.com') {
        navigate('/admin', { replace: true });
      } else {
        const redirectTo = (location.state as { from?: string })?.from ?? '/';
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      const serverMessage = err.response?.data?.message || err.response?.data?.errors || err.message;
      setError(typeof serverMessage === 'string' ? serverMessage : 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setIsGoogleSubmitting(true);
    setError(null);
    try {
      await googleLogin(credential, formState.rememberMe ?? true);
      const redirectTo = (location.state as { from?: string })?.from ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      console.error(err);
      const serverMessage = err.response?.data?.message || err.response?.data?.errors || err.message;
      setError(typeof serverMessage === 'string' ? serverMessage : 'Google Sign-In failed. Please try again.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className="mk-login-shell">
      <div className="mk-login-grid" aria-hidden="true" />
      <div className="mk-login-orb mk-login-orb--violet" aria-hidden="true" />
      <div className="mk-login-orb mk-login-orb--blue" aria-hidden="true" />

      <section className="mk-login-hero" aria-label="About Markety">
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
            <i className="fas fa-bolt" aria-hidden="true" />
            Commerce, reimagined
          </span>
          <h1>
            Welcome to <span>Markety</span>
          </h1>
          <p>
            Your all-in-one e-commerce platform. Manage products, fulfill orders, and grow your business — all from
            one powerful dashboard.
          </p>
        </div>

        <div className="mk-login-hero__body">
          <div className="mk-commerce-visual" aria-hidden="true">
            <div className="mk-commerce-visual__halo" />
            <div className="mk-commerce-orbit mk-commerce-orbit--one">
              <span><i className="fas fa-shopping-cart" /></span>
            </div>
            <div className="mk-commerce-orbit mk-commerce-orbit--two">
              <span><i className="fas fa-bolt" /></span>
            </div>

            <div className="mk-commerce-screen">
              <div className="mk-commerce-screen__bar">
                <span />
                <span />
                <span />
                <b>MARKETY / OVERVIEW</b>
              </div>
              <div className="mk-commerce-screen__content">
                <div className="mk-commerce-screen__heading">
                  <div>
                    <small>Revenue</small>
                    <strong>$128,430</strong>
                  </div>
                  <span>+24.8%</span>
                </div>
                <div className="mk-commerce-chart">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <svg viewBox="0 0 420 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartStroke" x1="0" x2="1">
                        <stop offset="0%" stopColor="#d946ef" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <path d="M2 82 C65 85, 70 34, 128 52 S210 76, 250 30 S330 45, 418 8" />
                  </svg>
                </div>
                <div className="mk-commerce-products">
                  <div><span><i className="fas fa-headphones" /></span><small>Audio</small><b>$12.4K</b></div>
                  <div><span><i className="fas fa-mobile-alt" /></span><small>Mobile</small><b>$18.9K</b></div>
                  <div><span><i className="fas fa-gamepad" /></span><small>Gaming</small><b>$9.8K</b></div>
                </div>
              </div>
            </div>

            <div className="mk-commerce-float-card mk-commerce-float-card--orders">
              <span><i className="fas fa-box" /></span>
              <div><small>New orders</small><strong>1,248</strong></div>
              <b>+18%</b>
            </div>
            <div className="mk-commerce-float-card mk-commerce-float-card--live">
              <i />
              Live store
            </div>
            <div className="mk-commerce-stand" />
          </div>

          <div className="mk-login-features">
            {features.map((feature) => (
              <article className="mk-login-feature" key={feature.title}>
                <span className="mk-login-feature__icon">
                  <i className={feature.icon} aria-hidden="true" />
                </span>
                <div>
                  <h2>{feature.title}</h2>
                  <p>{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mk-login-stats" aria-label="Markety platform statistics">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
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
            <h2>{requires2FA ? 'Verify your identity' : 'Sign in to continue'}</h2>
            <p>
              {requires2FA
                ? `Enter the 6-digit security code sent to ${formState.email}.`
                : 'Access your Markety account and start shopping.'}
            </p>
          </header>

          {error && (
            <div className="mk-login-error" role="alert">
              <i className="fas fa-exclamation-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {!requires2FA ? (
            <form className="mk-login-form" onSubmit={handleSubmit}>
              <div className="mk-login-field">
                <label htmlFor="login-email">Email</label>
                <div className="mk-login-input">
                  <i className="far fa-envelope" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="admin@gmail.com"
                    autoComplete="email"
                    value={formState.email}
                    onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="mk-login-field">
                <label htmlFor="login-password">Password</label>
                <div className="mk-login-input">
                  <i className="fas fa-lock" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={formState.password}
                    onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="mk-login-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    <i className={showPassword ? 'far fa-eye-slash' : 'far fa-eye'} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mk-login-options">
                <label className="mk-login-checkbox" htmlFor="rememberMe">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={formState.rememberMe ?? false}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, rememberMe: event.target.checked }))
                    }
                  />
                  <span aria-hidden="true"><i className="fas fa-check" /></span>
                  Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              {failedAttempts > 1 && (
                <p className="mk-login-security-note">
                  <i className="fas fa-shield-alt" aria-hidden="true" />
                  Check your credentials carefully before trying again.
                </p>
              )}

              <button className="mk-login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="mk-login-spinner" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <i className="fas fa-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <motion.form
              className="mk-login-form mk-login-otp"
              onSubmit={handleVerify2FA}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="mk-login-field">
                <label htmlFor="login-otp">Verification code</label>
                <div className="mk-login-input mk-login-input--otp">
                  <i className="fas fa-key" aria-hidden="true" />
                  <input
                    id="login-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button className="mk-login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="mk-login-spinner" aria-hidden="true" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <span>Verify & Sign In</span>
                    <i className="fas fa-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>

              <button
                type="button"
                className="mk-login-secondary-action"
                onClick={handleResendOTP}
                disabled={resendTimer > 0}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
              </button>

              <button
                type="button"
                className="mk-login-back"
                onClick={() => {
                  setRequires2FA(false);
                  setOtpCode('');
                  setError(null);
                }}
              >
                <i className="fas fa-arrow-left" aria-hidden="true" />
                Back to sign in
              </button>
            </motion.form>
          )}

          {!requires2FA && (
            <>
              <div className="mk-login-divider"><span>or continue with</span></div>
              <div className="mk-login-socials mk-signin-socials" aria-label="Social sign-in options">
                <GoogleAuthButton
                  mode="signin"
                  onCredential={handleGoogleCredential}
                  busy={isGoogleSubmitting}
                />
              </div>
            </>
          )}

          <p className="mk-login-register">
            New to Markety? <Link to="/register">Create an account</Link>
          </p>

          <div className="mk-login-trust">
            <span><i className="fas fa-lock" aria-hidden="true" /> SSL secured</span>
            <span><i className="fas fa-shield-alt" aria-hidden="true" /> Privacy protected</span>
          </div>
        </motion.div>
      </section>
    </main>
  );
};
