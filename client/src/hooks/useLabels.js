import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { downloadBlob } from '../utils/helpers';

export function useLabels(params = {}) {
  return useQuery({
    queryKey: ['labels', params],
    queryFn: async () => {
      const { data } = await api.get('/labels', { params });
      return data;
    },
  });
}

export function useUploadLabels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ platform, file }) => {
      const form = new FormData();
      form.append('platform', platform);
      form.append('file', file);
      const { data } = await api.post('/labels/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['labels'] });
      toast.success(`${data.processed} labels processed`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Label upload failed');
    },
  });
}

export function useGenerateLabels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/labels/generate', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Labels generated successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Label generation failed');
    },
  });
}

export function useDownloadLabels() {
  return useMutation({
    mutationFn: async ({ ids, config }) => {
      const response = await api.post(
        '/labels/download',
        { ids, config },
        { responseType: 'blob' }
      );
      downloadBlob(response.data, `shipsplit-labels-${Date.now()}.pdf`);
    },
    onSuccess: () => toast.success('Labels downloaded'),
    onError: () => toast.error('Download failed'),
  });
}
