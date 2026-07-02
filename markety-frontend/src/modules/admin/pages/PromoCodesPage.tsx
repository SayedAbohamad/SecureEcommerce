import { ChangeEvent, FormEvent, useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { promoCodeApi, categoryApi, productApi } from '../../../api';
import { PromoCode, PromoCodeFormInput, DiscountTypeName, PromoCodeStats } from '../../../types/promoCode';
import { Category, Product } from '../../../types';

const DISCOUNT_TYPES: { value: DiscountTypeName; label: string; icon: string; color: string }[] = [
  { value: 'Percentage', label: 'Percentage Off', icon: 'fas fa-percent', color: '#10B981' },
  { value: 'FixedAmount', label: 'Fixed Amount (Pound)', icon: 'fas fa-pound-sign', color: '#3B82F6' },
  { value: 'FreeShipping', label: 'Free Shipping', icon: 'fas fa-shipping-fast', color: '#F59E0B' },
  { value: 'BuyXGetY', label: 'Buy X Get Y', icon: 'fas fa-gift', color: '#EC4899' },
];

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  Active: { bg: 'bg-success-subtle', text: 'text-success' },
  Inactive: { bg: 'bg-secondary-subtle', text: 'text-secondary' },
  Expired: { bg: 'bg-danger-subtle', text: 'text-danger' },
  Scheduled: { bg: 'bg-info-subtle', text: 'text-info' },
  Exhausted: { bg: 'bg-warning-subtle', text: 'text-warning' },
};

const defaultForm: PromoCodeFormInput = {
  code: '', description: '', discountType: 'Percentage', discountValue: 0,
  minimumOrderAmount: null, maxDiscountAmount: null, maxUsageCount: null,
  maxUsagePerUser: null, startDate: null, expirationDate: null,
  applicableCategoryId: null, applicableProductId: null, buyQuantity: null, getQuantity: null, isActive: true,
};

