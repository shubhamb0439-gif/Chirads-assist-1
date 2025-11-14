import React, { useState, useEffect } from 'react';
import { Building2, UserCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';

interface Clinic {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  name: string;
}

interface ClinicProviderSelectionProps {
  userId: string;
  userRole: 'patient' | 'provider' | 'scribe';
  onComplete: (clinicId: string, providerId: string) => void;
}

const ClinicProviderSelection: React.FC<ClinicProviderSelectionProps> = ({
  userId,
  userRole,
  onComplete
}) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadClinics();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      loadProviders(selectedClinic);
    } else {
      setProviders([]);
      setSelectedProvider('');
    }
  }, [selectedClinic]);

  const loadClinics = async () => {
    try {
      let clinicData;

      if (userRole === 'scribe') {
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .order('name');

        if (error) throw error;
        clinicData = data;
      } else {
        const { data, error } = await supabase
          .from('user_clinics')
          .select('clinic_id, clinics(id, name)')
          .eq('user_id', userId);

        if (error) throw error;
        clinicData = data?.map((item: any) => item.clinics).filter(Boolean) || [];
      }

      setClinics(clinicData || []);
    } catch (error) {
      console.error('Error loading clinics:', error);
      setToast({ message: 'Failed to load clinics', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async (clinicId: string) => {
    try {
      if (userRole === 'scribe') {
        const { data, error } = await supabase
          .from('provider_clinics')
          .select('provider_id, providers(id, name)')
          .eq('clinic_id', clinicId);

        if (error) throw error;
        const providerData = data?.map((item: any) => item.providers).filter(Boolean) || [];
        setProviders(providerData);
      } else {
        const { data, error } = await supabase
          .from('user_providers')
          .select('provider_id, providers(id, name)')
          .eq('user_id', userId);

        if (error) throw error;
        const userProviderIds = data?.map((item: any) => item.provider_id) || [];

        const { data: clinicProviders, error: clinicError } = await supabase
          .from('provider_clinics')
          .select('provider_id, providers(id, name)')
          .eq('clinic_id', clinicId)
          .in('provider_id', userProviderIds);

        if (clinicError) throw clinicError;
        const providerData = clinicProviders?.map((item: any) => item.providers).filter(Boolean) || [];
        setProviders(providerData);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      setToast({ message: 'Failed to load providers', type: 'error' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClinic || !selectedProvider) {
      setToast({ message: 'Please select both clinic and provider', type: 'error' });
      return;
    }

    onComplete(selectedClinic, selectedProvider);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Select Clinic & Provider
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Clinic
            </label>
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a clinic</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserCircle className="w-4 h-4 inline mr-2" />
              Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!selectedClinic}
            >
              <option value="">Select a provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ClinicProviderSelection;
