import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleSelection from './pages/RoleSelection';
import Login from './pages/Login';
import ClinicProviderSelection from './pages/ClinicProviderSelection';
import PatientSelection from './pages/PatientSelection';
import ProgramEnrollment from './pages/ProgramEnrollment';
import NotificationModal from './components/NotificationModal';
import RefillNotificationModal from './components/RefillNotificationModal';
import { supabase } from './lib/supabase';

type Screen = 'roleSelection' | 'login' | 'clinicProviderSelection' | 'patientSelection' | 'programEnrollment';

interface Notification {
  id: string;
  message: string;
  program_id: string;
  old_status: string | null;
  new_status: string;
  created_at: string;
  enrollment_link?: string;
}

interface RefillNotification {
  id: string;
  drug_id: string;
  refill_date: string;
  days_remaining: number;
  drug_name?: string;
  created_at: string;
}

const AppContent: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('roleSelection');
  const [selectedRole, setSelectedRole] = useState<'patient' | 'provider' | 'scribe' | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refillNotifications, setRefillNotifications] = useState<RefillNotification[]>([]);
  const [showRefillNotifications, setShowRefillNotifications] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setCurrentScreen('roleSelection');
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;

    const programChannel = supabase
      .channel('program_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'program_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setShowNotifications(true);
        }
      )
      .subscribe();

    const refillChannel = supabase
      .channel('refill_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'refill_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newRefillNotification = payload.new as any;

          const { data: drugData } = await supabase
            .from('drugs')
            .select('name')
            .eq('id', newRefillNotification.drug_id)
            .maybeSingle();

          const formattedNotification: RefillNotification = {
            id: newRefillNotification.id,
            drug_id: newRefillNotification.drug_id,
            refill_date: newRefillNotification.refill_date,
            days_remaining: newRefillNotification.days_remaining,
            created_at: newRefillNotification.created_at,
            drug_name: drugData?.name
          };

          setRefillNotifications((prev) => [formattedNotification, ...prev]);
          setShowRefillNotifications(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(programChannel);
      supabase.removeChannel(refillChannel);
    };
  }, [user]);

  const checkNotifications = async (userId: string) => {
    try {
      await supabase.rpc('check_and_notify_re_enrollment_dates');

      const { data, error } = await supabase
        .from('program_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setNotifications(data);
        setShowNotifications(true);
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const checkRefillNotifications = async (userId: string) => {
    try {
      await supabase.rpc('check_and_notify_refill_dates');

      const { data, error } = await supabase
        .from('refill_notifications')
        .select(`
          id,
          drug_id,
          refill_date,
          days_remaining,
          created_at,
          drugs(name)
        `)
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('days_remaining', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedData = data.map(item => ({
          id: item.id,
          drug_id: item.drug_id,
          refill_date: item.refill_date,
          days_remaining: item.days_remaining,
          created_at: item.created_at,
          drug_name: (item.drugs as any)?.name
        }));
        setRefillNotifications(formattedData);
        setShowRefillNotifications(true);
      }
    } catch (error) {
      console.error('Error checking refill notifications:', error);
    }
  };

  const handleRoleSelection = (role: 'patient' | 'provider' | 'scribe') => {
    setSelectedRole(role);
    setCurrentScreen('login');
  };

  const handleLoginSuccess = () => {
    if (!user || !selectedRole) return;

    if (selectedRole === 'provider') {
      setCurrentScreen('patientSelection');
    } else {
      setCurrentScreen('clinicProviderSelection');
    }
  };

  const handleClinicProviderComplete = (clinicId: string, providerId: string) => {
    setSelectedClinic(clinicId);
    setSelectedProvider(providerId);

    const userId = selectedPatient || user?.id;
    if (userId) {
      checkNotifications(userId);
      checkRefillNotifications(userId);
    }

    setCurrentScreen('programEnrollment');
  };

  const handlePatientSelection = (patientId: string) => {
    setSelectedPatient(patientId);
    setCurrentScreen('clinicProviderSelection');
  };

  const handleCloseNotifications = async () => {
    if (notifications.length === 0) return;

    try {
      const notificationIds = notifications.map(n => n.id);
      const { error } = await supabase
        .from('program_notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      if (error) throw error;

      setShowNotifications(false);
      setNotifications([]);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      setShowNotifications(false);
    }
  };

  const handleCloseRefillNotifications = () => {
    setShowRefillNotifications(false);
    setRefillNotifications([]);
  };

  const handleRefreshEnrollment = () => {
    const userId = selectedPatient || user?.id;
    if (userId) {
      checkNotifications(userId);
      checkRefillNotifications(userId);
    }
  };

  const handleLogout = () => {
    logout();
    setSelectedRole(null);
    setSelectedClinic(null);
    setSelectedProvider(null);
    setSelectedPatient(null);
    setCurrentScreen('roleSelection');
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setCurrentScreen('roleSelection');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    if (currentScreen === 'roleSelection') {
      return <RoleSelection onSelectRole={handleRoleSelection} />;
    }

    if (currentScreen === 'login' && selectedRole) {
      return (
        <Login
          role={selectedRole}
          onLoginSuccess={handleLoginSuccess}
          onBack={handleBackToRoleSelection}
        />
      );
    }
  }

  if (user && selectedRole === 'provider' && currentScreen === 'patientSelection') {
    return (
      <PatientSelection
        providerId={user.id}
        onSelectPatient={handlePatientSelection}
      />
    );
  }

  if (user && currentScreen === 'clinicProviderSelection') {
    return (
      <ClinicProviderSelection
        userId={selectedPatient || user.id}
        userRole={selectedRole || 'patient'}
        onComplete={handleClinicProviderComplete}
      />
    );
  }

  if (user && currentScreen === 'programEnrollment') {
    return (
      <>
        <ProgramEnrollment onLogout={handleLogout} />
        {showNotifications && user && (
          <NotificationModal
            notifications={notifications}
            onClose={handleCloseNotifications}
            userId={selectedPatient || user.id}
            onLogout={handleLogout}
            onRefresh={handleRefreshEnrollment}
          />
        )}
        {showRefillNotifications && (
          <RefillNotificationModal
            notifications={refillNotifications}
            onClose={handleCloseRefillNotifications}
          />
        )}
      </>
    );
  }

  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