export const PromoCodesPage = () => {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeFormInput>({ ...defaultForm });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [catSearch, setCatSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showProdDropdown, setShowProdDropdown] = useState(false);

  const { data: promos = [], isLoading } = useQuery<PromoCode[]>({ queryKey: ['promoCodes'], queryFn: promoCodeApi.getAll });
  const { data: stats } = useQuery<PromoCodeStats>({ queryKey: ['promoCodeStats'], queryFn: promoCodeApi.getStats });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: categoryApi.getAll });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: productApi.getAll });

  const filteredCategoriesForSelect = useMemo(() => {
    if (!catSearch) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catSearch]);

  const filteredProductsForSelect = useMemo(() => {
    if (!prodSearch) return products;
    return products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.slug?.toLowerCase().includes(prodSearch.toLowerCase()));
  }, [products, prodSearch]);

  const toggleMut = useMutation({
    mutationFn: (id: string) => promoCodeApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promoCodes'] }); qc.invalidateQueries({ queryKey: ['promoCodeStats'] }); },
  });

  const resetForm = () => { setForm({ ...defaultForm }); setEditingId(null); setShowForm(false); };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (p: PromoCode) => {
    setEditingId(p.id);
    setForm({
      code: p.code, description: p.description, discountType: p.discountType, discountValue: p.discountValue,
      minimumOrderAmount: p.minimumOrderAmount, maxDiscountAmount: p.maxDiscountAmount,
      maxUsageCount: p.maxUsageCount, maxUsagePerUser: p.maxUsagePerUser,
      startDate: p.startDate ? p.startDate.slice(0, 16) : null,
      expirationDate: p.expirationDate ? p.expirationDate.slice(0, 16) : null,
      applicableCategoryId: p.applicableCategoryId, applicableProductId: p.applicableProductId,
      buyQuantity: p.buyQuantity, getQuantity: p.getQuantity, isActive: p.isActive,
    });
    setShowForm(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? null : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.description) {
      Swal.fire('Validation', 'Code and description are required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase().trim(),
        applicableCategoryId: form.applicableCategoryId === '' ? null : form.applicableCategoryId,
        applicableProductId: form.applicableProductId === '' ? null : form.applicableProductId,
      };
      if (editingId) {
        await promoCodeApi.update(editingId, payload);
        Swal.fire({ icon: 'success', title: 'Updated!', text: `Promo ${payload.code} updated.`, timer: 1500, showConfirmButton: false });
      } else {
        await promoCodeApi.create(payload);
        Swal.fire({ icon: 'success', title: 'Created!', text: `Promo ${payload.code} created.`, timer: 1500, showConfirmButton: false });
      }
      qc.invalidateQueries({ queryKey: ['promoCodes'] });
      qc.invalidateQueries({ queryKey: ['promoCodeStats'] });
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || 'Something went wrong.';
      Swal.fire('Error', msg, 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (p: PromoCode) => {
    const r = await Swal.fire({ title: `Delete "${p.code}"?`, text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC3545', confirmButtonText: 'Delete' });
    if (!r.isConfirmed) return;
    try {
      await promoCodeApi.remove(p.id);
      qc.invalidateQueries({ queryKey: ['promoCodes'] });
      qc.invalidateQueries({ queryKey: ['promoCodeStats'] });
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1200, showConfirmButton: false });
    } catch { Swal.fire('Error', 'Failed to delete.', 'error'); }
  };

  const filtered = promos.filter(p => {
    if (search && !p.code.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  const statCards = [
    { label: 'Total Codes', value: stats?.total ?? 0, icon: 'fas fa-tags', gradient: 'linear-gradient(135deg,#5B3DC8,#7C5CE7)' },
    { label: 'Active', value: stats?.active ?? 0, icon: 'fas fa-check-circle', gradient: 'linear-gradient(135deg,#10B981,#34D399)' },
    { label: 'Expired', value: stats?.expired ?? 0, icon: 'fas fa-clock', gradient: 'linear-gradient(135deg,#EF4444,#F87171)' },
    { label: 'Total Uses', value: stats?.totalUsage ?? 0, icon: 'fas fa-chart-bar', gradient: 'linear-gradient(135deg,#F59E0B,#FBBF24)' },
  ];

  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold mb-1"><i className="fas fa-ticket-alt text-primary me-2" />Promo Codes & Discounts</h3>
          <p className="text-muted mb-0">Manage promotional codes, percentage & fixed discounts, free shipping, and BOGO offers.</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="fas fa-plus" /> New Promo Code
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {statCards.map((c, i) => (
          <div key={i} className="col-6 col-lg-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="card border-0 shadow-sm text-white" style={{ background: c.gradient, borderRadius: 14 }}>
              <div className="card-body py-3 d-flex align-items-center justify-content-between">
                <div><p className="small mb-1 text-white-50">{c.label}</p><h4 className="fw-bold mb-0">{c.value}</h4></div>
                <i className={`${c.icon} fs-2 opacity-50`} />
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
              <div className="card-header bg-primary text-white py-3" style={{ borderRadius: '14px 14px 0 0' }}>
                <h5 className="mb-0"><i className={`fas fa-${editingId ? 'edit' : 'plus-circle'} me-2`} />{editingId ? 'Edit Promo Code' : 'Create New Promo Code'}</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {/* Discount Type Selector */}
                  <label className="form-label fw-semibold">Discount Type</label>
                  <div className="row g-2 mb-3">
                    {DISCOUNT_TYPES.map(dt => (
                      <div key={dt.value} className="col-6 col-md-3">
                        <div onClick={() => setForm(p => ({ ...p, discountType: dt.value }))}
                          className={`card border-2 text-center py-3 cursor-pointer ${form.discountType === dt.value ? 'border-primary shadow' : 'border-light'}`}
                          style={{ borderRadius: 12, cursor: 'pointer', transition: 'all .2s' }}>
                          <i className={`${dt.icon} fs-3 mb-2`} style={{ color: dt.color }} />
                          <span className="small fw-semibold">{dt.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Code <span className="text-danger">*</span></label>
                      <input className="form-control" name="code" value={form.code} onChange={handleChange} placeholder="e.g. SUMMER25" required style={{ textTransform: 'uppercase' }} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Discount Value <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input type="number" className="form-control" name="discountValue" value={form.discountValue} onChange={handleChange} min="0" step="0.01" required />
                        <span className="input-group-text">{form.discountType === 'Percentage' ? '%' : 'EGP'}</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label d-flex align-items-center gap-2">Active <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="form-check-input mt-0" /></label>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description <span className="text-danger">*</span></label>
                      <textarea className="form-control" name="description" value={form.description} onChange={handleChange} rows={2} required placeholder="Describe this promotion..." />
                    </div>

                    {/* Conditional BuyXGetY fields */}
                    {form.discountType === 'BuyXGetY' && (
                      <>
                        <div className="col-md-3">
                          <label className="form-label">Buy Quantity</label>
                          <input type="number" className="form-control" name="buyQuantity" value={form.buyQuantity ?? ''} onChange={handleChange} min="1" />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Get Quantity (Free)</label>
                          <input type="number" className="form-control" name="getQuantity" value={form.getQuantity ?? ''} onChange={handleChange} min="1" />
                        </div>
                      </>
                    )}

                    <div className="col-md-3">
                      <label className="form-label">Min Order Amount</label>
                      <input type="number" className="form-control" name="minimumOrderAmount" value={form.minimumOrderAmount ?? ''} onChange={handleChange} min="0" step="0.01" />
                    </div>
                    {form.discountType === 'Percentage' && (
                      <div className="col-md-3">
                        <label className="form-label">Max Discount Cap</label>
                        <input type="number" className="form-control" name="maxDiscountAmount" value={form.maxDiscountAmount ?? ''} onChange={handleChange} min="0" step="0.01" />
                      </div>
                    )}
                    <div className="col-md-3">
                      <label className="form-label">Max Total Uses</label>
                      <input type="number" className="form-control" name="maxUsageCount" value={form.maxUsageCount ?? ''} onChange={handleChange} min="1" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Max Uses / User</label>
                      <input type="number" className="form-control" name="maxUsagePerUser" value={form.maxUsagePerUser ?? ''} onChange={handleChange} min="1" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Start Date</label>
                      <input type="datetime-local" className="form-control" name="startDate" value={form.startDate ?? ''} onChange={handleChange} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Expiration Date</label>
                      <input type="datetime-local" className="form-control" name="expirationDate" value={form.expirationDate ?? ''} onChange={handleChange} />
                    </div>
                    <div className="col-md-6" onMouseLeave={() => setShowCatDropdown(false)}>
                      <label className="form-label fw-semibold text-dark"><i className="fas fa-folder text-primary me-1" />Restrict to Category</label>
                      {form.applicableCategoryId ? (
                        (() => {
                          const cat = categories.find(c => c.id === form.applicableCategoryId);
                          return (
                            <div className="d-flex align-items-center justify-content-between p-2 border border-2 border-primary rounded-3 bg-primary-subtle bg-opacity-10" style={{ height: '38px' }}>
                              <span className="fw-semibold text-primary text-truncate"><i className="fas fa-folder me-2" />{cat?.name || 'Category'}</span>
                              <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => setForm(p => ({ ...p, applicableCategoryId: null }))}>
                                <i className="fas fa-times-circle fs-5" />
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="position-relative">
                          <div className="input-group">
                            <span className="input-group-text bg-white border-end-0"><i className="fas fa-search text-muted" style={{ fontSize: '0.85rem' }} /></span>
                            <input
                              type="text"
                              className="form-control border-start-0 ps-0"
                              placeholder="Search & select category..."
                              value={catSearch}
                              onChange={e => { setCatSearch(e.target.value); setShowCatDropdown(true); }}
                              onFocus={() => setShowCatDropdown(true)}
                            />
                          </div>
                          {showCatDropdown && (
                            <div className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 p-2 overflow-auto" style={{ maxHeight: 200, zIndex: 1050 }}>
                              {filteredCategoriesForSelect.length === 0 ? (
                                <div className="text-muted small py-2 text-center">No categories found</div>
                              ) : (
                                filteredCategoriesForSelect.map(c => (
                                  <div
                                    key={c.id}
                                    className="p-2 rounded cursor-pointer hover-bg-light"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      setForm(p => ({ ...p, applicableCategoryId: c.id, applicableProductId: null }));
                                      setShowCatDropdown(false);
                                      setCatSearch('');
                                    }}
                                  >
                                    <i className="fas fa-folder text-secondary me-2" />
                                    {c.name}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="col-md-6" onMouseLeave={() => setShowProdDropdown(false)}>
                      <label className="form-label fw-semibold text-dark"><i className="fas fa-box text-info me-1" />Restrict to Product</label>
                      {form.applicableProductId ? (
                        (() => {
                          const prod = products.find(p => p.id === form.applicableProductId);
                          return (
                            <div className="d-flex align-items-center justify-content-between p-2 border border-2 border-info rounded-3 bg-info-subtle bg-opacity-10" style={{ height: '38px' }}>
                              <div className="d-flex align-items-center gap-2 min-width-0">
                                <img src={prod?.imageUrl} alt={prod?.name} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }} />
                                <span className="fw-semibold text-info text-truncate" style={{ maxWidth: 200 }} title={prod?.name}>{prod?.name}</span>
                              </div>
                              <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => setForm(p => ({ ...p, applicableProductId: null }))}>
                                <i className="fas fa-times-circle fs-5" />
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="position-relative">
                          <div className="input-group">
                            <span className="input-group-text bg-white border-end-0"><i className="fas fa-search text-muted" style={{ fontSize: '0.85rem' }} /></span>
                            <input
                              type="text"
                              className="form-control border-start-0 ps-0"
                              placeholder="Search & select product..."
                              value={prodSearch}
                              onChange={e => { setProdSearch(e.target.value); setShowProdDropdown(true); }}
                              onFocus={() => setShowProdDropdown(true)}
                            />
                          </div>
                          {showProdDropdown && (
                            <div className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 p-2 overflow-auto" style={{ maxHeight: 200, zIndex: 1050 }}>
                              {filteredProductsForSelect.length === 0 ? (
                                <div className="text-muted small py-2 text-center">No products found</div>
                              ) : (
                                filteredProductsForSelect.map(p => (
                                  <div
                                    key={p.id}
                                    className="d-flex align-items-center gap-2 p-2 rounded cursor-pointer hover-bg-light"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      setForm(prev => ({ ...prev, applicableProductId: p.id, applicableCategoryId: null }));
                                      setShowProdDropdown(false);
                                      setProdSearch('');
                                    }}
                                  >
                                    <img src={p.imageUrl} alt={p.name} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }} />
                                    <div style={{ minWidth: 0 }}>
                                      <div className="fw-semibold text-truncate" style={{ fontSize: '0.82rem', maxWidth: '240px' }}>{p.name}</div>
                                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{p.price} EGP</div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-4">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      <i className={`fas fa-${submitting ? 'spinner fa-spin' : 'save'} me-2`} />{submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="fas fa-search text-muted" /></span>
                <input className="form-control" placeholder="Search codes..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                {Object.keys(STATUS_BADGES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-md-4 text-end">
              <span className="text-muted small"><i className="fas fa-list me-1" />{filtered.length} promo code{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="fas fa-ticket-alt fs-1 mb-3 d-block opacity-25" />
          <p className="mb-0">No promo codes found.</p>
        </div>
      ) : (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Code</th><th>Type</th><th>Value</th><th>Usage</th><th>Dates</th><th>Status</th><th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const dt = DISCOUNT_TYPES.find(d => d.value === p.discountType);
                  const badge = STATUS_BADGES[p.status] || STATUS_BADGES.Inactive;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="fw-bold" style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{p.code}</div>
                        <small className="text-muted d-block mb-1" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</small>
                        {(() => {
                          const cat = categories.find(c => c.id === p.applicableCategoryId);
                          const prod = products.find(pr => pr.id === p.applicableProductId);
                          return (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {cat && (
                                <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.65rem' }}>
                                  <i className="fas fa-folder me-1" />{cat.name}
                                </span>
                              )}
                              {prod && (
                                <span className="badge bg-info-subtle text-info" style={{ fontSize: '0.65rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={prod.name}>
                                  <i className="fas fa-box me-1" />{prod.name}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td><span className="badge rounded-pill" style={{ background: dt?.color || '#6c757d', fontSize: '0.75rem' }}><i className={`${dt?.icon} me-1`} />{dt?.label}</span></td>
                      <td className="fw-semibold">
                        <div>
                          {p.discountType === 'Percentage' ? `${p.discountValue}%` : p.discountType === 'FreeShipping' ? '—' : p.discountType === 'BuyXGetY' ? `Buy ${p.buyQuantity} Get ${p.getQuantity}` : `${p.discountValue} EGP`}
                        </div>
                        {p.minimumOrderAmount !== undefined && p.minimumOrderAmount !== null && p.minimumOrderAmount > 0 && (
                          <div className="text-muted small fw-normal" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                            <i className="fas fa-shopping-bag text-secondary me-1" />Min Order: {p.minimumOrderAmount} EGP
                          </div>
                        )}
                        {p.maxDiscountAmount !== undefined && p.maxDiscountAmount !== null && p.maxDiscountAmount > 0 && (
                          <div className="text-danger small fw-normal" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                            <i className="fas fa-hand-holding-usd text-danger me-1" />Max Cap: {p.maxDiscountAmount} EGP
                          </div>
                        )}
                      </td>
                      <td><span className="text-muted">{p.currentUsageCount}{p.maxUsageCount ? ` / ${p.maxUsageCount}` : ' / ∞'}</span></td>
                      <td><small className="text-muted">{fmtDate(p.startDate)} → {fmtDate(p.expirationDate)}</small></td>
                      <td><span className={`badge ${badge.bg} ${badge.text}`}>{p.status}</span></td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" onClick={() => openEdit(p)} title="Edit"><i className="fas fa-edit" /></button>
                          <button className={`btn ${p.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => toggleMut.mutate(p.id)} title={p.isActive ? 'Deactivate' : 'Activate'}>
                            <i className={`fas fa-${p.isActive ? 'pause' : 'play'}`} />
                          </button>
                          <button className="btn btn-outline-danger" onClick={() => handleDelete(p)} title="Delete"><i className="fas fa-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
