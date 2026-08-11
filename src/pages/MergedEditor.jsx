import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import Editor from '../components/Editor';
import { AuthorMark } from '../extensions/AuthorMark';
import { AuthorOverride } from '../extensions/AuthorOverride';
import { PastedMark } from '../extensions/PastedMark';
import { buildAuthorColorMap, AUTHOR_PALETTE } from '../utils/authorship';
import { annotatePasted, stripPastedMarks } from '../utils/pasted';
import { Save, Send, Users, ClipboardPaste } from 'lucide-react';

// Leader-editable merged group document.
// Author text is always highlighted in a distinct color per member so the
// leader can see ownership in realtime. Leader edits are tracked on the
// merged submission only — teammates' individual events stay untouched.
export default function MergedEditor() {
  const { submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [group, setGroup] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`submission.php/${submissionId}`),
      groupId ? api.get(`group.php/${groupId}`) : Promise.resolve({ group: null }),
    ])
      .then(([sub, g]) => {
        setSubmission(sub.submission);
        setContent(sub.submission.content || '');
        setGroup(g.group);
      })
      .finally(() => setLoading(false));
  }, [submissionId, groupId]);

  // authorId -> palette color
  const colorMap = useMemo(() => {
    if (!group?.members) return {};
    const idx = buildAuthorColorMap(group.members);
    const map = {};
    for (const [id, i] of Object.entries(idx)) {
      map[id] = AUTHOR_PALETTE[i];
    }
    return map;
  }, [group]);

  // authorId -> externally pasted strings (red "copied" overlay)
  const pastedByAuthor = useMemo(() => {
    const map = {};
    (group?.sections || []).forEach(s => {
      map[String(s.student_id)] = s.pasted_texts || [];
    });
    return map;
  }, [group]);

  // Merged content + red pasted overlay (display-only; stripped on save)
  const annotated = useMemo(() => {
    if (!submission?.content) return null;
    try {
      return JSON.stringify(annotatePasted(JSON.parse(submission.content), pastedByAuthor));
    } catch (e) {
      return submission.content;
    }
  }, [submission, pastedByAuthor]);

  // Strip the display-only pasted marks before persisting the artifact
  const cleanForSave = (raw) => {
    try {
      return JSON.stringify(stripPastedMarks(JSON.parse(raw || '{}')));
    } catch (e) {
      return raw;
    }
  };

  // Inject a <style> block mapping .author-{id} to its color
  useEffect(() => {
    const styleId = 'author-colors';
    let el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = Object.entries(colorMap)
      .map(([id, color]) => `.author-${id} { background-color: ${color}; }`)
      .join('\n');
    return () => {};
  }, [colorMap]);

  async function handleSave() {
    setSaving(true);
    setSavedMsg('');
    try {
      // Persist without the display-only pasted overlay marks
      await api.put(`submission.php/${submissionId}`, { content: cleanForSave(content) });
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await api.post(`submission.php/${submissionId}/submit`, { content: cleanForSave(content) });
      navigate(`/review/${submissionId}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading merged document...</div>;
  if (!submission) return <div className="text-center py-12 text-gray-500">Merged document not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Merged Group Document</h1>
          <p className="text-sm text-gray-400 mt-1">Edit and format the combined work. Ownership colors stay attached to each member's text.</p>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <Save className="w-4 h-4" /> Save
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            <Send className="w-4 h-4" /> Submit Final
          </button>
        </div>
      </div>

      {/* Color legend */}
      {group?.members && (
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Users className="w-4 h-4 text-gray-400" />
          {group.members.map(m => (
            <span key={m.student_id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: colorMap[m.student_id] }} />
              {m.student_name}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <ClipboardPaste className="w-3.5 h-3.5 text-red-600" />
            <span className="w-3 h-3 rounded-sm bg-red-600/10 border-b-[3px] border-red-600" />
            Pasted from external source
          </span>
        </div>
      )}

      <Editor
        submissionId={parseInt(submissionId)}
        editable={true}
        extraExtensions={[AuthorMark, AuthorOverride.configure({ authorId: user?.id }), PastedMark]}
        initialContent={annotated}
        onContentChange={setContent}
      />
    </div>
  );
}