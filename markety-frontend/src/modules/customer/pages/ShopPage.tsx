import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cartApi, productApi, categoryApi, recommendationApi } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { useAuth } from '../../../hooks/useAuth';
import { SimpleProductCard } from '../components/SimpleProductCard';

const normalizeSearchText = (value: string) => value.trim().toLowerCase();
const searchTokens = (value: string) => normalizeSearchText(value).split(/\s+/).filter(Boolean);

export const ShopPage = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    setSearchTerm(searchFromUrl ?? '');

    const categoryFromUrl = searchParams.get('category');
    setActiveFilter(categoryFromUrl ?? 'all');
  }, [searchParams]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) return;

    const timeout = window.setTimeout(() => {
      recommendationApi.trackQuietly({
        eventType: 'search_query',
        searchQuery: query,
        source: 'shop_page',
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  const {
    data: products,
    isLoading: productsLoading,
    isError,
  } = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: () => productApi.getCatalog(),
  });

  const {
    data: categories,
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });

  // Build dynamic collection filters from categories
  const collectionFilters = useMemo(() => {
    const base = [{ label: 'All', value: 'all' }];
    if (categories && categories.length > 0) {
      categories.forEach((cat: any) => {
        base.push({ label: cat.name, value: cat.id || cat.name.toLowerCase() });
      });
    }
    return base;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const tokens = searchTokens(searchTerm);
    const filterValue = normalizeSearchText(activeFilter);

    return products.filter((product) => {
      const category = normalizeSearchText(product.categoryName ?? '');
      const categoryId = normalizeSearchText(product.categoryId?.toString() ?? '');
      const name = normalizeSearchText(product.name);
      const haystack = normalizeSearchText(
        `${product.name} ${product.description ?? ''} ${product.categoryName ?? ''}`,
      );
      const matchesFilter =
        filterValue === 'all' || category.includes(filterValue) || categoryId === filterValue || name.includes(filterValue);
      const matchesSearch = tokens.length === 0 || tokens.every((token) => haystack.includes(token));
      return matchesFilter && matchesSearch;
    });
  }, [products, activeFilter, searchTerm]);

  const handleFilterChange = (value: string) => {
    setActiveFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'all') {
      next.delete('category');
    } else {
      next.set('category', value);
    }
    setSearchParams(next, { replace: true });
  };

  const determineBadge = (index: number, product: any) => {
    if (product.oldPrice && product.oldPrice > product.price) return 'Sale';
    if (index % 5 === 0) return 'Bestseller';
    return false;
  };

  const handleAddToCart = async (product: any) => {
    if (!user) {
      navigate('/login', { state: { from: `/product/${product.id}` } });
      return;
    }

    try {
      await cartApi.add({ productId: product.id, quantity: 1 });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      const { showToast } = await import('../../../utils/toast');
      showToast.success('Item added to cart');
    } catch (error) {
      console.error(error);
      const { showToast } = await import('../../../utils/toast');
      showToast.error('Unable to add to cart. Please try again.');
    }
  };

  if (productsLoading || categoriesLoading) {
    return <LoadingOverlay />;
  }

  if (isError) {
    return (
      <div className="container py-5 text-center">
        <h2 className="text-danger mb-3">Could not load products</h2>
        <p className="text-muted">Please refresh the page or come back later.</p>
      </div>
    );
  }

  return (
    <section className="collection-section py-5">
      <div className="container py-5">
        <div className="collection-header">
          <span className="collection-eyebrow">Tech Collection</span>
          <h1>Upgrade Your Setup</h1>
          <p>Shop laptops, gaming PCs, GPUs, RAM, keyboards, mice, monitors, storage, and accessories.</p>
        </div>

        <div className="collection-filter">
          {collectionFilters.map((filter) => (
            <button
              key={filter.value}
              className={`collection-filter__button ${activeFilter === filter.value ? 'active' : ''}`}
              onClick={() => handleFilterChange(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="collection-search">
          <input
            type="search"
            className="form-control"
            placeholder="Search laptops, GPUs, RAM, monitors, brands, and more..."
            value={searchTerm}
            onChange={(event) => {
              const value = event.target.value;
              setSearchTerm(value);
              const next = new URLSearchParams(searchParams);
              if (value.trim()) {
                next.set('search', value);
              } else {
                next.delete('search');
              }
              setSearchParams(next, { replace: true });
            }}
          />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-5">
            <div className="mb-3">
              <i className="fas fa-search fa-3x text-muted"></i>
            </div>
            <h4>No products found</h4>
            <p className="text-muted">Try a different filter or search phrase.</p>
          </div>
        ) : (
          <div className="collection-grid row">
            {filteredProducts.map((product, index) => (
              <div key={product.id} className="col-md-6 col-lg-4">
                <SimpleProductCard product={product} onAddToCart={handleAddToCart} badge={determineBadge(index, product)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
