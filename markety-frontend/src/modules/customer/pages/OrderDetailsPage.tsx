import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { PageHeader } from '../../../components/common/PageHeader';
import { formatCurrencyEGP } from '../../../utils/currency';
import { formatDateTime } from '../../../utils/date';
import { showToast } from '../../../utils/toast';

const orderDetailsHero = `${process.env.PUBLIC_URL}/template/img/tech-page-header.svg`;
export const OrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderApi.getById(id!),
    enabled: Boolean(id),
  });

  const queryClient = useQueryClient();
  const cancelMutation = useMutation({
    mutationFn: () => orderApi.cancel(id!),
    onSuccess: () => {
      showToast.success('Order cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.response?.data || 'Failed to cancel order.';
      showToast.error(typeof message === 'string' ? message : 'Failed to cancel order.');
    },
  });

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Order Details"
          subtitle="We are preparing your order insights."
          image={orderDetailsHero}
          eyebrow="Order"
        />
        <LoadingOverlay />
      </>
    );
  }

  if (isError || !order) {
    return (
      <>
        <PageHeader
          title="Order Details"
          subtitle="We could not find this order."
          image={orderDetailsHero}
          eyebrow="Order"
        />
        <div className="container py-5 text-center">
        <h2 className="text-danger">Order not found</h2>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/orders')}>
          Back to Orders
        </button>
        </div>
      </>
    );
  }

  return (
      <>
        <PageHeader
          title="Order Details"
          subtitle="Review the items and summary for this purchase."
          image={orderDetailsHero}
          eyebrow="Order"
        />
      <div className="container py-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
        <div>
          <h1 className="fw-bold">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-muted mb-0">Placed on {formatDateTime(order.orderDate)}</p>
        </div>
        <span className="badge bg-primary fs-6 px-3 py-2">{order.status}</span>
      </div>
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="fw-semibold mb-4">Items</h5>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th className="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.productId}>
                        <td>{item.productName}</td>
                        <td>{formatCurrencyEGP(item.pricePerUnit)}</td>
                        <td>{item.quantity}</td>
                        <td className="text-end">{formatCurrencyEGP(item.subTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="fw-semibold mb-3">Order Summary</h5>
              <div className="d-flex justify-content-between mb-2">
                <span>Items</span>
                <span>{order.itemsCount}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>{formatCurrencyEGP(order.items.reduce((sum, item) => sum + item.subTotal, 0))}</span>
              </div>
              {order.promoCode && (
                <div className="d-flex justify-content-between mb-2 text-success fw-medium">
                  <span>Discount ({order.promoCode})</span>
                  <span>-{formatCurrencyEGP(order.discountAmount ?? 0)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between border-top pt-3 mt-3">
                <span className="fw-bold">Total</span>
                <span className="fw-bold text-primary fs-5">{formatCurrencyEGP(order.totalAmount)}</span>
              </div>
              {order.status !== 'Deliverd' && order.status !== 'Cancelled' && (
                <button
                  className="btn btn-danger w-100 mt-4"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
              <button className="btn btn-outline-primary w-100 mt-3" onClick={() => navigate('/orders')}>
                Back to Orders
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

