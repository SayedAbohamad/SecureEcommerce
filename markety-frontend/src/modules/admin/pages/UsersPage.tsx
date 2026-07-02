import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';

export const UsersPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['users', search, roleFilter, statusFilter, page],
    queryFn: () => userApi.getAll({
      search: search || undefined,
      roleFilter: roleFilter || undefined,
      statusFilter: statusFilter === '' ? undefined : statusFilter,
      page,
      pageSize,
    }),
  });

  const users = response?.users || [];
  const totalCount = response?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleToggleLock = async (userId: string, current?: boolean) => {
    try {
      await userApi.updateStatus(userId, { lockoutEnabled: !current });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error(error);
      const { showToast } = await import('../../../utils/toast');
      showToast.error('Unable to update user status');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Permanently delete this user account?')) {
      return;
    }
    try {
      await userApi.remove(userId);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error(error);
      const { showToast } = await import('../../../utils/toast');
      showToast.error('Unable to delete user');
    }
  };

  const handleEditRoles = async (userId: string, roles: string[]) => {
    const nextRoles = prompt('Enter roles separated by comma (e.g., Customer,Manager):', roles.join(','));
    if (nextRoles === null) {
      return;
    }
    const payload = nextRoles
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);

    try {
      await userApi.updateRoles(userId, { roles: payload });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error(error);
      const { showToast } = await import('../../../utils/toast');
      showToast.error('Unable to update roles');
    }
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page on search
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (isError) {
    return <div className="alert alert-danger">Unable to load users.</div>;
  }

  return (
    <div className="container-fluid admin-page">
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="fw-semibold mb-3">Users</h5>

          {/* Search Bar */}
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, email, or role"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-outline-secondary" onClick={handleSearch}>
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="row mb-3">
            <div className="col-md-3">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                  queryClient.invalidateQueries({ queryKey: ['users'] });
                }}
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Customer">Customer</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter === '' ? '' : statusFilter.toString()}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : e.target.value === 'true';
                  setStatusFilter(value);
                  setPage(1);
                  queryClient.invalidateQueries({ queryKey: ['users'] });
                }}
              >
                <option value="">All Status</option>
                <option value="false">Active</option>
                <option value="true">Locked</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName ?? 'N/A'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="badge bg-secondary">{user.roles.join(', ')}</span>
                    </td>
                    <td>{user.lockoutEnabled ? <span className="badge bg-warning">Locked</span> : <span className="badge bg-success">Active</span>}</td>
                    <td className="text-end">
                      <div className="btn-group flex-wrap gap-1 justify-content-end">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditRoles(user.id, user.roles)}
                        >
                          Edit Roles
                        </button>
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => handleToggleLock(user.id, user.lockoutEnabled)}
                        >
                          Toggle Lock
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(user.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Info */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              Showing {users.length} of {totalCount} users
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                  queryClient.invalidateQueries({ queryKey: ['users'] });
                }}
              >
                Previous
              </button>
              <span className="align-self-center">Page {page} of {totalPages}</span>
              <button
                className="btn btn-outline-primary"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1);
                  queryClient.invalidateQueries({ queryKey: ['users'] });
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

