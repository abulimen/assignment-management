import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import Editor from '../components/Editor';
import { Save, Send } from 'lucide-react';

export default function Submission() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`assignment.php/${id}`).then(d => {
      setAssignment(d.assignment);
      const sub = d.assignment.submissions?.find(s => s.student_id === user?.id);
      if (sub) {
        return api.get(`submission.php/${sub.id}`).then(r => {
          setSubmission(r.submission);
          setContent(r.submission.content || '');
        });
      } else {
        return api.post('submissions.php', { assignment_id: parseInt(id) }).then(r => {
          setSubmission(r.submission);
        });
      }
    }).finally(() => setLoading(false));
  }, [id, user?.id]);

  async function handleSubmit() {
    if (!submission) return;
    setSaving(true);
    try {
      await api.post(`submission.php/${submission.id}/submit`);
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{assignment?.title}</h1>
          {submission && (
            <p className="text-sm text-gray-400 mt-1">
              Status: <span className="font-medium text-gray-600">{submission.status}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {submission && submission.status !== 'submitted' && (
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Send className="w-4 h-4" /> Submit
            </button>
          )}
        </div>
      </div>

      {submission && (
        <Editor
          submissionId={submission.id}
          initialContent={submission.content}
          onContentChange={setContent}
        />
      )}
    </div>
  );
}