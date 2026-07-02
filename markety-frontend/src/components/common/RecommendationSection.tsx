import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi, recommendationApi } from '../../api';
import { RECOMMENDATIONS_UPDATED_EVENT } from '../../api/recommendations';
import { RecommendationProduct } from '../../types/recommendation';
import { formatCurrencyEGP } from '../../utils/currency';
import { resolveImageUrl } from '../../utils/media';
import { useAuth } from '../../hooks/useAuth';
import { showToast } from '../../utils/toast';

interface RecommendationSectionProps {
  placement: 'home' | 'product_details' | 'cart' | 'profile' | 'dashboard';
  productId?: string;
  limit?: number;
  className?: string;
}

export const RecommendationSection = ({
  placement,
  productId,
  limit = 8,
  className = '',
}: RecommendationSectionProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recommendations', user?.id ?? 'anonymous', placement, productId, limit],
    queryFn: () => recommendationApi.get({ placement, productId, limit }),
    staleTime: 1000 * 60 * 3,
  });

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshRecommendations = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        refetch();
      }, 250);
    };

    window.addEventListener(RECOMMENDATIONS_UPDATED_EVENT, refreshRecommendations);
    return () => {
      window.removeEventListener(RECOMMENDATIONS_UPDATED_EVENT, refreshRecommendations);
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [refetch]);

  const handleAddToCart = async (product: RecommendationProduct) => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }

    try {
      await cartApi.add({ productId: product.id, quantity: 1 });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast.success('Item added to cart');
    } catch (error) {
      console.error(error);
      showToast.error('Unable to add to cart');
    }
  };

  const handleProductClick = (product: RecommendationProduct, sectionType: string) => {
    recommendationApi.trackQuietly({
      eventType: 'product_click',
      productId: product.id,
      source: `recommendation_${placement}_${sectionType}`,
      metadata: {
        strategy: product.strategy,
      },
    });
  };

  if (isLoading) {
    return (
      <section className={`recommendation-block ${className}`}>
        <div className="container py-4">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <div className="placeholder-glow mb-2"><span className="placeholder col-3 rounded"></span></div>
              <div className="placeholder-glow"><span className="placeholder col-6 rounded"></span></div>
            </div>
          </div>
          <div className="row g-4">
            {[1, 2, 3, 4].map((item) => (
              <div className="col-md-6 col-lg-3" key={item}>
                <div className="recommendation-card recommendation-card--loading" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (data && !data.enabled) {
    return null;
  }

  if (isError || !data || !data.sections?.some((section) => section.items.length > 0)) {
    return (
      <section className={`recommendation-block ${className}`}>
        <div className="container py-4">
          <div className="recommendation-empty">
            <i className="fas fa-wand-magic-sparkles" />
            <div>
              <h2 className="recommendation-title mb-1">AI Recommendations</h2>
              <p className="recommendation-subtitle mb-0">
                {data?.message ?? 'Personalized suggestions will appear after you explore some products.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`recommendation-block ${className}`}>
      <div className="container py-4">
        {data.sections.map((section) => (
          <div className="mb-5" key={section.type}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-2 mb-4">
              <div>
                <span className="recommendation-eyebrow">
                  <i className="fas fa-wand-magic-sparkles me-2" />
                  AI Recommendations
                </span>
                <h2 className="recommendation-title mb-1">{section.title}</h2>
                <p className="recommendation-subtitle mb-0">{section.subtitle}</p>
              </div>
              <Link to="/shop" className="btn btn-outline-primary rounded-pill">
                Explore more <i className="fas fa-arrow-right ms-2" />
              </Link>
            </div>

            <div className="row g-4">
              {section.items.map((product) => (
                <div className="col-md-6 col-lg-3" key={`${section.type}-${product.id}`}>
                  <article className="recommendation-card h-100">
                    <Link
                      to={`/product/${product.id}`}
                      className="recommendation-card__media"
                      onClick={() => handleProductClick(product, section.type)}
                    >
                      <img src={resolveImageUrl(product.imageUrl)} alt={product.name} />
                    </Link>
                    <div className="recommendation-card__body">
                      <div className="recommendation-card__category">{product.categoryName}</div>
                      <Link
                        to={`/product/${product.id}`}
                        className="recommendation-card__name"
                        onClick={() => handleProductClick(product, section.type)}
                      >
                        {product.name}
                      </Link>
                      <div className="recommendation-card__price">{formatCurrencyEGP(product.price)}</div>
                      <p className="recommendation-card__explanation">
                        <i className="fas fa-shield-alt me-2" />
                        {product.explanation}
                      </p>
                      <button className="btn btn-primary w-100 rounded-pill" onClick={() => handleAddToCart(product)}>
                        <i className="fas fa-cart-plus me-2" />
                        Add to Cart
                      </button>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
