import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { formatCurrencyEGP } from '../../../utils/currency';

const ordersHeroImage = `${process.env.PUBLIC_URL}/template/img/tech-page-header.svg`;
export const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: orders,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => orderApi.getMine(),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <>
        <PageHeader
          title="My Orders"
          subtitle="Sign in to track your purchases and access order history."
          image={ordersHeroImage}
          eyebrow="History"
        />
        <div className="container py-5 text-center">
        <h2 className="text-primary mb-3">Track your orders with ease</h2>
        <button className="btn btn-primary" onClick={() => navigate('/login', { state: { from: '/orders' } })}>
          Login to Continue
        </button>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="My Orders"
          subtitle="Review your Markety purchases."
          image={ordersHeroImage}
          eyebrow="History"
        />
        <LoadingOverlay />
      </>
    );
  }

  if (isError || !orders) {
    return (
      <>
        <PageHeader
          title="My Orders"
          subtitle="We couldn't fetch your orders. Please try again later."
          image={ordersHeroImage}
          eyebrow="History"
        />
        <div className="container py-5 text-center">
        <h2 className="text-danger">Unable to load orders</h2>
        <p className="text-muted">Please refresh or try again later.</p>
        </div>
      </>
    );
  }

  return (
      <>
        <PageHeader
          title="My Orders"
          subtitle="Review your Markety purchases."
          image={ordersHeroImage}
          eyebrow="History"
        />
      <div className="container py-5">
      <h1 className="fw-bold mb-4">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-5">
          <h3 className="text-muted mb-3">No orders yet</h3>
          <button className="btn btn-primary" onClick={() => navigate('/shop')}>
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {orders.map((order) => (
            <div className="col-12 col-md-6" key={order.id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="fw-semibold">Order #{order.id.slice(0, 8)}</h5>
                    <span className="badge bg-primary">{order.status}</span>
                  </div>
                  <p className="text-muted mb-1">Placed on {new Date(order.orderDate).toLocaleDateString()}</p>
                  <p className="text-muted">Items: {order.itemsCount}</p>
                  <div className="mt-auto">
                    <p className="fw-bold fs-5 text-primary mb-3">{formatCurrencyEGP(order.totalAmount)}</p>
                    <button className="btn btn-outline-primary w-100" onClick={() => navigate(`/orders/${order.id}`)}>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
};

