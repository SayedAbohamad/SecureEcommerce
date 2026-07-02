import { Link } from 'react-router-dom';
import { Product } from '../../../types';
import { resolveImageUrl } from '../../../utils/media';
import { formatCurrencyEGP } from '../../../utils/currency';
import { useWishlist } from '../../../hooks/useWishlist';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface TemplateProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  showBadge?: 'new' | 'sale' | false;
  delay?: string;
}

export const TemplateProductCard = ({ product, onAddToCart, showBadge = false, delay = '0.1s' }: TemplateProductCardProps) => {
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const inWishlist = isInWishlist(product.id);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }
    const wasInWishlist = inWishlist;
    toggleWishlist(product);
    
    // Show toast notification
    const { showToast } = await import('../../../utils/toast');
    if (wasInWishlist) {
      showToast.success('Item removed from wishlist');
    } else {
      showToast.success('Item added to wishlist');
    }
  };

  return (
    <div className="product-item rounded wow fadeInUp" data-wow-delay={delay}>
      <div className="product-item-inner border rounded">
        <div className="product-item-inner-item" style={{ height: '280px', overflow: 'hidden' }}>
          <img
            src={resolveImageUrl(product.imageUrl)}
            className="img-fluid w-100 rounded-top"
            alt={product.name}
            style={{ height: '100%', width: '100%', objectFit: 'contain', background: '#050816' }}
          />
          {showBadge === 'new' && <div className="product-new">New</div>}
          {showBadge === 'sale' && <div className="product-sale">Sale</div>}
          <div className="product-details">
            <Link to={`/product/${product.id}`}>
              <i className="fa fa-eye fa-1x"></i>
            </Link>
          </div>
        </div>
        <div className="text-center rounded-bottom p-4">
          <Link to={`/shop?category=${product.categoryId}`} className="d-block mb-2">
            {product.categoryName}
          </Link>
          <Link to={`/product/${product.id}`} className="d-block h4">
            {product.name}
          </Link>
          {product.oldPrice ? (
            <>
              <del className="me-2 fs-5">{formatCurrencyEGP(product.oldPrice)}</del>
              <span className="text-primary fs-5">{formatCurrencyEGP(product.price)}</span>
            </>
          ) : (
            <span className="text-primary fs-5">{formatCurrencyEGP(product.price)}</span>
          )}
        </div>
      </div>
      <div className="product-item-add border border-top-0 rounded-bottom text-center p-4 pt-0">
        <button
          className="btn btn-primary border-secondary rounded-pill py-2 px-4 mb-4"
          onClick={() => onAddToCart?.(product)}
        >
          <i className="fas fa-shopping-cart me-2"></i> Add To Cart
        </button>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex">
            <i className="fas fa-star text-primary"></i>
            <i className="fas fa-star text-primary"></i>
            <i className="fas fa-star text-primary"></i>
            <i className="fas fa-star text-primary"></i>
            <i className="fas fa-star"></i>
          </div>
          <div className="d-flex">
            <Link to={`/product/${product.id}`} className="text-primary d-flex align-items-center justify-content-center me-3">
              <span className="rounded-circle btn-sm-square border">
                <i className="fas fa-random"></i>
              </span>
            </Link>
            <button
              className={`text-primary d-flex align-items-center justify-content-center me-0 border-0 bg-transparent p-0 ${inWishlist ? 'text-danger' : ''}`}
              onClick={handleWishlistClick}
              title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              type="button"
            >
              <span className="rounded-circle btn-sm-square border">
                <i className={`fas fa-heart ${inWishlist ? 'text-danger' : ''}`}></i>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

