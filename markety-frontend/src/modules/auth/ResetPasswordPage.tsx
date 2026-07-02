import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../../api/auth';
import { AuthScene } from '../../components/visuals/AuthScene';
import Swal from 'sweetalert2';
import { AxiosError } from 'axios';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    email: '',
    token: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      Swal.fire({
        title: 'Invalid Reset Link',
        text: 'The password reset link is invalid or incomplete.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      }).then(() => {
        navigate('/forgot-password');
      });
      return;
    }

    setFormState(prev => ({
      ...prev,
      email: email,
      token: token
    }));
  }, [searchParams, navigate]);

  const getPasswordPolicyStatus = (password: string) => {
    return [
      {
        label: 'At least 8 characters',
        passed: password.length >= 8,
      },
      {
        label: 'One uppercase letter',
        passed: /[A-Z]/.test(password),
      },
      {
        label: 'One lowercase letter',
        passed: /[a-z]/.test(password),
      },
      {
        label: 'One number',
        passed: /[0-9]/.test(password),
      },
      {
        label: 'One special character (!@#$%^&*...)',
        passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      },
    ];
  };

  const passwordPolicy = getPasswordPolicyStatus(formState.password);

  const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long.',
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one uppercase letter.',
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one lowercase letter.',
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one number.',
      };
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one special character (!@#$%^&*...).',
      };
    }

    return { isValid: true, message: '' };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // Check if passwords match
    if (formState.password !== formState.confirmPassword) {
      await Swal.fire({
        title: 'Password Mismatch',
        text: 'Passwords do not match. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(formState.password);
    if (!passwordValidation.isValid) {
      await Swal.fire({
        title: 'Weak Password',
        html: `<p>${passwordValidation.message}</p><p class="mt-2"><strong>Password requirements:</strong></p><ul class="text-start mt-2"><li>At least 8 characters</li><li>One uppercase letter</li><li>One lowercase letter</li><li>One number</li><li>One special character</li></ul>`,
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({
        email: formState.email,
        token: formState.token,
        newPassword: formState.password
      });

      await Swal.fire({
        title: 'Password Reset Successful',
        text: 'Your password has been reset successfully. You can now log in with your new password.',
        icon: 'success',
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#5B3DC8',
      });

      navigate('/login');
    } catch (err) {
      console.error(err);
      let errorMessage = 'Unable to reset password. Please try again.';

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
        title: 'Reset Failed',
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
            <i className="fas fa-lock me-2" />
            New Password
          </span>
          <h1 className="display-6 fw-bold mb-3 text-white">Set New Password</h1>
          <p className="fs-6 text-white-75 mb-4">
            Create a strong password for your Markety account.
          </p>
          <ul className="login-hero__list">
            <li>
              <i className="fas fa-shield-alt me-2 text-warning" />
              Secure password requirements
            </li>
            <li>
              <i className="fas fa-check-circle me-2 text-warning" />
              Must meet all criteria
            </li>
            <li>
              <i className="fas fa-key me-2 text-warning" />
              Keep your account safe
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
            <h2 className="fw-semibold mb-1">Create New Password</h2>
            <p className="text-muted">Enter a strong password for your account.</p>
          </div>

          <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
            <div className="form-floating-with-icon">
              <label className="form-label text-muted small">New Password</label>
              <div className="input-icon">
                <span className="icon">
                  <i className="fas fa-lock" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control form-control-lg"
                  placeholder="Create a secure password"
                  value={formState.password}
                  onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                </button>
              </div>
              <div className="password-policy mt-2 small text-start">
                {passwordPolicy.filter((rule) => !rule.passed).map((rule) => (
                  <div key={rule.label} className="d-flex align-items-center gap-2 text-danger mb-1">
                    <i className="fas fa-times-circle" />
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-floating-with-icon">
              <label className="form-label text-muted small">Confirm New Password</label>
              <div className="input-icon">
                <span className="icon">
                  <i className="fas fa-shield-alt" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-control form-control-lg"
                  placeholder="Repeat your password"
                  value={formState.confirmPassword}
                  onChange={(event) => setFormState((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                </button>
              </div>
            </div>

            <button className="btn btn-primary w-100 py-2 login-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Resetting password…
                </>
              ) : (
                <>
                  Reset Password <i className="fas fa-key ms-2" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};