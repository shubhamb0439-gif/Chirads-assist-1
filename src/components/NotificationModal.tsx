import React from 'react';
import { Bell, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  message: string;
  program_id: string;
  old_status: string | null;
  new_status: string;
  created_at: string;
  enrollment_link?: string;
}

interface NotificationModalProps {
  notifications: Notification[];
  onClose: () => void;
  userId: string;
  onLogout: () => void;
  onRefresh?: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notifications, onClose, userId, onLogout, onRefresh }) => {
  if (notifications.length === 0) return null;

  const calculateReEnrollmentDate = (renewalPeriod: string | null, enrolledAt: string): string | null => {
    const enrollmentDate = new Date(enrolledAt);

    if (!renewalPeriod || renewalPeriod === 'never') {
      return null;
    } else if (renewalPeriod === 'calendar years' || renewalPeriod === 'calendar year') {
      const nextYear = enrollmentDate.getFullYear() + 1;
      return `${nextYear}-01-01`;
    } else {
      const days = parseInt(renewalPeriod);
      if (!isNaN(days)) {
        const reEnrollmentDate = new Date(enrollmentDate);
        reEnrollmentDate.setDate(enrollmentDate.getDate() + days);
        return reEnrollmentDate.toISOString().split('T')[0];
      }
    }
    return null;
  };

  const handleEnrollNow = async () => {
    const notification = notifications[0];
    if (!notification || notification.new_status !== 'open') return;

    try {
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('renewal_period, enrollment_link')
        .eq('id', notification.program_id)
        .maybeSingle();

      if (programError) throw programError;

      const enrolledAt = new Date().toISOString();
      const reEnrollmentDate = calculateReEnrollmentDate(programData?.renewal_period || null, enrolledAt);

      // Check if there's an existing enrollment (for re-enrollment case)
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('program_id', notification.program_id)
        .maybeSingle();

      if (existingEnrollment) {
        // Update existing enrollment for re-enrollment
        const { error } = await supabase
          .from('enrollments')
          .update({
            status: 'enrolled',
            enrolled_at: enrolledAt,
            re_enrollment_date: reEnrollmentDate,
            completion_date: null,
            updated_at: enrolledAt,
          })
          .eq('id', existingEnrollment.id);

        if (error) throw error;
      } else {
        // Create new enrollment
        const { error } = await supabase
          .from('enrollments')
          .insert({
            user_id: userId,
            program_id: notification.program_id,
            status: 'enrolled',
            enrolled_at: enrolledAt,
            re_enrollment_date: reEnrollmentDate,
          });

        if (error) throw error;
      }

      // Check if this is a re-enrollment (existing enrollment updated) or new enrollment
      const isReEnrollment = !!existingEnrollment;

      // Open enrollment link
      const enrollmentLink = programData?.enrollment_link || 'https://portal.copays.org/#/register';
      window.open(enrollmentLink, '_blank');

      onClose();

      if (isReEnrollment && onRefresh) {
        // For re-enrollment, just refresh the page to show updated status
        setTimeout(() => {
          onRefresh();
        }, 500);
      } else {
        // For new enrollment, logout and force re-login
        setTimeout(() => {
          onLogout();
        }, 1000);
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Program Updates</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              className={`p-4 ${
                index !== notifications.length - 1 ? 'border-b border-gray-200' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                  notification.new_status === 'open' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-800 font-medium">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200">
          {notifications.length > 0 && notifications[0].new_status === 'open' ? (
            <button
              onClick={handleEnrollNow}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Enroll Now
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Got it!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
