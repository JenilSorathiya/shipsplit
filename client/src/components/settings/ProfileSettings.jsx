import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number').optional().or(z.literal('')),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN').optional().or(z.literal('')),
  businessName: z.string().optional(),
});

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      gstin: user?.gstin || '',
      businessName: user?.businessName || '',
    },
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const { data } = await api.patch('/users/profile', values);
      updateUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5 max-w-lg">
      <h3 className="font-semibold text-gray-900">Profile Information</h3>
      <div>
        <label className="label">Full Name</label>
        <input {...register('name')} className="input" />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label">Business Name <span className="text-gray-400 font-normal">(optional)</span></label>
        <input {...register('businessName')} className="input" placeholder="Your shop or company name" />
      </div>
      <div>
        <label className="label">Mobile Number</label>
        <input {...register('phone')} className="input" placeholder="9876543210" maxLength={10} />
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>
      <div>
        <label className="label">GSTIN <span className="text-gray-400 font-normal">(optional)</span></label>
        <input {...register('gstin')} className="input" placeholder="22AAAAA0000A1Z5" maxLength={15} style={{ textTransform: 'uppercase' }} />
        {errors.gstin && <p className="mt-1 text-xs text-red-600">{errors.gstin.message}</p>}
      </div>
      <div>
        <label className="label">Email</label>
        <input value={user?.email} disabled className="input" />
        <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
