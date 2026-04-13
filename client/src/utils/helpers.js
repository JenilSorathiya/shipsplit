import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date) => format(new Date(date), 'dd MMM yyyy');
export const formatDateTime = (date) => format(new Date(date), 'dd MMM yyyy, h:mm a');
export const timeAgo = (date) => formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const formatNumber = (n) =>
  new Intl.NumberFormat('en-IN').format(n);

export const getPlatformColor = (platform) => {
  const map = {
    amazon:   { bg: 'bg-amazon-light',   text: 'text-orange-700',  border: 'border-orange-200' },
    flipkart: { bg: 'bg-flipkart-light',  text: 'text-blue-700',    border: 'border-blue-200'   },
    meesho:   { bg: 'bg-meesho-light',    text: 'text-pink-700',    border: 'border-pink-200'   },
    myntra:   { bg: 'bg-myntra-light',    text: 'text-red-700',     border: 'border-red-200'    },
  };
  return map[platform] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
};

export const getOrderStatusBadge = (status) => {
  const map = {
    pending:         'badge-yellow',
    processed:       'badge-blue',
    label_generated: 'badge-blue',
    shipped:         'badge-green',
    delivered:       'badge-green',
    returned:        'badge-red',
    cancelled:       'badge-gray',
  };
  return map[status] || 'badge-gray';
};

export const truncate = (str, len = 30) =>
  str?.length > len ? `${str.slice(0, len)}…` : str;

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const parseErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'An unexpected error occurred';

export const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
