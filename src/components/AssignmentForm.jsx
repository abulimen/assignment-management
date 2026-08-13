import { useState } from 'react';
import { api } from '../api';
import { X, Users } from 'lucide-react';

export default function AssignmentForm({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isGroupWork, setIsGroupWork] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('assignments', {
        title, description,
        due_date: dueDate || null,
        is_group_work: isGroupWork,
      });
      onCreated(data.assignment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="new-assignment-title">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="new-assignment-title" className="font-semibold">New Assignment</h2>
          <button
            onClick={onClose}
            aria-label="Close new assignment dialog"
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}
          <div>
            <label htmlFor="new-assignment-title-input" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input id="new-assignment-title-input" type="text" value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
          </div>
          <div>
            <label htmlFor="new-assignment-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="new-assignment-description" value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none" />
          </div>
          <div>
            <label htmlFor="new-assignment-due" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input id="new-assignment-due" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
          </div>
          <label htmlFor="groupWork" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer min-h-11">
            <input type="checkbox" id="groupWork" checked={isGroupWork} onChange={e => setIsGroupWork(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0" />
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Users className="w-4 h-4" /> Enable group work
            </span>
          </label>
          {isGroupWork && (
            <p className="text-xs text-gray-600 -mt-2">Students will create groups, write individual sections, then the group leader merges and submits.</p>
          )}
          <div className="flex flex-wrap gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="min-h-11 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">Cancel</button>
            <button type="submit" disabled={loading}
              className="min-h-11 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}