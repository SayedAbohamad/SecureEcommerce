import { Link } from 'react-router-dom';
import { Product } from '../../../types';
import { resolveImageUrl } from '../../../utils/media';
import { formatCurrencyEGP } from '../../../utils/currency';
import { useWishlist } from '../../../hooks/useWishlist';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface BestsellerProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  delay?: string;
}

export const BestsellerProductCard = ({ product, onAddToCart, delay = '0.1s' }: BestsellerProductCardProps) => {
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
    <div className="products-mini-item border wow fadeInUp" data-wow-delay={delay}>
      <div className="row g-0">
        <div className="col-5">
          <div className="products-mini-img border-end h-100" style={{ height: '200px', overflow: 'hidden' }}>
            <Link to={`/product/${product.id}`} className="d-block h-100">
              <img
                src={resolveImageUrl(product.imageUrl)}
                className="img-fluid w-100 h-100"
                alt={product.name}
                style={{ height: '100%', width: '100%', objectFit: 'contain', background: '#050816' }}
              />
            </Link>
            <div className="products-mini-icon rounded-circle bg-primary">
              <Link to={`/product/${product.id}`}>
                <i className="fa fa-eye fa-1x text-white"></i>
              </Link>
            </div>
          </div>
        </div>
        <div className="col-7">
          <div className="products-mini-content p-3">
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
      </div>
      <div className="products-mini-add border p-3">
        <button
          className="btn btn-primary border-secondary rounded-pill py-2 px-4"
          onClick={() => onAddToCart?.(product)}
        >
          <i className="fas fa-shopping-cart me-2"></i> Add To Cart
        </button>
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
  );
};

