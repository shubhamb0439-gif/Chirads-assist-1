import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Calendar } from 'lucide-react';

export interface NotificationData {
  id: string;
  type: 'program_open' | 'refill_approaching';
  title: string;
  message: string;
}

interface NotificationProps {
  notifications: NotificationData[];
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notifications, onClose }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 animate-slide-in"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {notification.type === 'program_open' ? (
                <AlertCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Calendar className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {notification.title}
                </h3>
                <p className="text-sm text-gray-600">{notification.message}</p>
              </div>
            </div>
            <button
              onClick={() => onClose(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notification;
