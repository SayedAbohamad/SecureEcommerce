import { Product } from '../../../types';
import { resolveImageUrl } from '../../../utils/media';
import { formatCurrencyEGP } from '../../../utils/currency';
import { useWishlist } from '../../../hooks/useWishlist';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

interface SimpleProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  badge?: string | false;
}

const truncate = (value?: string, limit = 90) => {
  if (!value) return 'Reliable tech selected to upgrade your setup.';
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}…`;
};

export const SimpleProductCard = ({ product, onAddToCart, badge }: SimpleProductCardProps) => {
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
    <div className="collection-card h-100">
      <div className="collection-card__media">
        <Link to={`/product/${product.id}`} className="d-block">
          <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="collection-card__image" />
        </Link>
        {badge && <span className="collection-card__badge">{badge}</span>}
        <div className="collection-card__actions">
          <Link
            to={`/product/${product.id}`}
            className="collection-card__action-btn"
            title="View product details"
            onClick={(e) => e.stopPropagation()}
          >
            <i className="fas fa-eye" />
          </Link>
          <button
            className="collection-card__wishlist"
            onClick={handleWishlistClick}
            title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            type="button"
          >
            <i className={`fas fa-heart ${inWishlist ? 'text-danger' : ''}`} />
          </button>
        </div>
      </div>
      <div className="collection-card__body d-flex flex-column h-100">
        <h3 className="collection-card__title">{product.name}</h3>
        <div className="collection-card__price">{formatCurrencyEGP(product.price)}</div>
        <p className="collection-card__excerpt">{truncate(product.description)}</p>
        <div className="collection-card__cta">
          <button className="btn btn-primary w-100" onClick={() => onAddToCart?.(product)}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

