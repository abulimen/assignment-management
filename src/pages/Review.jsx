import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, FileText, BarChart3 } from 'lucide-react';
import { api } from '../api';
import VerdictPanel from '../components/VerdictPanel';
import ContributionXray from '../components/ContributionXray';
import MemberWorkload from '../components/MemberWorkload';
import MemberActivityChart from '../components/MemberActivityChart';
import CopiedTextViewer from '../components/CopiedTextViewer';
import PasteAnalysis from '../components/PasteAnalysis';
import StatsBar from '../components/StatsBar';
import EditDensity from '../components/EditDensity';
import EditTimeline from '../components/EditTimeline';
import Playback from '../components/Playback';
import GroupFinalDoc from '../components/GroupFinalDoc';

export default function Review() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verdictLoading, setVerdictLoading] = useState(true);

  useEffect(() => {
    api.get(`submissions/${id}/playback`)
      .then(d => {
        setData(d);
        if (d.sections) setSections(d.sections);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (id) {
      api.get(`submissions/${id}/verdict`)
        .then(v => setVerdict(v))
        .catch(() => setVerdict({ error: 'Analyzer unavailable' }))
        .finally(() => setVerdictLoading(false));
    }
  }, [id]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading review...</div>;
  if (!data) return <div className="text-center py-12 text-gray-500">Submission not found.</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Submission Review</h1>
        <p className="text-sm text-gray-600 mt-1">Proof of Work Analysis</p>
        <p className="text-xs text-gray-600 mt-1">Evidence is shown for your judgment — there is no automated verdict.</p>
      </div>

      {data.override?.used && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-800">Submitted via leader override</h2>
          </div>
          <p className="text-sm text-amber-800 mb-2">
            <strong>{data.override.by_name}</strong> submitted even though these members had not marked themselves Done:
          </p>
          <ul className="list-disc list-inside text-sm text-amber-800 mb-2">
            {(data.override.non_done || []).map(n => (
              <li key={n.student_id}>
                {n.student_name}
                {n.last_activity_at ? ` — last activity ${new Date(n.last_activity_at).toLocaleString()}` : ' — no recorded activity'}
              </li>
            ))}
          </ul>
          <p className="text-sm text-amber-900"><strong>Leader's reason:</strong> {data.override.reason}</p>
        </div>
      )}

      {sections ? (
        // Group submission: the X-Ray is the at-a-glance contribution answer;
        // workload, activity and the copied-text inspector stay behind a fold
        // so the review starts as evidence-on-demand, not surveillance.
        <>
          <ContributionXray sections={sections} />
          {data.realtime && data.insights && (
            <GroupEvidenceFold insights={data.insights} members={sections} />
          )}
          <h2 className="text-lg font-semibold mb-3 mt-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            {data.realtime ? 'Final Group Document' : 'Merged Document'}
          </h2>
          <GroupFinalDoc content={data.content} sections={sections} />
        </>
      ) : (
        // Individual submission: at-a-glance verdict, effort stats, the document,
        // then the detailed evidence tucked away.
        <>
          <VerdictPanel verdict={verdict} loading={verdictLoading} />
          <StatsBar stats={data.stats} />

          <h2 className="text-lg font-semibold mb-3 mt-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Document
          </h2>
          <Playback events={data.events} finalContent={data.content} />

          <EvidenceFold events={data.events} finalContent={data.content} stats={data.stats} />
        </>
      )}
    </div>
  );
}

// Detailed supporting evidence, collapsed by default so the review stays
// scannable. A lecturer who wants to dig can expand it.
function EvidenceFold({ events, finalContent, stats }) {
  const [open, setOpen] = useState(false);
  return (
    <div id="evidence-individual" className="mt-6">
      <FoldToggle open={open} toggle={() => setOpen((o) => !o)} controlsId="evidence-individual" />
      {open && (
        <div className="mt-4">
          <PasteAnalysis events={events} finalContent={finalContent} />
          <EditDensity events={events} totalTimeMs={stats?.total_time_ms} />
          <EditTimeline events={events} />
        </div>
      )}
    </div>
  );
}

// Group deep evidence (workload → activity → copied-text inspector), behind
// the same evidence-on-demand fold as the individual surface.
function GroupEvidenceFold({ insights, members }) {
  const [open, setOpen] = useState(false);
  return (
    <div id="evidence-group" className="mt-6">
      <FoldToggle open={open} toggle={() => setOpen((o) => !o)} controlsId="evidence-group" />
      {open && (
        <div className="mt-4">
          <MemberWorkload insights={insights} members={members} />
          <MemberActivityChart insights={insights} members={members} />
          <CopiedTextViewer insights={insights} members={members} />
        </div>
      )}
    </div>
  );
}

// Shared fold button: ≥44px tall target, labelled chevron, wired for the
// screen-reader disclosure contract.
function FoldToggle({ open, toggle, controlsId }) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      aria-controls={controlsId}
      className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 min-h-11 px-3 -ml-3 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      <BarChart3 className="w-4 h-4" />
      {open ? 'Hide detailed evidence' : 'Show detailed evidence'}
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );
}
