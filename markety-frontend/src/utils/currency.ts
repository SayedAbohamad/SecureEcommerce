const egpFormatter = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  minimumFractionDigits: 2,
});

export const formatCurrencyEGP = (value: number) => egpFormatter.format(value);



