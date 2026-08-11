import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import Editor from '../components/Editor';
import { AuthorMark } from '../extensions/AuthorMark';
import { PastedMark } from '../extensions/PastedMark';
import { annotatePasted } from '../utils/pasted';
import { User, FileText, ClipboardPaste } from 'lucide-react';

// Read-only view of a teammate's section, rendered in the TipTap editor.
// Externally pasted text is highlighted red so everyone sees what was copied.
export default function SectionView() {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Red overlay: this member's doc has no author marks, so match via '*'.
  const annotated = useMemo(() => {
    if (!submission?.content) return null;
    try {
      return JSON.stringify(annotatePasted(JSON.parse(submission.content), {
        '*': submission.pasted_texts || [],
      }));
    } catch (e) {
      return submission.content;
    }
  }, [submission]);

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
        {(submission.pasted_texts?.length > 0) && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-600">
            <ClipboardPaste className="w-3.5 h-3.5 text-red-600" />
            <span className="w-3 h-3 rounded-sm bg-red-600/10 border-b-[3px] border-red-600" />
            Pasted from external source
          </span>
        )}
      </div>

      <Editor
        editable={false}
        extraExtensions={[AuthorMark, PastedMark]}
        initialContent={annotated}
      />
    </div>
  );
}