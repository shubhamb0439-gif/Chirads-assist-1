import React, { useState, useEffect } from 'react';
import { Users, Building2, Pill, Calendar, FileText, UserSquare2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalPatients: number;
  totalClinics: number;
  totalProviders: number;
  activeDrugs: number;
  upcomingRefills: number;
  activePrograms: number;
}

interface ScribeDashboardProps {
  onManageData: () => void;
  onLogout: () => void;
}

const ScribeDashboard: React.FC<ScribeDashboardProps> = ({ onManageData, onLogout }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalClinics: 0,
    totalProviders: 0,
    activeDrugs: 0,
    upcomingRefills: 0,
    activePrograms: 0,
  });
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
          .select('id')
          .eq('user_role', 'patient'),
        supabase
          .from('clinics')
          .select('id'),
        supabase
          .from('providers')
          .select('id'),
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

          <div className="border-t border-gray-200 pt-6">
            <div className="text-center py-12">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#531B93' }}>
                  Manage Clinic Data
                </h2>
                <p className="text-gray-600">
                  Add and manage clinics, providers, patients, and drug information
                </p>
              </div>
              <button
                onClick={onManageData}
                className="inline-flex items-center gap-3 text-white font-semibold px-8 py-4 rounded-xl transition-all transform hover:scale-105"
                style={{ backgroundColor: '#009193' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
              >
                Go to Data Management
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScribeDashboard;
