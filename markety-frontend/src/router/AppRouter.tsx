import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { HomePage } from '../modules/customer/pages/HomePage';
import { ShopPage } from '../modules/customer/pages/ShopPage';
import { ProductDetailsPage } from '../modules/customer/pages/ProductDetailsPage';
import { CartPage } from '../modules/customer/pages/CartPage';
import { CheckoutPage } from '../modules/customer/pages/CheckoutPage';
import { ContactPage } from '../modules/customer/pages/ContactPage';
import { OrdersPage as CustomerOrdersPage } from '../modules/customer/pages/OrdersPage';
import { OrderDetailsPage } from '../modules/customer/pages/OrderDetailsPage';
import { WishlistPage } from '../modules/customer/pages/WishlistPage';
import { ProfilePage } from '../modules/customer/pages/ProfilePage';
import { SettingsPage } from '../modules/customer/pages/SettingsPage';
import { NotificationsPage } from '../modules/customer/pages/NotificationsPage';
import { LoginPage } from '../modules/auth/LoginPage';
import { RegisterPage } from '../modules/auth/RegisterPage';
import { ForgotPasswordPage } from '../modules/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../modules/auth/ResetPasswordPage';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { AdminLayout } from '../layouts/AdminLayout';
import { DashboardPage } from '../modules/admin/pages/DashboardPage';
import { CategoriesPage } from '../modules/admin/pages/CategoriesPage';
import { ProductsPage } from '../modules/admin/pages/ProductsPage';
import { OrdersPage as AdminOrdersPage } from '../modules/admin/pages/OrdersPage';
import { UsersPage } from '../modules/admin/pages/UsersPage';
import { PromoCodesPage } from '../modules/admin/pages/PromoCodesPage';
import { SupportInboxPage } from '../modules/admin/pages/SupportInboxPage';
import { HoneypotAnalyticsPage } from '../modules/admin/pages/HoneypotAnalyticsPage';
import { SecurityHealthPage } from '../modules/admin/pages/SecurityHealthPage';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<CustomerLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="product/:id" element={<ProductDetailsPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="wishlist" element={<WishlistPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="orders" element={<CustomerOrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['Admin', 'Manager']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="categories" element={
          <ProtectedRoute roles={['Admin']}>
            <CategoriesPage />
          </ProtectedRoute>
        } />
        <Route path="products" element={
          <ProtectedRoute roles={['Admin']}>
            <ProductsPage />
          </ProtectedRoute>
        } />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="support" element={<SupportInboxPage />} />
        <Route path="promo-codes" element={
          <ProtectedRoute roles={['Admin']}>
            <PromoCodesPage />
          </ProtectedRoute>
        } />
        <Route path="honeypot" element={
          <ProtectedRoute roles={['Admin']}>
            <HoneypotAnalyticsPage />
          </ProtectedRoute>
        } />
        <Route path="security-health" element={
          <ProtectedRoute roles={['Admin']}>
            <SecurityHealthPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

