import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import classNames from 'classnames';
import { useAuth } from '../hooks/useAuth';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAdmin = user?.roles.includes('Admin');

  const NAV_ITEMS = [
    { to: '/admin', icon: 'fas fa-chart-line', label: 'Dashboard', exact: true, iconColor: '#22D3EE' },
    ...(isAdmin ? [
      { to: '/admin/categories', icon: 'fas fa-folder-open', label: 'Categories', iconColor: '#F59E0B' },
      { to: '/admin/products', icon: 'fas fa-box', label: 'Products', iconColor: '#10B981' },
      { to: '/admin/promo-codes', icon: 'fas fa-ticket-alt', label: 'Promo Codes', iconColor: '#EC4899' },
    ] : []),
    { to: '/admin/orders', icon: 'fas fa-shopping-bag', label: 'Orders', iconColor: '#FB7185' },
    { to: '/admin/users', icon: 'fas fa-users-cog', label: 'Users', iconColor: '#A78BFA' },
    { to: '/admin/support', icon: 'fas fa-envelope-open-text', label: 'Support Inbox', iconColor: '#3B82F6' },
  ];

  const renderSidebarNav = (isCompact: boolean) => (
    <nav className="admin-sidebar__nav flex-grow-1 overflow-auto py-4">
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
                      Live
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
                  <span className="admin-sidebar__eyebrow">ADMIN PANEL</span>
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
          <button className={classNames('btn admin-sidebar__logout mt-3', isSidebarCollapsed ? 'w-100 px-2' : 'w-100')} onClick={logout} title={isSidebarCollapsed ? 'Logout' : undefined}>
            <i className={classNames('fas fa-sign-out-alt', !isSidebarCollapsed && 'me-2')} />
            {!isSidebarCollapsed && 'Logout'}
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
                      <span className="admin-sidebar__eyebrow">ADMIN PANEL</span>
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
                <button className="btn admin-sidebar__logout w-100 mt-3" onClick={logout}>
                  <i className="fas fa-sign-out-alt me-2" />
                  Logout
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
              <h1 className="h5 mb-0 fw-bold">Administration Dashboard</h1>
              <small className="text-muted">Manage catalogue, orders, and customers</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-md-flex align-items-center gap-2 text-muted">
              <i className="fas fa-location-arrow text-primary" />
              <span className="small">{location.pathname}</span>
            </div>
            <button className="btn btn-outline-primary btn-sm">
              <i className="fas fa-headset me-2" />
              Support
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
