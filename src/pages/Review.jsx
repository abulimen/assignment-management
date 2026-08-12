import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { api } from '../api';
import VerdictPanel from '../components/VerdictPanel';
import ContributionXray from '../components/ContributionXray';
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
    api.get(`playback.php/${id}`)
      .then(d => {
        setData(d);
        // Check if this is a merged group submission by looking for section data
        if (d.sections) setSections(d.sections);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (id) {
      api.get(`verdict.php/${id}`)
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
        <p className="text-sm text-gray-400 mt-1">Proof of Work Analysis</p>
      </div>

      {data.override?.used && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Submitted via leader override</h3>
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
        // Merged group: the X-Ray is the originality hub (per-member verdicts).
        // The single-student panels below analyze the leader's merge session,
        // which would be misleading here, so they're hidden.
        <ContributionXray sections={sections} />
      ) : (
        <>
          <VerdictPanel verdict={verdict} loading={verdictLoading} />
          <PasteAnalysis events={data.events} finalContent={data.content} />
          <StatsBar stats={data.stats} />
          <EditDensity events={data.events} totalTimeMs={data.stats?.total_time_ms} />
          <EditTimeline events={data.events} />
        </>
      )}

      {sections ? (
        <>
          <h2 className="text-lg font-semibold mb-3">
            {data.realtime ? 'Final Group Document' : 'Merged Document'}
          </h2>
          <GroupFinalDoc content={data.content} sections={sections} />
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-3">Document Playback</h2>
          <Playback events={data.events} finalContent={data.content} />
        </>
      )}
    </div>
  );
}