import { useState, useMemo } from 'react';
import { Clipboard, ExternalLink, Link2, ChevronDown, ChevronUp } from 'lucide-react';

export default function PasteAnalysis({ events, finalContent }) {
  const [showLinks, setShowLinks] = useState(false);
  const [expandedPastes, setExpandedPastes] = useState({});

  // Extract external paste events
  const pastes = useMemo(() => {
    if (!events) return [];
    return events
      .filter(e => e.type === 'paste' && e.data?.external_paste)
      .map(e => ({
        id: e.sequence,
        text: e.data.pasted_text || '',
        length: e.data.pasted_text_length || (e.data.pasted_text || '').length,
        position: e.data.position,
        occurredAt: e.occurred_at,
        isHtml: e.data.is_html,
      }));
  }, [events]);

  // Extract hyperlinks from pasted text
  const hyperlinks = useMemo(() => {
    const links = [];
    for (const paste of pastes) {
      const matches = paste.text.match(/https?:\/\/[^\s<>"']+/g);
      if (matches) {
        for (const url of matches) {
          links.push({ url, pasteId: paste.id });
        }
      }
    }
    return links;
  }, [pastes]);

  // Check how much of pasted text survived in final document
  const survivalStats = useMemo(() => {
    if (!finalContent || pastes.length === 0) return { totalPasted: 0, retained: 0 };
    let finalText = '';
    try {
      const doc = JSON.parse(finalContent);
      finalText = JSON.stringify(doc);
    } catch (e) {
      finalText = finalContent;
    }

    let totalPasted = 0;
    let retained = 0;
    for (const paste of pastes) {
      totalPasted += paste.length;
      // Check if the first 20 chars of the paste exist in the final document
      const sample = paste.text.substring(0, Math.min(50, paste.text.length)).trim();
      if (sample.length > 10 && finalText.includes(sample.replace(/[.*+?^${}()|[\]\\]/g, ''))) {
        retained += paste.length;
      }
    }
    return { totalPasted, retained };
  }, [pastes, finalContent]);

  if (pastes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clipboard className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold">Paste Analysis</h2>
        </div>
        <p className="text-sm text-gray-400">No external pastes detected. All content appears to be typed manually.</p>
      </div>
    );
  }

  const modifiedChars = survivalStats.totalPasted - survivalStats.retained;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clipboard className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Paste Analysis</h2>
        </div>
        {hyperlinks.length > 0 && (
          <button
            onClick={() => setShowLinks(!showLinks)}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg"
          >
            <Link2 className="w-4 h-4" />
            {hyperlinks.length} hyperlink{hyperlinks.length > 1 ? 's' : ''} found
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{pastes.length}</div>
          <div className="text-xs text-gray-500">External Pastes</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{survivalStats.totalPasted}</div>
          <div className="text-xs text-gray-500">Chars Pasted</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{survivalStats.retained}</div>
          <div className="text-xs text-gray-500">Retained Unmodified</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{modifiedChars}</div>
          <div className="text-xs text-gray-500">Modified / Removed</div>
        </div>
      </div>

      {/* Hyperlinks */}
      {showLinks && hyperlinks.length > 0 && (
        <div className="mb-4 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <ExternalLink className="w-4 h-4" /> Hyperlinks in Pasted Content
          </h3>
          <div className="space-y-1">
            {hyperlinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:underline truncate">
                {link.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Paste details */}
      <div className="space-y-3">
        {pastes.map((paste) => {
          const isExpanded = expandedPastes[paste.id];
          const preview = paste.text.length > 100 ? paste.text.substring(0, 100) + '...' : paste.text;
          return (
            <div key={paste.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedPastes(prev => ({ ...prev, [paste.id]: !prev[paste.id] }))}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-left flex-1 min-w-0">
                  <span className="text-xs font-mono text-gray-400">#{paste.id}</span>
                  <span className="text-sm text-gray-700 truncate bg-yellow-100 px-1.5 py-0.5 rounded">
                    {preview}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 ml-2 flex-shrink-0">
                  <span>{paste.length} chars</span>
                  {paste.isHtml && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">HTML</span>}
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-200 p-3">
                  <div className="bg-yellow-50 rounded p-3 text-sm whitespace-pre-wrap break-words font-mono">
                    {paste.text}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Pasted at position {paste.position} · {new Date(paste.occurredAt * 1000).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}