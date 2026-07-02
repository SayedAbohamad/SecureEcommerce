import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useWishlist } from '../../../hooks/useWishlist';
import { orderApi, addressApi, UserAddress } from '../../../api';
import { OrderSummary } from '../../../types/order';
import { formatCurrencyEGP } from '../../../utils/currency';
import { formatDate, formatDateTime } from '../../../utils/date';
import { RecommendationSection } from '../../../components/common/RecommendationSection';

export const ProfilePage = () => {
  const { user } = useAuth();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [favoriteCategory, setFavoriteCategory] = useState<string>('Loading...');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [ordersData, favCat, addrData] = await Promise.all([
          orderApi.getMine(),
          orderApi.getFavoriteCategory(),
          addressApi.getAll()
        ]);
        if (isMounted) {
          setOrders(ordersData);
          setFavoriteCategory(favCat);
          setAddresses(addrData);
        }
      } catch (error) {
        if (isMounted) {
          setOrdersError('Unable to load profile data.');
          setFavoriteCategory('N/A');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const defaultAddress = useMemo(() => addresses.find(a => a.isDefault), [addresses]);

  const totalOrders = orders.length;
  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    [orders],
  );
  const wishlistCount = wishlist.length;

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h2 className="text-primary mb-3">Access your account profile</h2>
        <p className="text-muted mb-4">Login to see your details, roles, and order shortcuts.</p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/login', { state: { from: '/profile' } })}>
          Login to Continue
        </button>
      </div>
    );
  }

  const memberSince = formatDate(user.createdAt);
  const lastLogin = formatDateTime(user.lastLogin);
  const accountType = user.roles?.[0] ?? 'Customer';

  return (
    <div className="container py-5">
        <div className="card border-0 shadow-sm mb-4 overflow-hidden">
          <div className="card-body p-4 bg-white">
            <div className="row align-items-center gy-3">
              <div className="col-lg-7 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white" style={{ width: 90, height: 90 }}>
                  <span className="fs-2 fw-bold">{user.fullName?.charAt(0) ?? 'U'}</span>
                </div>
                <div>
                  <h2 className="mb-1 fw-bold">{user.fullName}</h2>
                  <p className="mb-1 text-muted">{user.email}</p>
                  <p className="mb-0 small text-muted">Member since {memberSince}</p>
                </div>
              </div>
              <div className="col-lg-5">
                <div className="row g-3 text-center">
                  <div className="col-4">
                    <div className="p-3 rounded-3 border bg-light">
                      <div className="fs-5 fw-bold">{loading ? '--' : totalOrders}</div>
                      <div className="small text-muted">Total Orders</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 rounded-3 border bg-light">
                      <div className="fs-5 fw-bold">{wishlistCount}</div>
                      <div className="small text-muted">Wishlist Items</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 rounded-3 border bg-light">
                      <div className="fs-5 fw-bold">{loading ? '--' : formatCurrencyEGP(totalSpent)}</div>
                      <div className="small text-muted">Total Spent</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-xl-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                  <div>
                    <h4 className="fw-bold mb-1">Profile Information</h4>
                    <p className="text-muted mb-0">Your personal information and account details.</p>
                  </div>
                  <button className="btn btn-outline-primary" onClick={() => navigate('/settings')}>
                    Edit Profile
                  </button>
                </div>

                <div className="row g-3">
                  <div className="col-sm-6">
                    <div className="p-3 rounded-3 bg-light">
                      <div className="text-muted small text-uppercase fw-semibold mb-2">Full Name</div>
                      <div className="fw-semibold">{user.fullName}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 rounded-3 bg-light">
                      <div className="text-muted small text-uppercase fw-semibold mb-2">Email Address</div>
                      <div className="fw-semibold">{user.email}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 rounded-3 bg-light">
                      <div className="text-muted small text-uppercase fw-semibold mb-2">Phone Number</div>
                      <div className="fw-semibold">{user.phoneNumber || 'Not provided'}</div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 rounded-3 bg-light">
                      <div className="text-muted small text-uppercase fw-semibold mb-2">Date of Birth</div>
                      <div className="fw-semibold">{user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Not provided'}</div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 rounded-3 bg-primary-subtle bg-opacity-10 border border-primary border-opacity-10">
                      <div className="text-primary small text-uppercase fw-bold mb-2">
                        <i className="fas fa-truck me-2" />Primary Shipping Address
                      </div>
                      <div className="fw-bold fs-5">{defaultAddress ? `${defaultAddress.street}, ${defaultAddress.city}` : (user.address || 'No address saved yet.')}</div>
                      {defaultAddress && <div className="text-muted small mt-1">{defaultAddress.state} {defaultAddress.zipCode}, {defaultAddress.country}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mt-4">
              <div className="card-body p-4 d-flex align-items-center justify-content-between cursor-pointer" style={{ cursor: 'pointer' }} onClick={() => navigate('/profile/notifications')}>
                <div>
                  <h5 className="fw-semibold mb-1">My Notifications</h5>
                  <p className="small text-muted mb-0">View latest offers, order updates, and support replies.</p>
                </div>
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                  <i className="fas fa-bell" />
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mt-4">
              <div className="card-body p-4">
                <h5 className="fw-semibold mb-3">Security Information</h5>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <div className="p-3 rounded-3 bg-light">
                      <div className="text-muted small text-uppercase fw-semibold mb-2">Two-Factor Authentication</div>
                      <div className="fw-semibold">{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>
                  <div className="col-sm-12">
                    <div className="p-3 rounded-3 bg-light">
                      <div className="text-muted small text-uppercase fw-semibold mb-2">Last Login</div>
                      <div className="fw-semibold">{lastLogin}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h5 className="fw-semibold mb-4">Account Overview</h5>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted small">Account Type</span>
                  <span className="fw-semibold">{accountType}</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted small">Member Since</span>
                  <span className="fw-semibold">{memberSince}</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted small">Total Orders</span>
                  <span className="fw-semibold">{loading ? '--' : totalOrders}</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted small">Total Spent</span>
                  <span className="fw-semibold">{formatCurrencyEGP(totalSpent)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Favorite Category</span>
                  <span className="fw-semibold">{favoriteCategory}</span>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex align-items-start justify-content-between mb-3">
                  <div>
                    <h5 className="fw-semibold mb-1">My Addresses</h5>
                    <p className="small text-muted mb-0">Your saved shipping locations.</p>
                  </div>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/settings')}>
                    Manage
                  </button>
                </div>
                <div className="d-flex flex-column gap-2 mt-2">
                  {addresses.length === 0 ? (
                    <div className="p-3 rounded-3 bg-light text-center text-muted small">
                      No addresses saved yet.
                    </div>
                  ) : (
                    addresses.map(addr => (
                      <div key={addr.id} className={`p-3 rounded-3 ${addr.isDefault ? 'bg-primary-subtle bg-opacity-10 border border-primary border-opacity-20' : 'bg-light border-0'}`}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="fw-semibold small">{addr.street}</div>
                          {addr.isDefault && <span className="badge bg-primary x-small" style={{ fontSize: '10px' }}>PRIMARY</span>}
                        </div>
                        <div className="text-muted x-small mt-1" style={{ fontSize: '12px' }}>{addr.city}, {addr.state}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-semibold mb-0">Recent Orders</h5>
              <button className="btn btn-sm btn-link text-decoration-none" onClick={() => navigate('/orders')}>
                View All <i className="fas fa-chevron-right ms-1 small"></i>
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-4 bg-light rounded-3">
                <p className="text-muted mb-0">You haven't placed any orders yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 text-muted small text-uppercase fw-semibold">Order ID</th>
                      <th className="border-0 text-muted small text-uppercase fw-semibold">Date</th>
                      <th className="border-0 text-muted small text-uppercase fw-semibold">Status</th>
                      <th className="border-0 text-muted small text-uppercase fw-semibold text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${order.id}`)}>
                        <td className="fw-semibold text-primary">#{order.id.slice(0, 8)}</td>
                        <td className="text-muted small">{formatDate(order.orderDate)}</td>
                        <td>
                          <span className={`badge rounded-pill px-3 py-2 ${
                            order.status === 'Delivered' ? 'bg-success-subtle text-success' :
                            order.status === 'Cancelled' ? 'bg-danger-subtle text-danger' :
                            'bg-primary-subtle text-primary'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="text-end fw-bold">{formatCurrencyEGP(order.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {ordersError && (
          <div className="alert alert-warning mt-4">{ordersError}</div>
        )}
        <RecommendationSection placement="profile" className="mt-4" />
      </div>
  );
};
