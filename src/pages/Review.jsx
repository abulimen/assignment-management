import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import VerdictPanel from '../components/VerdictPanel';
import StatsBar from '../components/StatsBar';
import EditDensity from '../components/EditDensity';
import Playback from '../components/Playback';

export default function Review() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verdictLoading, setVerdictLoading] = useState(true);

  useEffect(() => {
    api.get(`playback.php/${id}`)
      .then(d => setData(d))
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

      <VerdictPanel verdict={verdict} loading={verdictLoading} />

      <StatsBar stats={data.stats} />
      <EditDensity events={data.events} totalTimeMs={data.stats?.total_time_ms} />

      <h2 className="text-lg font-semibold mb-3">Document Playback</h2>
      <Playback events={data.events} finalContent={data.content} />
    </div>
  );
}