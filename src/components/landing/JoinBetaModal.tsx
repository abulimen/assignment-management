import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';

interface JoinBetaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinBetaModal: React.FC<JoinBetaModalProps> = ({ isOpen, onClose }) => {
  const [role, setRole] = useState<'lecturer' | 'ta' | 'chair' | 'student'>('lecturer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [courseName, setCourseName] = useState('');
  const [assignmentType, setAssignmentType] = useState<'both' | 'individual' | 'group'>('both');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#F9F8F6] border-b border-gray-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-2 py-0.5 rounded border border-[#0047FF]/15">
              BETA ONBOARDING
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A1B]">
                You&apos;re on the early access list!
              </h3>
              <p className="text-sm text-[#1A1A1B]/70 leading-relaxed max-w-sm mx-auto font-sans">
                Thank you for bringing Draftly to <span className="font-semibold text-[#1A1A1B]">{institution || 'your course'}</span>. Our academic team will email you at <span className="font-semibold text-[#1A1A1B]">{email}</span> within 24 hours with your workspace credentials and onboarding guide.
              </p>
              <div className="pt-4">
                <button
                  onClick={handleReset}
                  className="bg-[#0047FF] hover:bg-[#0038CC] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#1A1A1B] mb-1">
                  Join the Draftly Beta
                </h3>
                <p className="text-xs text-gray-500 font-sans">
                  Free for educators during the beta. Pilot with a single assignment or an entire semester course.
                </p>
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1.5 tracking-wider">
                  Your Academic Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-medium">
                  {[
                    { id: 'lecturer', label: 'Lecturer / Prof' },
                    { id: 'ta', label: 'TA / Grader' },
                    { id: 'chair', label: 'Dept Chair' },
                    { id: 'student', label: 'Student' },
                  ].map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setRole(r.id as any)}
                      className={`p-2 rounded-md border text-center transition-all cursor-pointer font-sans ${
                        role === r.id
                          ? 'bg-[#0047FF] text-white border-[#0047FF]'
                          : 'bg-[#F9F8F6] text-gray-700 border-gray-200 hover:bg-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1 tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Eleanor Vance"
                    className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#0047FF] bg-[#F9F8F6] text-[#1A1A1B] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1 tracking-wider">
                    University Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.vance@university.edu"
                    className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#0047FF] bg-[#F9F8F6] text-[#1A1A1B] font-sans"
                  />
                </div>
              </div>

              {/* Institution & Course */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1 tracking-wider">
                    Institution / University *
                  </label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Stanford University"
                    className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#0047FF] bg-[#F9F8F6] text-[#1A1A1B] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1 tracking-wider">
                    Target Course / Dept
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="ECON 301 (65 students)"
                    className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#0047FF] bg-[#F9F8F6] text-[#1A1A1B] font-sans"
                  />
                </div>
              </div>

              {/* Assignment Mode Interest */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1 tracking-wider">
                  Primary Assignment Format
                </label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#0047FF] bg-[#F9F8F6] text-[#1A1A1B] font-sans"
                >
                  <option value="both">Both Individual & Group Assignments</option>
                  <option value="group">Group Assignments (Multi-author collaboration)</option>
                  <option value="individual">Individual Assignments (Solo thesis / essays)</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#0047FF] hover:bg-[#0038CC] text-white font-semibold text-sm py-3 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Request beta access</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-gray-400 text-center font-mono">
                No credit card required · Zero LMS migration disruption
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

