import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PatientDetails from './pages/PatientDetails';
import ProgramEnrollment from './pages/ProgramEnrollment';
import { supabase } from './lib/supabase';

type Screen = 'login' | 'patientDetails' | 'programEnrollment';

const AppContent: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      checkUserEnrollment();
    } else if (!loading && !user) {
      setCurrentScreen('login');
    }
  }, [user, loading]);

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
    return <ProgramEnrollment onLogout={handleLogout} />;
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
