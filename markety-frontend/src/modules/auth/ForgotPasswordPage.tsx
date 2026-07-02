import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../../api/auth';
import { executeRecaptcha } from '../../utils/recaptcha';
import { AuthScene } from '../../components/visuals/AuthScene';
import Swal from 'sweetalert2';
import { AxiosError } from 'axios';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    try {
      const recaptchaToken = await executeRecaptcha('forgot_password');
      await authApi.forgotPassword(email.trim(), recaptchaToken);

      await Swal.fire({
        title: 'Check Your Email',
        text: 'If an account with that email exists, we\'ve sent you a password reset link.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });

      setEmail('');
    } catch (err) {
      console.error(err);
      let errorMessage = 'Unable to process your request. Please try again.';

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

      await Swal.fire({
        title: 'Request Failed',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const heroImage = `${process.env.PUBLIC_URL}/template/img/product-banner-3.jpg`;

  return (
    <div className="login-page d-flex min-vh-100">
      <div className="login-hero position-relative text-white">
        <div className="auth-scene">
          <AuthScene accentColor="#7C5FE0" lightColor="#FF6B35" rotation={[0.4, -0.3, 0.1]} />
        </div>
        <div className="login-hero__overlay" />
        <img src={heroImage} alt="Markety shopping" className="login-hero__image" />
        <div className="login-hero__content">
          <span className="badge rounded-pill px-3 py-2 text-uppercase bg-white text-primary mb-3 shadow-sm">
            <i className="fas fa-key me-2" />
            Password Reset
          </span>
          <h1 className="display-6 fw-bold mb-3 text-white">Forgot Your Password?</h1>
          <p className="fs-6 text-white-75 mb-4">
            No worries! Enter your email and we'll send you a link to reset your password.
          </p>
          <ul className="login-hero__list">
            <li>
              <i className="fas fa-shield-alt me-2 text-warning" />
              Secure password reset process
            </li>
            <li>
              <i className="fas fa-clock me-2 text-warning" />
              Link expires in 15 minutes
            </li>
            <li>
              <i className="fas fa-envelope me-2 text-warning" />
              Check your email for instructions
            </li>
          </ul>
        </div>
      </div>

      <div className="login-form-wrapper d-flex align-items-center justify-content-center flex-grow-1">
        <div className="login-card glass-card shadow-lg position-relative">
          <div className="login-card__glow" />
          <div className="text-center mb-4">
            <motion.div
              className="auth-brand mx-auto mb-3"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <motion.span
                className="auth-brand__ring"
                animate={{ rotate: -360 }}
                transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
              />
              <img src="/Marketylogo.jpeg" alt="Markety" className="auth-brand__logo" />
            </motion.div>
            <h2 className="fw-semibold mb-1">Reset Your Password</h2>
            <p className="text-muted">Enter your email address and we'll send you a reset link.</p>
          </div>

          <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
            <div className="form-floating-with-icon">
              <label className="form-label text-muted small">Email Address</label>
              <div className="input-icon">
                <span className="icon">
                  <i className="fas fa-envelope" />
                </span>
                <input
                  type="email"
                  className="form-control form-control-lg"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button className="btn btn-primary w-100 py-2 login-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Sending reset link…
                </>
              ) : (
                <>
                  Send Reset Link <i className="fas fa-paper-plane ms-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-muted">
            <small>
              Remember your password?{' '}
              <Link to="/login" className="fw-semibold text-decoration-none">
                Sign in here
              </Link>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};