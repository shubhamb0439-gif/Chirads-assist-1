import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, User as DBUser } from '../lib/supabase';

interface PatientSelectionProps {
  onPatientSelected: (patientId: string) => void;
}

const PatientSelection: React.FC<PatientSelectionProps> = ({ onPatientSelected }) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, [user]);

  const loadPatients = async () => {
    if (!user) return;

    try {
      if (user.user_role === 'scribe') {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_role', 'patient')
          .order('email');

        if (error) throw error;
        if (data) setPatients(data);
      } else if (user.user_role === 'provider') {
        const userType = localStorage.getItem('userType');

        if (userType === 'provider') {
          const { data: userProviderData, error: upError } = await supabase
            .from('user_providers')
            .select('user_id')
            .eq('provider_id', user.id);

          if (upError) throw upError;

          if (userProviderData && userProviderData.length > 0) {
            const patientIds = userProviderData.map(up => up.user_id);
            const { data: patientData, error: patientError } = await supabase
              .from('users')
              .select('*')
              .in('id', patientIds)
              .eq('user_role', 'patient')
              .order('email');

            if (patientError) throw patientError;
            if (patientData) setPatients(patientData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#009193' }} />
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#531B93' }}>
              Select Patient
            </h1>
          </div>

          {patients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No patients found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => onPatientSelected(patient.id)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <p className="font-semibold text-gray-800">{patient.email}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Joined: {new Date(patient.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientSelection;
