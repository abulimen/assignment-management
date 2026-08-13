import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import Editor from '../components/Editor';
import SectionMap from '../components/SectionMap';
import { wrapFlatContent } from '../utils/sectionDoc';
import { Save, Send } from 'lucide-react';

// Legacy drafts are flat; normalize into the sectioned model before editing.
function normalizeForEditor(raw) {
  if (!raw) return JSON.stringify(wrapFlatContent(null));
  try {
    return JSON.stringify(wrapFlatContent(JSON.parse(raw)));
  } catch {
    return raw;
  }
}

export default function Submission() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    // Check if this is a group section submission (via query params)
    const sectionSubId = searchParams.get('sub');
    if (sectionSubId) {
      api.get(`submissions/${sectionSubId}`).then(r => {
        setSubmission(r.submission);
        setContent(normalizeForEditor(r.submission.content));
        return api.get(`assignments/${id}`);
      }).then(d => {
        setAssignment(d.assignment);
      }).finally(() => setLoading(false));
      return;
    }

    // Normal flow: find or create submission
    api.get(`assignments/${id}`).then(d => {
      setAssignment(d.assignment);
      const sub = d.assignment.submissions?.find(s => s.student_id === user?.id);
      if (sub) {
        return api.get(`submissions/${sub.id}`).then(r => {
          setSubmission(r.submission);
          setContent(normalizeForEditor(r.submission.content));
        });
      } else {
        return api.post('submissions', { assignment_id: parseInt(id) }).then(r => {
          setSubmission(r.submission);
        });
      }
    }).finally(() => setLoading(false));
  }, [id, user?.id, searchParams]);

  async function handleSave() {
    if (!submission) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await api.put(`submissions/${submission.id}`, { content });
      setSavedMsg('Draft saved');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!submission) return;
    setSaving(true);
    try {
      await api.post(`submissions/${submission.id}/submit`, { content });
      navigate(`/assignments/${id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading editor...</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">{assignment?.title}</h1>
          {submission && (
            <p className="text-sm text-gray-600 mt-1">
              Status: <span className="font-medium text-gray-600">{submission.status}</span>
              {savedMsg && <span className="text-green-700 ml-2">{savedMsg}</span>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {submission && submission.status !== 'submitted' && (
            <>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 min-h-11 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 min-h-11 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                <Send className="w-4 h-4" /> Submit
              </button>
            </>
          )}
        </div>
      </div>

      {submission && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-4 items-start">
          <Editor
            submissionId={submission.id}
            initialContent={normalizeForEditor(submission.content)}
            onContentChange={setContent}
            editable={submission.status !== 'submitted'}
            onReady={setEditor}
          />
          {editor && submission.status !== 'submitted' && (
            <SectionMap
              editor={editor}
              onAddSection={() => editor.chain().focus('end').addSectionAfter().run()}
            />
          )}
        </div>
      )}
    </div>
  );
}