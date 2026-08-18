import React from 'react';
import { LegalLayout } from '../components/legal/LegalLayout';
import { 
  Cookie, 
  CheckCircle2, 
  ShieldCheck, 
  Sliders, 
  HardDrive, 
  Lock, 
  Sparkles,
  Info
} from 'lucide-react';

export default function CookiePolicy() {
  const toc = [
    { id: 'overview', title: '1. What Are Cookies & Local Storage' },
    { id: 'why-we-use', title: '2. Why Draftly Uses Storage Technologies' },
    { id: 'cookie-inventory', title: '3. Detailed Inventory of Cookies Used' },
    { id: 'offline-persistence', title: '4. Offline Draft Caching & IndexedDB' },
    { id: 'no-ad-tracking', title: '5. Zero Third-Party Advertising Cookies' },
    { id: 'managing-cookies', title: '6. Managing Your Cookie Preferences' },
    { id: 'updates-contact', title: '7. Policy Updates & Inquiries' },
  ];

  return (
    <LegalLayout
      title="Cookie & Storage Policy"
      subtitle="Complete transparency on the session tokens, local storage mechanisms, and caching technologies used to power Draftly's assignment workspace."
      lastUpdated="August 16, 2026"
      badgeText="Transparent & Privacy-First"
      toc={toc}
    >
      {/* Intro Summary Callout */}
      <div className="not-prose bg-[#0047FF]/5 border border-[#0047FF]/20 rounded-xl p-4 sm:p-5 mb-8 text-sm">
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-[#0047FF] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-[#1A1A1B]">Our Commitment to Clean Storage</h3>
            <p className="text-[#1A1A1B]/75 leading-relaxed text-xs sm:text-sm">
              Draftly uses storage technologies strictly for <strong>functional and security purposes</strong>: keeping you signed in, preventing loss of student work during internet drops, and authenticating real-time collaborative editing. We <strong>do not</strong> use third-party advertising cookies or cross-site tracking pixels.
            </p>
          </div>
        </div>
      </div>

      {/* 1. What Are Cookies & Local Storage */}
      <section id="overview" className="scroll-mt-28">
        <h2>1. What Are Cookies & Local Storage?</h2>
        <p>
          Cookies are small text files placed on your computer or mobile device when you visit a website. Modern web applications also utilize browser-native storage technologies such as <code>localStorage</code>, <code>sessionStorage</code>, and <code>IndexedDB</code> to safely store preferences, cryptographic session tokens, and cached draft states.
        </p>
      </section>

      <hr />

      {/* 2. Why Draftly Uses Storage Technologies */}
      <section id="why-we-use" className="scroll-mt-28">
        <h2>2. Why Draftly Uses Storage Technologies</h2>
        <p>
          Unlike content media sites that deploy hundreds of advertising trackers, Draftly uses storage solely to support core educational functionality under the <strong>Nigeria Data Protection Act (NDPA) 2023</strong>:
        </p>
        <ul>
          <li><strong>Authentication & Security:</strong> Validating that you are securely logged into your student or lecturer account.</li>
          <li><strong>Draft Resilience & Data Loss Prevention:</strong> Buffering your keystrokes and document state locally so unexpected power cuts or network dropouts do not erase your assignment progress.</li>
          <li><strong>Collaborative Real-time Sync:</strong> Authenticating your WebSocket connection to the group Yjs collaboration server.</li>
          <li><strong>User Interface Preferences:</strong> Remembering your sidebar collapses, editor layout zoom, and cookie consent preferences.</li>
        </ul>
      </section>

      <hr />

      {/* 3. Detailed Inventory of Cookies Used */}
      <section id="cookie-inventory" className="scroll-mt-28">
        <h2>3. Detailed Inventory of Storage Items</h2>

        <div className="not-prose overflow-x-auto my-4">
          <table className="min-w-full text-xs text-left border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-[#1A1A1B] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Storage Key / Cookie</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-[#1A1A1B]">draftly_token</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Strictly Necessary</span></td>
                <td className="py-2.5 px-3">7 Days</td>
                <td className="py-2.5 px-3">HS256 JWT auth token for secure API request authentication.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-[#1A1A1B]">draftly_cookie_consent</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Strictly Necessary</span></td>
                <td className="py-2.5 px-3">1 Year</td>
                <td className="py-2.5 px-3">Remembers your cookie notice dismissal so the banner does not repeatedly appear.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-[#1A1A1B]">draftly_active_assignment_*</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">Functional</span></td>
                <td className="py-2.5 px-3">Session</td>
                <td className="py-2.5 px-3">Stores active document section navigation and local draft buffers.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-semibold text-[#1A1A1B]">draftly_ui_preferences</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">Functional</span></td>
                <td className="py-2.5 px-3">Persistent</td>
                <td className="py-2.5 px-3">Stores visual preferences such as Section Map toggles and Word ribbon tabs.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <hr />

      {/* 4. Offline Draft Caching & IndexedDB */}
      <section id="offline-persistence" className="scroll-mt-28">
        <h2>4. Offline Draft Caching & Local State Resilience</h2>
        <p>
          Students in Nigeria and emerging educational hubs frequently experience intermittent connectivity. Draftly uses local IndexedDB storage within your browser sandbox as an encrypted offline cache.
        </p>
        <p>
          While typing, edits are staged in your browser's local sandbox before being synced via WebSockets to our servers. This ensures that even if your connection drops mid-paragraph, your work remains fully preserved and automatically synchronizes when connectivity is restored.
        </p>
      </section>

      <hr />

      {/* 5. Zero Third-Party Advertising Cookies */}
      <section id="no-ad-tracking" className="scroll-mt-28">
        <h2>5. Zero Third-Party Advertising Cookies</h2>
        <p>
          Draftly is funded strictly via institutional university partnerships and transparent SaaS subscriptions. We do not participate in programmatic ad exchanges, behavioral retargeting networks, or third-party data tracking.
        </p>
        <p>
          You will never encounter tracking pixels from social media platforms or ad networks on Draftly assignment workspaces.
        </p>
      </section>

      <hr />

      {/* 6. Managing Your Cookie Preferences */}
      <section id="managing-cookies" className="scroll-mt-28">
        <h2>6. Managing Your Cookie Preferences</h2>
        <p>
          Because all cookies and storage items used on Draftly are strictly essential for account authentication and workspace functionality, disabling them may prevent you from logging in, saving drafts, or participating in collaborative group assignments.
        </p>
        <p>
          However, you can configure your browser to block or alert you about cookies at any time:
        </p>
        <ul>
          <li><strong>Google Chrome:</strong> Settings → Privacy and Security → Third-party cookies.</li>
          <li><strong>Mozilla Firefox:</strong> Settings → Privacy & Security → Enhanced Tracking Protection.</li>
          <li><strong>Apple Safari:</strong> Settings → Safari → Advanced → Privacy & Cookies.</li>
          <li><strong>Microsoft Edge:</strong> Settings → Cookies and site permissions.</li>
        </ul>
      </section>

      <hr />

      {/* 7. Policy Updates & Inquiries */}
      <section id="updates-contact" className="scroll-mt-28">
        <h2>7. Policy Updates & Inquiries</h2>
        <p>
          We may update this Cookie Policy periodically to reflect technological improvements or regulatory guidance from the Nigeria Data Protection Commission (NDPC).
        </p>
        <p>
          For any questions regarding our storage practices, please contact <a href="mailto:privacy@draftly.ng">privacy@draftly.ng</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
