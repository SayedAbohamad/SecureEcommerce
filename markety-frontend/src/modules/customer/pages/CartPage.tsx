import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { resolveImageUrl } from '../../../utils/media';
import { PageHeader } from '../../../components/common/PageHeader';
import { formatCurrencyEGP } from '../../../utils/currency';
import { RecommendationSection } from '../../../components/common/RecommendationSection';

const cartHeroImage = `${process.env.PUBLIC_URL}/template/img/tech-page-header.svg`;

export const CartPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: cartItems,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: Boolean(user),
  });

  const handleQuantityChange = async (productId: string, quantity: number, size?: string) => {
    if (quantity <= 0) {
      await handleRemove(productId, size);
      return;
    }
    await cartApi.update({ productId, quantity, size });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  const handleRemove = async (productId: string, size?: string) => {
    await cartApi.remove(productId, size);
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  if (!user) {
    return (
      <>
        <PageHeader
          title="Your Shopping Cart"
          subtitle="Sign in to view saved items and complete your purchase."
          image={cartHeroImage}
          eyebrow="Cart"
        />
        <div className="container py-5 text-center">
        <h2 className="text-primary mb-3">Your cart is waiting.</h2>
        <p className="text-muted mb-4">Sign in to access saved items and checkout faster.</p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/login', { state: { from: '/cart' } })}>
          Login to Continue
        </button>
        </div>
        <RecommendationSection placement="cart" />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Your Shopping Cart"
          subtitle="Review your selected items and proceed to checkout."
          image={cartHeroImage}
          eyebrow="Cart"
        />
        <LoadingOverlay />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader
          title="Your Shopping Cart"
          subtitle="We couldn't load your items. Please try again."
          image={cartHeroImage}
          eyebrow="Cart"
        />
        <div className="container py-5 text-center">
        <h2 className="text-danger">Unable to load your cart</h2>
        <p className="text-muted">Please refresh or try again later.</p>
        </div>
        <RecommendationSection placement="cart" />
      </>
    );
  }

  const total = cartItems?.reduce((acc, item) => acc + item.myTotal, 0) ?? 0;

  return (
      <>
        <PageHeader
          title="Your Shopping Cart"
          subtitle="Review your selected items and proceed to checkout."
          image={cartHeroImage}
          eyebrow="Cart"
        />
      <div className="container py-5">
      <h1 className="fw-bold mb-4">Shopping Cart</h1>
      {!cartItems || cartItems.length === 0 ? (
        <div className="text-center py-5">
          <h3 className="text-muted mb-3">Your cart is empty</h3>
          <button className="btn btn-primary" onClick={() => navigate('/shop')}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                {cartItems.map((item) => (
                  <div key={`${item.productId}-${item.size || 'no-size'}`} className="d-flex flex-column flex-md-row gap-4 border-bottom py-4">
                    <img src={resolveImageUrl(item.productImage)} alt={item.productName} style={{ width: 120, height: 120, objectFit: 'contain', background: '#050816' }} className="rounded" />
                    <div className="flex-grow-1">
                      <h5 className="fw-semibold">{item.productName}</h5>
                      {item.size && (
                        <p className="text-muted mb-1">
                          <span className="badge bg-secondary me-2">Option: {item.size}</span>
                        </p>
                      )}
                      <p className="text-muted mb-2">{formatCurrencyEGP(item.price)} per unit</p>
                      <div className="d-flex align-items-center gap-3">
                        <div className="input-group" style={{ width: 140 }}>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1, item.size)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) => handleQuantityChange(item.productId, Number(event.target.value), item.size)}
                            className="form-control text-center"
                          />
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1, item.size)}
                          >
                            +
                          </button>
                        </div>
                        <button className="btn btn-link text-danger" onClick={() => handleRemove(item.productId, item.size)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="mb-0 fw-semibold">{formatCurrencyEGP(item.myTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="fw-semibold mb-3">Order Summary</h5>
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>
                  <span className="fw-semibold">{formatCurrencyEGP(total)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Shipping</span>
                  <span className="fw-semibold text-success">Free</span>
                </div>
                <div className="d-flex justify-content-between border-top pt-3 mt-3">
                  <span className="fw-bold">Total</span>
                  <span className="fw-bold text-primary fs-5">{formatCurrencyEGP(total)}</span>
                </div>
                <button className="btn btn-primary w-100 mt-4" onClick={() => navigate('/checkout')}>
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      <RecommendationSection placement="cart" />
    </>
  );
};

