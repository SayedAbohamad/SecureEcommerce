import { ChangeEvent, FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { categoryApi, productApi } from '../../../api';
import { Product } from '../../../types';
import { GeneratedProductContent } from '../../../types/productAi';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { resolveImageUrl } from '../../../utils/media';
import { formatCurrencyEGP } from '../../../utils/currency';
import { showToast } from '../../../utils/toast';
import Swal from 'sweetalert2';
import { AxiosError } from 'axios';

interface ProductFormState {
  id?: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  slug: string;
  sizes: string; // Comma-separated sizes
  image?: File | null;
  currentImageUrl?: string; // Current image URL for preview when editing
  additionalImages?: File[];
  currentAdditionalImages?: string[];
}

type ProductViewMode = 'table' | 'cards';

const defaultForm: ProductFormState = {
  name: '',
  description: '',
  price: '',
  stock: '',
  categoryId: '',
  slug: '',
  sizes: '',
  image: null,
  additionalImages: [],
  currentAdditionalImages: [],
};

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif';
const PRODUCT_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

const toProductSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getProductImageError = (file: File): string | null => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!PRODUCT_IMAGE_EXTENSIONS.has(extension)) {
    return 'Please choose a JPG, JPEG, PNG, WEBP, or GIF image.';
  }
  if (file.size === 0) {
    return 'The selected image is empty.';
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return 'Each product image must be 5 MB or smaller.';
  }
  return null;
};

