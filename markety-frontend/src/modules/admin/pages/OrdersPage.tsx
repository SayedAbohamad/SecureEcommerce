import { ChangeEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { showToast } from '../../../utils/toast';
import { formatCurrencyEGP } from '../../../utils/currency';

// Match backend enum exactly (Note: 'Deliverd' typo in backend)
const statusOptions: string[] = ['Pending', 'Processing', 'Shipped', 'Deliverd', 'Cancelled'];

export const OrdersPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const {
    data: orders,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: () => orderApi.getAll(),
  });

  const handleStatusChange = async (orderId: string, event: ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value;
    try {
      await orderApi.updateStatus(orderId, { status: nextStatus });
      queryClient.invalidateQueries({ queryKey: ['orders', 'all'] });
      showToast.success('Order status updated successfully');
    } catch (error) {
      console.error(error);
      showToast.error('Unable to update order status');
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm('Delete this order permanently?')) return;
    try {
      await orderApi.remove(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders', 'all'] });
      showToast.success('Order deleted successfully');
    } catch (error) {
      console.error(error);
      showToast.error('Unable to delete order');
    }
  };

  const statusToColor: Record<string, string> = {
    Pending: '#6c757d',
    Processing: '#5B3DC8',
    Shipped: '#6610f2',
    Deliverd: '#198754',
    Cancelled: '#dc3545',
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : undefined;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : undefined;
    return orders.filter((o) => {
      const passStatus = statusFilter === 'all' || o.status === statusFilter;
      const term = searchTerm.trim().toLowerCase();
      const passSearch =
        term.length === 0 ||
        o.id.toLowerCase().includes(term) ||
        (o.customerEmail ?? '').toLowerCase().includes(term) ||
        (o.customerName ?? '').toLowerCase().includes(term);
      const t = new Date(o.orderDate).getTime();
      const passFrom = fromTs === undefined || t >= fromTs;
      const passTo = toTs === undefined || t <= toTs;
      return passStatus && passSearch && passFrom && passTo;
    });
  }, [orders, statusFilter, searchTerm, dateFrom, dateTo]);

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (isError) {
    return <div className="alert alert-danger">Unable to load orders.</div>;
  }

  return (
    <div className="container-fluid admin-page">
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-3">
            <h5 className="fw-semibold mb-0">Orders</h5>
            <div className="d-flex flex-column flex-lg-row gap-2">
              <div className="input-group">
                <span className="input-group-text"><i className="fa fa-search" /></span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search by ID, name, or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Status legend */}
          <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
            {Object.entries(statusToColor).map(([label, color]) => (
              <div key={label} className="d-flex align-items-center gap-2">
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: color,
                  }}
                />
                <small>{label}</small>
              </div>
            ))}
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="fw-semibold">{order.id.slice(0, 8)}</td>
                    <td>
                      <div>{order.customerName ?? 'Unknown'}</div>
                      <small className="text-muted">{order.customerEmail}</small>
                    </td>
                    <td>{new Date(order.orderDate).toLocaleString()}</td>
                    <td>{formatCurrencyEGP(Number(order.totalAmount))}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span
                          title={order.status}
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: statusToColor[order.status] ?? '#6c757d',
                          }}
                        />
                        <select
                          className="form-select form-select-sm"
                          value={order.status}
                          onChange={(event) => handleStatusChange(order.id, event)}
                          style={{ minWidth: 130 }}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>{order.itemsCount}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger w-100 w-sm-auto" onClick={() => handleDelete(order.id)}>
                        <i className="fas fa-trash-alt me-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

