import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Container, Dropdown, Nav, Navbar } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { cartApi, productApi, notificationApi, recommendationApi } from '../api';
import { resolveImageUrl } from '../utils/media';
import { BackToTop } from '../components/common/BackToTop';
import { ChatbotWidget } from '../components/chat/ChatbotWidget';

const normalizeSearchText = (value: string) => value.trim().toLowerCase();
const searchTokens = (value: string) => normalizeSearchText(value).split(/\s+/).filter(Boolean);

export const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: cartItems } = useQuery({
    queryKey: ['cart', 'layout'],
    queryFn: cartApi.get,
    enabled: Boolean(user),
  });

  const { data: products } = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: () => productApi.getCatalog(),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.getMyNotifications,
    enabled: Boolean(user),
  });

  const unreadNotificationsCount = notifications?.filter(n => !n.isRead).length ?? 0;

  const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const wishlistCount = wishlist.length;

  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const mobileSearchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedDesktopSearch = searchRef.current?.contains(target) ?? false;
      const clickedMobileSearch = mobileSearchRef.current?.contains(target) ?? false;

      if (!clickedDesktopSearch && !clickedMobileSearch) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const tokens = searchTokens(searchQuery);
    if (tokens.length === 0 || !products) return [];

    return products
      .filter((p) => {
        const haystack = normalizeSearchText(
          `${p.name} ${p.description ?? ''} ${p.categoryName ?? ''}`,
        );
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, 6);
  }, [searchQuery, products]);

  const submitSearch = (source: 'header_search' | 'header_dropdown') => {
    const query = searchQuery.trim();
    if (!query) return;

    recommendationApi.trackQuietly({
      eventType: 'search_query',
      searchQuery: query,
      source,
    });
    navigate(`/shop?search=${encodeURIComponent(query)}`);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch('header_search');
  };

  const navItems = [
    { to: '/', label: t('navbar.home'), icon: 'fas fa-home', exact: true },
    { to: '/shop', label: t('navbar.shop'), icon: 'fas fa-store' },
    { to: '/contact', label: t('navbar.contact'), icon: 'fas fa-headset' },
  ];

  if (user) {
    navItems.push({ to: '/orders', label: t('navbar.orders'), icon: 'fas fa-box-open' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="customer-shell d-flex flex-column min-vh-100">
      {/* Main Header */}
      <header className="customer-main-header shadow-sm bg-white sticky-top" style={{ zIndex: 1020 }}>
        <Navbar expand="lg" className="customer-navbar py-2">
          <Container className="d-flex align-items-center">
            {/* Logo */}
            <Navbar.Brand as={NavLink} to="/" className="d-flex align-items-center me-4" style={{ textDecoration: 'none' }}>
              <img
                src="/Marketylogo.jpeg"
                alt="Markety Logo"
                style={{ height: '50px', width: '50px', borderRadius: '12px', objectFit: 'cover' }}
              />
              <div className="ms-2 d-none d-md-block">
                <span className="fw-bold fs-5" style={{ color: '#5B3DC8', letterSpacing: '-0.5px' }}>MARKETY</span>
                <span className="d-block" style={{ fontSize: '0.65rem', color: '#6C757D', marginTop: '-4px', letterSpacing: '0.5px' }}>shop smart, live better</span>
              </div>
            </Navbar.Brand>

            {/* Search Bar - Center */}
            <form ref={searchRef} onSubmit={handleSearch} className="d-none d-lg-flex flex-grow-1 mx-4 position-relative" style={{ maxWidth: '500px' }}>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder={`${t('common.search')} laptops, GPUs, components, and accessories...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  style={{
                    borderRadius: '8px 0 0 8px',
                    border: '2px solid #5B3DC8',
                    background: '#fff',
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                  }}
                />
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: '#5B3DC8',
                    color: '#fff',
                    borderRadius: '0 8px 8px 0',
                    border: '2px solid #5B3DC8',
                    padding: '0.5rem 1.25rem',
                  }}
                >
                  <i className="fas fa-search" />
                </button>
              </div>
              
              {/* Autocomplete Dropdown */}
              <AnimatePresence>
                {showDropdown && searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="position-absolute w-100 bg-white shadow-lg rounded-3 overflow-hidden"
                    style={{ top: '100%', left: 0, zIndex: 1050, marginTop: '8px', border: '1px solid #E2E8F0' }}
                  >
                    {searchResults.length > 0 ? (
                      <div className="p-2">
                        <small className="text-muted mb-2 d-block px-1">Results show top 6 matches</small>
                        {searchResults.map((product) => (
                          <button
                            type="button"
                            key={product.id}
                            className="chat-result-item d-flex align-items-center w-100 text-start"
                            onClick={() => {
                              recommendationApi.trackQuietly({
                                eventType: 'product_click',
                                productId: product.id,
                                source: 'header_autocomplete',
                                metadata: { searchQuery },
                              });
                              navigate(`/product/${product.id}`);
                              setShowDropdown(false);
                              setSearchQuery('');
                            }}
                          >
                            <div className="result-thumb">
                              <img src={resolveImageUrl(product.imageUrl)} alt={product.name} />
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-semibold">{product.name}</div>
                              <small className="text-muted">{product.categoryName}</small>
                            </div>
                            <div className="text-primary fw-bold">
                              {product.price?.toLocaleString('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 })}
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="btn btn-light w-100 mt-2 fw-semibold"
                          style={{ color: '#5B3DC8', fontSize: '0.85rem' }}
                          onClick={() => submitSearch('header_dropdown')}
                        >
                          View all results <i className="fas fa-arrow-right ms-1"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted">
                        <i className="fas fa-search mb-2" style={{ fontSize: '1.5rem', opacity: 0.5 }}></i>
                        <p className="mb-0 small">No products match "{searchQuery}"</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Right Side - Icons */}
            <div className="d-flex align-items-center gap-2 ms-auto ms-lg-0">
              {user && (
                <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <NavLink
                    to="/wishlist"
                    className="customer-icon-action btn btn-sm position-relative d-flex align-items-center gap-1"
                  >
                  <i className="fas fa-heart" style={{ fontSize: '1.1rem' }} />
                  <span className="d-none d-xl-inline" style={{ fontSize: '0.8rem' }}>{t('navbar.wishlist')}</span>
                  {wishlistCount > 0 && (
                    <span
                      className="position-absolute badge rounded-pill"
                      style={{
                        top: '-2px',
                        right: '-6px',
                        background: '#FF6B35',
                        fontSize: '0.65rem',
                        padding: '0.2rem 0.45rem',
                      }}
                    >
                      {wishlistCount}
                    </span>
                  )}
                  </NavLink>
                </motion.div>
              )}
              {user && (
                <Dropdown align="end" className="d-flex align-items-center">
                  <Dropdown.Toggle
                    as={motion.div}
                    whileHover={{ y: -2, scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    className="customer-icon-action btn btn-sm position-relative d-flex align-items-center gap-1 border-0"
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="fas fa-bell" style={{ fontSize: '1.1rem' }} />
                    {unreadNotificationsCount > 0 && (
                      <span
                        className="position-absolute badge rounded-pill"
                        style={{
                          top: '-2px',
                          right: '-6px',
                          background: '#E11D48',
                          fontSize: '0.65rem',
                          padding: '0.2rem 0.45rem',
                        }}
                      >
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-lg border-0 overflow-hidden" style={{ width: '320px' }}>
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                      <span className="fw-bold text-dark">{t('navbar.notifications')}</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="badge bg-danger-subtle text-danger">{unreadNotificationsCount} {t('navbar.new')}</span>
                      )}
                    </div>
                    <div className="p-0 overflow-auto" style={{ maxHeight: '350px' }}>
                      {!notifications || notifications.length === 0 ? (
                        <div className="text-center py-5">
                          <i className="far fa-bell-slash text-muted mb-2 fs-3" style={{ opacity: 0.3 }} />
                          <p className="text-muted small mb-0">{t('navbar.emptyNotifications')}</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map(n => (
                          <div key={n.id} className={`p-3 border-bottom cursor-pointer ${n.isRead ? 'bg-white' : 'bg-primary-subtle bg-opacity-10'}`} onClick={() => navigate(n.link || '/profile/notifications')}>
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <span className="fw-semibold small text-dark">{n.title}</span>
                              <small className="text-muted" style={{ fontSize: '0.65rem' }}>{new Date(n.createdAt).toLocaleDateString()}</small>
                            </div>
                            <div className="small text-muted line-clamp-2">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2 border-top bg-light text-center">
                      <button className="btn btn-link text-primary text-decoration-none small fw-semibold p-0 w-100" onClick={() => navigate('/profile/notifications')}>
                        {t('navbar.viewAllNotifications')}
                      </button>
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
              )}
              <Dropdown align="end" className="d-flex align-items-center">
                <Dropdown.Toggle
                  as={motion.div}
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className="customer-icon-action btn btn-sm position-relative d-flex align-items-center gap-1 border-0"
                  style={{ cursor: 'pointer' }}
                >
                  <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }} />
                  <span className="d-none d-xl-inline" style={{ fontSize: '0.8rem' }}>{t('navbar.cart')}</span>
                  {cartCount > 0 && (
                    <span
                      className="position-absolute badge rounded-pill"
                      style={{
                        top: '-2px',
                        right: '-6px',
                        background: '#FF6B35',
                        fontSize: '0.65rem',
                        padding: '0.2rem 0.45rem',
                      }}
                    >
                      {cartCount}
                    </span>
                  )}
                </Dropdown.Toggle>

                <Dropdown.Menu className="cart-dropdown p-0 shadow-lg border-0 overflow-hidden">
                  <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                    <span className="fw-bold text-dark">{t('navbar.orderSummary')}</span>
                    <span className="badge bg-primary-subtle text-primary">{cartCount} {t('navbar.items')}</span>
                  </div>
                  <div className="p-3 overflow-auto" style={{ maxHeight: '300px' }}>
                    {!cartItems || cartItems.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-shopping-basket text-muted mb-2 fs-3" style={{ opacity: 0.3 }} />
                        <p className="text-muted small mb-0">{t('navbar.emptyCart')}</p>
                      </div>
                    ) : (
                      cartItems.map((item) => (
                        <div key={`${item.productId}-${item.size}`} className="cart-item-preview">
                          <img src={resolveImageUrl(item.productImage)} alt={item.productName} className="cart-item-preview__thumb" />
                          <div className="cart-item-preview__info">
                            <p className="cart-item-preview__name">{item.productName}</p>
                            <p className="cart-item-preview__meta">
                              {item.quantity} x {item.price?.toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {cartItems && cartItems.length > 0 && (
                    <div className="cart-dropdown-footer">
                      <div className="d-flex justify-content-between mb-3">
                        <span className="text-muted small fw-semibold">Total</span>
                        <span className="fw-bold text-primary">
                          {cartItems.reduce((acc, item) => acc + item.myTotal, 0).toLocaleString('en-EG', { style: 'currency', currency: 'EGP' })}
                        </span>
                      </div>
                      <div className="d-grid gap-2">
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/cart')}>
                          View Full Cart
                        </button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/checkout')}>
                          Quick Checkout
                        </button>
                      </div>
                    </div>
                  )}
                </Dropdown.Menu>
              </Dropdown>
              <Navbar.Toggle aria-controls="customer-nav" className="ms-2" />
            </div>

            {/* Navigation Links */}
            <Navbar.Collapse id="customer-nav">
              {/* Mobile Search */}
              <form ref={mobileSearchRef} onSubmit={handleSearch} className="d-lg-none my-3 position-relative">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    style={{ border: '2px solid #5B3DC8', borderRadius: '8px 0 0 8px' }}
                  />
                  <button
                    type="submit"
                    className="btn"
                    style={{ background: '#5B3DC8', color: '#fff', borderRadius: '0 8px 8px 0', border: '2px solid #5B3DC8' }}
                  >
                    <i className="fas fa-search" />
                  </button>
                </div>
                
                {/* Mobile Autocomplete Dropdown */}
                <AnimatePresence>
                  {showDropdown && searchQuery.trim().length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="position-absolute w-100 bg-white shadow rounded-3 overflow-hidden"
                      style={{ top: '100%', left: 0, zIndex: 1050, marginTop: '4px', border: '1px solid #E2E8F0' }}
                    >
                      {searchResults.length > 0 ? (
                        <div className="p-2">
                          <small className="text-muted mb-2 d-block px-1">Results show top 6 matches</small>
                          {searchResults.map((product) => (
                            <button
                              type="button"
                              key={product.id}
                              className="chat-result-item d-flex align-items-center w-100 text-start"
                              onClick={() => {
                                recommendationApi.trackQuietly({
                                  eventType: 'product_click',
                                  productId: product.id,
                                  source: 'mobile_header_autocomplete',
                                  metadata: { searchQuery },
                                });
                                navigate(`/product/${product.id}`);
                                setShowDropdown(false);
                                setSearchQuery('');
                              }}
                            >
                              <div className="result-thumb">
                                <img src={resolveImageUrl(product.imageUrl)} alt={product.name} />
                              </div>
                              <div className="flex-grow-1">
                                <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>{product.name}</div>
                                <small className="text-muted">{product.categoryName}</small>
                              </div>
                              <div className="text-primary fw-bold" style={{ fontSize: '0.85rem' }}>
                                {product.price?.toLocaleString('en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 })}
                              </div>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="btn btn-light w-100 mt-2 fw-semibold"
                            style={{ color: '#5B3DC8', fontSize: '0.85rem' }}
                            onClick={() => submitSearch('header_dropdown')}
                          >
                            View all results <i className="fas fa-arrow-right ms-1"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 text-center text-muted small">
                          No matches for "{searchQuery}"
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              <Nav as="ul" className="ms-auto align-items-lg-center customer-nav">
                {navItems.map((item) => (
                  <motion.li key={item.to} className="list-unstyled" whileHover={{ y: -2 }}>
                    <NavLink
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) => classNames('customer-nav-link', { active: isActive })}
                    >
                      {({ isActive }) => (
                        <>
                          <span className="customer-nav-link__icon">
                            <i className={item.icon} />
                          </span>
                          <span className="customer-nav-link__label">{item.label}</span>
                          {isActive && <motion.span layoutId="customerNavHighlight" className="customer-nav-link__indicator" />}
                        </>
                      )}
                    </NavLink>
                  </motion.li>
                ))}
              </Nav>

              <div className="customer-nav-controls">
                <button type="button" className="mk-nav-control" onClick={toggleLanguage} aria-label="Toggle language">
                  <i className="fas fa-globe" aria-hidden="true" />
                  <span>{language === 'ar' ? t('common.english') : t('common.arabic')}</span>
                </button>
                <button
                  type="button"
                  className="mk-nav-control mk-nav-control--icon"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                  title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                >
                  <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} aria-hidden="true" />
                </button>
                {user ? (
                  <Dropdown align="end" className="customer-nav-account">
                    <Dropdown.Toggle className="mk-nav-control mk-nav-account-toggle">
                      <i className="fas fa-user-circle" aria-hidden="true" />
                      <span className="mk-nav-account-name">{user.fullName}</span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="mk-nav-account-menu border-0 shadow">
                      <Dropdown.Item as={NavLink} to="/profile" className="d-flex align-items-center gap-2">
                        <i className="fas fa-id-badge text-primary" />
                        Profile
                      </Dropdown.Item>
                      <Dropdown.Item as={NavLink} to="/settings" className="d-flex align-items-center gap-2">
                        <i className="fas fa-cog text-primary" />
                        Settings
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item as="button" onClick={handleLogout} className="d-flex align-items-center gap-2 text-danger">
                        <i className="fas fa-right-from-bracket" />
                        {t('common.logout')}
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                ) : (
                  <NavLink to="/login" className="mk-nav-auth-link">
                    <i className="fas fa-sign-in-alt" aria-hidden="true" />
                    <span>{t('common.loginRegister')}</span>
                  </NavLink>
                )}
              </div>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </header>

      <main className="flex-grow-1">
        <Outlet />
      </main>

      {/* Modern Footer */}
      <footer style={{ background: '#1A1A2E', color: '#E2E8F0' }} className="pt-5">
        <Container className="pb-4">
          {/* Footer Top - Logo and Description */}
          <div className="row gy-4 mb-4">
            <div className="col-lg-4">
              <div className="d-flex align-items-center mb-3">
                <img
                  src="/Marketylogo.jpeg"
                  alt="Markety Logo"
                  style={{ height: '45px', width: '45px', borderRadius: '10px', objectFit: 'cover' }}
                />
                <div className="ms-2">
                  <span className="fw-bold fs-5" style={{ color: '#fff' }}>MARKETY</span>
                  <span className="d-block" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>shop smart, live better</span>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: '1.7' }}>
                Your destination for laptops, gaming PCs, components, monitors, storage, and accessories with fast delivery and secure shopping.
              </p>
              <div className="d-flex gap-3 mt-3">
                <button type="button" aria-label="Facebook" className="d-flex align-items-center justify-content-center border-0" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#fff', transition: 'all 0.3s' }}>
                  <i className="fab fa-facebook-f" />
                </button>
                <button type="button" aria-label="Twitter" className="d-flex align-items-center justify-content-center border-0" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                  <i className="fab fa-twitter" />
                </button>
                <button type="button" aria-label="Instagram" className="d-flex align-items-center justify-content-center border-0" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                  <i className="fab fa-instagram" />
                </button>
              </div>
            </div>

            <div className="col-lg-2 col-md-4">
              <h6 className="text-white fw-bold mb-3 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Quick Links</h6>
              <ul className="list-unstyled" style={{ fontSize: '0.9rem' }}>
                <li className="mb-2"><NavLink to="/" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Home</NavLink></li>
                <li className="mb-2"><NavLink to="/shop" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Shop</NavLink></li>
                <li className="mb-2"><NavLink to="/contact" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Contact Us</NavLink></li>
                <li className="mb-2"><NavLink to="/orders" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>My Orders</NavLink></li>
              </ul>
            </div>

            <div className="col-lg-3 col-md-4">
              <h6 className="text-white fw-bold mb-3 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Contact Info</h6>
              <ul className="list-unstyled" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                <li className="mb-2">
                  <i className="fas fa-map-marker-alt me-2" style={{ color: '#5B3DC8' }} />
                  10th of Ramadan, Cairo, Egypt
                </li>
                <li className="mb-2">
                  <i className="fas fa-phone-alt me-2" style={{ color: '#5B3DC8' }} />
                  +20 100 000 0000
                </li>
                <li className="mb-2">
                  <i className="fas fa-envelope me-2" style={{ color: '#5B3DC8' }} />
                  contact@markety.com
                </li>
              </ul>
            </div>

            <div className="col-lg-3 col-md-4">
              <h6 className="text-white fw-bold mb-3 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Newsletter</h6>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Subscribe for exclusive deals, new arrivals & updates.</p>
              <form className="d-flex gap-2">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email Address"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  className="btn"
                  style={{
                    background: '#5B3DC8',
                    color: '#fff',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    fontSize: '0.85rem',
                    border: 'none',
                  }}
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </Container>
        <div style={{ background: 'rgba(0,0,0,0.3)' }} className="text-center py-3">
          <small style={{ color: 'rgba(255,255,255,0.5)' }}>
            &copy; {new Date().getFullYear()} Markety. All rights reserved. | Shop Smart, Live Better
          </small>
        </div>
      </footer>

      <ChatbotWidget />
      <BackToTop />
    </div>
  );
};
