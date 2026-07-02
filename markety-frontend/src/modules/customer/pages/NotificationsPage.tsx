import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi, Notification } from '../../../api';
import { PageHeader } from '../../../components/common/PageHeader';
import { Link } from 'react-router-dom';

const heroImage = `${process.env.PUBLIC_URL}/template/img/tech-page-header.svg`;

type FilterTab = 'all' | 'Order' | 'Support' | 'Offer';

const TABS: { key: FilterTab; label: string; icon: string; color: string; gradient: string }[] = [
  { key: 'all',     label: 'All',              icon: 'fas fa-bell',      color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  { key: 'Order',   label: 'Orders',           icon: 'fas fa-box',       color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
  { key: 'Support', label: 'Support',          icon: 'fas fa-headset',   color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  { key: 'Offer',   label: 'Offers & Deals',   icon: 'fas fa-tags',      color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
];

const typeConfig: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  Order:   { icon: 'fas fa-box',       color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  label: 'Order Update' },
  Support: { icon: 'fas fa-headset',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Support Reply' },
  Offer:   { icon: 'fas fa-tags',      color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Offer' },
  System:  { icon: 'fas fa-bell',      color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  label: 'System' },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr.includes('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: days > 365 ? 'numeric' : undefined });
}

export const NotificationsPage = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: notificationApi.getMyNotifications,
  });

  const markReadMut = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMut = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const filtered = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter(n => n.type === activeTab);
  }, [notifications, activeTab]);

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    orders: notifications.filter(n => n.type === 'Order').length,
    support: notifications.filter(n => n.type === 'Support').length,
    offers: notifications.filter(n => n.type === 'Offer').length,
  }), [notifications]);

  const filteredUnread = filtered.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Notifications" subtitle="Stay updated with your orders, support, and offers." image={heroImage} eyebrow="My Account" />
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-9">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden" style={{ opacity: 0.6 }}>
                  <div className="card-body p-4">
                    <div className="d-flex gap-3 align-items-start">
                      <div className="rounded-circle bg-light" style={{ width: 44, height: 44, flexShrink: 0 }} />
                      <div className="flex-grow-1">
                        <div className="bg-light rounded mb-2" style={{ height: 14, width: '40%' }} />
                        <div className="bg-light rounded mb-2" style={{ height: 12, width: '70%' }} />
                        <div className="bg-light rounded" style={{ height: 10, width: '25%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with your latest offers, orders, and support tickets."
        image={heroImage}
        eyebrow="My Account"
      />

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-9">

            {/* ── Stats Summary Cards ──────────────────────────────── */}
            <div className="row g-3 mb-4">
              {[
                { label: 'Total', value: stats.total, icon: 'fas fa-bell', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
                { label: 'Unread', value: stats.unread, icon: 'fas fa-envelope', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
                { label: 'Orders', value: stats.orders, icon: 'fas fa-box', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
                { label: 'Offers', value: stats.offers, icon: 'fas fa-tags', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
              ].map((s, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden position-relative" style={{ transition: 'transform 0.2s', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                    <div className="card-body p-3 text-center">
                      <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                        style={{ width: 40, height: 40, background: s.gradient }}>
                        <i className={`${s.icon} text-white`} style={{ fontSize: '0.85rem' }} />
                      </div>
                      <h4 className="fw-bold mb-0" style={{ color: '#1e293b' }}>{s.value}</h4>
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filter Tabs ──────────────────────────────────────── */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
              <div className="card-body p-3">
                <div className="d-flex gap-2 flex-wrap">
                  {TABS.map(tab => {
                    const isActive = activeTab === tab.key;
                    const count = tab.key === 'all'
                      ? notifications.length
                      : notifications.filter(n => n.type === tab.key).length;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="btn btn-sm rounded-pill d-flex align-items-center gap-2 px-3 py-2 border-0"
                        style={{
                          background: isActive ? tab.gradient : '#f1f5f9',
                          color: isActive ? '#fff' : '#64748b',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '0.82rem',
                          transition: 'all 0.25s ease',
                          boxShadow: isActive ? `0 4px 12px ${tab.color}33` : 'none',
                        }}
                      >
                        <i className={tab.icon} style={{ fontSize: '0.75rem' }} />
                        {tab.label}
                        <span className="badge rounded-pill ms-1"
                          style={{
                            background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                            color: isActive ? '#fff' : '#94a3b8',
                            fontSize: '0.7rem',
                          }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Action Bar ───────────────────────────────────────── */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold mb-0" style={{ color: '#1e293b' }}>
                  {activeTab === 'all' ? 'All Notifications' : TABS.find(t => t.key === activeTab)?.label}
                </h5>
                <small className="text-muted">
                  {filteredUnread > 0
                    ? `${filteredUnread} unread notification${filteredUnread > 1 ? 's' : ''}`
                    : 'All caught up!'}
                </small>
              </div>
              {filteredUnread > 0 && (
                <button
                  className="btn btn-sm btn-outline-primary rounded-pill px-3 d-flex align-items-center gap-2"
                  onClick={() => markAllReadMut.mutate()}
                  disabled={markAllReadMut.isPending}
                  style={{ fontSize: '0.82rem' }}
                >
                  <i className="fas fa-check-double" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* ── Notification List ────────────────────────────────── */}
            {filtered.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="card-body text-center py-5">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{ width: 72, height: 72, background: '#f1f5f9' }}>
                    <i className="far fa-bell-slash" style={{ fontSize: '1.8rem', color: '#cbd5e1' }} />
                  </div>
                  <h5 className="fw-bold mb-1" style={{ color: '#64748b' }}>No notifications here</h5>
                  <p className="text-muted small mb-0" style={{ maxWidth: 320, margin: '0 auto' }}>
                    {activeTab === 'Order' && "You'll be notified when your order status changes."}
                    {activeTab === 'Support' && "Support replies will appear here once your tickets get responses."}
                    {activeTab === 'Offer' && "Enable offer notifications in settings to receive exclusive deals."}
                    {activeTab === 'all' && "We'll notify you when something important happens."}
                  </p>
                  {activeTab === 'Offer' && (
                    <Link to="/settings" className="btn btn-sm btn-outline-success rounded-pill mt-3 px-4">
                      <i className="fas fa-cog me-2" />Enable Offers
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {filtered.map(n => {
                  const cfg = typeConfig[n.type] || typeConfig.System;
                  return (
                    <div
                      key={n.id}
                      className="card border-0 shadow-sm rounded-4 overflow-hidden"
                      style={{
                        transition: 'all 0.2s ease',
                        borderLeft: !n.isRead ? `4px solid ${cfg.color}` : '4px solid transparent',
                        background: !n.isRead ? '#fefefe' : '#fff',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div className="card-body p-4">
                        <div className="d-flex gap-3 align-items-start">
                          {/* Icon */}
                          <div
                            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                            style={{
                              width: 44,
                              height: 44,
                              background: !n.isRead ? cfg.bg : '#f8fafc',
                              transition: 'background 0.2s ease',
                            }}
                          >
                            <i className={cfg.icon} style={{ color: !n.isRead ? cfg.color : '#94a3b8', fontSize: '1rem' }} />
                          </div>

                          {/* Content */}
                          <div className="flex-grow-1 min-width-0">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <h6
                                  className="mb-0"
                                  style={{
                                    fontWeight: !n.isRead ? 700 : 500,
                                    color: '#1e293b',
                                    fontSize: '0.92rem',
                                  }}
                                >
                                  {n.title}
                                </h6>
                                {!n.isRead && (
                                  <span className="badge rounded-pill" style={{ background: cfg.color, fontSize: '0.6rem', padding: '3px 8px' }}>
                                    NEW
                                  </span>
                                )}
                              </div>
                              <small className="text-muted text-nowrap ms-2 flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                                {timeAgo(n.createdAt)}
                              </small>
                            </div>

                            <p className="mb-2" style={{
                              color: '#64748b',
                              fontSize: '0.85rem',
                              lineHeight: 1.5,
                            }}>
                              {n.message}
                            </p>

                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-2">
                                <span
                                  className="badge rounded-pill"
                                  style={{
                                    background: cfg.bg,
                                    color: cfg.color,
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    padding: '4px 10px',
                                  }}
                                >
                                  <i className={`${cfg.icon} me-1`} style={{ fontSize: '0.6rem' }} />
                                  {cfg.label}
                                </span>

                                {n.link && (
                                  <Link
                                    to={n.link}
                                    className="btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center gap-1"
                                    style={{ fontSize: '0.78rem', color: cfg.color, fontWeight: 600 }}
                                  >
                                    View Details
                                    <i className="fas fa-arrow-right" style={{ fontSize: '0.65rem' }} />
                                  </Link>
                                )}
                              </div>

                              {!n.isRead && (
                                <button
                                  className="btn btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
                                  style={{
                                    fontSize: '0.72rem',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    border: 'none',
                                    transition: 'all 0.2s',
                                  }}
                                  onClick={() => markReadMut.mutate(n.id)}
                                  disabled={markReadMut.isPending}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                >
                                  <i className="fas fa-check" />
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Settings Link ────────────────────────────────────── */}
            <div className="text-center mt-4">
              <Link
                to="/settings"
                className="btn btn-sm btn-light rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2"
                style={{ fontSize: '0.82rem', color: '#64748b' }}
              >
                <i className="fas fa-cog" />
                Manage Notification Settings
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};
