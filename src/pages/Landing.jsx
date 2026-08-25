import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { TheProblem } from '../components/landing/TheProblem';
import { TwoModes } from '../components/landing/TwoModes';
import { WorkspaceShowcase } from '../components/landing/WorkspaceShowcase';
import { SubmissionSection } from '../components/landing/SubmissionSection';
import { WhoBenefits } from '../components/landing/WhoBenefits';
import { BetaCTA } from '../components/landing/BetaCTA';
import { Footer } from '../components/landing/Footer';
import { EvidenceModal } from '../components/landing/EvidenceModal';
import { InfoModal } from '../components/landing/InfoModal';
import { useParallax, useScrollReveal } from '../hooks/useParallax';
import { useSeo } from '../utils/seo';

/** Scroll-reveal wrapper: fades + slides children into view on intersection. */
function RevealSection({ children, className = '' }) {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className={`scroll-reveal ${className}`}>
      {children}
    </div>
  );
}

export default function Landing() {
  useSeo({
    title: 'Draftly — See the work behind the submission',
    description: 'Draftly gives students a workspace to complete assignments individually or together, and preserves how the work develops from first draft to final submission. Free for early lecturers during the beta.',
    canonical: '/',
  });
  const navigate = useNavigate();
  const scrollY = useParallax();
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

      <main id="main" className="flex-grow">
        {/* Section 1: Hero (parallax-driven) */}
        <Hero onOpenBetaModal={() => navigate('/register')} scrollY={scrollY} />

        {/* Section 2: The Problem / Workflow Difference */}
        <RevealSection>
          <TheProblem />
        </RevealSection>

        {/* Section 3: Individual + Group Assignments */}
        <RevealSection>
          <TwoModes />
        </RevealSection>

        {/* Section 4: The Draftly Workspace Experience */}
        <RevealSection>
          <WorkspaceShowcase />
        </RevealSection>

        {/* Section 5: What Happens When They Submit */}
        <RevealSection>
          <SubmissionSection
            onOpenEvidenceModal={() => setIsEvidenceModalOpen(true)}
          />
        </RevealSection>

        {/* Section 6: Who Benefits */}
        <RevealSection>
          <WhoBenefits />
        </RevealSection>

        {/* Section 7: Beta CTA */}
        <RevealSection>
          <BetaCTA onOpenBetaModal={() => navigate('/register')} />
        </RevealSection>
      </main>

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
