import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orderApi, cartApi, addressApi, promoCodeApi, UserAddress } from '../../../api';
import { useAuth } from '../../../hooks/useAuth';
import { executeRecaptcha } from '../../../utils/recaptcha';
import { PageHeader } from '../../../components/common/PageHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { showToast } from '../../../utils/toast';
import { formatCurrencyEGP } from '../../../utils/currency';
import { CartItem } from '../../../types';

const paymentOptions = [
  { value: 'CashOnDelivery', label: 'Cash on Delivery' },
  { value: 'CreditCard', label: 'Credit Card' },
];

const checkoutHeroImage = `${process.env.PUBLIC_URL}/template/img/tech-page-header.svg`;

export const CheckoutPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState(paymentOptions[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    calculatedDiscount: number;
    description: string;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setValidatingPromo(true);
    setPromoError('');
    try {
      const result = await promoCodeApi.validate(promoCodeInput.trim().toUpperCase(), total);
      if (result.valid) {
        setAppliedPromo(result);
        showToast.success(`Promo code "${result.code}" applied!`);
      } else {
        setPromoError('Invalid promo code.');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.title || 'Invalid or expired promo code.';
      setPromoError(errMsg);
      showToast.error(errMsg);
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError('');
    showToast.success('Promo code removed.');
  };

  // Form State
  const [formData, setFormData] = useState({
    city: '',
    street: '',
    zipCode: '',
    phoneNumber: ''
  });

  useEffect(() => {
    const stripeSuccess = searchParams.get('stripeSuccess');
    const stripeCanceled = searchParams.get('stripeCanceled');
    const sessionId = searchParams.get('session_id');

    if (stripeCanceled) {
      showToast.error('Stripe payment was canceled.');
      setSearchParams({}, { replace: true });
      return;
    }

    if (stripeSuccess && sessionId) {
      const handledKey = `stripe_session_handled_${sessionId}`;
      const processingKey = `stripe_session_processing_${sessionId}`;
      if (sessionStorage.getItem(handledKey)) {
        setSearchParams({}, { replace: true });
        return;
      }
      if (sessionStorage.getItem(processingKey)) {
        return;
      }
      sessionStorage.setItem(processingKey, 'true');

      const finalizeStripeOrder = async () => {
        try {
          const verify = await orderApi.verifyStripeSession(sessionId);
          if (!verify.isPaid) {
            showToast.error('Payment was not completed. Please try again.');
            return;
          }

          const savedPromo = sessionStorage.getItem('applied_promo_code') || undefined;
          const recaptchaToken = await executeRecaptcha('checkout');
          await orderApi.checkout({ paymentMethod: 'CreditCard', promoCode: savedPromo, recaptchaToken });
          sessionStorage.removeItem('applied_promo_code');
          queryClient.setQueryData(['cart'], []);
          await queryClient.invalidateQueries({ queryKey: ['cart'] });
          sessionStorage.setItem(handledKey, 'true');

          await Swal.fire({
            title: 'Payment Successful!',
            text: 'Your Stripe payment is complete and your order has been placed.',
            icon: 'success',
            confirmButtonText: 'View My Orders',
            confirmButtonColor: '#5B3DC8',
          });
          navigate('/orders', { replace: true });
        } catch (error) {
          console.error(error);
          showToast.error('Unable to finalize your Stripe order. Please contact support.');
        } finally {
          sessionStorage.removeItem(processingKey);
          setSearchParams({}, { replace: true });
        }
      };

      finalizeStripeOrder();
    }
  }, [navigate, queryClient, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;
      try {
        const data = await addressApi.getAll();
        setAddresses(data);
        const defaultAddr = data.find(a => a.isDefault);
        if (defaultAddr) {
          setFormData({
            city: defaultAddr.city,
            street: defaultAddr.street,
            zipCode: defaultAddr.zipCode || '',
            phoneNumber: user.phoneNumber || ''
          });
        } else {
          setFormData({
            city: '',
            street: user.address || '',
            zipCode: '',
            phoneNumber: user.phoneNumber || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch addresses', error);
      } finally {
        setLoadingAddresses(false);
      }
    };
    fetchAddresses();
  }, [user]);

  const { data: cartItems } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: Boolean(user),
  });

  const total = cartItems?.reduce((acc: number, item: CartItem) => acc + item.myTotal, 0) ?? 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (paymentMethod === 'CreditCard') {
        if (appliedPromo?.code) {
          sessionStorage.setItem('applied_promo_code', appliedPromo.code);
        } else {
          sessionStorage.removeItem('applied_promo_code');
        }
        const recaptchaToken = await executeRecaptcha('stripe_checkout');
        const session = await orderApi.createStripeCheckoutSession(appliedPromo?.code, recaptchaToken);
        if (!session.url) {
          throw new Error('Unable to start Stripe checkout.');
        }
        window.location.href = session.url;
        return;
      }

      const recaptchaToken = await executeRecaptcha('checkout');
      await orderApi.checkout({ paymentMethod, promoCode: appliedPromo?.code, recaptchaToken });
      queryClient.setQueryData(['cart'], []);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });

      await Swal.fire({
        title: 'Thank you for your order!',
        text: 'Your order has been placed successfully.',
        icon: 'success',
        confirmButtonText: 'View My Orders',
        confirmButtonColor: '#5B3DC8',
        showCloseButton: true,
        backdrop: true,
      });
      navigate('/orders');
    } catch (error) {
      console.error(error);
      showToast.error('Unable to place the order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <>
        <PageHeader title="Checkout" subtitle="Sign in to complete your Markety order securely." image={checkoutHeroImage} eyebrow="Secure" />
        <div className="container py-5 text-center">
        <h2 className="text-primary mb-3">Sign in to complete your order</h2>
        <button className="btn btn-primary" onClick={() => navigate('/login', { state: { from: '/checkout' } })}>
          Login to Continue
        </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Checkout"
        subtitle="Provide billing details and choose your preferred payment method."
        image={checkoutHeroImage}
        eyebrow="Secure"
      />
      <div className="container py-5">
      <h1 className="fw-bold mb-4">Secure Checkout</h1>
      <form className="row g-4" onSubmit={handleSubmit}>
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-semibold mb-0">Billing Information</h5>
                {addresses.length > 0 && (
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => navigate('/settings')}>
                    Manage Saved Addresses
                  </button>
                )}
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" value={user.fullName} disabled />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={user.email} disabled />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={formData.phoneNumber} 
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    required 
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">City</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.city} 
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    required 
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Address</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.street} 
                    onChange={(e) => setFormData({...formData, street: e.target.value})}
                    required 
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Postal Code</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.zipCode} 
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                    required 
                  />
                </div>
              </div>
              
              {addresses.length > 0 && (
                <div className="mt-4 p-3 bg-light rounded-3">
                  <p className="small text-muted mb-2"><i className="fas fa-info-circle me-1" /> Use a saved address:</p>
                  <div className="d-flex flex-wrap gap-2">
                    {addresses.map(addr => (
                      <button
                        key={addr.id}
                        type="button"
                        className={`btn btn-sm ${formData.street === addr.street ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setFormData({
                          city: addr.city,
                          street: addr.street,
                          zipCode: addr.zipCode || '',
                          phoneNumber: user.phoneNumber || ''
                        })}
                      >
                        {addr.street}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Order Summary</h5>
              <div className="cart-items-mini mb-3">
                {cartItems?.map((item: CartItem) => (
                  <div key={`${item.productId}-${item.size}`} className="d-flex justify-content-between align-items-center mb-2 small">
                    <span className="text-muted">{item.quantity}x {item.productName}</span>
                    <span className="fw-semibold">{formatCurrencyEGP(item.myTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span className="fw-semibold">{formatCurrencyEGP(total)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping</span>
                <span className="fw-semibold text-success">Free</span>
              </div>

              {/* Promo Code Application Widget */}
              <div className="border-top pt-3 mt-3 mb-3">
                <label className="form-label small fw-semibold text-muted">Have a Promo Code?</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Enter code"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    disabled={!!appliedPromo || validatingPromo}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {appliedPromo ? (
                    <button className="btn btn-outline-danger btn-sm" type="button" onClick={handleRemovePromo}>
                      Remove
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={validatingPromo || !promoCodeInput.trim()}
                    >
                      {validatingPromo ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                </div>
                {promoError && <div className="text-danger small mt-1"><i className="fas fa-exclamation-circle me-1" />{promoError}</div>}
                {appliedPromo && (
                  <div className="text-success small mt-1">
                    <i className="fas fa-check-circle me-1" />
                    <strong>{appliedPromo.code}</strong> applied! ({appliedPromo.description})
                  </div>
                )}
              </div>

              {appliedPromo && (
                <div className="d-flex justify-content-between mb-2 text-success fw-semibold">
                  <span>Discount</span>
                  <span>-{formatCurrencyEGP(appliedPromo.calculatedDiscount)}</span>
                </div>
              )}

              <div className="d-flex justify-content-between border-top pt-3 mt-3">
                <span className="fw-bold">Total</span>
                <span className="fw-bold text-primary fs-5">
                  {formatCurrencyEGP(appliedPromo ? Math.max(0, total - appliedPromo.calculatedDiscount) : total)}
                </span>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Payment Method</h5>
              {paymentOptions.map((option) => (
                <div className="form-check mb-2" key={option.value}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="payment"
                    id={option.value}
                    value={option.value}
                    checked={paymentMethod === option.value}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  />
                  <label className="form-check-label" htmlFor={option.value}>
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          {paymentMethod === 'CreditCard' && (
            <div className="alert alert-info small">
              <i className="fas fa-lock me-2" />
              Redirecting to secure Stripe checkout.
            </div>
          )}
          <button className="btn btn-primary btn-lg w-100 shadow-sm" type="submit" disabled={isSubmitting || total === 0}>
            {isSubmitting ? 'Processing...' : paymentMethod === 'CreditCard' ? 'Pay with Stripe' : 'Place Order'}
          </button>
        </div>
      </form>
      </div>
    </>
  );
};
