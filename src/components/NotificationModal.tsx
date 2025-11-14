import React from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationModalProps {
  notifications: Array<{
    id: string;
    message: string;
    program_id: string;
    old_status: string | null;
    new_status: string;
    created_at: string;
    enrollment_link?: string;
  }>;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notifications, onClose }) => {
  if (notifications.length === 0) return null;

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
          {notifications.length > 0 && notifications[0].new_status === 'open' && notifications[0].enrollment_link ? (
            <a
              href={notifications[0].enrollment_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
            >
              Enroll Now
            </a>
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
