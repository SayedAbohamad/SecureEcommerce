import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { Product } from '../../../types';
import { resolveImageUrl } from '../../../utils/media';
import { formatCurrencyEGP } from '../../../utils/currency';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  className?: string;
}

export const ProductCard = ({ product, onAddToCart, className }: ProductCardProps) => {
  return (
    <div className={classNames('card border-0 shadow-sm h-100 product-card', className)}>
      <div className="position-relative" style={{ height: '280px', overflow: 'hidden' }}>
        <Link to={`/product/${product.id}`} className="d-block h-100">
          <img
            src={resolveImageUrl(product.imageUrl)}
            alt={product.name}
            className="card-img-top"
            style={{ height: '100%', width: '100%', objectFit: 'contain', background: '#050816' }}
          />
        </Link>
        <div className="position-absolute top-0 end-0 p-2 d-flex flex-column gap-2">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onAddToCart?.(product)}
            title="Add to cart"
            type="button"
          >
            <i className="fas fa-shopping-cart" />
          </button>
          <Link to={`/product/${product.id}`} className="btn btn-sm btn-secondary" title="View details">
            <i className="fas fa-eye" />
          </Link>
        </div>
      </div>
      <div className="card-body d-flex flex-column">
        <span className="text-secondary text-uppercase small fw-semibold">{product.categoryName}</span>
        <h5 className="card-title fw-bold mt-2">{product.name}</h5>
        <p className="card-text text-muted flex-grow-1">{product.description}</p>
        <div className="d-flex align-items-center justify-content-between mt-3">
          <span className="fw-bold text-primary">{formatCurrencyEGP(product.price)}</span>
          {product.oldPrice && (
            <span className="text-muted text-decoration-line-through">{formatCurrencyEGP(product.oldPrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

