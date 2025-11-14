import React, { useState, useEffect } from 'react';
import { Heart, CheckCircle2, XCircle, Clock, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, Program, Enrollment } from '../lib/supabase';
import RefillCalendar from '../components/RefillCalendar';
import Toast from '../components/Toast';

interface PatientDrug {
  drug_id: string;
  refill_date: string | null;
  weekly_price: number;
  monthly_price: number;
  yearly_price: number;
}

interface ProgramEnrollmentProps {
  onLogout: () => void;
}

const ProgramEnrollment: React.FC<ProgramEnrollmentProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [patientDrug, setPatientDrug] = useState<PatientDrug | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [enrollNow, setEnrollNow] = useState(false);
  const [completedCheck, setCompletedCheck] = useState(false);
  const [statusSelection, setStatusSelection] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [completionDate, setCompletionDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const patientProgramsRes = await supabase
        .from('patient_programs')
        .select('program_id')
        .eq('user_id', user.id);

      const allowedProgramIds = patientProgramsRes.data?.map(pp => pp.program_id) || [];

      let programsQuery = supabase.from('programs').select('*').order('name');

      if (allowedProgramIds.length > 0) {
        programsQuery = programsQuery.in('id', allowedProgramIds);
      } else {
        programsQuery = programsQuery.limit(0);
      }

      const [programsRes, enrollmentsRes, patientDrugRes] = await Promise.all([
        programsQuery,
        supabase.from('enrollments').select('*').eq('user_id', user.id),
        supabase.from('patient_drugs').select('drug_id, refill_date, weekly_price, monthly_price, yearly_price').eq('user_id', user.id).maybeSingle(),
      ]);

      if (programsRes.data) setPrograms(programsRes.data);
      if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data);
      if (patientDrugRes.data) setPatientDrug(patientDrugRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgramSelect = (programId: string) => {
    setSelectedProgramId(selectedProgramId === programId ? null : programId);
    setEnrollNow(false);
    setCompletedCheck(false);
    setStatusSelection('');
    setShowDatePicker(false);
    setCompletionDate('');
  };

  const calculateReEnrollmentDate = (renewalPeriod: string, enrolledAt: string): string | null => {
    const enrollmentDate = new Date(enrolledAt);

    if (renewalPeriod === 'never') {
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

  const handleEnrollNow = async (program: Program) => {
    if (!user) return;

    try {
      const enrolledAt = new Date().toISOString();
      const reEnrollmentDate = calculateReEnrollmentDate(program.renewal_period, enrolledAt);

      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          program_id: program.id,
          status: 'enrolled',
          enrolled_at: enrolledAt,
          re_enrollment_date: reEnrollmentDate,
        });

      if (error) throw error;

      window.open('https://portal.copays.org/#/register', '_blank');

      await loadData();

      setTimeout(() => {
        onLogout();
      }, 1000);
    } catch (error) {
      console.error('Error enrolling:', error);
    }
  };

  const handleStatusChange = async (program: Program, status: string) => {
    if (!user) return;

    const enrollment = enrollments.find(e => e.program_id === program.id);
    if (!enrollment) return;

    if (status === 'completed') {
      setStatusSelection(status);
      setShowDatePicker(true);
      return;
    }

    try {
      const updateData = status === 'rejected'
        ? { status: null, updated_at: new Date().toISOString() }
        : { status, updated_at: new Date().toISOString() };

      const { error } = await supabase
        .from('enrollments')
        .update(updateData)
        .eq('id', enrollment.id);

      if (error) throw error;

      await loadData();
      setStatusSelection('');
      setToastMessage(`Program status updated to ${status === 'rejected' ? 'rejected' : status}`);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCompletionSubmit = async (program: Program) => {
    if (!user || !completionDate) return;

    const enrollment = enrollments.find(e => e.program_id === program.id);
    if (!enrollment) return;

    try {
      const reEnrollmentDate = calculateReEnrollmentDate(program.renewal_period, completionDate);

      const { error } = await supabase
        .from('enrollments')
        .update({
          status: 'completed',
          completion_date: completionDate,
          re_enrollment_date: reEnrollmentDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);

      if (error) throw error;

      await loadData();
      setShowDatePicker(false);
      setCompletionDate('');
      setStatusSelection('');
      setToastMessage('Program marked as completed successfully');
    } catch (error) {
      console.error('Error updating completion:', error);
    }
  };

  const getEnrollmentForProgram = (programId: string) => {
    return enrollments.find(e => e.program_id === programId);
  };

  const calculatePotentialSaving = (program: Program): number => {
    if (program.monetary_cap.toLowerCase() === 'free') {
      return patientDrug?.yearly_price || 0;
    }
    const monetaryCapStr = program.monetary_cap.replace(/[^0-9.]/g, '');
    return parseFloat(monetaryCapStr) || 0;
  };

  const calculateOutOfPocketCost = (program: Program): number => {
    if (!patientDrug) return 0;
    const potentialSaving = calculatePotentialSaving(program);
    const totalDrugCost = patientDrug.yearly_price;
    const outOfPocket = totalDrugCost - potentialSaving;
    return outOfPocket > 0 ? outOfPocket : 0;
  };

  const renderProgramDetails = (program: Program) => {
    const enrollment = getEnrollmentForProgram(program.id);
    const isProgramOpen = program.program_status === 'open';

    const getDummyRefillDate = () => {
      if (patientDrug?.refill_date) return patientDrug.refill_date;
      const today = new Date();
      const daysToAdd = 15;
      const refillDate = new Date(today);
      refillDate.setDate(today.getDate() + daysToAdd);
      return refillDate.toISOString().split('T')[0];
    };

    return (
      <div className="border-t border-gray-200 mt-3 pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 mt-1 flex-shrink-0" style={{ color: '#009193' }} />
            <div className="flex-1 min-w-0">
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row">
                  <span className="font-medium text-gray-700 sm:w-32 mb-1 sm:mb-0">Monetary Cap:</span>
                  <span className="text-gray-600">{program.monetary_cap}</span>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <span className="font-medium text-gray-700 sm:w-32 mb-1 sm:mb-0">Description:</span>
                  <span className="text-gray-600 break-words">{program.description}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 self-start">
            <div
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm text-white whitespace-nowrap ${
                program.program_status === 'open'
                  ? 'bg-green-500'
                  : program.program_status === 'waitlisted'
                  ? 'bg-yellow-500'
                  : program.program_status === 'closed'
                  ? 'bg-red-500'
                  : program.program_status === 'identified'
                  ? 'bg-blue-500'
                  : 'bg-gray-500'
              }`}
            >
              {program.program_status.charAt(0).toUpperCase() + program.program_status.slice(1)}
            </div>
          </div>
        </div>

        {!enrollment && isProgramOpen && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`enrollNow-${program.id}`}
                checked={enrollNow}
                onChange={(e) => setEnrollNow(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`enrollNow-${program.id}`} className="text-sm font-medium text-gray-700">
                Enroll Now
              </label>
            </div>

            {enrollNow && (
              <button
                onClick={() => handleEnrollNow(program)}
                className="w-full text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-colors text-sm sm:text-base"
                style={{ backgroundColor: '#009193' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007b7d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009193'}
              >
                Proceed to Enrollment
              </button>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`ongoingCheck-${program.id}`}
                checked={statusSelection === 'ongoing'}
                onChange={async (e) => {
                  if (e.target.checked) {
                    try {
                      const enrolledAt = new Date().toISOString();
                      const reEnrollmentDate = calculateReEnrollmentDate(program.renewal_period, enrolledAt);

                      const { error } = await supabase
                        .from('enrollments')
                        .insert({
                          user_id: user.id,
                          program_id: program.id,
                          status: 'ongoing',
                          enrolled_at: enrolledAt,
                          re_enrollment_date: reEnrollmentDate,
                        });
                      if (error) throw error;
                      await loadData();
                      setToastMessage('Program marked as ongoing successfully');
                    } catch (error) {
                      console.error('Error marking as ongoing:', error);
                    }
                  }
                }}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`ongoingCheck-${program.id}`} className="text-sm font-medium text-gray-700">
                Ongoing
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`completedCheck-${program.id}`}
                checked={completedCheck}
                onChange={(e) => {
                  setCompletedCheck(e.target.checked);
                  if (e.target.checked) {
                    setShowDatePicker(true);
                  } else {
                    setShowDatePicker(false);
                    setCompletionDate('');
                  }
                }}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`completedCheck-${program.id}`} className="text-sm font-medium text-gray-700">
                Completed
              </label>
            </div>

            {showDatePicker && completedCheck && (
              <div className="border border-gray-300 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Completion Date
                  </label>
                </div>
                <input
                  type="date"
                  value={completionDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={async () => {
                    if (!user || !completionDate) return;
                    try {
                      const reEnrollmentDate = calculateReEnrollmentDate(program.renewal_period, completionDate);

                      const { error } = await supabase
                        .from('enrollments')
                        .insert({
                          user_id: user.id,
                          program_id: program.id,
                          status: 'completed',
                          completion_date: completionDate,
                          enrolled_at: completionDate,
                          re_enrollment_date: reEnrollmentDate,
                        });
                      if (error) throw error;
                      await loadData();
                      setShowDatePicker(false);
                      setCompletionDate('');
                      setCompletedCheck(false);
                      setToastMessage('Program marked as completed successfully');
                    } catch (error) {
                      console.error('Error marking as completed:', error);
                    }
                  }}
                  disabled={!completionDate}
                  className="w-full text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  style={{ backgroundColor: '#531B93' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#421680'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#531B93'}
                >
                  Submit
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`rejectedCheck-${program.id}`}
                checked={statusSelection === 'rejected'}
                onChange={async (e) => {
                  if (e.target.checked) {
                    try {
                      const { error } = await supabase
                        .from('enrollments')
                        .insert({
                          user_id: user.id,
                          program_id: program.id,
                          status: null,
                        });
                      if (error) throw error;
                      await loadData();
                      setToastMessage('Program marked as rejected');
                    } catch (error) {
                      console.error('Error marking as rejected:', error);
                    }
                  }
                }}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`rejectedCheck-${program.id}`} className="text-sm font-medium text-gray-700">
                Rejected
              </label>
            </div>
          </div>
        )}

        {enrollment && (
          <div className="mt-6 space-y-4">
            {enrollment.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">
                  You are enrolled in this program
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Status: <span className="capitalize">Completed</span>
                </p>
                {enrollment.completion_date && (
                  <p className="text-green-700 text-sm mt-1">
                    Completion Date: {new Date(enrollment.completion_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {enrollment.status === 'completed' && patientDrug && (
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-green-500 rounded-lg p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800">Cost Summary</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <div className="flex flex-col gap-1 p-3 sm:p-4 bg-gray-50 rounded-lg">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">Total Drug Cost (Yearly)</span>
                          <span className="text-lg sm:text-xl font-bold text-gray-900">
                            ${patientDrug.yearly_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 p-3 sm:p-4 bg-green-50 rounded-lg">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">Potential Saving</span>
                          <span className="text-lg sm:text-xl font-bold text-green-600">
                            ${calculatePotentialSaving(program).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 p-3 sm:p-4 bg-blue-50 rounded-lg border-2 border-blue-500 sm:col-span-2 lg:col-span-1">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700">Out of Pocket Cost</span>
                          <span className="text-lg sm:text-xl font-bold text-blue-600">
                            ${calculateOutOfPocketCost(program).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#009193' }} />
                        Refill Schedule
                      </h4>
                      <RefillCalendar
                        refillDate={getDummyRefillDate()}
                        reEnrollmentDate={enrollment.re_enrollment_date}
                        enrollmentDate={enrollment.enrolled_at}
                      />
                    </div>
                  </div>
            )}

            {enrollment.status === null && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  This program is marked as rejected and cannot be changed.
                </p>
              </div>
            )}

            {(enrollment.status === 'ongoing' || enrollment.status === 'enrolled') && isProgramOpen && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Update your enrollment status</p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleStatusChange(program, 'ongoing')}
                    className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700 text-sm sm:text-base">Ongoing</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange(program, 'completed')}
                    className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700 text-sm sm:text-base">Completed</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange(program, 'rejected')}
                    className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700 text-sm sm:text-base">Rejected</span>
                  </button>
                </div>
              </div>
            )}

            {showDatePicker && isProgramOpen && (
              <div className="border border-gray-300 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Completion Date
                  </label>
                </div>
                <input
                  type="date"
                  value={completionDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleCompletionSubmit(program)}
                  disabled={!completionDate}
                  className="w-full text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#531B93' }}
                  onMouseEnter={(e) => !completionDate ? null : e.currentTarget.style.backgroundColor = '#421680'}
                  onMouseLeave={(e) => !completionDate ? null : e.currentTarget.style.backgroundColor = '#531B93'}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        )}

        {!isProgramOpen && !enrollment && (
          <div className="rounded-lg p-4 bg-blue-50 border border-blue-200">
            <p className="text-sm font-medium text-blue-800">
              Update your enrollment status
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#531B93' }}>Program Enrollment</h1>
            <button
              onClick={onLogout}
              className="text-sm font-medium"
              style={{ color: '#009193' }}
            >
              Logout
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Your Programs</h2>
              <div className="space-y-3">
                {programs.map(program => (
                  <div key={program.id} className="border-2 border-gray-200 rounded-lg">
                    <button
                      onClick={() => handleProgramSelect(program.id)}
                      className={`w-full text-left px-4 sm:px-6 py-3 sm:py-4 rounded-lg transition-all ${
                        selectedProgramId === program.id
                          ? 'bg-blue-50'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-base sm:text-lg" style={{ color: '#531B93' }}>
                        {program.name}
                      </div>
                    </button>
                    {selectedProgramId === program.id && (
                      <div className="px-4 sm:px-6 pb-4">
                        {renderProgramDetails(program)}
                      </div>
                    )}
                  </div>
                ))}
                {programs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No programs available. Please contact your administrator.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default ProgramEnrollment;
