import React from 'react';
import { User, Stethoscope, FileText } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: 'patient' | 'provider' | 'scribe') => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Welcome to Drug Assist
          </h1>
          <p className="text-gray-600 text-lg">
            Please select your role to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => onSelectRole('patient')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-200 hover:scale-105 flex flex-col items-center gap-4 group"
          >
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient</h2>
              <p className="text-gray-600 text-sm">
                Access your programs and manage your medications
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectRole('provider')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-200 hover:scale-105 flex flex-col items-center gap-4 group"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <Stethoscope className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Provider</h2>
              <p className="text-gray-600 text-sm">
                Manage programs for your assigned patients
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectRole('scribe')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-200 hover:scale-105 flex flex-col items-center gap-4 group"
          >
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <FileText className="w-10 h-10 text-purple-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Scribe</h2>
              <p className="text-gray-600 text-sm">
                Full access to manage all patients and programs
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
