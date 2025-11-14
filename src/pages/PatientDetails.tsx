import React, { useState, useEffect } from 'react';
import { Building2, UserSquare2, Pill, Plus, X, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, Clinic, Provider, Drug } from '../lib/supabase';

interface PatientDetailsProps {
  onNext: () => void;
  onBack?: () => void;
  onLogout?: () => void;
  selectedPatientId?: string | null;
}

const PatientDetails: React.FC<PatientDetailsProps> = ({ onNext, onBack, onLogout, selectedPatientId }) => {
  const { user } = useAuth();
  const effectiveUserId = selectedPatientId || user?.id;
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [userClinic, setUserClinic] = useState<string | null>(null);
  const [userProvider, setUserProvider] = useState<string | null>(null);
  const [userDrug, setUserDrug] = useState<string | null>(null);
  const [newClinicName, setNewClinicName] = useState('');
  const [newProviderName, setNewProviderName] = useState('');
  const [newDrugName, setNewDrugName] = useState('');
  const [showClinicInput, setShowClinicInput] = useState(false);
  const [showProviderInput, setShowProviderInput] = useState(false);
  const [showDrugInput, setShowDrugInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNewClinicAdded, setIsNewClinicAdded] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (userClinic) {
      loadProvidersForClinic(userClinic);
    } else {
      setFilteredProviders([]);
    }
  }, [userClinic, providers]);

  const loadData = async () => {
    if (!effectiveUserId) return;

    try {
      const [clinicsRes, providersRes, drugsRes, userClinicsRes, userProvidersRes, userDrugRes] = await Promise.all([
        supabase.from('clinics').select('*').order('name'),
        supabase.from('providers').select('*').order('name'),
        supabase.from('drugs').select('*').order('name'),
        supabase.from('user_clinics').select('clinic_id').eq('user_id', effectiveUserId).maybeSingle(),
        supabase.from('user_providers').select('provider_id').eq('user_id', effectiveUserId).maybeSingle(),
        supabase.from('patient_drugs').select('drug_id').eq('user_id', effectiveUserId).maybeSingle(),
      ]);

      if (clinicsRes.data) setClinics(clinicsRes.data);
      if (providersRes.data) setProviders(providersRes.data);
      if (drugsRes.data) setDrugs(drugsRes.data);
      if (userClinicsRes.data) setUserClinic(userClinicsRes.data.clinic_id);
      if (userProvidersRes.data) setUserProvider(userProvidersRes.data.provider_id);
      if (userDrugRes.data?.drug_id) {
        setUserDrug(userDrugRes.data.drug_id);
      }
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

  const handleAddClinic = async (clinicId: string, isNewClinic: boolean = false) => {
    if (!effectiveUserId) return;

    try {
      await supabase
        .from('user_clinics')
        .delete()
        .eq('user_id', effectiveUserId);

      const { error } = await supabase
        .from('user_clinics')
        .insert({ user_id: effectiveUserId, clinic_id: clinicId });

      if (error) throw error;
      setUserClinic(clinicId);
      setIsNewClinicAdded(isNewClinic);

      setUserProvider(null);
      await supabase
        .from('user_providers')
        .delete()
        .eq('user_id', effectiveUserId);
    } catch (error) {
      console.error('Error adding clinic:', error);
    }
  };

  const handleRemoveClinic = async () => {
    if (!effectiveUserId || !userClinic) return;

    try {
      const { error } = await supabase
        .from('user_clinics')
        .delete()
        .eq('user_id', effectiveUserId)
        .eq('clinic_id', userClinic);

      if (error) throw error;
      setUserClinic(null);
      setIsNewClinicAdded(false);
    } catch (error) {
      console.error('Error removing clinic:', error);
    }
  };

  const handleAddProvider = async (providerId: string) => {
    if (!effectiveUserId) return;

    try {
      await supabase
        .from('user_providers')
        .delete()
        .eq('user_id', effectiveUserId);

      const { error } = await supabase
        .from('user_providers')
        .insert({ user_id: effectiveUserId, provider_id: providerId });

      if (error) throw error;
      setUserProvider(providerId);
    } catch (error) {
      console.error('Error adding provider:', error);
    }
  };

  const handleRemoveProvider = async () => {
    if (!effectiveUserId || !userProvider) return;

    try {
      const { error } = await supabase
        .from('user_providers')
        .delete()
        .eq('user_id', effectiveUserId)
        .eq('provider_id', userProvider);

      if (error) throw error;
      setUserProvider(null);
    } catch (error) {
      console.error('Error removing provider:', error);
    }
  };

  const handleCreateClinic = async () => {
    if (!effectiveUserId || !newClinicName.trim()) return;

    try {
      const { data: newClinic, error: insertError } = await supabase
        .from('clinics')
        .insert({ name: newClinicName.trim() })
        .select()
        .single();

      if (insertError) throw insertError;
      if (newClinic) {
        setClinics([...clinics, newClinic]);
        await handleAddClinic(newClinic.id, true);
        setNewClinicName('');
        setShowClinicInput(false);
      }
    } catch (error) {
      console.error('Error creating clinic:', error);
    }
  };

  const handleCreateProvider = async () => {
    if (!effectiveUserId || !newProviderName.trim()) return;

    try {
      const baseEmail = newProviderName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = baseEmail + '@gmail.com';

      const { data: newProvider, error: insertError } = await supabase
        .from('providers')
        .insert({
          name: newProviderName.trim(),
          email: email,
          password: null
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (newProvider) {
        setProviders([...providers, newProvider]);

        if (userClinic) {
          await supabase
            .from('provider_clinics')
            .insert({
              provider_id: newProvider.id,
              clinic_id: userClinic
            });
        }

        await handleAddProvider(newProvider.id);
        setNewProviderName('');
        setShowProviderInput(false);
      }
    } catch (error) {
      console.error('Error creating provider:', error);
    }
  };

  const handleAddDrug = async (drugId: string) => {
    if (!effectiveUserId) return;

    try {
      await supabase
        .from('patient_drugs')
        .delete()
        .eq('user_id', effectiveUserId);

      const selectedDrug = drugs.find(d => d.id === drugId);
      if (!selectedDrug) return;

      const { error } = await supabase
        .from('patient_drugs')
        .insert({
          user_id: effectiveUserId,
          drug_id: selectedDrug.id,
          weekly_price: selectedDrug.weekly_price,
          monthly_price: selectedDrug.monthly_price,
          yearly_price: selectedDrug.yearly_price
        });

      if (error) throw error;
      setUserDrug(drugId);
    } catch (error) {
      console.error('Error adding drug:', error);
    }
  };

  const handleRemoveDrug = async () => {
    if (!effectiveUserId || !userDrug) return;

    try {
      const { error } = await supabase
        .from('patient_drugs')
        .delete()
        .eq('user_id', effectiveUserId)
        .eq('drug_id', userDrug);

      if (error) throw error;
      setUserDrug(null);
    } catch (error) {
      console.error('Error removing drug:', error);
    }
  };

  const handleCreateDrug = async () => {
    if (!effectiveUserId || !newDrugName.trim()) return;

    try {
      const { data: newDrug, error: insertError } = await supabase
        .from('drugs')
        .insert({
          name: newDrugName.trim(),
          weekly_price: 0,
          monthly_price: 0,
          yearly_price: 0
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (newDrug) {
        setDrugs([...drugs, newDrug]);
        await handleAddDrug(newDrug.id);
        setNewDrugName('');
        setShowDrugInput(false);
      }
    } catch (error) {
      console.error('Error creating drug:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-6 h-6" style={{ color: '#531B93' }} />
                </button>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#531B93' }}>Patient Details</h1>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#009193' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            <div className="border-b border-gray-200 pb-4 sm:pb-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#009193' }} />
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: '#531B93' }}>Clinic Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Clinic:</p>
                  <div className="flex flex-wrap gap-2">
                    {userClinic && (() => {
                      const clinic = clinics.find(c => c.id === userClinic);
                      return clinic ? (
                        <span key={clinic.id} className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                          {clinic.name}
                          <button
                            type="button"
                            onClick={handleRemoveClinic}
                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {userClinic ? 'Change Clinic' : 'Select Clinic'}
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value === 'CREATE_NEW') {
                        setShowClinicInput(true);
                        e.target.value = '';
                      } else if (e.target.value) {
                        handleAddClinic(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value=""
                  >
                    <option value="">Select a clinic...</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                    ))}
                    <option value="CREATE_NEW">+ Create New Clinic</option>
                  </select>
                </div>

                {showClinicInput && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Enter new clinic name"
                      value={newClinicName}
                      onChange={(e) => setNewClinicName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateClinic}
                        className="text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                        style={{ backgroundColor: '#009193' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowClinicInput(false);
                          setNewClinicName('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex-1 sm:flex-initial"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-b border-gray-200 pb-4 sm:pb-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <UserSquare2 className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#009193' }} />
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: '#531B93' }}>Provider Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Provider:</p>
                  <div className="flex flex-wrap gap-2">
                    {userProvider && (() => {
                      const provider = providers.find(p => p.id === userProvider);
                      return provider ? (
                        <span key={provider.id} className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                          {provider.name}
                          <button
                            type="button"
                            onClick={handleRemoveProvider}
                            className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {userProvider ? 'Change Provider' : 'Select Provider'}
                  </label>
                  {isNewClinicAdded ? (
                    <button
                      type="button"
                      onClick={() => setShowProviderInput(true)}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-600 font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      Add Provider
                    </button>
                  ) : (
                    <select
                      onChange={(e) => {
                        if (e.target.value === 'CREATE_NEW') {
                          setShowProviderInput(true);
                          e.target.value = '';
                        } else if (e.target.value) {
                          handleAddProvider(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value=""
                      disabled={!userClinic}
                    >
                      <option value="">{!userClinic ? 'Select a clinic first...' : 'Select a provider...'}</option>
                      {filteredProviders.map(provider => (
                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                      ))}
                      <option value="CREATE_NEW">+ Create New Provider</option>
                    </select>
                  )}
                </div>

                {showProviderInput && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Enter new provider name"
                      value={newProviderName}
                      onChange={(e) => setNewProviderName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateProvider}
                        className="text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                        style={{ backgroundColor: '#009193' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProviderInput(false);
                          setNewProviderName('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex-1 sm:flex-initial"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <Pill className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#009193' }} />
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: '#531B93' }}>Drug Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Drug:</p>
                  <div className="flex flex-wrap gap-2">
                    {userDrug && (() => {
                      const drug = drugs.find(d => d.id === userDrug);
                      return drug ? (
                        <span key={drug.id} className="px-3 py-1.5 rounded-full text-sm flex items-center gap-2" style={{ backgroundColor: '#009193', color: 'white' }}>
                          {drug.name}
                          <button
                            type="button"
                            onClick={handleRemoveDrug}
                            className="rounded-full p-0.5 transition-colors"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {userDrug ? 'Change Drug' : 'Select Drug'}
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value === 'CREATE_NEW') {
                        setShowDrugInput(true);
                        e.target.value = '';
                      } else if (e.target.value) {
                        handleAddDrug(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value=""
                  >
                    <option value="">Select a drug...</option>
                    {drugs.map(drug => (
                      <option key={drug.id} value={drug.id}>
                        {drug.name}
                      </option>
                    ))}
                    <option value="CREATE_NEW">+ Create New Drug</option>
                  </select>
                </div>

                {showDrugInput && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Enter new drug name"
                      value={newDrugName}
                      onChange={(e) => setNewDrugName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateDrug}
                        className="text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                        style={{ backgroundColor: '#009193' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDrugInput(false);
                          setNewDrugName('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex-1 sm:flex-initial"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="w-full sm:w-auto text-white font-semibold px-6 sm:px-8 py-3 rounded-lg transition-colors"
                style={{ backgroundColor: '#009193' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
              >
                Continue to Program Enrollment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;
