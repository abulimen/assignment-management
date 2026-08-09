import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import Editor from '../components/Editor';
import { AuthorMark } from '../extensions/AuthorMark';
import { User, FileText } from 'lucide-react';

// Read-only view of a teammate's section, rendered in the TipTap editor.
export default function SectionView() {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`submission.php/${submissionId}`)
      .then(d => setSubmission(d.submission))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading section...</div>;
  if (error) return <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>;
  if (!submission) return <div className="text-center py-12 text-gray-500">Section not found.</div>;

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{submission.student_name}'s Section</h1>
            <p className="text-sm text-gray-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Read-only view
            </p>
          </div>
        </div>
      </div>

      <Editor
        editable={false}
        extraExtensions={[AuthorMark]}
        initialContent={submission.content}
      />
    </div>
  );
}