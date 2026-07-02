import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { categoryApi } from '../../../api';
import { Category } from '../../../types';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';

type ViewMode = 'table' | 'cards';
type SortMode = 'name-asc' | 'name-desc' | 'products-desc' | 'products-asc' | 'newest';

const CARD_THEMES = [
  'linear-gradient(135deg, #5B3DC8 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)',
  'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
  'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
  'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)',
  'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
];

const CARD_ICONS = [
  'fas fa-gem',
  'fas fa-crown',
  'fas fa-tags',
  'fas fa-layer-group',
  'fas fa-cube',
  'fas fa-star',
];

const STAT_THEMES = [
  {
    label: 'Categories',
    icon: 'fas fa-layer-group',
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(168,85,247,0.30) 100%)',
    ring: 'rgba(255,255,255,0.28)',
  },
  {
    label: 'Assigned Products',
    icon: 'fas fa-box-open',
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(34,211,238,0.30) 100%)',
    ring: 'rgba(255,255,255,0.24)',
  },
  {
    label: 'Avg Products / Category',
    icon: 'fas fa-chart-line',
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(251,146,60,0.30) 100%)',
    ring: 'rgba(255,255,255,0.24)',
  },
];

export const CategoriesPage = () => {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<{ id?: string; name: string }>({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [minProducts, setMinProducts] = useState('');
  const [maxProducts, setMaxProducts] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name-asc');

  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });

  const resetForm = () => setFormState({ name: '' });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formState.name.trim()) return;
    setIsSubmitting(true);
    try {
      if (formState.id) {
        await categoryApi.update({ id: formState.id, name: formState.name });
      } else {
        await categoryApi.create({ name: formState.name });
      }
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
      setIsFormExpanded(false);
    } catch (error) {
      console.error(error);
      alert('Unable to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setFormState({ id: category.id, name: category.name });
    setIsFormExpanded(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await categoryApi.remove(categoryId);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error) {
      console.error(error);
      alert('Unable to delete category');
    }
  };

  const categoryCount = categories?.length ?? 0;
  const totalProducts = categories?.reduce((acc, category) => acc + (category.products?.length ?? 0), 0) ?? 0;
  const averageProducts = categoryCount > 0 ? (totalProducts / categoryCount).toFixed(1) : '0.0';
  const statValues = [categoryCount, totalProducts, averageProducts];

  const filteredCategories = useMemo(() => {
    const min = minProducts.trim() ? Number(minProducts) : undefined;
    const max = maxProducts.trim() ? Number(maxProducts) : undefined;
    const normalizedSearch = search.trim().toLowerCase();

    const next = [...(categories ?? [])]
      .filter((category) => {
        const productCount = category.products?.length ?? 0;
        const nameMatches = normalizedSearch ? category.name.toLowerCase().includes(normalizedSearch) : true;
        const minMatches = typeof min === 'number' && !Number.isNaN(min) ? productCount >= min : true;
        const maxMatches = typeof max === 'number' && !Number.isNaN(max) ? productCount <= max : true;
        return nameMatches && minMatches && maxMatches;
      })
      .sort((a, b) => {
        const aProducts = a.products?.length ?? 0;
        const bProducts = b.products?.length ?? 0;
        if (sortMode === 'name-desc') return b.name.localeCompare(a.name);
        if (sortMode === 'products-desc') return bProducts - aProducts;
        if (sortMode === 'products-asc') return aProducts - bProducts;
        if (sortMode === 'newest') {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        }
        return a.name.localeCompare(b.name);
      });

    return next;
  }, [categories, maxProducts, minProducts, search, sortMode]);

  const clearFilters = () => {
    setSearch('');
    setMinProducts('');
    setMaxProducts('');
    setSortMode('name-asc');
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormExpanded(true);
  };

  const closeForm = () => {
    resetForm();
    setIsFormExpanded(false);
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (isError) {
    return (
      <div className="alert alert-danger">
        Unable to load categories. Please refresh or check your API configuration.
      </div>
    );
  }

  return (
    <div className="container-fluid admin-page">
      <div
        className="rounded-4 p-4 mb-4 text-white position-relative overflow-hidden"
        style={{ background: 'linear-gradient(120deg, #1A1A2E 0%, #5B3DC8 48%, #7C5FE0 100%)' }}
      >
        <div className="position-absolute top-0 end-0 opacity-25 pe-none" style={{ fontSize: '6rem', marginTop: '-0.8rem', marginRight: '-0.5rem' }}>
          <i className="fas fa-layer-group" />
        </div>
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 position-relative">
          <div>
            <h3 className="fw-bold mb-1" style={{ color: '#FFFFFF' }}>Category Studio</h3>
            <p className="mb-0 text-white-50">Curate a premium product taxonomy with fast filtering and dual views.</p>
          </div>
        </div>
        <div className="row g-3 mt-2 position-relative">
          {STAT_THEMES.map((stat, index) => (
            <div key={stat.label} className="col-md-4">
              <div
                className="rounded-4 p-3 h-100 position-relative overflow-hidden border"
                style={{
                  background: stat.gradient,
                  borderColor: stat.ring,
                  backdropFilter: 'blur(3px)',
                }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="small text-white-50 mb-1">{stat.label}</p>
                    <h4 className="mb-0 fw-bold text-white">{statValues[index]}</h4>
                  </div>
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.24)',
                    }}
                  >
                    <i className={stat.icon} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h5 className="fw-semibold mb-1">Category Form</h5>
              <p className="text-muted mb-0 small">Create or edit categories from one premium workspace.</p>
            </div>
            <div className="d-flex gap-2">
              {!isFormExpanded ? (
                <button type="button" className="btn btn-primary" onClick={openCreateForm}>
                  <i className="fas fa-plus me-2" />
                  Add Category
                </button>
              ) : (
                <button type="button" className="btn btn-outline-secondary" onClick={closeForm}>
                  <i className="fas fa-chevron-up me-2" />
                  Collapse
                </button>
              )}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {isFormExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.24, ease: 'easeInOut' }}
                className="mt-4 border rounded-4 p-4 bg-light-subtle overflow-hidden"
              >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-semibold mb-0">{formState.id ? 'Edit Category' : 'Add Category'}</h6>
                <span className={`badge ${formState.id ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'}`}>
                  {formState.id ? 'Edit Mode' : 'Create Mode'}
                </span>
              </div>
              <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label">Category Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : formState.id ? 'Update Category' : 'Create Category'}
                  </button>
                  <button className="btn btn-outline-secondary" type="button" onClick={closeForm}>
                    Cancel
                  </button>
                </div>
              </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h5 className="fw-semibold mb-0">Categories</h5>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('table')}
              >
                <i className="fas fa-table me-2" />
                Table
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('cards')}
              >
                <i className="fas fa-grip me-2" />
                Cards
              </button>
              <span className="badge bg-primary-subtle text-primary">{filteredCategories.length} visible</span>
            </div>
          </div>

          <div className="border rounded-4 p-3 mb-3 bg-light-subtle">
            <div className="row g-3 align-items-end">
              <div className="col-md-5">
                <label className="form-label">Search Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search categories..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Min Products</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={minProducts}
                  onChange={(event) => setMinProducts(event.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Max Products</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={maxProducts}
                  onChange={(event) => setMaxProducts(event.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Sort By</label>
                <select
                  className="form-select"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="products-desc">Products High-Low</option>
                  <option value="products-asc">Products Low-High</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                <i className="fas fa-rotate-left me-2" />
                Clear Filters
              </button>
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="alert alert-warning mb-0">No categories match your current filters.</div>
          ) : viewMode === 'table' ? (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Products</th>
                    <th>Created</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id}>
                      <td className="fw-semibold">{category.name}</td>
                      <td>{category.products?.length ?? 0}</td>
                      <td>{category.createdAt ? new Date(category.createdAt).toLocaleDateString() : '--'}</td>
                      <td className="text-end">
                        <div className="btn-group flex-wrap gap-1 justify-content-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(category)}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(category.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="row g-3">
              {filteredCategories.map((category, index) => (
                <div key={category.id} className="col-md-6 col-xl-4">
                  <div
                    className="card h-100 border-0 shadow text-white overflow-hidden"
                    style={{ background: CARD_THEMES[index % CARD_THEMES.length] }}
                  >
                    <div className="card-body d-flex flex-column position-relative">
                      <div
                        className="position-absolute top-0 end-0 opacity-25 pe-none"
                        style={{ fontSize: '4rem', marginTop: '-0.4rem', marginRight: '-0.2rem' }}
                      >
                        <i className={CARD_ICONS[index % CARD_ICONS.length]} />
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <span
                          className="d-inline-flex align-items-center justify-content-center rounded-circle me-2"
                          style={{
                            width: '36px',
                            height: '36px',
                            background: 'rgba(255,255,255,0.22)',
                            border: '1px solid rgba(255,255,255,0.35)',
                          }}
                        >
                          <i className={CARD_ICONS[index % CARD_ICONS.length]} />
                        </span>
                        <small className="text-white-50">Premium Category</small>
                      </div>
                      <div className="d-flex justify-content-between align-items-start mb-3 position-relative">
                        <h6 className="mb-0 fw-bold">{category.name}</h6>
                        <span className="badge bg-white text-dark">{category.products?.length ?? 0} products</span>
                      </div>
                      <p className="small mb-4 text-white-50">
                        Created: {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : 'Not available'}
                      </p>
                      <div className="mt-auto d-flex gap-2">
                        <button className="btn btn-sm btn-light w-100 text-primary" onClick={() => handleEdit(category)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-outline-light w-100" onClick={() => handleDelete(category.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

