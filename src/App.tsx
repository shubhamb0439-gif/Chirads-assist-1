import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PatientDetails from './pages/PatientDetails';
import ProgramEnrollment from './pages/ProgramEnrollment';
import NotificationModal from './components/NotificationModal';
import RefillNotificationModal from './components/RefillNotificationModal';
import { supabase } from './lib/supabase';

type Screen = 'login' | 'patientDetails' | 'programEnrollment';

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
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refillNotifications, setRefillNotifications] = useState<RefillNotification[]>([]);
  const [showRefillNotifications, setShowRefillNotifications] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      checkUserEnrollment();
      checkNotifications();
      checkRefillNotifications();
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

  const handleCloseRefillNotifications = () => {
    setShowRefillNotifications(false);
    setRefillNotifications([]);
  };

  const handleLoginSuccess = () => {
    if (user) {
      checkUserEnrollment();
    }
  };

  const handlePatientDetailsNext = () => {
    setCurrentScreen('programEnrollment');
  };

  const handleLogout = () => {
    logout();
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

  if (currentScreen === 'patientDetails') {
    return <PatientDetails onNext={handlePatientDetailsNext} />;
  }

  if (currentScreen === 'programEnrollment') {
    return (
      <>
        <ProgramEnrollment onLogout={handleLogout} />
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
