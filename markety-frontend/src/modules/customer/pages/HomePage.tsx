import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { categoryApi, productApi } from '../../../api';
import { TemplateProductCard } from '../components/TemplateProductCard';
import { BestsellerProductCard } from '../components/BestsellerProductCard';
import { RecommendationSection } from '../../../components/common/RecommendationSection';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { cartApi } from '../../../api';
import { resolveImageUrl } from '../../../utils/media';
import { formatCurrencyEGP } from '../../../utils/currency';

declare global {
  interface Window {
    WOW: any;
    $: any;
    jQuery: any;
  }
}

export const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tab-1');

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: () => productApi.getCatalog(),
  });

  const allProducts = useMemo(() => products || [], [products]);
  const featuredProducts = useMemo(() => products?.filter((p, i) => i % 3 === 0).slice(0, 8) || [], [products]);
  const newArrivals = useMemo(() => products?.slice(0, 4) || [], [products]);
  const topSelling = useMemo(() => products?.slice(-4) || [], [products]);
  const bestsellerProducts = useMemo(() => products?.slice(0, 6) || [], [products]);

  useEffect(() => {
    // Initialize WOW.js and Owl Carousel after libraries are loaded
    let wowInstance: any = null;
    let headerCarousel: any = null;
    let productListCarousel: any = null;
    let productImgCarousels: any[] = [];

    const initAnimations = () => {
      const $ = (window as any).$;
      if (!$) return;

      // Initialize WOW.js
      if ((window as any).WOW) {
        wowInstance = new (window as any).WOW({
          boxClass: 'wow',
          animateClass: 'animated',
          offset: 0,
          mobile: true,
          live: true,
        });
        wowInstance.init();
      }

      // Initialize Owl Carousel for header carousel
      if ($.fn.owlCarousel) {
        // Destroy existing carousel if it exists
        if ($('.header-carousel').length && $('.header-carousel').data('owl.carousel')) {
          $('.header-carousel').trigger('destroy.owl.carousel').removeClass('owl-carousel owl-loaded');
          $('.header-carousel').find('.owl-stage-outer').children().unwrap();
        }
        
        if ($('.header-carousel').length) {
          headerCarousel = $('.header-carousel').owlCarousel({
            items: 1,
            autoplay: true,
            smartSpeed: 2000,
            center: false,
            dots: false,
            loop: true,
            margin: 0,
            nav: true,
            navText: [
              '<i class="bi bi-arrow-left"></i>',
              '<i class="bi bi-arrow-right"></i>'
            ]
          });
        }

        // Initialize ProductList carousel
        if ($('.productList-carousel').length && $('.productList-carousel').data('owl.carousel')) {
          $('.productList-carousel').trigger('destroy.owl.carousel').removeClass('owl-carousel owl-loaded');
          $('.productList-carousel').find('.owl-stage-outer').children().unwrap();
        }

        if ($('.productList-carousel').length) {
          productListCarousel = $('.productList-carousel').owlCarousel({
            autoplay: true,
            smartSpeed: 2000,
            dots: false,
            loop: true,
            margin: 25,
            nav: true,
            navText: [
              '<i class="fas fa-chevron-left"></i>',
              '<i class="fas fa-chevron-right"></i>'
            ],
            responsiveClass: true,
            responsive: {
              0: { items: 1 },
              576: { items: 1 },
              768: { items: 2 },
              992: { items: 2 },
              1200: { items: 3 }
            }
          });
        }

        // Initialize ProductList categories carousel (nested)
        $('.productImg-carousel').each((_: number, el: HTMLElement) => {
          const $carousel = $(el);
          if ($carousel.data('owl.carousel')) {
            $carousel.trigger('destroy.owl.carousel').removeClass('owl-carousel owl-loaded');
            $carousel.find('.owl-stage-outer').children().unwrap();
          }
          
          if ($carousel.length) {
            const carouselInstance = $carousel.owlCarousel({
              autoplay: true,
              smartSpeed: 1500,
              dots: false,
              loop: true,
              items: 1,
              margin: 25,
              nav: true,
              navText: [
                '<i class="bi bi-arrow-left"></i>',
                '<i class="bi bi-arrow-right"></i>'
              ]
            });
            productImgCarousels.push(carouselInstance);
          }
        });
      }
    };

    // Wait for libraries to be available
    const checkLibraries = () => {
      if (
        typeof window !== 'undefined' &&
        (window as any).WOW &&
        (window as any).$ &&
        (window as any).$.fn.owlCarousel &&
        products &&
        products.length > 0
      ) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          initAnimations();
        }, 200);
      } else if (typeof window !== 'undefined') {
        // Retry after a short delay
        const timer = setTimeout(checkLibraries, 100);
        return () => clearTimeout(timer);
      }
    };

    const timer = setTimeout(checkLibraries, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      const $ = (window as any).$;
      if ($) {
        // Destroy carousels
        if ($('.header-carousel').length && $('.header-carousel').data('owl.carousel')) {
          $('.header-carousel').trigger('destroy.owl.carousel');
        }
        if ($('.productList-carousel').length && $('.productList-carousel').data('owl.carousel')) {
          $('.productList-carousel').trigger('destroy.owl.carousel');
        }
        $('.productImg-carousel').each((_: number, el: HTMLElement) => {
          const $el = $(el as HTMLElement);
          if ($el.data('owl.carousel')) {
            $el.trigger('destroy.owl.carousel');
          }
        });
      }
    };
  }, [products]);

  const handleAddToCart = async (product: any) => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }

    try {
      await cartApi.add({ productId: product.id, quantity: 1 });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      const { showToast } = await import('../../../utils/toast');
      showToast.success('Item added to cart');
    } catch (error) {
      console.error(error);
      const { showToast } = await import('../../../utils/toast');
      showToast.error('Unable to add to cart. Please try again.');
    }
  };

  if (categoriesLoading || productsLoading) {
    return <LoadingOverlay />;
  }

  if (categoriesError || productsError) {
    return (
      <div className="container py-5 text-center">
        <h2 className="text-danger">Unable to load our catalogue right now.</h2>
        <p className="text-muted">Please refresh the page or come back later.</p>
      </div>
    );
  }

  return (
    <>
      {/* Carousel Start */}
      <div className="container-fluid carousel bg-light px-0">
        <div className="row g-0">
          <div className="col-12">
            <div className="header-carousel owl-carousel bg-light py-5">
              {/* Slide 1 */}
              <div className="row g-0 header-carousel-item align-items-center">
                <div className="col-xl-6 carousel-img carousel-img--real wow fadeInLeft" data-wow-delay="0.1s">
                  <img
                    src={`${process.env.PUBLIC_URL}/template/img/gaming-setup-real.jpg`}
                    className="w-100"
                    alt="Real RGB gaming PC desk setup"
                  />
                </div>
                <div className="col-xl-6 carousel-content p-4">
                  <h4 className="text-uppercase fw-bold mb-4 wow fadeInRight" data-wow-delay="0.1s" style={{ letterSpacing: '3px' }}>
                    Gaming & Productivity
                  </h4>
                  <h1 className="display-3 text-capitalize mb-4 wow fadeInRight" data-wow-delay="0.3s">
                    Upgrade Your Tech Setup
                  </h1>
                  <p className="text-dark wow fadeInRight" data-wow-delay="0.5s">
                    Shop powerful laptops, gaming PCs, graphics cards, RAM, monitors, and accessories.
                  </p>
                  <Link className="btn btn-primary rounded-pill py-3 px-5 wow fadeInRight" data-wow-delay="0.7s" to="/shop">
                    Shop Now
                  </Link>
                </div>
              </div>
              {/* Slide 2 */}
              <div className="row g-0 header-carousel-item align-items-center">
                <div className="col-xl-6 carousel-img carousel-img--real wow fadeInLeft" data-wow-delay="0.1s">
                  <img
                    src={`${process.env.PUBLIC_URL}/template/img/pc-components-real.jpg`}
                    className="w-100"
                    alt="Real PC motherboard and graphics card components"
                  />
                </div>
                <div className="col-xl-6 carousel-content p-4">
                  <h4 className="text-uppercase fw-bold mb-4 wow fadeInRight" data-wow-delay="0.1s" style={{ letterSpacing: '3px' }}>
                    Components & Accessories
                  </h4>
                  <h1 className="display-3 text-capitalize mb-4 wow fadeInRight" data-wow-delay="0.3s">
                    Build Your Dream PC
                  </h1>
                  <p className="text-dark wow fadeInRight" data-wow-delay="0.5s">
                    Find GPUs, processors, memory, storage, keyboards, mice, and everything your setup needs.
                  </p>
                  <Link className="btn btn-primary rounded-pill py-3 px-5 wow fadeInRight" data-wow-delay="0.7s" to="/shop">
                    Explore Products
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Carousel End */}

      {/* Services Start */}
      <div className="container-fluid px-0">
        <div className="row g-0">
          <div className="col-6 col-md-4 col-lg-2 border-start border-end wow fadeInUp" data-wow-delay="0.1s">
            <div className="p-4">
              <div className="d-inline-flex align-items-center">
                <i className="fa fa-sync-alt fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Free Return</h6>
                  <p className="mb-0">30 days money back guarantee!</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.2s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fab fa-telegram-plane fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Free Shipping</h6>
                  <p className="mb-0">Free shipping on all order</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.3s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-life-ring fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Support 24/7</h6>
                  <p className="mb-0">We support online 24 hrs a day</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.4s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-credit-card fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Receive Gift Card</h6>
                  <p className="mb-0">Receive gift all over order 500 LE</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.5s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-lock fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Secure Payment</h6>
                  <p className="mb-0">We Value Your Security</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.6s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-blog fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Online Service</h6>
                  <p className="mb-0">Free return products in 30 days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Services End */}

      {/* Products Offer Start (Dynamic from DB) */}
      <div className="container-fluid bg-light py-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-6 wow fadeInLeft" data-wow-delay="0.2s">
              {featuredProducts[0] ? (
                <div
                  className="d-flex align-items-center justify-content-between border bg-white rounded p-4"
                  role="button"
                  onClick={() => navigate(`/product/${featuredProducts[0].id}`)}
                >
                <div>
                    <p className="text-muted mb-3">
                      <Link to={`/shop?category=${featuredProducts[0].categoryId}`} className="text-muted text-decoration-none">
                        {featuredProducts[0].categoryName}
                      </Link>
                    </p>
                    <h3 className="text-primary">{featuredProducts[0].name}</h3>
                  <h1 className="display-3 text-secondary mb-0">
                      {featuredProducts[0].oldPrice
                        ? `${Math.max(1, Math.min(90, Math.round((1 - featuredProducts[0].price / featuredProducts[0].oldPrice) * 100)))}%`
                        : formatCurrencyEGP(featuredProducts[0].price)}{' '}
                      <span className="text-primary fw-normal">
                        {featuredProducts[0].oldPrice ? 'Off' : ''}
                      </span>
                    </h1>
                  </div>
                  <div style={{ width: '200px', height: '200px', flexShrink: 0, overflow: 'hidden' }}>
                    <img
                      src={resolveImageUrl(featuredProducts[0].imageUrl)}
                      className="img-fluid"
                      alt={featuredProducts[0].name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              ) : (
                <Link to="/shop" className="d-flex align-items-center justify-content-between border bg-white rounded p-4">
                  <div>
                    <p className="text-muted mb-3">Explore our latest products</p>
                    <h3 className="text-primary">Discover More</h3>
                    <h1 className="display-3 text-secondary mb-0">
                      Shop <span className="text-primary fw-normal">Now</span>
                  </h1>
                </div>
                <div style={{ width: '200px', height: '200px', flexShrink: 0, overflow: 'hidden' }}>
                  <img
                    src={`${process.env.PUBLIC_URL}/template/img/tech-components.svg`}
                    className="img-fluid"
                      alt="Featured tech products"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </Link>
              )}
            </div>
            <div className="col-lg-6 wow fadeInRight" data-wow-delay="0.3s">
              {(featuredProducts[1] || allProducts[1] || allProducts[0]) && (() => {
                const product = featuredProducts[1] || allProducts[1] || allProducts[0];
                return (
                  <div
                    className="d-flex align-items-center justify-content-between border bg-white rounded p-4"
                    role="button"
                    onClick={() => navigate(`/product/${product.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <p className="text-muted mb-3">
                        <Link 
                          to={`/shop?category=${product.categoryId}`} 
                          className="text-muted text-decoration-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {product.categoryName}
                        </Link>
                      </p>
                      <h3 className="text-primary">{product.name}</h3>
                      <h1 className="display-3 text-secondary mb-0">
                        {product.oldPrice
                          ? `${Math.max(1, Math.min(90, Math.round((1 - product.price / product.oldPrice) * 100)))}%`
                          : formatCurrencyEGP(product.price)}{' '}
                        <span className="text-primary fw-normal">
                          {product.oldPrice ? 'Off' : ''}
                        </span>
                      </h1>
                    </div>
                    <div style={{ width: '200px', height: '200px', flexShrink: 0, overflow: 'hidden' }}>
                      <img
                        src={resolveImageUrl(product.imageUrl)}
                        className="img-fluid"
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      {/* Products Offer End */}

      <RecommendationSection placement="home" />

      {/* Our Products Start */}
      <div className="container-fluid product py-5">
        <div className="container py-5">
          <div className="tab-class">
            <div className="row g-4">
              <div className="col-lg-4 text-start wow fadeInLeft" data-wow-delay="0.1s">
                <h1>Explore Tech</h1>
              </div>
              <div className="col-lg-8 text-end wow fadeInRight" data-wow-delay="0.1s">
                <ul className="nav nav-pills d-inline-flex text-center mb-5">
                  <li className="nav-item mb-4">
                    <a
                      className={`d-flex mx-2 py-2 bg-light rounded-pill ${activeTab === 'tab-1' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('tab-1');
                      }}
                      href="#tab-1"
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      <span className="text-dark" style={{ width: '130px' }}>
                        All Products
                      </span>
                    </a>
                  </li>
                  <li className="nav-item mb-4">
                    <a
                      className={`d-flex py-2 mx-2 bg-light rounded-pill ${activeTab === 'tab-2' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('tab-2');
                      }}
                      href="#tab-2"
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      <span className="text-dark" style={{ width: '130px' }}>
                        New Arrivals
                      </span>
                    </a>
                  </li>
                  <li className="nav-item mb-4">
                    <a
                      className={`d-flex mx-2 py-2 bg-light rounded-pill ${activeTab === 'tab-3' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('tab-3');
                      }}
                      href="#tab-3"
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      <span className="text-dark" style={{ width: '130px' }}>
                        Featured
                      </span>
                    </a>
                  </li>
                  <li className="nav-item mb-4">
                    <a
                      className={`d-flex mx-2 py-2 bg-light rounded-pill ${activeTab === 'tab-4' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('tab-4');
                      }}
                      href="#tab-4"
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      <span className="text-dark" style={{ width: '130px' }}>
                        Top Selling
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="tab-content">
              {activeTab === 'tab-1' && (
                <div id="tab-1" className="tab-pane fade show p-0 active">
                  <div className="row g-4">
                    {allProducts.slice(0, 8).map((product, index) => (
                      <div key={product.id} className="col-md-6 col-lg-4 col-xl-3">
                        <TemplateProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          showBadge={index % 4 === 0 ? 'new' : index % 4 === 2 ? 'sale' : false}
                          delay={`${(index % 4) * 0.2 + 0.1}s`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'tab-2' && (
                <div id="tab-2" className="tab-pane fade show p-0">
                  <div className="row g-4">
                    {newArrivals.map((product, index) => (
                      <div key={product.id} className="col-md-6 col-lg-4 col-xl-3">
                        <TemplateProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          showBadge="new"
                          delay={`${index * 0.2 + 0.1}s`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'tab-3' && (
                <div id="tab-3" className="tab-pane fade show p-0">
                  <div className="row g-4">
                    {featuredProducts.map((product, index) => (
                      <div key={product.id} className="col-md-6 col-lg-4 col-xl-3">
                        <TemplateProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          delay={`${index * 0.2 + 0.1}s`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'tab-4' && (
                <div id="tab-4" className="tab-pane fade show p-0">
                  <div className="row g-4">
                    {topSelling.map((product, index) => (
                      <div key={product.id} className="col-md-6 col-lg-4 col-xl-3">
                        <TemplateProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          showBadge={index % 2 === 0 ? 'sale' : false}
                          delay={`${index * 0.2 + 0.1}s`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Our Products End */}

      {/* Product Banner Start */}
      <div className="container-fluid py-5">
        <div className="container">
          <div className="row g-4">
            {(featuredProducts[2] || allProducts[2] || allProducts[0]) && (() => {
              const product = featuredProducts[2] || allProducts[2] || allProducts[0];
              return (
                <div key="banner-1" className="col-lg-6 wow fadeInLeft" data-wow-delay="0.1s">
                  <div 
                    className="bg-primary rounded position-relative" 
                    style={{ minHeight: '400px', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <img
                      src={resolveImageUrl(product.imageUrl)}
                      className="img-fluid w-100 rounded"
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', top: 0, left: 0, background: '#050816' }}
                    />
                    <div
                      className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center rounded p-4"
                      style={{ background: 'linear-gradient(90deg, rgba(2,6,23,0.9), rgba(2,6,23,0.3))', zIndex: 1 }}
                    >
                      <h3 className="display-5 text-white">
                        {product.name} <br /> <span>{product.categoryName}</span>
                      </h3>
                      <p className="fs-4 text-white-50">
                        {product.oldPrice ? (
                          <>
                            <del className="me-2">{formatCurrencyEGP(product.oldPrice)}</del>
                            {formatCurrencyEGP(product.price)}
                          </>
                        ) : (
                          formatCurrencyEGP(product.price)
                        )}
                      </p>
                      <button 
                        type="button" 
                        className="btn btn-primary rounded-pill align-self-start py-2 px-4" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/product/${product.id}`);
                        }}
                      >
                        Shop Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
            {(() => {
              // Find a product with discount for the sale banner, or use the next available product
              const saleProduct = allProducts.find(p => p.oldPrice) || featuredProducts[3] || allProducts[3] || allProducts[1] || allProducts[0];
              if (!saleProduct) return null;
              const discountPercent = saleProduct.oldPrice 
                ? Math.max(1, Math.min(90, Math.round((1 - saleProduct.price / saleProduct.oldPrice) * 100)))
                : 50;
              return (
                <div key="banner-2" className="col-lg-6 wow fadeInRight" data-wow-delay="0.2s">
                  <div 
                    className="text-center bg-primary rounded position-relative" 
                    style={{ minHeight: '400px', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => navigate(`/product/${saleProduct.id}`)}
                  >
                    <img
                      src={resolveImageUrl(saleProduct.imageUrl)}
                      className="img-fluid w-100"
                      alt={saleProduct.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', top: 0, left: 0, background: '#050816' }}
                    />
                    <div
                      className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center rounded p-4"
                      style={{ background: 'linear-gradient(90deg, rgba(91,33,182,0.88), rgba(37,99,235,0.35))', zIndex: 1 }}
                    >
                      <h2 className="display-2 text-primary">SALE</h2>
                      <h4 className="display-5 text-white mb-4">Get UP To {discountPercent}% Off</h4>
                      <button 
                        type="button" 
                        className="btn btn-primary rounded-pill align-self-center py-2 px-4" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/product/${saleProduct.id}`);
                        }}
                      >
                        Shop Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      {/* Product Banner End */}

      {/* Product List Start */}
      <div className="container-fluid products productList overflow-hidden">
        <div className="container products-mini py-5">
          <div className="mx-auto text-center mb-5" style={{ maxWidth: '900px' }}>
            <h4
              className="text-primary border-bottom border-primary border-2 d-inline-block p-2 title-border-radius wow fadeInUp"
              data-wow-delay="0.1s"
            >
              Tech Catalog
            </h4>
            <h1 className="mb-0 display-3 wow fadeInUp" data-wow-delay="0.3s">
              Upgrade Every Part of Your Setup
            </h1>
          </div>
          <div className="productList-carousel owl-carousel pt-4 wow fadeInUp" data-wow-delay="0.3s">
            {products &&
              Array.from({ length: Math.ceil(products.length / 4) }).map((_, groupIndex) => {
                const groupProducts = products.slice(groupIndex * 4, (groupIndex + 1) * 4);
                return (
                  <div key={groupIndex} className="productImg-carousel owl-carousel productList-item">
                    {groupProducts.map((product) => (
                      <div key={product.id} className="productImg-item products-mini-item border">
                        <div className="row g-0">
                          <div className="col-5">
                            <div className="products-mini-img border-end h-100" style={{ height: '200px', overflow: 'hidden' }}>
                              <img
                                src={resolveImageUrl(product.imageUrl)}
                                className="img-fluid w-100 h-100"
                                alt={product.name}
                                style={{ height: '100%', width: '100%', objectFit: 'contain', background: '#050816' }}
                              />
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
                            onClick={() => handleAddToCart(product)}
                          >
                            <i className="fas fa-shopping-cart me-2"></i> Add To Cart
                          </button>
                          <div className="d-flex">
                            <Link
                              to={`/product/${product.id}`}
                              className="text-primary d-flex align-items-center justify-content-center me-3"
                            >
                              <span className="rounded-circle btn-sm-square border">
                                <i className="fas fa-random"></i>
                              </span>
                            </Link>
                            <Link to="#" className="text-primary d-flex align-items-center justify-content-center me-0">
                              <span className="rounded-circle btn-sm-square border">
                                <i className="fas fa-heart"></i>
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      {/* Product List End */}

      {/* Bestseller Products Start */}
      <div className="container-fluid products pb-5">
        <div className="container products-mini py-5">
          <div className="mx-auto text-center mb-5" style={{ maxWidth: '700px' }}>
            <h4
              className="text-primary mb-4 border-bottom border-primary border-2 d-inline-block p-2 title-border-radius wow fadeInUp"
              data-wow-delay="0.1s"
            >
              Bestselling Tech
            </h4>
            <p className="mb-0 wow fadeInUp" data-wow-delay="0.2s">
              Discover the laptops, PC components, displays, and accessories customers choose most.
            </p>
          </div>
          <div className="row g-4">
            {bestsellerProducts.map((product, index) => (
              <div key={product.id} className="col-md-6 col-lg-6 col-xl-4">
                <BestsellerProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                  delay={`${(index % 3) * 0.2 + 0.1}s`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Bestseller Products End */}
    </>
  );
};
