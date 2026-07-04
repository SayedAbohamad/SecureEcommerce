import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import { securityHealthApi, SecurityCheck } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';

const statusTone = (status: string) =>
  classNames({
    'text-success': status === 'Good',
    'text-warning': status === 'Warning',
    'text-danger': status === 'Critical',
    'text-info': status === 'Info',
  });

const statusBadge = (status: string) =>
  classNames('badge', {
    'bg-success': status === 'Good',
    'bg-warning text-dark': status === 'Warning',
    'bg-danger': status === 'Critical',
    'bg-info text-dark': status === 'Info',
  });

const statusIcon = (status: string) => {
  switch (status) {
    case 'Good':
      return 'fas fa-check-circle';
    case 'Warning':
      return 'fas fa-exclamation-triangle';
    case 'Critical':
      return 'fas fa-times-circle';
    default:
      return 'fas fa-info-circle';
  }
};

const CheckCard = ({ icon, check }: { icon: string; check: SecurityCheck }) => (
  <div className="admin-panel card border-0 h-100">
    <div className="card-body">
      <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
        <div className="d-flex align-items-center gap-2">
          <i className={`${icon} fs-5 text-muted`} />
          <h6 className="fw-semibold mb-0">{check.label}</h6>
        </div>
        <span className={statusBadge(check.status)}>
          <i className={classNames(statusIcon(check.status), 'me-1')} />
          {check.status}
        </span>
      </div>
      <p className={classNames('fw-bold mb-1', statusTone(check.status))} style={{ fontSize: '1.1rem' }}>
        {check.value}
      </p>
      <small className="text-muted">{check.explanation}</small>
    </div>
  </div>
);

const scoreColor = (status: string) => (status === 'Good' ? '#10b981' : status === 'Warning' ? '#f59e0b' : '#dc2626');

export const SecurityHealthPage = () => {
  const queryClient = useQueryClient();
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');

  const { data: health, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['security-health'],
    queryFn: () => securityHealthApi.getHealth(),
    refetchInterval: 60_000,
  });

  const { data: blockedIps } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: () => securityHealthApi.getBlockedIps(),
  });

  const addMutation = useMutation({
    mutationFn: () => securityHealthApi.addBlockedIp({ ipAddress: newIp, reason: newReason || undefined }),
    onSuccess: () => {
      setNewIp('');
      setNewReason('');
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['security-health'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => securityHealthApi.removeBlockedIp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['security-health'] });
    },
  });

  if (isLoading || !health) {
    return <LoadingOverlay />;
  }

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <div className="admin-page admin-security-health container-fluid px-0">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-1">
            <i className="fas fa-heartbeat me-2 text-primary" />
            Security Health Dashboard
          </h4>
          <small className="text-muted">Live snapshot of authentication, network, and header security posture.</small>
        </div>
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => refetch()} disabled={isFetching}>
          <i className="fas fa-rotate me-2" />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="row g-4">
        <div className="col-xl-4">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-4">
              <svg width="140" height="140" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bs-border-color, #e2e8f0)" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={scoreColor(health.scoreStatus)}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="66" textAnchor="middle" fontSize="28" fontWeight="700" fill={scoreColor(health.scoreStatus)}>
                  {health.score}
                </text>
              </svg>
              <h5 className="fw-bold mt-3 mb-1">Overall Security Score</h5>
              <span className={statusBadge(health.scoreStatus)}>{health.scoreStatus}</span>
              <small className="text-muted mt-2">
                Generated {new Date(health.generatedAt).toLocaleString()}
              </small>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="row g-3 h-100">
            <div className="col-md-6">
              <CheckCard icon="fas fa-key" check={health.passwordPolicy} />
            </div>
            <div className="col-md-6">
              <CheckCard icon="fas fa-user-clock" check={health.activeSessions} />
            </div>
            <div className="col-md-6">
              <CheckCard icon="fas fa-user-lock" check={health.failedLogins} />
            </div>
            <div className="col-md-6">
              <CheckCard icon="fas fa-bullseye" check={health.lastAttackDetected} />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-md-4">
          <CheckCard icon="fas fa-ban" check={health.blockedIps} />
        </div>
        <div className="col-md-4">
          <CheckCard icon="fas fa-lock" check={health.sslTls} />
        </div>
        <div className="col-md-4">
          <CheckCard icon="fas fa-file-shield" check={health.contentSecurityPolicy} />
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-xl-6">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">
                <i className="fas fa-shield-halved me-2" />
                Security Headers Detail
              </h5>
              <ul className="list-group list-group-flush">
                {health.headerDetails.map((header) => (
                  <li key={header.key} className="list-group-item px-0">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="small">{header.label}</strong>
                      <span className={statusBadge(header.status)}>{header.status}</span>
                    </div>
                    <small className="text-muted text-break">{header.explanation}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="admin-panel card border-0 h-100">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">
                <i className="fas fa-ban me-2" />
                Manage Blocked IPs
              </h5>
              <form
                className="d-flex gap-2 mb-3 flex-wrap"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newIp.trim()) addMutation.mutate();
                }}
              >
                <input
                  className="form-control form-control-sm"
                  placeholder="IP address"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  style={{ maxWidth: 160 }}
                  required
                />
                <input
                  className="form-control form-control-sm"
                  placeholder="Reason (optional)"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  style={{ maxWidth: 220 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={addMutation.isPending}>
                  <i className="fas fa-plus me-1" />
                  Block
                </button>
              </form>

              <ul className="list-group list-group-flush">
                {(blockedIps ?? []).length === 0 && <li className="list-group-item">No IPs blocked yet.</li>}
                {(blockedIps ?? [])
                  .filter((b) => b.isActive)
                  .map((entry) => (
                    <li key={entry.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <div>
                        <code>{entry.ipAddress}</code>
                        {entry.reason && <div className="small text-muted">{entry.reason}</div>}
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeMutation.mutate(entry.id)}
                        disabled={removeMutation.isPending}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
