import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAdmin = user?.roles.includes('Admin');

  const NAV_ITEMS = [
    { to: '/admin', icon: 'fas fa-chart-line', label: t('admin.dashboard'), exact: true, iconColor: '#22D3EE' },
    ...(isAdmin ? [
      { to: '/admin/categories', icon: 'fas fa-folder-open', label: t('admin.categories'), iconColor: '#F59E0B' },
      { to: '/admin/products', icon: 'fas fa-box', label: t('admin.products'), iconColor: '#10B981' },
      { to: '/admin/promo-codes', icon: 'fas fa-ticket-alt', label: t('admin.promoCodes'), iconColor: '#EC4899' },
    ] : []),
    { to: '/admin/orders', icon: 'fas fa-shopping-bag', label: t('admin.orders'), iconColor: '#FB7185' },
    { to: '/admin/users', icon: 'fas fa-users-cog', label: t('admin.users'), iconColor: '#A78BFA' },
    { to: '/admin/support', icon: 'fas fa-envelope-open-text', label: t('admin.supportInbox'), iconColor: '#3B82F6' },
    ...(isAdmin ? [
      { to: '/admin/honeypot', icon: 'fas fa-shield-virus', label: 'Honeypot Analytics', iconColor: '#EF4444' },
      { to: '/admin/security-health', icon: 'fas fa-heartbeat', label: 'Security Health', iconColor: '#0EA5E9' },
    ] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderSidebarNav = (isCompact: boolean) => (
    <nav className="admin-sidebar__nav py-4">
      <ul className="list-unstyled mb-0">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className={isCompact ? 'px-2' : 'px-3'}>
            <NavLink
              to={item.to}
              end={item.exact}
              title={isCompact ? item.label : undefined}
              className={({ isActive }) =>
                classNames(
                  'd-flex align-items-center gap-3 px-3 py-3 rounded-3 text-decoration-none transition-all',
                  'admin-sidebar__link',
                  isCompact && 'justify-content-center',
                  isActive
                    ? 'admin-sidebar__link--active'
                    : 'admin-sidebar__link--idle position-relative'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={classNames(item.icon, 'fs-5')}
                    style={{ color: isActive ? '#0f766e' : item.iconColor }}
                  />
                  {!isCompact && <span className="fw-semibold">{item.label}</span>}
                  {!isCompact && isActive && (
                    <motion.span
                      layoutId="active-pill"
                      className="admin-sidebar__active-badge ms-auto badge rounded-pill"
                      transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                    >
                      <i className="fas fa-circle me-1" />
                      {t('admin.live')}
                    </motion.span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="admin-shell d-flex min-vh-100 position-relative">
      <motion.aside
        className="admin-sidebar d-none d-lg-flex flex-column"
        animate={{ width: isSidebarCollapsed ? 96 : 280 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
      >
        <div className={classNames('admin-sidebar__brand py-4 text-center', isSidebarCollapsed ? 'px-2' : 'px-4')}>
          <NavLink to="/admin" className="text-decoration-none">
            <div className={classNames('d-flex align-items-center justify-content-center', isSidebarCollapsed ? 'gap-0' : 'gap-2')}>
              <img
                src="/Marketylogo.jpeg"
                alt="Markety Logo"
                className="admin-sidebar__logo"
              />
              {!isSidebarCollapsed && (
                <div className="text-start">
                  <h2 className="h5 mb-0 text-white" style={{ letterSpacing: '-0.5px' }}>
                    Markety
                  </h2>
                  <span className="admin-sidebar__eyebrow">{t('admin.panel')}</span>
                </div>
              )}
            </div>
          </NavLink>
        </div>
        {renderSidebarNav(isSidebarCollapsed)}
        <div className={classNames('admin-sidebar__footer py-4', isSidebarCollapsed ? 'px-2' : 'px-4')}>
          <div className={classNames('d-flex align-items-center', isSidebarCollapsed ? 'justify-content-center' : 'gap-3')}>
            <div className="admin-sidebar__avatar rounded-circle d-flex align-items-center justify-content-center">
              <i className="fas fa-user-shield" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-grow-1">
                <p className="mb-0 fw-semibold text-white">{user?.fullName ?? 'Administrator'}</p>
                <small className="text-white-50">{user?.email}</small>
              </div>
            )}
          </div>
          <button className={classNames('btn admin-sidebar__logout mt-3', isSidebarCollapsed ? 'w-100 px-2' : 'w-100')} onClick={handleLogout} title={isSidebarCollapsed ? t('common.logout') : undefined}>
            <i className={classNames('fas fa-sign-out-alt', !isSidebarCollapsed && 'me-2')} />
            {!isSidebarCollapsed && t('common.logout')}
          </button>
        </div>
      </motion.aside>

      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="admin-sidebar d-lg-none d-flex flex-column shadow-lg position-fixed top-0 start-0 h-100"
              style={{ width: 280, zIndex: 1046 }}
            >
              <div className="admin-sidebar__brand px-4 py-4 text-center position-relative">
                <NavLink to="/admin" className="text-decoration-none">
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <img
                      src="/Marketylogo.jpeg"
                      alt="Markety Logo"
                      className="admin-sidebar__logo"
                    />
                    <div className="text-start">
                      <h2 className="h5 mb-0 text-white" style={{ letterSpacing: '-0.5px' }}>
                        Markety
                      </h2>
                      <span className="admin-sidebar__eyebrow">{t('admin.panel')}</span>
                    </div>
                  </div>
                </NavLink>
                <button
                  className="btn btn-sm admin-sidebar__logout position-absolute top-50 translate-middle-y end-0 me-3"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Close sidebar"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              {renderSidebarNav(false)}
              <div className="admin-sidebar__footer px-4 py-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="admin-sidebar__avatar rounded-circle d-flex align-items-center justify-content-center">
                    <i className="fas fa-user-shield" />
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-0 fw-semibold text-white">{user?.fullName ?? 'Administrator'}</p>
                    <small className="text-white-50">{user?.email}</small>
                  </div>
                </div>
                <button className="btn admin-sidebar__logout w-100 mt-3" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-2" />
                  {t('common.logout')}
                </button>
              </div>
            </motion.aside>

            <motion.div
              key="backdrop"
              className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-50 d-lg-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileSidebarOpen(false)}
              style={{ zIndex: 1045 }}
            />
          </>
        )}
      </AnimatePresence>

      <div className="flex-grow-1 position-relative">
        <header className="admin-topbar d-flex align-items-center justify-content-between px-4 py-3 sticky-top">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-primary btn-sm admin-icon-btn d-none d-lg-inline-flex align-items-center justify-content-center"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label="Toggle sidebar collapse"
            >
              <i className="fas fa-bars" />
            </button>
            <button
              className="btn btn-primary btn-sm admin-icon-btn d-inline-flex d-lg-none align-items-center justify-content-center"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <i className="fas fa-bars" />
            </button>
            <div>
              <h1 className="h5 mb-0 fw-bold">{t('admin.title')}</h1>
              <small className="text-muted">{t('admin.subtitle')}</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-md-flex align-items-center gap-2 text-muted">
              <i className="fas fa-location-arrow text-primary" />
              <span className="small">{location.pathname}</span>
            </div>
            <button type="button" className="mk-admin-control" onClick={toggleLanguage} aria-label="Toggle language">
              {language === 'ar' ? t('common.english') : t('common.arabic')}
            </button>
            <button
              type="button"
              className="mk-admin-control mk-admin-control--icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
              title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            >
              <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} />
            </button>
            <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/admin/support')}>
              <i className="fas fa-headset me-2" />
              {t('common.support')}
            </button>
          </div>
        </header>

        <main className="admin-main p-4">
          <div className="admin-surface position-relative overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
