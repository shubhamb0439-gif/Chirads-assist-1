import React, { useState, useEffect } from 'react';
import { Users, Building2, Pill, Calendar, FileText, TrendingUp, UserSquare2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, User as DBUser, Clinic, Provider } from '../lib/supabase';

interface DashboardStats {
  totalPatients: number;
  totalClinics: number;
  totalProviders: number;
  activeDrugs: number;
  upcomingRefills: number;
  activePrograms: number;
}

interface ScribeDashboardProps {
  onPatientSelect: (patientId: string) => void;
  onLogout: () => void;
}

const ScribeDashboard: React.FC<ScribeDashboardProps> = ({ onPatientSelect, onLogout }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalClinics: 0,
    totalProviders: 0,
    activeDrugs: 0,
    upcomingRefills: 0,
    activePrograms: 0,
  });
  const [patients, setPatients] = useState<DBUser[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        patientsRes,
        clinicsRes,
        providersRes,
        drugsRes,
        refillsRes,
        programsRes,
      ] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('user_role', 'patient')
          .order('email'),
        supabase
          .from('clinics')
          .select('*')
          .order('name'),
        supabase
          .from('providers')
          .select('*')
          .order('name'),
        supabase
          .from('patient_drugs')
          .select('drug_id'),
        supabase
          .from('patient_drugs')
          .select('refill_date')
          .gte('refill_date', new Date().toISOString().split('T')[0])
          .lte('refill_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        supabase
          .from('enrollments')
          .select('program_id'),
      ]);

      setPatients(patientsRes.data || []);
      setClinics(clinicsRes.data || []);
      setProviders(providersRes.data || []);

      const uniqueDrugs = new Set(drugsRes.data?.map(d => d.drug_id) || []);
      const uniquePrograms = new Set(programsRes.data?.map(p => p.program_id) || []);

      setStats({
        totalPatients: patientsRes.data?.length || 0,
        totalClinics: clinicsRes.data?.length || 0,
        totalProviders: providersRes.data?.length || 0,
        activeDrugs: uniqueDrugs.size,
        upcomingRefills: refillsRes.data?.length || 0,
        activePrograms: uniquePrograms.size,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      icon: Users,
      label: 'Total Patients',
      value: stats.totalPatients,
      color: '#009193',
      bgColor: 'bg-teal-50',
    },
    {
      icon: Building2,
      label: 'Total Clinics',
      value: stats.totalClinics,
      color: '#531B93',
      bgColor: 'bg-purple-50',
    },
    {
      icon: UserSquare2,
      label: 'Total Providers',
      value: stats.totalProviders,
      color: '#009193',
      bgColor: 'bg-teal-50',
    },
    {
      icon: Pill,
      label: 'Active Drugs',
      value: stats.activeDrugs,
      color: '#FF6B6B',
      bgColor: 'bg-red-50',
    },
    {
      icon: Calendar,
      label: 'Upcoming Refills',
      value: stats.upcomingRefills,
      color: '#531B93',
      bgColor: 'bg-purple-50',
    },
    {
      icon: FileText,
      label: 'Active Programs',
      value: stats.activePrograms,
      color: '#FFA500',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#531B93' }}>
              Scribe Dashboard
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className={`${card.bgColor} rounded-xl p-6 transition-transform hover:scale-105 cursor-pointer border-2 border-transparent hover:border-gray-200`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                      <p className="text-3xl font-bold" style={{ color: card.color }}>
                        {card.value}
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-full"
                      style={{ backgroundColor: card.color + '20' }}
                    >
                      <Icon className="w-8 h-8" style={{ color: card.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-6 h-6" style={{ color: '#009193' }} />
                <h2 className="text-xl font-semibold" style={{ color: '#531B93' }}>
                  Clinics Overview
                </h2>
              </div>
              {clinics.length === 0 ? (
                <p className="text-gray-500">No clinics available.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {clinics.map((clinic) => (
                    <div
                      key={clinic.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-800">{clinic.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <UserSquare2 className="w-6 h-6" style={{ color: '#009193' }} />
                <h2 className="text-xl font-semibold" style={{ color: '#531B93' }}>
                  Providers Overview
                </h2>
              </div>
              {providers.length === 0 ? (
                <p className="text-gray-500">No providers available.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium text-gray-800">{provider.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6" style={{ color: '#009193' }} />
              <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: '#531B93' }}>
                All Patients
              </h2>
            </div>

            {patients.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-lg">No patients in the system yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => onPatientSelect(patient.id)}
                    className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">
                          {patient.email}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Joined: {new Date(patient.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div
                        className="p-2 rounded-full bg-gray-100 group-hover:bg-blue-100 transition-colors"
                      >
                        <Users className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScribeDashboard;
