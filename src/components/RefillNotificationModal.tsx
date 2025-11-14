import React from 'react';
import { Pill, X } from 'lucide-react';

interface RefillNotification {
  id: string;
  drug_id: string;
  drug_name?: string;
  refill_date: string;
  days_remaining: number;
  is_read: boolean;
  created_at: string;
}

interface RefillNotificationModalProps {
  notification: RefillNotification;
  onClose: () => void;
}

const RefillNotificationModal: React.FC<RefillNotificationModalProps> = ({ notification, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining === 0) return 'from-red-500 to-red-600';
    if (daysRemaining <= 2) return 'from-orange-500 to-orange-600';
    return 'from-blue-500 to-blue-600';
  };

  const getUrgencyMessage = (daysRemaining: number) => {
    if (daysRemaining === 0) return 'Your refill is due today!';
    if (daysRemaining === 1) return 'Your refill is due tomorrow!';
    return `Your refill is due in ${daysRemaining} days`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
        <div className={`bg-gradient-to-r ${getUrgencyColor(notification.days_remaining)} p-3 sm:p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
            <h2 className="text-base sm:text-xl font-bold text-white">Refill Reminder</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-4 ${
              notification.days_remaining === 0
                ? 'bg-red-100'
                : notification.days_remaining <= 2
                ? 'bg-orange-100'
                : 'bg-blue-100'
            }`}>
              <span className={`text-3xl sm:text-4xl font-bold ${
                notification.days_remaining === 0
                  ? 'text-red-600'
                  : notification.days_remaining <= 2
                  ? 'text-orange-600'
                  : 'text-blue-600'
              }`}>
                {notification.days_remaining}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
              {getUrgencyMessage(notification.days_remaining)}
            </h3>
            {notification.drug_name && (
              <p className="text-sm sm:text-base text-gray-600">
                Medication: <span className="font-semibold">{notification.drug_name}</span>
              </p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Refill Date:</span>
              <span className="text-sm font-semibold text-gray-800">
                {formatDate(notification.refill_date)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-gray-600 text-center">
              {notification.days_remaining === 0
                ? "Don't forget to refill your medication today."
                : `Please plan to refill your medication soon to avoid running out.`
              }
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className={`w-full bg-gradient-to-r ${getUrgencyColor(notification.days_remaining)} hover:opacity-90 text-white font-semibold py-2.5 sm:py-2 px-4 rounded-lg transition-opacity text-sm sm:text-base`}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefillNotificationModal;
