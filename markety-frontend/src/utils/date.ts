export const ensureLocalDate = (dateStr?: string | Date) => {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return new Date(dateStr);
  // If missing timezone info, append 'Z' to treat as UTC before converting to local
  const normalized = (dateStr.includes('Z') || dateStr.includes('+')) ? dateStr : `${dateStr}Z`;
  return new Date(normalized);
};

export const formatDate = (dateStr?: string | Date) => {
  return ensureLocalDate(dateStr)?.toLocaleDateString() ?? 'N/A';
};

export const formatDateTime = (dateStr?: string | Date) => {
  return ensureLocalDate(dateStr)?.toLocaleString() ?? 'N/A';
};
