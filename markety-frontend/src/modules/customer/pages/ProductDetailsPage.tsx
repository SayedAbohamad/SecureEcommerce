import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { cartApi, productApi, recommendationApi, reviewApi } from '../../../api';
import { RecommendationSection } from '../../../components/common/RecommendationSection';
import { ReviewSummaryCard } from '../../../components/common/ReviewSummaryCard';
import { executeRecaptcha } from '../../../utils/recaptcha';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { useAuth } from '../../../hooks/useAuth';
import { useWishlist } from '../../../hooks/useWishlist';
import { resolveImageUrl } from '../../../utils/media';
import { formatCurrencyEGP } from '../../../utils/currency';
import { showToast } from '../../../utils/toast';
import { ReviewQueryResponse, ReviewSort } from '../../../types/review';

const reviewPageSize = 4;

export const ProductDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'description' | 'additional' | 'reviews'>('description');
  const [reviewSort, setReviewSort] = useState<ReviewSort>('latest');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getById(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      setSelectedSize(product.sizes[0]);
    }
  }, [product, selectedSize]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product]);

  useEffect(() => {
    if (!product?.id) return;
    recommendationApi.trackQuietly({
      eventType: 'product_view',
      productId: product.id,
      source: 'product_details',
    });
  }, [product?.id]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const images = [product.imageUrl];
    if (product.additionalImages) {
      try {
        const parsed = JSON.parse(product.additionalImages);
        if (Array.isArray(parsed)) {
          images.push(...parsed);
        }
      } catch (e) {
        console.error("Failed to parse additional images", e);
      }
    }
    return images;
  }, [product]);

  const parsedDescription = useMemo(() => {
    if (!product?.description) return null;
    try {
      const parsed = JSON.parse(product.description);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed) as [string, string][];
      }
    } catch (e) {
      // Not JSON
    }
    return null;
  }, [product?.description]);

  const shortDescriptionText = useMemo(() => {
    if (!product?.description) return '';
    try {
      const parsed = JSON.parse(product.description);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');
      }
    } catch (e) {
      // Plain text
    }
    return product.description;
  }, [product?.description]);

  const reviewsQuery = useInfiniteQuery<ReviewQueryResponse>({
    queryKey: ['productReviews', id, reviewSort],
    queryFn: ({ pageParam = 1 }) =>
      reviewApi.getByProduct(id!, {
        sort: reviewSort,
        page: pageParam as number,
        pageSize: reviewPageSize,
      }),
    initialPageParam: 1,
    enabled: Boolean(id),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const reviews = useMemo(
    () => reviewsQuery.data?.pages.flatMap((page) => page.reviews) ?? [],
    [reviewsQuery.data],
  );

  const reviewSummary = reviewsQuery.data?.pages[0];
  const averageRating = reviewSummary?.averageRating ?? 0;
  const totalReviews = reviewSummary?.totalReviews ?? 0;
  const ratingDistribution = reviewSummary?.distribution ?? {
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0,
  };
  const hasReviewed = reviewSummary?.hasReviewed ?? false;

  const reviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment: string; recaptchaToken?: string }) => {
      return reviewApi.create(id!, payload);
    },
    onSuccess: () => {
      setReviewComment('');
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ['productReviews', id, reviewSort] });
      showToast.success('Review submitted successfully!');
    },
    onError: (error) => {
      console.error(error);
      showToast.error('Unable to submit review.');
    },
  });

  const handleAddToCart = async () => {
    if (!product) return;

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      showToast.error('Please select an option');
      return;
    }

    if (!user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }

    try {
      await cartApi.add({
        productId: product.id,
        quantity,
        size: selectedSize || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast.success('Item added to cart');
    } catch (error) {
      console.error(error);
      showToast.error('Unable to add to cart');
    }
  };

  const handleReviewSubmit = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }

    if (!reviewComment.trim()) {
      showToast.error('Please write your review.');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      showToast.error('Please select a valid rating.');
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha('submit_review');
      reviewMutation.mutate({ rating: reviewRating, comment: reviewComment.trim(), recaptchaToken });
    } catch (err) {
      console.error(err);
      showToast.error('Failed to submit review.');
    }
  };

  const currentSku = product?.slug?.toUpperCase() || product?.id?.slice(0, 8).toUpperCase() || 'N/A';

  const discountPercent = product?.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : undefined;

  const getBarWidth = (count: number) => {
    if (!totalReviews) return 0;
    return Math.max(6, Math.round((count / totalReviews) * 100));
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (isError || !product) {
    return (
      <div className="container py-5 text-center">
        <h2 className="text-danger">Product not found</h2>
        <p className="text-muted">The product you are looking for might be unavailable.</p>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="mb-4 d-flex flex-column flex-md-row align-items-start justify-content-between gap-3">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><button type="button" className="btn btn-link p-0 text-decoration-none" onClick={() => navigate('/')}>Home</button></li>
              <li className="breadcrumb-item"><button type="button" className="btn btn-link p-0 text-decoration-none" onClick={() => navigate('/shop')}>{product.categoryName || 'Shop'}</button></li>
              <li className="breadcrumb-item active" aria-current="page">{product.name}</li>
            </ol>
          </nav>
          <h2 className="fw-bold mb-1">{product.name}</h2>
          <div className="d-flex flex-wrap align-items-center gap-3 text-muted">
            <div className="d-flex align-items-center gap-1">
              <span className="text-warning">{Array.from({ length: 5 }, (_, index) => (
                <i
                  key={index}
                  className={`fas fa-star ${index < Math.round(averageRating) ? 'text-warning' : 'text-secondary'}`}
                />
              ))}</span>
              <span className="fw-semibold">{averageRating.toFixed(1)}</span>
            </div>
            <span>{totalReviews} reviews</span>
            <span className="badge bg-light text-dark">SKU: {currentSku}</span>
          </div>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left me-2" /> Back to Shop
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="product-card p-4 rounded-4 shadow-sm bg-white">
            <div className="d-flex gap-3">
              {galleryImages.length > 1 && (
                <div className="product-thumbnails d-none d-md-flex flex-column">
                  {galleryImages.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`product-thumb ${activeImageIndex === index ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(index)}
                    >
                      <img src={resolveImageUrl(image)} alt={`${product.name} thumbnail ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}

              <div className="product-image-card position-relative overflow-hidden rounded-4">
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="badge badge-sale">Sale</span>
                )}
                <img
                  src={resolveImageUrl(galleryImages[activeImageIndex] ?? product.imageUrl)}
                  alt={product.name}
                  className="product-main-image"
                />
                <span className="image-overlay-icon rounded-circle bg-white shadow-sm">
                  <i className="fas fa-search"></i>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="product-card p-4 rounded-4 shadow-sm bg-white h-100">
            <div className="d-flex flex-column gap-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-primary text-white">{product.categoryName}</span>
                    {discountPercent && discountPercent > 0 && (
                      <span className="badge bg-purple text-white">Save {discountPercent}%</span>
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="h2 text-primary mb-0">{formatCurrencyEGP(product.price)}</span>
                    {product.oldPrice && product.oldPrice > product.price && (
                      <span className="text-muted text-decoration-line-through">{formatCurrencyEGP(product.oldPrice)}</span>
                    )}
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-muted small">Item code</div>
                  <div className="fw-semibold">{currentSku}</div>
                </div>
              </div>

              <p className="text-muted mb-0">{shortDescriptionText.length > 180 ? `${shortDescriptionText.slice(0, 180)}...` : shortDescriptionText}</p>

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <div className="mb-3 fw-semibold">Select Option</div>
                  <div className="d-flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`btn ${selectedSize === size ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex flex-wrap align-items-center gap-3">
                <div className="quantity-picker d-flex align-items-center rounded-4 border px-3 py-2">
                  <button type="button" className="btn btn-sm btn-link text-dark p-0" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}>
                    <i className="fas fa-minus" />
                  </button>
                  <span className="mx-3 fw-semibold">{quantity}</span>
                  <button type="button" className="btn btn-sm btn-link text-dark p-0" onClick={() => setQuantity((prev) => Math.min(10, prev + 1))}>
                    <i className="fas fa-plus" />
                  </button>
                </div>

                <button type="button" className="btn btn-primary btn-lg" onClick={handleAddToCart}>
                  <i className="fas fa-shopping-cart me-2" /> Add to Cart
                </button>

                <button
                  type="button"
                  className={`btn btn-outline-secondary btn-lg ${user ? '' : 'disabled'}`}
                  onClick={async () => {
                    if (!user) return;
                    const wasInWishlist = isInWishlist(product.id);
                    toggleWishlist(product);
                    if (wasInWishlist) {
                      showToast.success('Item removed from wishlist');
                    } else {
                      showToast.success('Item added to wishlist');
                    }
                  }}
                >
                  <i className="fas fa-heart me-2"></i>
                  {isInWishlist(product.id) ? 'In Wishlist' : 'Add to Wishlist'}
                </button>
              </div>

              <div className="feature-grid mt-4">
                <div className="feature-card">
                  <i className="fas fa-shipping-fast text-primary"></i>
                  <div>
                    <div className="fw-semibold">Free Shipping</div>
                    <div className="text-muted small">On all orders</div>
                  </div>
                </div>
                <div className="feature-card">
                  <i className="fas fa-undo text-primary"></i>
                  <div>
                    <div className="fw-semibold">Easy Returns</div>
                    <div className="text-muted small">30-day policy</div>
                  </div>
                </div>
                <div className="feature-card">
                  <i className="fas fa-shield-alt text-primary"></i>
                  <div>
                    <div className="fw-semibold">Secure Payment</div>
                    <div className="text-muted small">100% secure</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="product-tabs mt-5 bg-white rounded-4 shadow-sm p-4">
        <div className="d-flex flex-wrap gap-2 mb-4">
          {[
            { key: 'description', label: 'Description' },
            { key: 'additional', label: 'Additional Information' },
            { key: 'reviews', label: 'Reviews' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tab-pill ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as 'description' | 'additional' | 'reviews')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'description' && (
          <div className="pb-3 animate-fade-in">
            <h5 className="fw-semibold mb-4 text-dark d-flex align-items-center gap-2">
              <i className="fas fa-list-alt text-primary" />
              <span>Specifications</span>
            </h5>
            {parsedDescription ? (
              <div className="table-responsive rounded-4 border border-secondary border-opacity-10 overflow-hidden shadow-sm">
                <table className="table table-hover mb-0 align-middle">
                  <tbody>
                    {parsedDescription.map(([key, value], idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td 
                          className="fw-bold text-secondary border-end py-3 px-4" 
                          style={{ 
                            width: '30%', 
                            minWidth: '150px', 
                            fontSize: '0.9rem', 
                            backgroundColor: '#F8F9FA',
                            color: '#4B5563'
                          }}
                        >
                          {key}
                        </td>
                        <td className="text-dark py-3 px-4fw-semibold" style={{ fontSize: '0.9rem', color: '#1F2937' }}>
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted leading-relaxed" style={{ whiteSpace: 'pre-line', fontSize: '0.95rem' }}>{product.description}</p>
            )}
          </div>
        )}

        {activeTab === 'additional' && (
          <div className="pb-3 row gy-3">
            <div className="col-md-6">
              <div className="rounded-4 border p-4 h-100">
                <h6 className="mb-3">Product Details</h6>
                <p className="mb-2"><span className="fw-semibold">Category:</span> {product.categoryName}</p>
                <p className="mb-2"><span className="fw-semibold">Availability:</span> {product.stock > 0 ? 'In stock' : 'Out of stock'}</p>
                <p className="mb-2"><span className="fw-semibold">SKU:</span> {currentSku}</p>
                <p className="mb-0"><span className="fw-semibold">Options:</span> {product.sizes?.join(', ') || 'Standard configuration'}</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="rounded-4 border p-4 h-100">
                <h6 className="mb-3">Why customers love it</h6>
                <ul className="list-unstyled mb-0 text-muted">
                  <li className="mb-2">• Carefully selected components and trusted technology brands.</li>
                  <li className="mb-2">• Fast delivery and dedicated technical support.</li>
                  <li>• Reliable performance for gaming, work, and everyday use.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="pb-3">
            <ReviewSummaryCard productId={product.id} totalReviews={totalReviews} />
            <div className="row gy-4">
              <div className="col-lg-4">
                <div className="review-summary-card p-4 rounded-4 h-100">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                      <h1 className="mb-1">{averageRating.toFixed(1)}</h1>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        {Array.from({ length: 5 }, (_, index) => (
                          <i
                            key={index}
                            className={`fas fa-star ${index < Math.round(averageRating) ? 'text-warning' : 'text-muted'}`}
                          />
                        ))}
                      </div>
                      <div className="text-muted">Based on {totalReviews} reviews</div>
                    </div>
                  </div>

                  {['5', '4', '3', '2', '1'].map((label) => {
                    const count =
                      label === '5'
                        ? ratingDistribution.fiveStars
                        : label === '4'
                        ? ratingDistribution.fourStars
                        : label === '3'
                        ? ratingDistribution.threeStars
                        : label === '2'
                        ? ratingDistribution.twoStars
                        : ratingDistribution.oneStar;

                    return (
                      <div className="mb-3" key={label}>
                        <div className="d-flex justify-content-between small text-muted mb-2">
                          <span>{label} stars</span>
                          <span>{count}</span>
                        </div>
                        <div className="rating-bar">
                          <div className="rating-bar__fill" style={{ width: `${getBarWidth(count)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-lg-5">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                  <div>
                    <div className="small text-muted">Sort by</div>
                    <select
                      className="form-select mt-2"
                      value={reviewSort}
                      onChange={(e) => setReviewSort(e.target.value as ReviewSort)}
                    >
                      <option value="latest">Latest</option>
                      <option value="highest">Highest Rating</option>
                      <option value="lowest">Lowest Rating</option>
                    </select>
                  </div>
                </div>

                {reviewsQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((index) => (
                      <div key={index} className="p-4 rounded-4 bg-light shimmer"></div>
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="review-empty-state p-5 rounded-4 text-center">
                    <div className="mb-3 display-6 text-primary">No reviews yet</div>
                    <p className="text-muted">Be the first to share your experience with this product.</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {reviews.map((review) => (
                      <div className="review-card p-4 rounded-4 bg-white shadow-sm" key={review.id}>
                        <div className="d-flex align-items-start gap-3 mb-3">
                          <div className="review-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                            {review.userName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                              <div>
                                <div className="fw-semibold">{review.userName}</div>
                                <div className="text-muted small">{new Date(review.createdAt).toLocaleDateString()}</div>
                              </div>
                              {review.isVerifiedPurchase && <span className="badge bg-light text-success">Verified Buyer</span>}
                            </div>
                            <div className="mb-2">
                              {Array.from({ length: 5 }, (_, index) => (
                                <i
                                  key={index}
                                  className={`fas fa-star ${index < review.rating ? 'text-warning' : 'text-muted'}`}
                                />
                              ))}
                            </div>
                            <p className="mb-0 text-muted">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {reviewsQuery.hasNextPage && (
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => reviewsQuery.fetchNextPage()}
                      disabled={reviewsQuery.isFetchingNextPage}
                    >
                      {reviewsQuery.isFetchingNextPage ? 'Loading...' : 'Load More Reviews'}
                    </button>
                  </div>
                )}
              </div>

              <div className="col-lg-3">
                <div className="review-form-card p-4 rounded-4 h-100">
                  <h5 className="fw-semibold mb-3">Write a Review</h5>
                  {user ? (
                    hasReviewed ? (
                      <div className="alert alert-success mb-0">
                        You have already reviewed this product.
                      </div>
                    ) : (
                      <>
                        <div className="mb-3">
                          <div className="fw-semibold mb-2">Your Rating</div>
                          <div className="d-flex gap-1">
                            {Array.from({ length: 5 }, (_, index) => {
                              const value = index + 1;
                              const active = value <= (hoverRating || reviewRating);
                              return (
                                <button
                                  type="button"
                                  key={value}
                                  className={`review-star-btn ${active ? 'active' : ''}`}
                                  onMouseEnter={() => setHoverRating(value)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  onClick={() => setReviewRating(value)}
                                >
                                  <i className="fas fa-star"></i>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold">Your Comment</label>
                          <textarea
                            rows={5}
                            className="form-control"
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Share your experience..."
                          />
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary w-100"
                          disabled={reviewMutation.isPending}
                          onClick={handleReviewSubmit}
                        >
                          {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                        </button>
                      </>
                    )
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted mb-4">Sign in to leave a review and help other shoppers.</p>
                      <button type="button" className="btn btn-primary" onClick={() => navigate('/login', { state: { from: `/product/${id}` } })}>
                        Login to Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <RecommendationSection placement="product_details" productId={product.id} />
    </div>
  );
};

