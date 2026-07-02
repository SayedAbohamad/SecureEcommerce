import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { addressApi, UserAddress } from '../../../api/addresses';
import { notificationApi, NotificationSettings } from '../../../api/notifications';

export const SettingsPage = () => {
  const { 
    user, 
    updateProfile, 
    requestPasswordChange, 
    confirmPasswordChange, 
    requestEmailChange, 
    verifyOldEmail,
    sendNewOtp,
    confirmEmailChange,
    toggleTwoFactor,
    resend2FA,
    logout,
    refreshCurrentUser,
    requestAccountDeletion,
    confirmAccountDeletion
  } = useAuth();
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'addresses' | 'notifications'>('profile');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // Profile State
  const [profileData, setProfileData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    dob: ''
  });
  
  // Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    street: '',
    city: '',
    state: '',
    country: 'Egypt',
    zipCode: '',
    isDefault: false
  });

  // Security State
  const [securityData, setSecurityData] = useState({
    newEmail: '',
    newPassword: '',
    confirmPassword: '',
    deletePassword: ''
  });

  // Notifications State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    receiveSupportEmails: true,
    receiveOfferEmails: true,
    notificationEmail: ''
  });

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [pendingAction, setPendingAction] = useState<'password' | 'email' | 'delete' | null>(null);
  const [emailChangeStep, setEmailChangeStep] = useState<1 | 2>(1); // 1: Old email verification, 2: New email verification
  const [changeEmailToken, setChangeEmailToken] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [otpStatus, setOtpStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const phoneRegex = /^(?:\+20|0)?1[0125]\d{8}$/;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        dob: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
      });
      setTwoFactorEnabled(Boolean(user.twoFactorEnabled));
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'addresses') {
      fetchAddresses();
    } else if (activeTab === 'notifications') {
      fetchNotificationSettings();
    }
  }, [activeTab]);

  const fetchNotificationSettings = async () => {
    try {
      const data = await notificationApi.getSettings();
      setNotificationSettings({
        receiveSupportEmails: data.receiveSupportEmails,
        receiveOfferEmails: data.receiveOfferEmails,
        notificationEmail: data.notificationEmail || ''
      });
    } catch (err) {
      console.error('Failed to fetch notification settings', err);
    }
  };

  const fetchAddresses = async () => {
    try {
      const data = await addressApi.getAll();
      setAddresses(data);
    } catch (err) {
      console.error('Failed to fetch addresses', err);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0 || !user) return;
    try {
      await resend2FA(user.email);
      setResendTimer(60);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Failed to resend code.' });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profileData.phoneNumber && !phoneRegex.test(profileData.phoneNumber)) {
      setStatus({ type: 'error', msg: 'Please enter a valid Egyptian phone number.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    try {
      await updateProfile({
        fullName: profileData.fullName,
        phoneNumber: profileData.phoneNumber,
        address: profileData.address,
        dateOfBirth: profileData.dob ? new Date(profileData.dob).toISOString() : undefined
      } as any);
      setStatus({ type: 'success', msg: 'Profile updated successfully!' });
      await refreshCurrentUser();
    } catch (err) {
      setStatus({ type: 'error', msg: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleToggleTwoFactor = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setStatus(null);
    try {
      await toggleTwoFactor(!twoFactorEnabled);
      setTwoFactorEnabled((prev) => !prev);
      setStatus({ type: 'success', msg: `Two-factor authentication ${twoFactorEnabled ? 'disabled' : 'enabled'} successfully.` });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Unable to update two-factor authentication setting.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecurityRequest = async (type: 'password' | 'email' | 'delete') => {
    if (type === 'password' && securityData.newPassword !== securityData.confirmPassword) {
      setStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }
    if (type === 'email' && !securityData.newEmail) {
      setStatus({ type: 'error', msg: 'Please enter a valid email.' });
      return;
    }
    if (type === 'delete' && !securityData.deletePassword) {
      setStatus({ type: 'error', msg: 'Password is required to delete your account.' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    setOtpStatus(null);
    try {
      if (type === 'password') {
        await requestPasswordChange();
      } else if (type === 'email') {
        await requestEmailChange(securityData.newEmail);
        setEmailChangeStep(1);
        setChangeEmailToken(null);
        setOtpStatus({ type: 'success', msg: 'Verification code sent to your CURRENT email.' });
      } else if (type === 'delete') {
        await requestAccountDeletion(securityData.deletePassword);
        setOtpStatus({ type: 'success', msg: 'Verification code sent to your email.' });
      }
      setPendingAction(type);
      setShowOtpModal(true);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? (typeof err.response?.data === 'string' ? err.response?.data : undefined))
        : undefined;
      setStatus({ type: 'error', msg: message || 'Failed to send verification code.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOtpStatus(null);
    try {
      if (pendingAction === 'password') {
        await confirmPasswordChange(otpCode, securityData.newPassword);
        setSecurityData({ ...securityData, newPassword: '', confirmPassword: '' });
        setStatus({ type: 'success', msg: 'Password updated successfully!' });
        setShowOtpModal(false);
        setPendingAction(null);
      } else if (pendingAction === 'email') {
        if (emailChangeStep === 1) {
          // Step 1: Verify old email
          const response = await verifyOldEmail(otpCode);
          const token = response.changeEmailToken;
          setChangeEmailToken(token);
          
          // Move to Step 2: Send OTP to new email
          await sendNewOtp(securityData.newEmail, token);
          setEmailChangeStep(2);
          setOtpCode('');
          setOtpStatus({ type: 'success', msg: 'Verification code sent to your NEW email.' });
          setIsSubmitting(false);
          return; // Stay in modal for step 2
        } else {
          // Step 2: Confirm new email
          if (!changeEmailToken) throw new Error('Session token missing.');
          await confirmEmailChange(otpCode, changeEmailToken);
          setSecurityData({ ...securityData, newEmail: '' });
          setStatus({ type: 'success', msg: 'Email updated successfully!' });
          setShowOtpModal(false);
          setPendingAction(null);
        }
      } else if (pendingAction === 'delete') {
        await confirmAccountDeletion(securityData.deletePassword, otpCode);
        setSecurityData({ ...securityData, deletePassword: '' });
        setStatus({ type: 'success', msg: 'Account deleted successfully!' });
        setShowOtpModal(false);
        setPendingAction(null);
        navigate('/');
      }
      setOtpCode('');
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? (typeof err.response?.data === 'string' ? err.response?.data : undefined))
        : undefined;
      setOtpStatus({ type: 'error', msg: message || 'Invalid verification code.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingAddress) {
        await addressApi.update(editingAddress.id, addressFormData);
      } else {
        await addressApi.add(addressFormData);
      }
      setShowAddressModal(false);
      fetchAddresses();
      // If default was set, update user's main address too
      if (addressFormData.isDefault) {
        await updateProfile({
          fullName: profileData.fullName,
          address: `${addressFormData.street}, ${addressFormData.city}`
        });
      }
    } catch (err) {
      console.error('Failed to save address', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await addressApi.delete(id);
      fetchAddresses();
    } catch (err) {
      console.error('Failed to delete address', err);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await addressApi.setDefault(id);
      fetchAddresses();
      await refreshCurrentUser();
    } catch (err) {
      console.error('Failed to set default address', err);
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    try {
      await notificationApi.updateSettings({
        receiveSupportEmails: notificationSettings.receiveSupportEmails,
        receiveOfferEmails: notificationSettings.receiveOfferEmails,
        notificationEmail: notificationSettings.notificationEmail || undefined
      });
      setStatus({ type: 'success', msg: 'Notification preferences updated successfully!' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Failed to update notification settings.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const menuItems = [
    { id: 'profile', label: 'Profile', icon: 'fa-user' },
    { id: 'security', label: 'Security', icon: 'fa-shield-alt' },
    { id: 'addresses', label: 'Addresses', icon: 'fa-map-marker-alt' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell' },
  ];

  if (!user) return null;

  return (
    <div className="settings-page bg-light min-vh-100 pb-5">
      {/* Premium Gradient Header */}
      <div className="settings-banner position-relative overflow-hidden" style={{ 
        background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
        padding: '80px 0 120px 0',
        marginBottom: '-60px'
      }}>
        <div className="container position-relative z-1">
          <div className="row align-items-center">
            <div className="col-lg-6 text-white">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb text-white-50 mb-2 small">
                  <li className="breadcrumb-item"><a href="/" className="text-white-50 text-decoration-none">HOME</a></li>
                  <li className="breadcrumb-item active text-white" aria-current="page">ACCOUNT</li>
                </ol>
              </nav>
              <h1 className="display-4 fw-bold mb-2">Settings</h1>
              <p className="lead opacity-75">Manage your profile and security settings.</p>
            </div>
            <div className="col-lg-6 d-none d-lg-flex justify-content-end">
                <div className="header-icon-container">
                    <i className="fas fa-shield-alt text-white opacity-25" style={{ fontSize: '180px' }} />
                    <div className="security-badge-overlay shadow-lg">
                        <i className="fas fa-lock text-primary fs-2" />
                    </div>
                </div>
            </div>
          </div>
        </div>
        <div className="position-absolute top-0 end-0 p-5 opacity-10">
          <i className="fas fa-ellipsis-h fs-1 text-white" />
        </div>
      </div>

      <div className="container position-relative z-2">
        <div className="row g-4">
          <div className="col-xl-3 col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
              <div className="card-body p-4">
                <h6 className="text-muted small fw-bold text-uppercase mb-4">My Account</h6>
                <div className="nav flex-column gap-2">
                  {menuItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`nav-link border-0 text-start d-flex align-items-center gap-3 px-3 py-3 rounded-3 transition-all ${
                        activeTab === item.id 
                        ? 'bg-primary-subtle text-primary fw-bold' 
                        : 'bg-transparent text-muted'
                      }`}
                    >
                      <i className={`fas ${item.icon} ${activeTab === item.id ? 'text-primary' : 'text-muted-light'}`} style={{ width: '20px' }} />
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 p-4 rounded-4 bg-primary-subtle bg-opacity-10 border border-primary border-opacity-10">
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <i className="fas fa-headphones-alt text-primary fs-4" />
                        <span className="fw-bold text-primary">Need Help?</span>
                    </div>
                    <p className="small text-muted mb-3">Our support team is always ready to help you.</p>
                    <button 
                      className="btn btn-link p-0 text-primary fw-bold text-decoration-none small"
                      onClick={() => navigate('/contact')}
                    >
                        Contact Support <i className="fas fa-chevron-right ms-1 small" />
                    </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-6 col-lg-8">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4 p-md-5">
                <AnimatePresence mode="wait">
                  {activeTab === 'profile' && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <div>
                          <h4 className="fw-bold mb-1">Profile Information</h4>
                          <p className="text-muted small mb-0">Update your personal information and manage your account details.</p>
                        </div>
                        <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                          <i className="fas fa-user-circle fs-3" />
                        </div>
                      </div>

                      {status && (
                        <div className={`alert alert-${status.type === 'success' ? 'success' : 'danger'} border-0 shadow-sm mb-4`}>
                          {status.msg}
                        </div>
                      )}

                      <form onSubmit={handleProfileSubmit}>
                        <div className="row g-4">
                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-muted">Full Name</label>
                            <input 
                              type="text" 
                              className="form-control form-control-lg bg-light border-0" 
                              value={profileData.fullName}
                              onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-muted">Email Address</label>
                            <input 
                              type="email" 
                              className="form-control form-control-lg bg-light border-0" 
                              value={user.email}
                              disabled
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-muted">Phone Number</label>
                            <input 
                              type="tel" 
                              className={`form-control form-control-lg bg-light border-0 ${profileData.phoneNumber && !phoneRegex.test(profileData.phoneNumber) ? 'is-invalid' : ''}`} 
                              value={profileData.phoneNumber}
                              onChange={(e) => setProfileData({...profileData, phoneNumber: e.target.value})}
                              placeholder="01XXXXXXXXX"
                            />
                            <div className="invalid-feedback">Please enter a valid Egyptian phone number.</div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-muted">Date of Birth</label>
                            <input 
                              type="date" 
                              className="form-control form-control-lg bg-light border-0" 
                              value={profileData.dob}
                              onChange={(e) => setProfileData({...profileData, dob: e.target.value})}
                            />
                          </div>
                          <div className="col-12 mt-5">
                            <div className="p-4 rounded-4 bg-light border border-dashed text-center mb-4">
                               <i className="fas fa-map-marker-alt text-primary mb-2 d-block fs-4" />
                               <p className="small text-muted mb-0">Manage your shipping addresses in the <strong>Addresses</strong> tab for multiple locations and default selection.</p>
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg px-4 d-flex align-items-center gap-2" disabled={isSubmitting}>
                              <i className="fas fa-edit" />
                              {isSubmitting ? 'Saving...' : 'Update Personal Info'}
                            </button>
                          </div>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div
                      key="security"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <div>
                          <h4 className="fw-bold mb-1">Security & Login</h4>
                          <p className="text-muted small mb-0">Manage your password, email, and two-factor authentication.</p>
                        </div>
                        <div className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                          <i className="fas fa-shield-alt fs-3" />
                        </div>
                      </div>

                      {status && (
                        <div className={`alert alert-${status.type === 'success' ? 'success' : 'danger'} border-0 shadow-sm mb-4`}>
                          {status.msg}
                        </div>
                      )}

                      <div className="security-section mb-5 p-4 rounded-4 bg-light">
                        <h6 className="fw-bold mb-3">Change Email Address</h6>
                        <div className="row g-3">
                          <div className="col-md-8">
                            <input 
                              type="email" 
                              className="form-control form-control-lg border-0 shadow-sm" 
                              placeholder="New Email Address"
                              value={securityData.newEmail}
                              onChange={(e) => setSecurityData({...securityData, newEmail: e.target.value})}
                            />
                          </div>
                          <div className="col-md-4">
                            <button 
                              className="btn btn-primary btn-lg w-100 shadow-sm"
                              onClick={() => handleSecurityRequest('email')}
                              disabled={isSubmitting}
                            >
                              Update Email
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="security-section mb-5 p-4 rounded-4 bg-light">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-bold mb-0">Two-Factor Authentication</h6>
                            <span className={`badge ${twoFactorEnabled ? 'bg-success' : 'bg-secondary'}`}>
                                {twoFactorEnabled ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="small text-muted mb-4">Protect your account with an extra layer of security. We'll send a code to your email when you log in.</p>
                        <button
                          className={`btn btn-${twoFactorEnabled ? 'outline-danger' : 'primary'} btn-lg px-4`}
                          onClick={handleToggleTwoFactor}
                          disabled={isSubmitting}
                        >
                          {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                        </button>
                      </div>

                      <div className="security-section p-4 rounded-4 bg-light">
                        <h6 className="fw-bold mb-3">Update Password</h6>
                        <div className="row g-4">
                          <div className="col-md-6">
                            <label className="form-label small text-muted">New Password</label>
                            <input 
                              type="password" 
                              className="form-control form-control-lg border-0 shadow-sm" 
                              value={securityData.newPassword}
                              onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small text-muted">Confirm Password</label>
                            <input 
                              type="password" 
                              className="form-control form-control-lg border-0 shadow-sm" 
                              value={securityData.confirmPassword}
                              onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                            />
                          </div>
                          <div className="col-12 mt-4">
                            <button 
                              className="btn btn-primary btn-lg px-5 shadow-sm"
                              onClick={() => handleSecurityRequest('password')}
                              disabled={isSubmitting}
                            >
                              Save New Password
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="security-section p-4 rounded-4 bg-light mt-4 border border-danger border-opacity-25">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-bold text-danger mb-0">Delete Account</h6>
                            <i className="fas fa-exclamation-triangle text-danger opacity-75" />
                        </div>
                        <p className="small text-muted mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                        <div className="row g-4">
                          <div className="col-md-8">
                            <input 
                              type="password" 
                              className="form-control form-control-lg border-danger shadow-sm" 
                              placeholder="Enter your password to confirm"
                              value={securityData.deletePassword}
                              onChange={(e) => setSecurityData({...securityData, deletePassword: e.target.value})}
                            />
                          </div>
                          <div className="col-md-4">
                            <button 
                              className="btn btn-outline-danger btn-lg w-100 shadow-sm"
                              onClick={() => handleSecurityRequest('delete')}
                              disabled={isSubmitting}
                            >
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'addresses' && (
                    <motion.div
                      key="addresses"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <div>
                          <h4 className="fw-bold mb-1">My Addresses</h4>
                          <p className="text-muted small mb-0">Manage your shipping addresses and choose a default.</p>
                        </div>
                        <button 
                          className="btn btn-primary btn-sm rounded-3 px-3"
                          onClick={() => {
                            setEditingAddress(null);
                            setAddressFormData({ street: '', city: '', state: '', country: 'Egypt', zipCode: '', isDefault: false });
                            setShowAddressModal(true);
                          }}
                        >
                          <i className="fas fa-plus me-2" />Add New
                        </button>
                      </div>

                      <div className="row g-3">
                        {addresses.length === 0 ? (
                          <div className="col-12 text-center py-5 text-muted">
                            <i className="fas fa-map-marker-alt fs-1 opacity-25 mb-3" />
                            <p>No addresses found. Add your first shipping address!</p>
                          </div>
                        ) : (
                          addresses.map(addr => (
                            <div className="col-12" key={addr.id}>
                              <div className={`card border-${addr.isDefault ? 'primary' : '0'} shadow-sm rounded-4 ${addr.isDefault ? 'bg-primary-subtle bg-opacity-10' : 'bg-light'}`}>
                                <div className="card-body p-3">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                      <div className="d-flex align-items-center gap-2 mb-1">
                                        <h6 className="fw-bold mb-0">{addr.street}</h6>
                                        {addr.isDefault && <span className="badge bg-primary small">Shipping Address</span>}
                                      </div>
                                      <p className="text-muted small mb-0">{addr.city}, {addr.state} {addr.zipCode}</p>
                                      <p className="text-muted small mb-0">{addr.country}</p>
                                    </div>
                                    <div className="d-flex gap-2">
                                      {!addr.isDefault && (
                                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleSetDefaultAddress(addr.id)}>
                                          Ship to this address
                                        </button>
                                      )}
                                      <button className="btn btn-sm btn-light" onClick={() => {
                                        setEditingAddress(addr);
                                        setAddressFormData({ ...addr, state: addr.state || '', zipCode: addr.zipCode || '', country: addr.country || 'Egypt' });
                                        setShowAddressModal(true);
                                      }}>
                                        <i className="fas fa-pen small" />
                                      </button>
                                      <button className="btn btn-sm btn-light text-danger" onClick={() => handleDeleteAddress(addr.id)}>
                                        <i className="fas fa-trash small" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}

                  {['notifications'].includes(activeTab) && (
                    <motion.div
                      key="coming-soon"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-5"
                    >
                      <i className="fas fa-tools fs-1 text-muted opacity-25 mb-3" />
                      <h4 className="text-muted">Content for {activeTab} coming soon</h4>
                      <p className="text-muted-light small">We are working on bringing this functionality to the new design.</p>
                      <button className="btn btn-sm btn-outline-primary mt-3" onClick={() => setActiveTab('profile')}>Back to Profile</button>
                    </motion.div>
                  )}

                  {activeTab === 'notifications' && (
                    <motion.div
                      key="notifications"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <div>
                          <h4 className="fw-bold mb-1">Notification Preferences</h4>
                          <p className="text-muted small mb-0">Control how and when we contact you via email.</p>
                        </div>
                        <div className="rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                          <i className="fas fa-envelope-open-text fs-3" />
                        </div>
                      </div>

                      {status && (
                        <div className={`alert alert-${status.type === 'success' ? 'success' : 'danger'} border-0 shadow-sm mb-4`}>
                          {status.msg}
                        </div>
                      )}

                      <form onSubmit={handleNotificationSubmit}>
                        <div className="card border-0 bg-light rounded-4 mb-4">
                          <div className="card-body p-4">
                            <h6 className="fw-bold mb-4">Email Preferences</h6>
                            
                            <div className="d-flex justify-content-between align-items-center mb-4">
                              <div>
                                <h6 className="mb-1 fw-semibold text-dark">Support Responses</h6>
                                <p className="small text-muted mb-0">Receive emails when an agent replies to your support ticket.</p>
                              </div>
                              <div className="form-check form-switch">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  role="switch" 
                                  style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                                  checked={notificationSettings.receiveSupportEmails}
                                  onChange={(e) => setNotificationSettings({...notificationSettings, receiveSupportEmails: e.target.checked})}
                                />
                              </div>
                            </div>
                            
                            <hr className="my-4 text-muted opacity-25" />
                            
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="mb-1 fw-semibold text-dark">Offers and Promotions</h6>
                                <p className="small text-muted mb-0">Receive updates about the latest deals and exclusive promo codes.</p>
                              </div>
                              <div className="form-check form-switch">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  role="switch" 
                                  style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                                  checked={notificationSettings.receiveOfferEmails}
                                  onChange={(e) => setNotificationSettings({...notificationSettings, receiveOfferEmails: e.target.checked})}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="card border-0 bg-light rounded-4 mb-4">
                          <div className="card-body p-4">
                            <h6 className="fw-bold mb-3">Notification Email</h6>
                            <p className="small text-muted mb-4">Send my notifications to this email address instead of my primary account email.</p>
                            
                            <div>
                              <input 
                                type="email" 
                                className="form-control form-control-lg border-0 shadow-sm" 
                                placeholder="Alternative email address (optional)"
                                value={notificationSettings.notificationEmail}
                                onChange={(e) => setNotificationSettings({...notificationSettings, notificationEmail: e.target.value})}
                              />
                            </div>
                          </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg px-5 shadow-sm d-flex align-items-center gap-2" disabled={isSubmitting}>
                          <i className="fas fa-save" />
                          {isSubmitting ? 'Saving Preferences...' : 'Save Preferences'}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="col-xl-3">
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h6 className="fw-bold mb-0">Quick Shortcuts</h6>
                    <i className="fas fa-th text-muted-light small" />
                </div>
                <div className="d-flex flex-column gap-3">
                    <button className="btn btn-light border-0 p-3 text-start d-flex align-items-center justify-content-between rounded-3" onClick={() => navigate('/orders')}>
                        <div className="d-flex align-items-center gap-3">
                            <i className="fas fa-shopping-bag text-primary" />
                            <span className="fw-semibold small">My Orders</span>
                        </div>
                        <i className="fas fa-chevron-right small text-muted-light" />
                    </button>
                    <button className="btn btn-light border-0 p-3 text-start d-flex align-items-center justify-content-between rounded-3" onClick={() => navigate('/profile')}>
                        <div className="d-flex align-items-center gap-3">
                            <i className="fas fa-heart text-primary" />
                            <span className="fw-semibold small">Wishlist</span>
                        </div>
                        <i className="fas fa-chevron-right small text-muted-light" />
                    </button>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 bg-white">
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="fw-bold mb-0">Account Security</h6>
                    <i className="fas fa-shield-alt text-danger opacity-50 small" />
                </div>
                <p className="small text-muted mb-4">Keep your account secure. We recommend using a strong password and enabling two-factor authentication.</p>
                <button className="btn btn-danger btn-lg w-100 d-flex align-items-center justify-content-center gap-2 rounded-3 py-3" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt" />
                    <span className="fw-bold">Logout Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .header-icon-container { position: relative; padding: 20px; }
        .security-badge-overlay {
            position: absolute; bottom: 20px; right: 20px; background: white;
            width: 80px; height: 80px; border-radius: 20px;
            display: flex; align-items: center; justify-content: center; transform: rotate(-10deg);
        }
        .text-muted-light { color: #adb5bd; }
        .bg-primary-subtle { background-color: #e0e7ff; }
        .btn-primary { background-color: #7c3aed; border-color: #7c3aed; }
        .btn-primary:hover { background-color: #6d28d9; border-color: #6d28d9; }
        .nav-link:hover { background-color: #f8fafc; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .letter-spacing-lg { letter-spacing: 0.5rem; }
        .otp-modal .modal-content, .address-modal .modal-content { border-radius: 24px; border: none; }
      `}</style>

      {/* OTP Verification Modal */}
      <Modal show={showOtpModal} onHide={() => setShowOtpModal(false)} centered className="otp-modal">
        <Modal.Body className="p-5 text-center">
          <div className="mb-4">
            <span className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 80, height: 80 }}>
              <i className="fas fa-shield-alt fs-1" />
            </span>
            <h3 className="fw-bold">
              {pendingAction === 'email' 
                ? (emailChangeStep === 1 ? 'Verify Current Email' : 'Verify New Email')
                : pendingAction === 'delete'
                ? 'Confirm Account Deletion'
                : 'Security Verification'}
            </h3>
            <p className="text-muted">
              {pendingAction === 'email'
                ? (emailChangeStep === 1 
                    ? 'Please enter the code sent to your current email to prove ownership.' 
                    : `Now enter the code sent to ${securityData.newEmail} to confirm the change.`)
                : pendingAction === 'delete'
                ? 'To delete your account, please enter the 6-digit verification code we just sent to your email.'
                : 'For your protection, please enter the 6-digit code sent to your email.'}
            </p>
          </div>
          <form onSubmit={handleVerifyOtp}>
            {otpStatus && (
              <div className={`alert alert-${otpStatus.type === 'success' ? 'success' : 'danger'} border-0 shadow-sm mb-4`}>
                {otpStatus.msg}
              </div>
            )}
            <div className="mb-4">
              <input 
                type="text" 
                className="form-control form-control-lg text-center fw-bold fs-2 letter-spacing-lg" 
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="d-grid gap-2">
              <button className="btn btn-primary btn-lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Confirm Action'}
              </button>
              <div className="text-center py-2">
                <button type="button" className="btn btn-link btn-sm text-decoration-none" onClick={handleResendOTP} disabled={resendTimer > 0}>
                  {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Verification Code'}
                </button>
              </div>
              <button type="button" className="btn btn-link text-muted text-decoration-none" onClick={() => {
                setShowOtpModal(false);
                setOtpCode('');
                setOtpStatus(null);
                setPendingAction(null);
              }}>Cancel Request</button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Address Modal */}
      <Modal show={showAddressModal} onHide={() => setShowAddressModal(false)} centered className="address-modal">
        <Modal.Header closeButton className="border-0 p-4 pb-0">
          <Modal.Title className="fw-bold">{editingAddress ? 'Edit Address' : 'Add New Address'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <form onSubmit={handleAddressSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label small fw-bold">Street Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={addressFormData.street}
                  onChange={(e) => setAddressFormData({...addressFormData, street: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">City</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={addressFormData.city}
                  onChange={(e) => setAddressFormData({...addressFormData, city: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">State / Province</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={addressFormData.state}
                  onChange={(e) => setAddressFormData({...addressFormData, state: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Zip / Postal Code</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={addressFormData.zipCode}
                  onChange={(e) => setAddressFormData({...addressFormData, zipCode: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold">Country</label>
                <select 
                  className="form-select" 
                  value={addressFormData.country}
                  onChange={(e) => setAddressFormData({...addressFormData, country: e.target.value})}
                >
                  <option value="Egypt">Egypt</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="UAE">UAE</option>
                </select>
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="isDefault" 
                    checked={addressFormData.isDefault}
                    onChange={(e) => setAddressFormData({...addressFormData, isDefault: e.target.checked})}
                  />
                  <label className="form-check-label" htmlFor="isDefault">Set as primary shipping address</label>
                </div>
              </div>
              <div className="col-12 mt-4">
                <button type="submit" className="btn btn-primary w-100 btn-lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

