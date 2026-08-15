import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { TheProblem } from '../components/landing/TheProblem';
import { TwoModes } from '../components/landing/TwoModes';
import { HowItWorks } from '../components/landing/HowItWorks';
import { WorkHistory } from '../components/landing/WorkHistory';
import { EvidenceSection } from '../components/landing/EvidenceSection';
import { GroupContribution } from '../components/landing/GroupContribution';
import { StudentBenefit } from '../components/landing/StudentBenefit';
import { SubmissionSection } from '../components/landing/SubmissionSection';
import { BetaCTA } from '../components/landing/BetaCTA';
import { Footer } from '../components/landing/Footer';
import { EvidenceModal } from '../components/landing/EvidenceModal';
import { InfoModal } from '../components/landing/InfoModal';

// Glue for the AI Studio landing components (src/components/landing, kept
// byte-identical to the source export). The export's Join/Sign-in modals are
// mock-only; here those two callbacks route into the product's real auth
// flows instead. Everything else renders exactly as authored.
export default function Landing() {
  const navigate = useNavigate();
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [infoModalData, setInfoModalData] = useState({
    isOpen: false,
    title: '',
    content: '',
  });

  const handleOpenInfoModal = (title, content) => {
    setInfoModalData({ isOpen: true, title, content });
  };

  const handleCloseInfoModal = () => {
    setInfoModalData((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1B] font-sans antialiased flex flex-col selection:bg-[#0047FF]/15 selection:text-[#0047FF]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#0047FF] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <Navbar
        onOpenBetaModal={() => navigate('/register')}
        onOpenSignInModal={() => navigate('/login')}
      />

      {/* div, not main: the Hero artifact authors its own <main> landmark. */}
      <div id="main" className="flex-grow">
        <Hero onOpenBetaModal={() => navigate('/register')} />
        <TheProblem />
        <TwoModes />
        <HowItWorks />
        <WorkHistory />
        <EvidenceSection />
        <GroupContribution
          onOpenEvidenceModal={() => setIsEvidenceModalOpen(true)}
        />
        <StudentBenefit />
        <SubmissionSection />
        <BetaCTA onOpenBetaModal={() => navigate('/register')} />
      </div>

      <Footer
        onOpenBetaModal={() => navigate('/register')}
        onOpenSignInModal={() => navigate('/login')}
        onOpenInfoModal={handleOpenInfoModal}
      />

      <EvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
      />

      <InfoModal
        isOpen={infoModalData.isOpen}
        title={infoModalData.title}
        content={infoModalData.content}
        onClose={handleCloseInfoModal}
      />
    </div>
  );
}
