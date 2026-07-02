import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useWishlist } from '../../../hooks/useWishlist';
import { useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../../../api';
import { PageHeader } from '../../../components/common/PageHeader';
import { resolveImageUrl } from '../../../utils/media';
import { showToast } from '../../../utils/toast';
import { formatCurrencyEGP } from '../../../utils/currency';

const wishlistHeroImage = `${process.env.PUBLIC_URL}/template/img/tech-page-header.svg`;

export const WishlistPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist } = useWishlist();
  const queryClient = useQueryClient();

  if (!user) {
    return (
      <>
        <PageHeader
          title="Your Wishlist"
          subtitle="Sign in to view and manage your saved items."
          image={wishlistHeroImage}
          eyebrow="Wishlist"
        />
        <div className="container py-5 text-center">
          <h2 className="text-primary mb-3">Save your favourites</h2>
          <p className="text-muted mb-4">Create an account or sign in to keep track of items you love.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/login', { state: { from: '/wishlist' } })}>
            Login to Continue
          </button>
        </div>
      </>
    );
  }

  const handleAddToCart = async (product: any) => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }

    try {
      await cartApi.add({ productId: product.id, quantity: 1 });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast.success('Item added to cart');
    } catch (error) {
      console.error(error);
      showToast.error('Unable to add to cart. Please try again.');
    }
  };

  const handleRemoveFromWishlist = (productId: string) => {
    removeFromWishlist(productId);
    showToast.success('Item removed from wishlist');
  };

  return (
    <>
      <PageHeader
        title="Your Wishlist"
        subtitle="Items you've saved for later."
        image={wishlistHeroImage}
        eyebrow="Wishlist"
      />
      <div className="container py-5">
        {wishlist.length === 0 ? (
          <div className="text-center text-muted">
            <i className="fas fa-heart fa-3x text-primary mb-3"></i>
            <h4 className="mb-2">Your wishlist is empty</h4>
            <p>Browse our catalogue and add items to your wishlist.</p>
            <button className="btn btn-outline-primary" onClick={() => navigate('/shop')}>
              Explore Products
            </button>
          </div>
        ) : (
          <>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
              <h3 className="mb-0">Saved Items ({wishlist.length})</h3>
              <button className="btn btn-outline-secondary" onClick={() => navigate('/shop')}>
                Continue Shopping
              </button>
            </div>
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '100px' }}>Image</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wishlist.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <Link to={`/product/${product.id}`}>
                              <img
                                src={resolveImageUrl(product.imageUrl)}
                                alt={product.name}
                                style={{ width: 80, height: 80, objectFit: 'contain', background: '#050816' }}
                                className="rounded"
                              />
                            </Link>
                          </td>
                          <td>
                            <Link to={`/product/${product.id}`} className="text-decoration-none">
                              <h6 className="mb-1 fw-semibold">{product.name}</h6>
                            </Link>
                            <p className="text-muted small mb-0" style={{ fontSize: '0.875rem' }}>
                              {product.description?.substring(0, 100)}
                              {product.description && product.description.length > 100 ? '...' : ''}
                            </p>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{product.categoryName || 'N/A'}</span>
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="fw-bold text-primary">{formatCurrencyEGP(product.price)}</span>
                              {product.oldPrice && product.oldPrice > product.price && (
                                <span className="text-muted text-decoration-line-through small">
                                  {formatCurrencyEGP(product.oldPrice)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="d-flex gap-2 justify-content-center">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleAddToCart(product)}
                                title="Add to cart"
                              >
                                <i className="fas fa-shopping-cart me-1" />
                                Add to Cart
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemoveFromWishlist(product.id)}
                                title="Remove from wishlist"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};



