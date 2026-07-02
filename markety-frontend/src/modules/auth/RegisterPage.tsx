import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AxiosError } from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api';
import { RegisterPayload } from '../../types';
import { GoogleAuthButton } from '../../components/common/GoogleAuthButton';
import './LoginPage.css';
import './RegisterPage.css';

const defaultForm: RegisterPayload = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'Customer',
};

const registerFeatures = [
  {
    icon: 'fas fa-tag',
    title: 'Exclusive deals',
    description: 'Access member-only discounts and special offers.',
  },
  {
    icon: 'fas fa-laptop',
    title: 'Wide range of products',
    description: 'Laptops, PCs, accessories, and more — all in one place.',
  },
  {
    icon: 'fas fa-shield-alt',
    title: 'Secure shopping',
    description: 'Your data and payments are always protected.',
  },
  {
    icon: 'fas fa-headset',
    title: 'Dedicated support',
    description: 'Get help from our 24/7 customer support team.',
  },
];

export const RegisterPage = () => {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState<RegisterPayload>({ ...defaultForm });
  const [stage, setStage] = useState<'register' | 'verify'>('register');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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
      await register({ ...formState, role: 'Customer' });
      setStage('verify');
      await Swal.fire({
        title: 'Verify Your Email',
        text: 'A verification code has been sent to your email. Enter it below to complete registration.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
    } catch (err) {
      console.error(err);
      let errorMessage = 'Unable to create account. Please try again.';

      if (err instanceof AxiosError) {
        if (!err.response) {
          errorMessage = 'Failed to connect to the server. Please check your internet connection and try again.';
        } else if (err.response?.data) {
          const responseData = err.response.data;
          if (typeof responseData === 'string') {
            errorMessage = responseData;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          } else if (responseData.errors) {
            const errorMessages = Object.values(responseData.errors).flat().join(', ');
            errorMessage = errorMessages || errorMessage;
          } else if (responseData.title) {
            errorMessage = responseData.title;
          } else if (err.message) {
            errorMessage = err.message;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      await Swal.fire({
        title: 'Registration Failed',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!otpCode.trim()) {
      await Swal.fire({
        title: 'Code Required',
        text: 'Please enter the verification code sent to your email.',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
      return;
    }

    setIsVerifying(true);
    try {
      await authApi.confirmRegistration({ email: formState.email, code: otpCode.trim() });
      await Swal.fire({
        title: 'Registration Complete',
        text: 'Your email has been verified and your account is now active. You can sign in now.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
      navigate('/login');
    } catch (err) {
      console.error(err);
      let errorMessage = 'Unable to verify registration. Please try again.';
      if (err instanceof AxiosError) {
        if (!err.response) {
          errorMessage = 'Failed to connect to the server. Please check your internet connection and try again.';
        } else if (err.response?.data) {
          const responseData = err.response.data;
          if (typeof responseData === 'string') {
            errorMessage = responseData;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          } else if (responseData.errors) {
            const errorMessages = Object.values(responseData.errors).flat().join(', ');
            errorMessage = errorMessages || errorMessage;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      await Swal.fire({
        title: 'Verification Failed',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      await authApi.resendRegistrationOtp(formState.email);
      await Swal.fire({
        title: 'Code Resent',
        text: 'A new verification code has been sent to your email.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
    } catch (err) {
      console.error(err);
      let errorMessage = 'Unable to resend verification code. Please try again.';
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
        title: 'Resend Failed',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setIsGoogleSubmitting(true);
    try {
      await googleLogin(credential, true);
      await Swal.fire({
        title: 'Welcome to Markety',
        text: 'Your Google account is ready and you are now signed in.',
        icon: 'success',
        confirmButtonText: 'Start shopping',
        confirmButtonColor: '#5B3DC8',
      });
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      let errorMessage = 'Google Sign-Up failed. Please try again.';
      if (err instanceof AxiosError) {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      await Swal.fire({
        title: 'Google Sign-Up Failed',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className="mk-login-shell mk-register-shell">
      <div className="mk-login-grid" aria-hidden="true" />
      <div className="mk-login-orb mk-login-orb--violet" aria-hidden="true" />
      <div className="mk-login-orb mk-login-orb--blue" aria-hidden="true" />

      <section className="mk-login-hero mk-register-hero" aria-label="Why join Markety">
        <header className="mk-login-brand">
          <span className="mk-login-brand__mark" aria-hidden="true">
            <img className="mk-login-logo-image" src="/Marketylogo.jpeg" alt="" />
          </span>
          <span className="mk-login-brand__copy">
            <strong>MARKETY</strong>
            <small>shop smart, live better</small>
          </span>
        </header>

        <div className="mk-login-hero__intro mk-register-intro">
          <span className="mk-login-eyebrow">
            <i className="fas fa-bolt" aria-hidden="true" />
            Your tech journey starts here
          </span>
          <h1>
            Create your <span>Markety account</span>
          </h1>
          <p>Join Markety today and unlock the best deals on laptops, PCs, and all your favorite tech.</p>
        </div>

        <div className="mk-register-hero__body">
          <div className="mk-register-tech" aria-hidden="true">
            <div className="mk-register-tech__halo" />
            <div className="mk-register-tech__orbit mk-register-tech__orbit--one" />
            <div className="mk-register-tech__orbit mk-register-tech__orbit--two" />

            <div className="mk-register-laptop">
              <div className="mk-register-laptop__screen">
                <div className="mk-register-laptop__topbar">
                  <span />
                  <span />
                  <span />
                  <b>MARKETY / TECH</b>
                </div>
                <div className="mk-register-laptop__content">
                  <div className="mk-register-product-copy">
                    <small>NEW GENERATION</small>
                    <strong>Built for more.</strong>
                    <span>Powerful tech. Exceptional deals.</span>
                  </div>
                  <div className="mk-register-product">
                    <div className="mk-register-product__glow" />
                    <i className="fas fa-laptop" />
                  </div>
                  <div className="mk-register-tech-tags">
                    <span><i className="fas fa-microchip" /> Ultra performance</span>
                    <span><i className="fas fa-bolt" /> Fast delivery</span>
                  </div>
                </div>
              </div>
              <div className="mk-register-laptop__base"><i /></div>
            </div>

            <div className="mk-register-float mk-register-float--deal">
              <span><i className="fas fa-tag" /></span>
              <div><small>Member deal</small><strong>Save 30%</strong></div>
            </div>
            <div className="mk-register-float mk-register-float--secure">
              <i className="fas fa-shield-alt" />
              Secure checkout
            </div>
            <div className="mk-register-float mk-register-float--delivery">
              <i className="fas fa-truck" />
              <span><strong>Free delivery</strong><small>On selected tech</small></span>
            </div>
          </div>

          <div className="mk-login-features mk-register-features">
            {registerFeatures.map((feature) => (
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

        <div className="mk-login-stats">
          <div><strong>10K+</strong><span>Products</span></div>
          <div><strong>25K+</strong><span>Happy Customers</span></div>
          <div><strong>99.9%</strong><span>Uptime</span></div>
        </div>
      </section>

      <section className="mk-login-panel mk-register-panel">
        <motion.div
          className="mk-login-card mk-register-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="mk-login-card__shine" aria-hidden="true" />

          <header className="mk-login-card__header mk-register-card__header">
            <motion.div
              className="mk-login-card__logo"
              initial={{ scale: 0.9, rotate: 6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <i className={stage === 'verify' ? 'fas fa-envelope-open-text' : 'fas fa-user-plus'} />
            </motion.div>
            <h2>{stage === 'verify' ? 'Verify your email' : 'Create your account'}</h2>
            <p>
              {stage === 'verify'
                ? 'Enter the verification code we sent to complete your registration.'
                : 'Start your shopping journey with Markety.'}
            </p>
          </header>

          <form className="mk-login-form mk-register-form" onSubmit={stage === 'register' ? handleSubmit : handleVerify}>
            {stage === 'register' ? (
              <>
                <div className="mk-login-field">
                  <label htmlFor="register-name">Full Name</label>
                  <div className="mk-login-input">
                    <i className="far fa-user" aria-hidden="true" />
                    <input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      value={formState.fullName}
                      onChange={(event) => setFormState((prev) => ({ ...prev, fullName: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="mk-login-field">
                  <label htmlFor="register-email">Email</label>
                  <div className="mk-login-input">
                    <i className="far fa-envelope" aria-hidden="true" />
                    <input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={formState.email}
                      onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="mk-login-field">
                  <label htmlFor="register-password">Password</label>
                  <div className="mk-login-input">
                    <i className="fas fa-lock" aria-hidden="true" />
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Create a password"
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
                      <i className={showPassword ? 'far fa-eye-slash' : 'far fa-eye'} />
                    </button>
                  </div>

                  {formState.password && (
                    <div className="mk-register-policy" aria-label="Password requirements">
                      {passwordPolicy.map((rule) => (
                        <span className={rule.passed ? 'is-valid' : ''} key={rule.label}>
                          <i className={rule.passed ? 'fas fa-check-circle' : 'far fa-circle'} />
                          {rule.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mk-login-field">
                  <label htmlFor="register-confirm-password">Confirm Password</label>
                  <div
                    className={`mk-login-input ${
                      formState.confirmPassword && formState.password !== formState.confirmPassword
                        ? 'mk-register-input--invalid'
                        : ''
                    }`}
                  >
                    <i className="fas fa-lock" aria-hidden="true" />
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Confirm your password"
                      value={formState.confirmPassword}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      required
                    />
                    <button
                      type="button"
                      className="mk-login-password-toggle"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showConfirmPassword}
                    >
                      <i className={showConfirmPassword ? 'far fa-eye-slash' : 'far fa-eye'} />
                    </button>
                  </div>
                  {formState.confirmPassword && formState.password !== formState.confirmPassword && (
                    <span className="mk-register-field-error">
                      <i className="fas fa-exclamation-circle" />
                      Passwords do not match
                    </span>
                  )}
                </div>

                <label className="mk-login-checkbox mk-register-terms" htmlFor="register-terms">
                  <input
                    id="register-terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    required
                  />
                  <span aria-hidden="true"><i className="fas fa-check" /></span>
                  <span className="mk-register-terms__copy">
                    I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>
                  </span>
                </label>

                <button className="mk-login-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="mk-login-spinner" aria-hidden="true" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      <span>Sign Up</span>
                      <i className="fas fa-arrow-right" aria-hidden="true" />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="mk-register-verification-note">
                  <i className="fas fa-paper-plane" aria-hidden="true" />
                  <div>
                    <strong>Code sent successfully</strong>
                    <span>We sent a verification code to {formState.email}</span>
                  </div>
                </div>

                <div className="mk-register-account-summary">
                  <span><i className="far fa-user" /></span>
                  <div>
                    <strong>{formState.fullName}</strong>
                    <small>{formState.email}</small>
                  </div>
                </div>

                <div className="mk-login-field">
                  <label htmlFor="register-code">Verification Code</label>
                  <div className="mk-login-input mk-login-input--otp">
                    <i className="fas fa-key" aria-hidden="true" />
                    <input
                      id="register-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button className="mk-login-submit" type="submit" disabled={isVerifying}>
                  {isVerifying ? (
                    <>
                      <span className="mk-login-spinner" aria-hidden="true" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <span>Verify Email</span>
                      <i className="fas fa-check" aria-hidden="true" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="mk-login-secondary-action"
                  onClick={handleResendOtp}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <span className="mk-login-spinner" aria-hidden="true" />
                      Resending code…
                    </>
                  ) : (
                    <>
                      <i className="fas fa-redo-alt" />
                      Resend verification code
                    </>
                  )}
                </button>
              </>
            )}
          </form>

          {stage === 'register' && (
            <>
              <div className="mk-login-divider"><span>or sign up with</span></div>
              <div className="mk-login-socials mk-register-socials" aria-label="Social sign-up options">
                <GoogleAuthButton
                  mode="signup"
                  onCredential={handleGoogleCredential}
                  busy={isGoogleSubmitting}
                />
              </div>
            </>
          )}

          <p className="mk-login-register">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>

          <div className="mk-login-trust">
            <span><i className="fas fa-lock" /> SSL secured</span>
            <span><i className="fas fa-shield-alt" /> Privacy protected</span>
          </div>
        </motion.div>
      </section>
    </main>
  );
};
