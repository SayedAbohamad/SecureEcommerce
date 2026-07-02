import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, Variants } from 'framer-motion';
import classNames from 'classnames';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { categoryApi, userApi, orderApi, productApi, adminInsightsApi } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { formatCurrencyEGP } from '../../../utils/currency';

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
};

const toCurrency = (value: number) => formatCurrencyEGP(value);

export const DashboardPage = () => {
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: () => productApi.getCatalog(),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: () => orderApi.getAll(),
  });

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => userApi.getAll(),
  });

  const {
    data: aiInsights,
    isLoading: aiInsightsLoading,
    isFetching: aiInsightsFetching,
    isError: aiInsightsError,
    refetch: refetchAiInsights,
  } = useQuery({
    queryKey: ['admin-ai-insights'],
    queryFn: () => adminInsightsApi.getInsights(),
  });

  const {
    data: securityInsights,
    isLoading: securityInsightsLoading,
    isFetching: securityInsightsFetching,
    isError: securityInsightsError,
    refetch: refetchSecurityInsights,
  } = useQuery({
    queryKey: ['admin-security-ai-insights'],
    queryFn: () => adminInsightsApi.getSecurityInsights(),
  });

  const totalRevenue = orders?.reduce((acc, order) => acc + Number(order.totalAmount ?? 0), 0) ?? 0;
  const totalOrders = orders?.length ?? 0;
  const topProducts = useMemo(
    () =>
      [...(products ?? [])]
        .sort((a, b) => Number(b.price) - Number(a.price))
        .slice(0, 3)
        .map((product) => ({ name: product.name, price: product.price })),
    [products],
  );

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    orders?.forEach((order) => {
      const status = (order.status ?? 'Unknown').toString();
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [orders]);

  const monthlyRevenue = useMemo(() => {
    const result: { month: string; revenue: number }[] = [];
    const now = new Date();
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ month: monthFormatter.format(date), revenue: 0 });
    }
    orders?.forEach((order) => {
      const date = new Date(order.orderDate);
      const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
      const bucketIndex = 5 - diffMonths;
      if (bucketIndex >= 0 && bucketIndex < result.length) {
        result[bucketIndex].revenue += Number(order.totalAmount ?? 0);
      }
    });
    return result;
  }, [orders]);

  const stats = [
    {
      label: 'Revenue',
      value: toCurrency(totalRevenue),
      icon: 'fas fa-coins',
      tone: 'emerald',
      subtitle: 'Total confirmed order value',
    },
    {
      label: 'Orders',
      value: totalOrders,
      icon: 'fas fa-clipboard-check',
      tone: 'blue',
      subtitle: `${toCurrency(totalOrders ? totalRevenue / totalOrders : 0)} avg order`,
    },
    {
      label: 'Products',
      value: products?.length ?? 0,
      icon: 'fas fa-box',
      tone: 'amber',
      subtitle: `${categories?.length ?? 0} active categories`,
    },
    {
      label: 'Customers',
      value: customers?.totalCount ?? 0,
      icon: 'fas fa-user-friends',
      tone: 'violet',
      subtitle: 'Unique registered shoppers',
    },
  ];

  const quickLinks = [
    { to: '/admin/products', icon: 'fas fa-plus-circle', label: 'Add Product', description: 'Create a new item' },
    { to: '/admin/orders', icon: 'fas fa-truck', label: 'Track Orders', description: 'Update fulfilment status' },
    { to: '/admin/categories', icon: 'fas fa-layer-group', label: 'Manage Categories', description: 'Organise catalogue' },
    { to: '/admin/customers', icon: 'fas fa-user-shield', label: 'Manage Customers', description: 'Roles & accounts' },
  ];

  const loading = categoriesLoading || productsLoading || ordersLoading || customersLoading;
  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="dashboard admin-page admin-dashboard container-fluid px-0">
      <motion.div
        className="row g-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {stats.map((card, index) => (
          <motion.div key={card.label} className="col-xxl-3 col-md-6" custom={index} variants={cardVariants}>
            <div className={`stat-card stat-card--${card.tone} card border-0 h-100`}>
              <div className="card-body position-relative">
                <div className="d-flex justify-content-between align-items-start position-relative">
                  <div>
                    <p className="stat-card__label text-uppercase small mb-1 letter-spacing-1 d-flex align-items-center gap-2">
                      <i className={`${card.icon} small-icon`} />
                      {card.label}
                    </p>
                    <h2 className="stat-card__value fw-bold mb-0 display-value">{card.value}</h2>
                  </div>
                  <span className="stat-card__icon-circle">
                    <i className={`${card.icon} fs-3`} />
                  </span>
                </div>
                <p className="stat-card__subtitle small mt-3 mb-0">{card.subtitle}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="row g-4 mt-1">
        <div className="col-xxl-8">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="fw-semibold mb-0">Revenue (6 months)</h5>
                  <small className="text-muted">Smoothed area chart of order totals</small>
                </div>
                <span className="badge bg-primary-subtle text-primary">
                  <i className="fas fa-chart-area me-2" />
                  {toCurrency(monthlyRevenue.reduce((acc, item) => acc + item.revenue, 0))}
                </span>
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.42} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `EGP ${value / 1000}k`} />
                    <Tooltip formatter={(value: number) => toCurrency(value)} />
                    <Area type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xxl-4">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Orders by Status</h5>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xl-6">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                <div>
                  <h5 className="fw-semibold mb-0">AI Insights</h5>
                  <small className="text-muted">
                    {aiInsights?.generatedAt
                      ? `Generated ${new Date(aiInsights.generatedAt).toLocaleString()}`
                      : 'Aggregated sales, stock, category, and promo signals'}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => refetchAiInsights()}
                  disabled={aiInsightsFetching}
                >
                  <i className="fas fa-rotate me-2" />
                  {aiInsightsFetching ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {aiInsightsLoading && <div className="text-muted small">Generating insights...</div>}
              {aiInsightsError && <div className="alert alert-warning py-2">AI insights are temporarily unavailable.</div>}
              {aiInsights && (
                <>
                  <p className="mb-3">{aiInsights.summary}</p>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <span className="badge bg-primary-subtle text-primary">Provider: {aiInsights.provider}</span>
                    {aiInsights.metrics.slice(0, 3).map((metric) => (
                      <span key={metric.label} className="badge bg-light text-dark border">
                        {metric.label}: {metric.value}
                      </span>
                    ))}
                  </div>
                  <ul className="list-group list-group-flush">
                    {aiInsights.suggestedActions.map((action) => (
                      <li key={action} className="list-group-item px-0 d-flex gap-2">
                        <i className="fas fa-check-circle text-success mt-1" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                <div>
                  <h5 className="fw-semibold mb-0">Security AI Insights</h5>
                  <small className="text-muted">
                    {securityInsights?.generatedAt
                      ? `Generated ${new Date(securityInsights.generatedAt).toLocaleString()}`
                      : 'Rule-based risk signals summarized for review'}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => refetchSecurityInsights()}
                  disabled={securityInsightsFetching}
                >
                  <i className="fas fa-shield-alt me-2" />
                  {securityInsightsFetching ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {securityInsightsLoading && <div className="text-muted small">Checking security signals...</div>}
              {securityInsightsError && <div className="alert alert-warning py-2">Security insights are temporarily unavailable.</div>}
              {securityInsights && (
                <>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span
                      className={classNames('badge fs-6', {
                        'bg-success': securityInsights.riskLevel === 'Low',
                        'bg-warning text-dark': securityInsights.riskLevel === 'Medium',
                        'bg-danger': securityInsights.riskLevel === 'High',
                      })}
                    >
                      {securityInsights.riskLevel} Risk
                    </span>
                    <span className="badge bg-light text-muted border">Provider: {securityInsights.provider}</span>
                  </div>
                  <p>{securityInsights.summary}</p>
                  <div className="alert alert-secondary py-2">{securityInsights.recommendedAction}</div>
                  <div className="row g-2">
                    {securityInsights.signals.map((signal, index) => (
                      <div className="col-md-6" key={`${signal.title}-${index}`}>
                        <div className="admin-signal-card border rounded-3 p-3 h-100">
                          <div className="d-flex justify-content-between gap-2 mb-2">
                            <strong>{signal.title}</strong>
                            <span
                              className={classNames('badge', {
                                'bg-success': signal.severity === 'Low',
                                'bg-warning text-dark': signal.severity === 'Medium',
                                'bg-danger': signal.severity === 'High',
                              })}
                            >
                              {signal.severity}
                            </span>
                          </div>
                          <small className="text-muted">{signal.description}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xl-6">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-semibold mb-0">Quick Actions</h5>
                <span className="badge bg-warning-subtle text-warning">
                  <i className="fas fa-bolt me-2" />
                  Shortcuts
                </span>
              </div>
              <div className="row g-3">
                {quickLinks.map((link) => (
                  <div className="col-sm-6" key={link.to}>
                    <Link to={link.to} className="text-decoration-none">
                      <div className="admin-quick-link border rounded-3 p-3 h-100 hover-card">
                        <div className="d-flex align-items-center gap-3">
                          <span className="quick-link-icon badge rounded-circle bg-primary-subtle text-primary p-3">
                            <i className={`${link.icon} fs-4`} />
                          </span>
                          <div>
                            <p className="fw-semibold mb-0 text-dark">{link.label}</p>
                            <small className="text-muted">{link.description}</small>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-semibold mb-0">Top Priced Tech</h5>
                <small className="text-muted">Premium systems and components in the catalog</small>
              </div>
              <ul className="list-group list-group-flush">
                {topProducts.length === 0 && <li className="list-group-item">No products available yet.</li>}
                {topProducts.map((product) => (
                  <li key={product.name} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <p className="mb-0 fw-semibold">{product.name}</p>
                      <small className="text-muted">Performance catalog</small>
                    </div>
                    <span className="badge bg-primary-subtle text-primary">{toCurrency(product.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-muted small">
                <i className="fas fa-info-circle me-2" />
                Consider featuring premium systems and components on the storefront banner to boost sales.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


