import { useState } from 'react';
import { api } from '../api';
import { GripVertical, FileText, GitMerge } from 'lucide-react';

export default function GroupMerge({ group, onMerged }) {
  const [sections, setSections] = useState(group.sections || []);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');

  function moveUp(idx) {
    if (idx === 0) return;
    const next = [...sections];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setSections(next);
  }

  function moveDown(idx) {
    if (idx === sections.length - 1) return;
    const next = [...sections];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setSections(next);
  }

  async function handleMerge() {
    setMerging(true);
    setError('');
    try {
      const ordered = sections.map(s => s.id);
      const d = await api.post(`group.php/${group.id}/merge`, { section_order: ordered });
      onMerged(d.submission_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setMerging(false);
    }
  }

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-sm text-gray-400 text-center py-4">No sections created yet. Ask members to create their sections.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <GitMerge className="w-4 h-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-700">Merge Sections</h3>
      </div>

      <p className="text-xs text-gray-400 mb-3">Reorder the sections below, then merge. Merging joins everyone's work into ONE draft document — nothing is submitted yet. You'll then open it in the merged editor to review, edit and format it (each member's text stays color-coded by author), and submit the final version from there.</p>

      <div className="space-y-2">
        {sections.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(idx)} disabled={idx === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▲</button>
              <GripVertical className="w-4 h-4 text-gray-300" />
              <button onClick={() => moveDown(idx)} disabled={idx === sections.length - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▼</button>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
              {idx + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.student_name}</p>
              <p className="text-xs text-gray-400">
                {s.title || 'Untitled section'} · {s.word_count || 0} words · {s.submission_status || 'draft'}
              </p>
            </div>
            <FileText className="w-4 h-4 text-gray-300" />
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mt-3">{error}</div>}

      <button onClick={handleMerge} disabled={merging}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
        <GitMerge className="w-4 h-4" />
        {merging ? 'Merging...' : 'Merge Sections'}
      </button>
    </div>
  );
}