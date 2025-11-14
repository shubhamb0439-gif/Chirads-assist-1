import React, { useState, useEffect } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';

interface Patient {
  id: string;
  email: string;
}

interface PatientSelectionProps {
  providerId: string;
  onSelectPatient: (patientId: string) => void;
}

const PatientSelection: React.FC<PatientSelectionProps> = ({
  providerId,
  onSelectPatient
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('user_providers')
        .select('user_id, users(id, email)')
        .eq('provider_id', providerId);

      if (error) throw error;

      const patientData = data?.map((item: any) => item.users).filter(Boolean) || [];
      setPatients(patientData);
    } catch (error) {
      console.error('Error loading patients:', error);
      setToast({ message: 'Failed to load patients', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      setToast({ message: 'Please select a patient', type: 'error' });
      return;
    }

    onSelectPatient(selectedPatient);
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
          Select Patient
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Patient
            </label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.email}
                </option>
              ))}
            </select>
          </div>

          {patients.length === 0 && (
            <p className="text-sm text-gray-600 text-center">
              No patients assigned to this provider.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            disabled={patients.length === 0}
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

export default PatientSelection;