export const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<ProductFormState>({ ...defaultForm });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ProductViewMode>('table');
  const [descriptionMode, setDescriptionMode] = useState<'specs' | 'text'>('specs');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<GeneratedProductContent | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([
    { key: 'Model', value: '' },
    { key: 'Processor / Chipset', value: '' },
    { key: 'Memory', value: '' },
    { key: 'Warranty', value: '' },
  ]);

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: () => productApi.getCatalog(),
  });

  const resetForm = () => {
    setFormState({ ...defaultForm });
    setDescriptionMode('specs');
    setAiPanelOpen(false);
    setAiResult(null);
    setSpecs([
      { key: 'Model', value: '' },
      { key: 'Processor / Chipset', value: '' },
      { key: 'Memory', value: '' },
      { key: 'Warranty', value: '' },
    ]);
    // Clear any image preview
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => {
      (input as HTMLInputElement).value = '';
    });
  };

  const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
    setSpecs(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addSpecRow = () => {
    setSpecs(prev => [...prev, { key: '', value: '' }]);
  };

  const removeSpecRow = (index: number) => {
    setSpecs(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleGenerateAiContent = async () => {
    if (!formState.name.trim()) {
      showToast.error('Enter a product name first so AI has something to work with.');
      return;
    }
    setAiGenerating(true);
    setAiPanelOpen(true);
    try {
      const category = categories?.find((c) => c.id === formState.categoryId)?.name;
      const specsText = specs
        .filter((s) => s.key.trim() && s.value.trim())
        .map((s) => `${s.key}: ${s.value}`)
        .join(', ');

      const result = await productApi.generateAiContent({
        name: formState.name,
        categoryName: category,
        price: formState.price ? Number(formState.price) : undefined,
        specs: specsText || undefined,
        existingDescription: descriptionMode === 'text' ? formState.description : undefined,
      });
      setAiResult(result);
    } catch (error) {
      console.error(error);
      showToast.error('Unable to generate AI content right now.');
      setAiPanelOpen(false);
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAiDescription = () => {
    if (!aiResult) return;
    setDescriptionMode('text');
    setFormState((prev) => ({ ...prev, description: aiResult.description }));
    showToast.success('AI description applied — review before saving.');
  };

  const applyAiSpecifications = () => {
    if (!aiResult || aiResult.specifications.length === 0) return;
    setDescriptionMode('specs');
    setSpecs((prev) => {
      const withoutEmpty = prev.filter((s) => s.key.trim() || s.value.trim());
      const additions = aiResult.specifications.map((s) => ({ key: s.key, value: s.value }));
      return [...withoutEmpty, ...additions];
    });
    showToast.success('AI specifications added — review before saving.');
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => {
      if (name === 'name') {
        const shouldUpdateSlug = !prev.slug || prev.slug === toProductSlug(prev.name);
        return {
          ...prev,
          name: value,
          slug: shouldUpdateSlug ? toProductSlug(value) : prev.slug,
        };
      }
      if (name === 'slug') {
        return { ...prev, slug: toProductSlug(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageError = getProductImageError(file);
      if (imageError) {
        event.target.value = '';
        setFormState((prev) => ({ ...prev, image: null }));
        void Swal.fire({
          title: 'Invalid Product Image',
          text: imageError,
          icon: 'error',
          confirmButtonColor: '#5B3DC8',
        });
        return;
      }
    }
    setFormState((prev) => ({ 
      ...prev, 
      image: file ?? null,
      // Clear current image URL when new image is selected
      currentImageUrl: file ? undefined : prev.currentImageUrl
    }));
  };

  const handleAdditionalImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const filesArray = Array.from(files);
      const invalidFile = filesArray.find((file) => getProductImageError(file));
      if (invalidFile) {
        const imageError = getProductImageError(invalidFile);
        event.target.value = '';
        setFormState((prev) => ({ ...prev, additionalImages: [] }));
        void Swal.fire({
          title: 'Invalid Additional Image',
          text: `${invalidFile.name}: ${imageError}`,
          icon: 'error',
          confirmButtonColor: '#5B3DC8',
        });
        return;
      }
      setFormState((prev) => ({
        ...prev,
        additionalImages: filesArray,
        currentAdditionalImages: [] // Clear existing previews if new ones are uploaded
      }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // 1. Build finalDescription
    const finalDescription = descriptionMode === 'specs'
      ? (() => {
          const specsObj: Record<string, string> = {};
          specs.forEach(s => {
            if (s.key.trim() && s.value.trim()) {
              specsObj[s.key.trim()] = s.value.trim();
            }
          });
          return Object.keys(specsObj).length > 0 ? JSON.stringify(specsObj) : '';
        })()
      : formState.description.trim();

    // 2. Validate required fields (sizes is optional now!)
    if (!formState.name.trim() || !finalDescription || !formState.price || formState.stock === '' || !formState.categoryId || !formState.slug) {
      await Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields (Name, Description/Specifications, Price, Stock, Category, Slug).',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
      return;
    }

    if (!formState.id && !formState.image) {
      await Swal.fire({
        title: 'Product Image Required',
        text: 'Please choose a JPG, JPEG, PNG, WEBP, or GIF image up to 5 MB.',
        icon: 'error',
        confirmButtonColor: '#5B3DC8',
      });
      return;
    }

    if (!/^[a-z0-9-]+$/.test(formState.slug)) {
      await Swal.fire({
        title: 'Invalid Slug',
        text: 'The slug may only contain lowercase letters, numbers, and hyphens.',
        icon: 'error',
        confirmButtonColor: '#5B3DC8',
      });
      return;
    }

    const price = Number(formState.price);
    const stock = Number(formState.stock);
    if (!Number.isFinite(price) || price < 0.01 || price > 1_000_000 ||
        !Number.isInteger(stock) || stock < 0 || stock > 100_000) {
      await Swal.fire({
        title: 'Invalid Price or Stock',
        text: 'Price must be between 0.01 and 1,000,000, and stock must be a whole number between 0 and 100,000.',
        icon: 'error',
        confirmButtonColor: '#5B3DC8',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse sizes from comma-separated string if provided
      const sizesArray = formState.sizes
        ? formState.sizes
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
        : [];

      const payload = {
        name: formState.name,
        description: finalDescription,
        price,
        stock,
        categoryId: formState.categoryId,
        slug: formState.slug,
        sizes: sizesArray,
        image: formState.image ?? undefined,
        additionalImages: formState.additionalImages ?? [],
      };

      if (formState.id) {
        await productApi.update(formState.id, { ...payload, id: formState.id });
      } else {
        await productApi.create(payload);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products', 'catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
      ]);

      resetForm();
      setIsFormExpanded(false);
    } catch (error) {
      console.error(error);
      let errorMessage = 'Unable to save the product. Please try again.';
      
      if (error instanceof AxiosError && error.response?.data) {
        // Try to extract error message from response
        const responseData = error.response.data;
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.errors) {
          // Handle validation errors object
          const errorMessages = Object.values(responseData.errors).flat().join(', ');
          errorMessage = errorMessages || errorMessage;
        } else if (responseData.title) {
          errorMessage = responseData.title;
        }
      }
      if (error instanceof AxiosError && error.response?.status === 401) {
        errorMessage = 'Your admin session has expired. Please sign in again, then retry adding the product.';
      } else if (error instanceof AxiosError && error.response?.status === 403) {
        errorMessage = 'Your account does not have permission to manage products.';
      }

      await Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#5B3DC8',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    let additionalImagesUrls: string[] = [];
    if (product.additionalImages) {
      try {
        additionalImagesUrls = JSON.parse(product.additionalImages);
      } catch (e) {
        console.error("Failed to parse additional images", e);
      }
    }

    let isSpecs = false;
    let parsedSpecs = [
      { key: 'Model', value: '' },
      { key: 'Processor / Chipset', value: '' },
      { key: 'Memory', value: '' },
      { key: 'Warranty', value: '' },
    ];

    if (product.description) {
      try {
        const parsed = JSON.parse(product.description);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedSpecs = Object.entries(parsed).map(([k, v]) => ({ key: k, value: String(v) }));
          isSpecs = true;
        }
      } catch (e) {
        // Plain text description
      }
    }

    setDescriptionMode(isSpecs ? 'specs' : 'text');
    setSpecs(parsedSpecs);

    setFormState({
      id: product.id,
      name: product.name,
      description: isSpecs ? '' : product.description,
      price: String(product.price),
      stock: String(product.stock),
      categoryId: product.categoryId,
      slug: product.slug ?? '',
      sizes: product.sizes ? product.sizes.join(', ') : '',
      image: null,
      currentImageUrl: product.imageUrl, // Store current image URL for preview
      additionalImages: [],
      currentAdditionalImages: additionalImagesUrls,
    });
    setIsFormExpanded(true);
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Delete this product?')) {
      return;
    }

    try {
      await productApi.remove(productId);
      await queryClient.invalidateQueries({ queryKey: ['products', 'catalog'] });
    } catch (error) {
      console.error(error);
      alert('Unable to delete product.');
    }
  };

  if (categoriesLoading || productsLoading) {
    return <LoadingOverlay />;
  }

  if (categoriesError || productsError) {
    return <div className="alert alert-danger">Unable to load product data.</div>;
  }

  const totalProducts = products?.length ?? 0;
  const totalStock = products?.reduce((sum, product) => sum + (product.stock ?? 0), 0) ?? 0;
  const averagePrice = totalProducts > 0
    ? products!.reduce((sum, product) => sum + Number(product.price ?? 0), 0) / totalProducts
    : 0;

  const openCreateForm = () => {
    resetForm();
    setIsFormExpanded(true);
  };

  const closeForm = () => {
    resetForm();
    setIsFormExpanded(false);
  };

  return (
    <div className="container-fluid admin-page">
      <div
        className="rounded-4 p-4 mb-4 text-white position-relative overflow-hidden"
        style={{ background: 'linear-gradient(120deg, #1A1A2E 0%, #5B3DC8 48%, #7C5FE0 100%)' }}
      >
        <div className="position-absolute top-0 end-0 opacity-25 pe-none" style={{ fontSize: '6rem', marginTop: '-0.8rem', marginRight: '-0.5rem' }}>
          <i className="fas fa-box-open" />
        </div>
        <div className="position-relative">
          <h3 className="fw-bold mb-1 text-white">Product Studio</h3>
          <p className="mb-3 text-white-50">Manage catalog products with a streamlined premium workflow.</p>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="rounded-4 p-3 border" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(14,165,233,0.3) 100%)', borderColor: 'rgba(255,255,255,0.25)' }}>
                <p className="small text-white-50 mb-1">Products</p>
                <h4 className="mb-0 text-white fw-bold">{totalProducts}</h4>
              </div>
            </div>
            <div className="col-md-4">
              <div className="rounded-4 p-3 border" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(34,197,94,0.3) 100%)', borderColor: 'rgba(255,255,255,0.25)' }}>
                <p className="small text-white-50 mb-1">Total Stock</p>
                <h4 className="mb-0 text-white fw-bold">{totalStock}</h4>
              </div>
            </div>
            <div className="col-md-4">
              <div className="rounded-4 p-3 border" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(251,146,60,0.3) 100%)', borderColor: 'rgba(255,255,255,0.25)' }}>
                <p className="small text-white-50 mb-1">Avg Price</p>
                <h4 className="mb-0 text-white fw-bold">{formatCurrencyEGP(averagePrice)}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h5 className="fw-semibold mb-1">Product Form</h5>
              <p className="text-muted mb-0 small">Create or edit products in one expandable premium panel.</p>
            </div>
            {!isFormExpanded ? (
              <button type="button" className="btn btn-primary" onClick={openCreateForm}>
                <i className="fas fa-plus me-2" />
                Add Product
              </button>
            ) : (
              <button type="button" className="btn btn-outline-secondary" onClick={closeForm}>
                <i className="fas fa-chevron-up me-2" />
                Collapse
              </button>
            )}
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
                <h6 className="fw-semibold mb-0">{formState.id ? 'Edit Product' : 'Add Product'}</h6>
                <span className={`badge ${formState.id ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'}`}>
                  {formState.id ? 'Edit Mode' : 'Create Mode'}
                </span>
              </div>
              <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
                <div>
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formState.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                 <div>
                  <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <label className="form-label mb-0 fw-semibold text-dark"><i className="fas fa-align-left text-primary me-1.5" />Product Description / Specifications</label>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill"
                        onClick={handleGenerateAiContent}
                        disabled={aiGenerating}
                      >
                        <i className="fas fa-wand-magic-sparkles me-1.5" />
                        {aiGenerating ? 'Generating...' : 'AI Assist'}
                      </button>
                      <div className="btn-group btn-group-sm rounded-3 overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                        <button
                          type="button"
                          className={`btn px-3 py-1.5 fw-semibold ${descriptionMode === 'specs' ? 'btn-primary' : 'btn-light text-dark'}`}
                          onClick={() => setDescriptionMode('specs')}
                          style={{ border: 'none' }}
                        >
                          <i className="fas fa-list-alt me-1.5" />
                          Specifications (Key-Value)
                        </button>
                        <button
                          type="button"
                          className={`btn px-3 py-1.5 fw-semibold ${descriptionMode === 'text' ? 'btn-primary' : 'btn-light text-dark'}`}
                          onClick={() => setDescriptionMode('text')}
                          style={{ border: 'none' }}
                        >
                          <i className="fas fa-file-alt me-1.5" />
                          Plain Text
                        </button>
                      </div>
                    </div>
                  </div>

                  {aiPanelOpen && (
                    <div className="border border-primary-subtle rounded-4 p-3 mb-3" style={{ background: 'linear-gradient(135deg, rgba(91,61,200,0.05) 0%, rgba(124,95,224,0.08) 100%)' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-semibold small text-primary">
                          <i className="fas fa-wand-magic-sparkles me-1" /> AI-Generated Draft {aiResult && <span className="badge bg-light text-muted ms-1">{aiResult.provider}</span>}
                        </span>
                        <button type="button" className="btn btn-sm btn-link text-muted p-0" onClick={() => setAiPanelOpen(false)}>
                          <i className="fas fa-xmark" />
                        </button>
                      </div>

                      {aiGenerating && (
                        <div className="placeholder-glow">
                          <span className="placeholder col-12 rounded mb-2 d-block"></span>
                          <span className="placeholder col-8 rounded d-block"></span>
                        </div>
                      )}

                      {!aiGenerating && aiResult && (
                        <>
                          <p className="small mb-2">{aiResult.description}</p>
                          {aiResult.highlights.length > 0 && (
                            <ul className="small mb-2 ps-3">
                              {aiResult.highlights.map((h, idx) => <li key={idx}>{h}</li>)}
                            </ul>
                          )}
                          {aiResult.suggestedTags.length > 0 && (
                            <div className="mb-2 d-flex flex-wrap gap-1">
                              {aiResult.suggestedTags.map((tag) => (
                                <span key={tag} className="badge bg-secondary-subtle text-secondary">#{tag}</span>
                              ))}
                            </div>
                          )}
                          <div className="d-flex gap-2 flex-wrap">
                            <button type="button" className="btn btn-sm btn-primary" onClick={applyAiDescription}>
                              Use as Description
                            </button>
                            {aiResult.specifications.length > 0 && (
                              <button type="button" className="btn btn-sm btn-outline-primary" onClick={applyAiSpecifications}>
                                Use as Specifications
                              </button>
                            )}
                          </div>
                          <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.75rem' }}>
                            Review before saving — AI drafts may need edits.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {descriptionMode === 'specs' ? (
                    <div className="border rounded-4 p-3 bg-light shadow-inner mb-2">
                      <div className="table-responsive">
                        <table className="table table-borderless mb-0 align-middle">
                          <thead>
                            <tr className="border-bottom text-muted" style={{ fontSize: '0.85rem' }}>
                              <th className="py-2 fw-semibold" style={{ width: '40%' }}>Feature Name (Key)</th>
                              <th className="py-2 fw-semibold" style={{ width: '50%' }}>Feature Value (Value)</th>
                              <th className="py-2 text-center" style={{ width: '10%' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {specs.map((spec, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-1">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm rounded-3 border"
                                    placeholder="e.g., Processor, Memory, Refresh Rate"
                                    value={spec.key}
                                    onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                                  />
                                </td>
                                <td className="py-2 px-1">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm rounded-3 border"
                                    placeholder="e.g., Ryzen 7 7800X3D, 32GB DDR5, 165Hz"
                                    value={spec.value}
                                    onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                                  />
                                </td>
                                <td className="py-2 text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0"
                                    onClick={() => removeSpecRow(idx)}
                                    disabled={specs.length <= 1}
                                  >
                                    <i className="fas fa-minus-circle fs-5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary rounded-pill px-3"
                          onClick={addSpecRow}
                        >
                          <i className="fas fa-plus me-1.5" />
                          Add Row
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <textarea
                        className="form-control rounded-4 p-3 border"
                        rows={4}
                        name="description"
                        value={formState.description}
                        onChange={handleInputChange}
                        placeholder="Write a plain text product description..."
                        required={descriptionMode === 'text'}
                      />
                    </div>
                  )}
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000000"
                      className="form-control"
                      name="price"
                      value={formState.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Stock</label>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      className="form-control"
                      name="stock"
                      value={formState.stock}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    name="categoryId"
                    value={formState.categoryId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Slug</label>
                  <input
                    type="text"
                    className="form-control"
                    name="slug"
                    value={formState.slug}
                    onChange={handleInputChange}
                    pattern="[a-z0-9-]+"
                    placeholder="generated-from-product-name"
                    required
                  />
                  <small className="form-text text-muted">Lowercase letters, numbers, and hyphens only. It is generated automatically from the product name.</small>
                </div>
                <div>
                  <label className="form-label fw-semibold text-dark"><i className="fas fa-sliders-h text-primary me-1.5" />Options / Variants (comma-separated) - <span className="text-muted fw-normal">Optional</span></label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    name="sizes"
                    value={formState.sizes}
                    onChange={handleInputChange}
                    placeholder="e.g., 16GB / 1TB, 32GB / 1TB, Black, White"
                  />
                  <small className="form-text text-muted">Enter configurations, capacities, switch types, or colors separated by commas. Leave empty when the product has one configuration.</small>
                </div>
                <div>
                  <label className="form-label">Product Image {formState.id ? '(leave empty to keep current)' : ''}</label>
                  {formState.currentImageUrl && (
                    <div className="mb-2">
                      <p className="text-muted small mb-1">Current Image:</p>
                      <img
                        src={resolveImageUrl(formState.currentImageUrl)}
                        alt="Current product"
                        style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                        className="rounded border"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    className="form-control"
                    accept={PRODUCT_IMAGE_ACCEPT}
                    onChange={handleImageChange}
                    key={formState.id || 'new'}
                    required={!formState.id}
                  />
                  <small className="form-text text-muted">JPG, JPEG, PNG, WEBP, or GIF. Maximum 5 MB.</small>
                  {formState.image && (
                    <div className="mt-2">
                      <p className="text-muted small mb-1">New Image Preview:</p>
                      <img
                        src={URL.createObjectURL(formState.image)}
                        alt="Preview"
                        style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                        className="rounded border"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">Additional Product Images {formState.id ? '(leave empty to keep current)' : ''}</label>
                  {formState.currentAdditionalImages && formState.currentAdditionalImages.length > 0 && (
                    <div className="mb-2">
                      <p className="text-muted small mb-1">Current Additional Images:</p>
                      <div className="d-flex flex-wrap gap-2">
                        {formState.currentAdditionalImages.map((imgUrl, index) => (
                          <img
                            key={index}
                            src={resolveImageUrl(imgUrl)}
                            alt={`Additional ${index}`}
                            style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'cover' }}
                            className="rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    className="form-control"
                    accept={PRODUCT_IMAGE_ACCEPT}
                    multiple
                    onChange={handleAdditionalImagesChange}
                    key={(formState.id || 'new') + '_additional'}
                  />
                  {formState.additionalImages && formState.additionalImages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-muted small mb-1">New Additional Images Preview:</p>
                      <div className="d-flex flex-wrap gap-2">
                        {formState.additionalImages.map((file, index) => (
                          <img
                            key={index}
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index}`}
                            style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'cover' }}
                            className="rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : formState.id ? 'Update Product' : 'Create Product'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={closeForm}>
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
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h5 className="fw-semibold mb-0">Products</h5>
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
              <span className="badge bg-primary-subtle text-primary">{totalProducts} items</span>
            </div>
          </div>

          {totalProducts === 0 ? (
            <div className="alert alert-warning mb-0">No products found.</div>
          ) : viewMode === 'table' ? (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Image</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products?.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.categoryName}</td>
                      <td>{formatCurrencyEGP(product.price)}</td>
                      <td>{product.stock}</td>
                      <td>
                        {product.imageUrl && <img src={resolveImageUrl(product.imageUrl)} alt={product.name} width={60} height={60} style={{ objectFit: 'cover' }} className="rounded" />}
                      </td>
                      <td className="text-end">
                      <div className="btn-group flex-wrap gap-1 justify-content-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(product)}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(product.id)}>
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
              {products?.map((product) => (
                <div key={product.id} className="col-md-6 col-xl-4">
                  <div className="card border-0 shadow-sm h-100 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={resolveImageUrl(product.imageUrl)}
                        alt={product.name}
                        className="card-img-top"
                        style={{ height: 180, objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center text-muted" style={{ height: 180, background: '#f1f3f5' }}>
                        <i className="fas fa-image me-2" />
                        No image
                      </div>
                    )}
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                        <h6 className="mb-0 fw-semibold">{product.name}</h6>
                        <span className="badge bg-primary-subtle text-primary">{product.categoryName}</span>
                      </div>
                      <p className="small text-muted mb-2">Slug: {product.slug ?? '--'}</p>
                      <div className="d-flex gap-2 mb-3">
                        <span className="badge bg-success-subtle text-success">{formatCurrencyEGP(product.price)}</span>
                        <span className="badge bg-info-subtle text-info">Stock: {product.stock}</span>
                      </div>
                      <div className="mt-auto d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary w-100" onClick={() => handleEdit(product)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-outline-danger w-100" onClick={() => handleDelete(product.id)}>
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

