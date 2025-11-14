import React from 'react';
import { Pill, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RefillNotification {
  id: string;
  drug_id: string;
  refill_date: string;
  days_remaining: number;
  drug_name?: string;
  created_at: string;
}

interface RefillNotificationModalProps {
  notifications: RefillNotification[];
  onClose: () => void;
  onComplete: (drugIds: string[]) => void;
}

const RefillNotificationModal: React.FC<RefillNotificationModalProps> = ({
  notifications,
  onClose,
  onComplete
}) => {
  if (notifications.length === 0) return null;

  const getDaysText = (days: number) => {
    if (days === 0) return 'TODAY';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const handleGotIt = async () => {
    try {
      const notificationIds = notifications.map(n => n.id);
      const { error } = await supabase
        .from('refill_notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      if (error) throw error;

      onClose();
    } catch (error) {
      console.error('Error marking refill notifications as read:', error);
      onClose();
    }
  };

  const handleComplete = async () => {
    const drugIds = notifications.map(n => n.drug_id);
    onComplete(drugIds);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[85vh] sm:max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
            <h2 className="text-base sm:text-xl font-bold text-white">Refill Reminders</h2>
          </div>
          <button
            onClick={handleGotIt}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-140px)] sm:max-h-[calc(80vh-140px)]">
          {notifications.map((notification, index) => {
            const daysRemaining = notification.days_remaining;
            const isUrgent = daysRemaining <= 2;

            return (
              <div
                key={notification.id}
                className={`p-3 sm:p-4 ${
                  index !== notifications.length - 1 ? 'border-b border-gray-200' : ''
                } ${isUrgent ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className={`flex-shrink-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mt-1 ${
                    isUrgent ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-800 font-semibold break-words">
                      {notification.drug_name || 'Medication'} Refill Due
                    </p>
                    <p className="text-sm sm:text-base text-gray-900 font-bold mt-1">
                      {daysRemaining === 0 ? (
                        <span className="text-red-600">Refill Due TODAY!</span>
                      ) : (
                        <>
                          <span className={isUrgent ? 'text-red-600' : 'text-orange-600'}>
                            {getDaysText(daysRemaining)}
                          </span>
                          {' '}until refill
                        </>
                      )}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      Refill Date: {new Date(notification.refill_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 space-y-2">
          <button
            onClick={handleComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 sm:py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
          >
            Completed
          </button>
          <button
            onClick={handleGotIt}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 sm:py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefillNotificationModal;
