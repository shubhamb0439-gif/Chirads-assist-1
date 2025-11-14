import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RefillCalendarProps {
  refillDate: string | null;
  reEnrollmentDate: string | null;
  enrollmentDate: string | null;
}

const RefillCalendar: React.FC<RefillCalendarProps> = ({ refillDate, reEnrollmentDate, enrollmentDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isEnrollmentDate = (day: number) => {
    if (!enrollmentDate) return false;
    const enrollment = new Date(enrollmentDate);
    return (
      day === enrollment.getDate() &&
      currentDate.getMonth() === enrollment.getMonth() &&
      currentDate.getFullYear() === enrollment.getFullYear()
    );
  };

  const isRefillDate = (day: number) => {
    if (!refillDate) return false;
    const refill = new Date(refillDate);
    return (
      day === refill.getDate() &&
      currentDate.getMonth() === refill.getMonth() &&
      currentDate.getFullYear() === refill.getFullYear()
    );
  };

  const isReEnrollmentDate = (day: number) => {
    if (!reEnrollmentDate) return false;
    const reEnroll = new Date(reEnrollmentDate);
    return (
      day === reEnroll.getDate() &&
      currentDate.getMonth() === reEnroll.getMonth() &&
      currentDate.getFullYear() === reEnroll.getFullYear()
    );
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square p-0.5">
          <div className="w-full h-full" />
        </div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const enrollment = isEnrollmentDate(day);
      const refill = isRefillDate(day);
      const reEnroll = isReEnrollmentDate(day);

      days.push(
        <div key={day} className="aspect-square p-0.5">
          <div
            className={`w-full h-full rounded flex flex-col items-center justify-center text-[10px] sm:text-xs font-medium transition-colors ${
              reEnroll
                ? 'bg-red-400 text-white'
                : refill
                ? 'bg-yellow-400 text-gray-900'
                : enrollment
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{day}</span>
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 w-full max-w-sm mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1 order-2 sm:order-1">
          <button
            onClick={previousMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-0.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          >
            today
          </button>
        </div>
        <div className="text-xs sm:text-sm font-bold text-gray-800 order-1 sm:order-2">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
      </div>

      <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3 mb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-blue-500" />
          <span className="text-gray-600">Enrollment</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-yellow-400" />
          <span className="text-gray-600">Refill</span>
        </div>
        {reEnrollmentDate && (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-red-400" />
            <span className="text-gray-600">Re-enroll</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-gray-600 py-0.5 sm:py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {renderCalendar()}
      </div>
    </div>
  );
};

export default RefillCalendar;
