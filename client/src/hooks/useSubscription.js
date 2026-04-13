import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../utils/api';

/* ── Fetch current subscription ─────────────────────────────────────── */
export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn:  () => api.get('/subscription').then((r) => r.data?.subscription),
    staleTime: 60_000,
  });
}

/* ── Fetch invoice history ───────────────────────────────────────────── */
export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn:  () => api.get('/subscription/invoices').then((r) => r.data?.invoices ?? []),
    staleTime: 300_000,
  });
}

/* ── Create Razorpay order ───────────────────────────────────────────── */
export function useCreateOrder() {
  return useMutation({
    mutationFn: ({ plan, billing }) =>
      api.post('/subscription/create-order', { plan, billing }).then((r) => r.data),
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not create payment order');
    },
  });
}

/* ── Verify payment ─────────────────────────────────────────────────── */
export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      api.post('/subscription/verify', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Payment verification failed');
    },
  });
}

/* ── Cancel subscription ────────────────────────────────────────────── */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason) =>
      api.post('/subscription/cancel', { reason }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Subscription cancelled. Access continues until the billing period ends.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    },
  });
}

/* ── Load Razorpay checkout script ──────────────────────────────────── */
export function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}
