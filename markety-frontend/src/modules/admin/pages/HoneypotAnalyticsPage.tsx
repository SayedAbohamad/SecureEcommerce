import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
import { honeypotApi } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';

const trapLabel = (trapType: string) => {
  switch (trapType) {
    case 'fake-login':
      return 'Fake Admin/WP Login';
    case 'fake-phpmyadmin':
      return 'Fake phpMyAdmin';
    case 'fake-config':
      return 'Fake Config/.env';
    default:
      return trapType;
  }
};

export const HoneypotAnalyticsPage = () => {
  const [page, setPage] = useState(1);
  const [pathFilter, setPathFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [uaFilter, setUaFilter] = useState('');
  const pageSize = 15;

  const { data: summary, isLoading: summaryLoading, isFetching: summaryFetching, refetch: refetchSummary } = useQuery({
    queryKey: ['honeypot-summary'],
    queryFn: () => honeypotApi.getSummary(),
    refetchInterval: 60_000,
  });

  const { data: events, isLoading: eventsLoading, isFetching: eventsFetching } = useQuery({
    queryKey: ['honeypot-events', page, pathFilter, ipFilter, uaFilter],
    queryFn: () =>
      honeypotApi.getEvents({
        page,
        pageSize,
        path: pathFilter || undefined,
        ipAddress: ipFilter || undefined,
        userAgent: uaFilter || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const hitsOverTime = useMemo(
    () => (summary?.hitsByDay ?? []).map((entry) => ({ day: entry.key.slice(5), hits: entry.count })),
    [summary],
  );

  const topPaths = useMemo(
    () => (summary?.topPaths ?? []).slice(0, 6).map((entry) => ({ path: entry.key, hits: entry.count })),
    [summary],
  );

  const totalPages = events ? Math.max(1, Math.ceil(events.totalCount / pageSize)) : 1;

  if (summaryLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="admin-page admin-honeypot container-fluid px-0">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">
            <i className="fas fa-shield-virus me-2 text-danger" />
            Honeypot Analytics
          </h4>
          <small className="text-muted">
            Fake decoy endpoints (/wp-admin, /phpmyadmin, /admin-old, /config) monitored for scanner &amp; attacker traffic.
          </small>
        </div>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => refetchSummary()}
          disabled={summaryFetching}
        >
          <i className="fas fa-rotate me-2" />
          {summaryFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-xxl-3 col-md-6">
          <div className="stat-card stat-card--emerald card border-0 h-100">
            <div className="card-body">
              <p className="stat-card__label text-uppercase small mb-1 d-flex align-items-center gap-2">
                <i className="fas fa-bug small-icon" />
                Total Hits
              </p>
              <h2 className="stat-card__value fw-bold mb-0 display-value">{summary?.totalHits ?? 0}</h2>
              <p className="stat-card__subtitle small mt-3 mb-0">All-time honeypot triggers</p>
            </div>
          </div>
        </div>
        <div className="col-xxl-3 col-md-6">
          <div className="stat-card stat-card--amber card border-0 h-100">
            <div className="card-body">
              <p className="stat-card__label text-uppercase small mb-1 d-flex align-items-center gap-2">
                <i className="fas fa-calendar-day small-icon" />
                Hits Today
              </p>
              <h2 className="stat-card__value fw-bold mb-0 display-value">{summary?.hitsToday ?? 0}</h2>
              <p className="stat-card__subtitle small mt-3 mb-0">Since midnight UTC</p>
            </div>
          </div>
        </div>
        <div className="col-xxl-3 col-md-6">
          <div className="stat-card stat-card--blue card border-0 h-100">
            <div className="card-body">
              <p className="stat-card__label text-uppercase small mb-1 d-flex align-items-center gap-2">
                <i className="fas fa-network-wired small-icon" />
                Unique IPs
              </p>
              <h2 className="stat-card__value fw-bold mb-0 display-value">{summary?.uniqueIps ?? 0}</h2>
              <p className="stat-card__subtitle small mt-3 mb-0">Distinct attacker sources</p>
            </div>
          </div>
        </div>
        <div className="col-xxl-3 col-md-6">
          <div className="stat-card stat-card--violet card border-0 h-100">
            <div className="card-body">
              <p className="stat-card__label text-uppercase small mb-1 d-flex align-items-center gap-2">
                <i className="fas fa-crosshairs small-icon" />
                Most Targeted
              </p>
              <h2 className="stat-card__value fw-bold mb-0 display-value" style={{ fontSize: '1.35rem' }}>
                {summary?.mostTargetedPath ?? '—'}
              </h2>
              <p className="stat-card__subtitle small mt-3 mb-0">
                {summary?.latestAttackAt
                  ? `Last attack ${new Date(summary.latestAttackAt).toLocaleString()}`
                  : 'No attacks yet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xxl-8">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Hits Over Time (last 14 days)</h5>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hitsOverTime}>
                    <defs>
                      <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="hits" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorHits)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xxl-4">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Top Fake Endpoints</h5>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topPaths} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="path" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="hits" fill="#dc2626" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xl-4">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Top Attacker IPs</h5>
              <ul className="list-group list-group-flush">
                {(summary?.topIps ?? []).length === 0 && <li className="list-group-item">No data yet.</li>}
                {(summary?.topIps ?? []).map((entry) => (
                  <li key={entry.key} className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <code>{entry.key}</code>
                    <span className="badge bg-danger-subtle text-danger">{entry.count} hits</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Latest Attacker User Agents</h5>
              <ul className="list-group list-group-flush">
                {(summary?.recentUserAgents ?? []).length === 0 && <li className="list-group-item">No data yet.</li>}
                {(summary?.recentUserAgents ?? []).map((ua, index) => (
                  <li key={index} className="list-group-item px-0 small text-break">
                    {ua}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Recent Payloads</h5>
              <ul className="list-group list-group-flush">
                {(summary?.recentPayloads ?? []).length === 0 && <li className="list-group-item">No payloads captured.</li>}
                {(summary?.recentPayloads ?? []).map((payload, index) => (
                  <li key={index} className="list-group-item px-0">
                    <code className="small text-break">{payload.slice(0, 200)}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="admin-panel card border-0">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <h5 className="fw-semibold mb-0">Raw Honeypot Events</h5>
                <div className="d-flex gap-2 flex-wrap">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Filter by path"
                    value={pathFilter}
                    onChange={(e) => {
                      setPage(1);
                      setPathFilter(e.target.value);
                    }}
                    style={{ maxWidth: 160 }}
                  />
                  <input
                    className="form-control form-control-sm"
                    placeholder="Filter by IP"
                    value={ipFilter}
                    onChange={(e) => {
                      setPage(1);
                      setIpFilter(e.target.value);
                    }}
                    style={{ maxWidth: 160 }}
                  />
                  <input
                    className="form-control form-control-sm"
                    placeholder="Filter by user agent"
                    value={uaFilter}
                    onChange={(e) => {
                      setPage(1);
                      setUaFilter(e.target.value);
                    }}
                    style={{ maxWidth: 200 }}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Trap</th>
                      <th>Method</th>
                      <th>Path</th>
                      <th>IP</th>
                      <th>User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsLoading && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          Loading events...
                        </td>
                      </tr>
                    )}
                    {!eventsLoading && (events?.items.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          No honeypot events match these filters.
                        </td>
                      </tr>
                    )}
                    {events?.items.map((event) => (
                      <tr key={event.id}>
                        <td className="small text-nowrap">{new Date(event.createdAt).toLocaleString()}</td>
                        <td>
                          <span className="badge bg-danger-subtle text-danger">{trapLabel(event.trapType)}</span>
                        </td>
                        <td>
                          <span className={classNames('badge', event.method === 'GET' ? 'bg-secondary' : 'bg-warning text-dark')}>
                            {event.method}
                          </span>
                        </td>
                        <td className="small text-break">{event.path}</td>
                        <td>
                          <code>{event.ipAddress}</code>
                        </td>
                        <td className="small text-break" style={{ maxWidth: 260 }}>
                          {event.userAgent ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">
                  {events ? `Showing page ${events.page} of ${totalPages} (${events.totalCount} total events)` : ''}
                  {eventsFetching ? ' — refreshing...' : ''}
                </small>
                <div className="btn-group">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <i className="fas fa-chevron-left" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <i className="fas fa-chevron-right" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
