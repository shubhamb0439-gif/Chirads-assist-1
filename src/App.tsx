import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ProviderDashboard from './pages/ProviderDashboard';
import ScribeDashboard from './pages/ScribeDashboard';
import ScribeInterface from './pages/ScribeInterface';
import PatientDetails from './pages/PatientDetails';
import ProgramEnrollment from './pages/ProgramEnrollment';
import NotificationModal from './components/NotificationModal';
import RefillNotificationModal from './components/RefillNotificationModal';
import { supabase } from './lib/supabase';

type Screen = 'login' | 'providerDashboard' | 'scribeDashboard' | 'scribeInterface' | 'patientDetails' | 'programEnrollment';

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
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refillNotifications, setRefillNotifications] = useState<RefillNotification[]>([]);
  const [showRefillNotifications, setShowRefillNotifications] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.user_role === 'scribe') {
        setCurrentScreen('scribeDashboard');
      } else if (user.user_role === 'provider') {
        setCurrentScreen('providerDashboard');
      } else {
        checkUserEnrollment();
        checkNotifications();
        checkRefillNotifications();
      }
    } else if (!loading && !user) {
      setCurrentScreen('login');
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

  const checkUserEnrollment = async () => {
    if (!user) return;

    setCheckingEnrollment(true);
    try {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (enrollments && enrollments.length > 0) {
        setCurrentScreen('programEnrollment');
      } else {
        setCurrentScreen('patientDetails');
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
      setCurrentScreen('patientDetails');
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const checkNotifications = async () => {
    if (!user) return;

    try {
      // First, trigger the re-enrollment date check
      await supabase.rpc('check_and_notify_re_enrollment_dates');

      // Then fetch all unread notifications
      const { data, error } = await supabase
        .from('program_notifications')
        .select('*')
        .eq('user_id', user.id)
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

  const checkRefillNotifications = async () => {
    if (!user) return;

    try {
      // Trigger the refill date check
      await supabase.rpc('check_and_notify_refill_dates');

      // Fetch all unread refill notifications with drug names
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
        .eq('user_id', user.id)
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

  const handleCloseNotifications = async () => {
    if (!user || notifications.length === 0) return;

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

  const handleRefreshEnrollment = () => {
    // Force a re-check of enrollment status
    checkUserEnrollment();
    checkNotifications();
    checkRefillNotifications();
  };

  const handleCloseRefillNotifications = async () => {
    if (!user || refillNotifications.length === 0) return;

    try {
      const notificationIds = refillNotifications.map(n => n.id);
      const { error } = await supabase
        .from('refill_notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      if (error) throw error;

      setShowRefillNotifications(false);
      setRefillNotifications([]);
    } catch (error) {
      console.error('Error marking refill notifications as read:', error);
      setShowRefillNotifications(false);
    }
  };

  const handleCompleteRefill = async (drugIds: string[]) => {
    if (!user || drugIds.length === 0) return;

    try {
      const today = new Date();
      const nextRefillDate = new Date(today);
      nextRefillDate.setDate(today.getDate() + 30);

      const { error: updateError } = await supabase
        .from('patient_drugs')
        .update({ refill_date: nextRefillDate.toISOString().split('T')[0] })
        .in('drug_id', drugIds)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const notificationIds = refillNotifications.map(n => n.id);
      const { error: markError } = await supabase
        .from('refill_notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      if (markError) throw markError;

      setShowRefillNotifications(false);
      setRefillNotifications([]);
      setToast({ message: 'Refill date updated to 30 days from today', type: 'success' });
    } catch (error) {
      console.error('Error completing refill:', error);
      setToast({ message: 'Failed to update refill date', type: 'error' });
      setShowRefillNotifications(false);
    }
  };

  const handleLoginSuccess = () => {
    if (user) {
      if (user.user_role === 'scribe') {
        setCurrentScreen('scribeDashboard');
      } else if (user.user_role === 'provider') {
        setCurrentScreen('providerDashboard');
      } else {
        checkUserEnrollment();
      }
    }
  };

  const handlePatientSelected = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentScreen('patientDetails');
  };

  const handleScribeManageData = () => {
    setCurrentScreen('scribeInterface');
  };

  const handleBackToDashboard = () => {
    setSelectedPatientId(null);
    if (user?.user_role === 'provider') {
      setCurrentScreen('providerDashboard');
    } else if (user?.user_role === 'scribe') {
      setCurrentScreen('scribeDashboard');
    }
  };

  const handleBackToScribeDashboard = () => {
    setSelectedPatientId(null);
    setCurrentScreen('scribeDashboard');
  };

  const handleScribeContinue = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentScreen('programEnrollment');
  };

  const handlePatientDetailsNext = () => {
    setCurrentScreen('programEnrollment');
  };

  const handleLogout = () => {
    logout();
    setSelectedPatientId(null);
    setCurrentScreen('login');
  };

  if (loading || checkingEnrollment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentScreen === 'scribeDashboard') {
    return <ScribeDashboard onManageData={handleScribeManageData} onLogout={handleLogout} />;
  }

  if (currentScreen === 'scribeInterface') {
    return <ScribeInterface onLogout={handleLogout} onBack={handleBackToScribeDashboard} onContinue={handleScribeContinue} />;
  }

  if (currentScreen === 'providerDashboard') {
    return <ProviderDashboard onPatientSelect={handlePatientSelected} onLogout={handleLogout} />;
  }

  if (currentScreen === 'patientDetails') {
    const isProvider = user?.user_role === 'provider';
    return (
      <PatientDetails
        onNext={handlePatientDetailsNext}
        onBack={isProvider ? handleBackToDashboard : undefined}
        onLogout={isProvider ? handleLogout : undefined}
        selectedPatientId={selectedPatientId}
      />
    );
  }

  if (currentScreen === 'programEnrollment') {
    return (
      <>
        <ProgramEnrollment onLogout={handleLogout} selectedPatientId={selectedPatientId} />
        {showNotifications && user && (
          <NotificationModal
            notifications={notifications}
            onClose={handleCloseNotifications}
            userId={user.id}
            onLogout={handleLogout}
            onRefresh={handleRefreshEnrollment}
          />
        )}
        {showRefillNotifications && (
          <RefillNotificationModal
            notifications={refillNotifications}
            onClose={handleCloseRefillNotifications}
            onComplete={handleCompleteRefill}
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
