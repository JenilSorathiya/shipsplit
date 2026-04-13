import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function useOrders(params = {}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const { data } = await api.get('/orders', { params });
      return data;
    },
  });
}

export function useOrder(id) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data.order;
    },
    enabled: !!id,
  });
}

export function useUploadOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ platform, file }) => {
      const form = new FormData();
      form.append('platform', platform);
      form.append('file', file);
      const { data } = await api.post('/orders/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`${data.imported} orders imported successfully`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Upload failed');
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted');
    },
  });
}
