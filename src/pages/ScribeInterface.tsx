import React, { useState, useEffect } from 'react';
import { Building2, UserSquare2, Users, Plus, X, Pill, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, Clinic, Provider, User as DBUser, Drug } from '../lib/supabase';

interface ScribeInterfaceProps {
  onLogout: () => void;
  onContinue: (patientId: string) => void;
}

const ScribeInterface: React.FC<ScribeInterfaceProps> = ({ onLogout, onContinue }) => {
  const { user } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const [refillDate, setRefillDate] = useState<string>('');
  const [mappedPatients, setMappedPatients] = useState<DBUser[]>([]);
  const [allPatients, setAllPatients] = useState<DBUser[]>([]);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      loadProvidersForClinic(selectedClinic);
    } else {
      setFilteredProviders([]);
      setSelectedProvider(null);
    }
  }, [selectedClinic, providers]);

  useEffect(() => {
    if (selectedProvider) {
      loadMappedPatients(selectedProvider);
    } else {
      setMappedPatients([]);
    }
  }, [selectedProvider]);

  const loadData = async () => {
    try {
      const [clinicsRes, providersRes, patientsRes, drugsRes] = await Promise.all([
        supabase.from('clinics').select('*').order('name'),
        supabase.from('providers').select('*').order('name'),
        supabase.from('users').select('*').eq('user_role', 'patient').order('email'),
        supabase.from('drugs').select('*').order('name'),
      ]);

      if (clinicsRes.data) setClinics(clinicsRes.data);
      if (providersRes.data) setProviders(providersRes.data);
      if (patientsRes.data) setAllPatients(patientsRes.data);
      if (drugsRes.data) setDrugs(drugsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProvidersForClinic = async (clinicId: string) => {
    try {
      const { data: providerClinicData } = await supabase
        .from('provider_clinics')
        .select('provider_id')
        .eq('clinic_id', clinicId);

      if (providerClinicData) {
        const providerIds = providerClinicData.map(pc => pc.provider_id);
        const filtered = providers.filter(p => providerIds.includes(p.id));
        setFilteredProviders(filtered);
      } else {
        setFilteredProviders([]);
      }
    } catch (error) {
      console.error('Error loading providers for clinic:', error);
      setFilteredProviders([]);
    }
  };

  const loadMappedPatients = async (providerId: string) => {
    try {
      const { data: userProviderData, error } = await supabase
        .from('user_providers')
        .select('user_id')
        .eq('provider_id', providerId);

      if (error) throw error;

      if (userProviderData && userProviderData.length > 0) {
        const patientIds = userProviderData.map(up => up.user_id);
        const { data: patientData, error: patientError } = await supabase
          .from('users')
          .select('*')
          .in('id', patientIds)
          .eq('user_role', 'patient')
          .order('email');

        if (patientError) throw patientError;
        if (patientData) setMappedPatients(patientData);
      } else {
        setMappedPatients([]);
      }
    } catch (error) {
      console.error('Error loading mapped patients:', error);
      setMappedPatients([]);
    }
  };

  const handleAddPatient = async (patientId: string) => {
    if (!selectedProvider) return;

    try {
      const { error } = await supabase
        .from('user_providers')
        .insert({ user_id: patientId, provider_id: selectedProvider });

      if (error) throw error;

      await loadMappedPatients(selectedProvider);
      setShowAddPatientModal(false);
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  const handleRemovePatient = async (patientId: string) => {
    if (!selectedProvider) return;

    try {
      const { error } = await supabase
        .from('user_providers')
        .delete()
        .eq('user_id', patientId)
        .eq('provider_id', selectedProvider);

      if (error) throw error;

      await loadMappedPatients(selectedProvider);

      if (selectedPatient === patientId) {
        setSelectedPatient(null);
        setSelectedDrug(null);
        setRefillDate('');
      }
    } catch (error) {
      console.error('Error removing patient:', error);
    }
  };

  const handleSelectPatient = async (patientId: string) => {
    setSelectedPatient(patientId);

    try {
      const { data: patientDrugData } = await supabase
        .from('patient_drugs')
        .select('drug_id, refill_date')
        .eq('user_id', patientId)
        .maybeSingle();

      if (patientDrugData) {
        setSelectedDrug(patientDrugData.drug_id);
        setRefillDate(patientDrugData.refill_date || '');
      } else {
        setSelectedDrug(null);
        setRefillDate('');
      }
    } catch (error) {
      console.error('Error loading patient drug:', error);
    }
  };

  const handleSaveDrugAndRefillDate = async () => {
    if (!selectedPatient || !selectedDrug) return;

    try {
      await supabase
        .from('patient_drugs')
        .delete()
        .eq('user_id', selectedPatient);

      const drug = drugs.find(d => d.id === selectedDrug);
      if (!drug) return;

      const { error } = await supabase
        .from('patient_drugs')
        .insert({
          user_id: selectedPatient,
          drug_id: drug.id,
          refill_date: refillDate || null,
          weekly_price: drug.weekly_price,
          monthly_price: drug.monthly_price,
          yearly_price: drug.yearly_price
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving drug:', error);
    }
  };

  const handleContinue = async () => {
    if (!selectedPatient) return;

    await handleSaveDrugAndRefillDate();
    onContinue(selectedPatient);
  };

  const availablePatients = allPatients.filter(
    patient => !mappedPatients.some(mp => mp.id === patient.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#531B93' }}>
              Scribe Interface
            </h1>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#009193' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
            >
              Logout
            </button>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="border-b border-gray-200 pb-4 sm:pb-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#009193' }} />
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: '#531B93' }}>
                  Select Clinic
                </h2>
              </div>

              <select
                value={selectedClinic || ''}
                onChange={(e) => setSelectedClinic(e.target.value || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a clinic...</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                ))}
              </select>
            </div>

            <div className="border-b border-gray-200 pb-4 sm:pb-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <UserSquare2 className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#009193' }} />
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: '#531B93' }}>
                  Select Provider
                </h2>
              </div>

              <select
                value={selectedProvider || ''}
                onChange={(e) => setSelectedProvider(e.target.value || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedClinic}
              >
                <option value="">
                  {!selectedClinic ? 'Select a clinic first...' : 'Select a provider...'}
                </option>
                {filteredProviders.map(provider => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </div>

            {selectedProvider && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#009193' }} />
                    <h2 className="text-lg sm:text-xl font-semibold" style={{ color: '#531B93' }}>
                      Mapped Patients ({mappedPatients.length})
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAddPatientModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#009193' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
                  >
                    <Plus className="w-4 h-4" />
                    Add Patient
                  </button>
                </div>

                {mappedPatients.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No patients mapped to this provider yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mappedPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all cursor-pointer ${
                          selectedPatient === patient.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectPatient(patient.id)}
                      >
                        <div>
                          <p className="font-semibold text-gray-800">{patient.email}</p>
                          <p className="text-sm text-gray-500">
                            Joined: {new Date(patient.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePatient(patient.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove patient"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedPatient && (
              <>
                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <Pill className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#009193' }} />
                    <h2 className="text-lg sm:text-xl font-semibold" style={{ color: '#531B93' }}>
                      Drug Details
                    </h2>
                  </div>

                  <select
                    value={selectedDrug || ''}
                    onChange={(e) => setSelectedDrug(e.target.value || null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a drug...</option>
                    {drugs.map(drug => (
                      <option key={drug.id} value={drug.id}>{drug.name}</option>
                    ))}
                  </select>
                </div>

                <div className="border-b border-gray-200 pb-4 sm:pb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#009193' }} />
                    <h2 className="text-lg sm:text-xl font-semibold" style={{ color: '#531B93' }}>
                      Refill Date
                    </h2>
                  </div>

                  <input
                    type="date"
                    value={refillDate}
                    onChange={(e) => setRefillDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleContinue}
                    disabled={!selectedDrug}
                    className="w-full sm:w-auto text-white font-semibold px-6 sm:px-8 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#009193' }}
                    onMouseEnter={(e) => !selectedDrug ? null : e.currentTarget.style.backgroundColor = '#007b7d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
                  >
                    Continue to Program Enrollment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold" style={{ color: '#531B93' }}>
                Add Patient to Provider
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {availablePatients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">All patients are already mapped to this provider.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availablePatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleAddPatient(patient.id)}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
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

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddPatientModal(false)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScribeInterface;
