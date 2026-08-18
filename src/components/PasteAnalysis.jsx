import React, { useState, useMemo } from 'react';
import { Clipboard, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

/**
 * PasteAnalysis — factual inspection of text entered via paste events.
 */
export default function PasteAnalysis({ events }) {
  const [expandedId, setExpandedId] = useState(null);

  const pastes = useMemo(() => {
    if (!events) return [];
    return events
      .filter((e) => e.type === 'paste')
      .map((e, idx) => ({
        id: e.sequence ?? idx,
        text: e.data?.pasted_text || e.data?.text || '',
        length: (e.data?.pasted_text || e.data?.text || '').length,
        isHtml: !!e.data?.is_html,
        occurredAt: e.occurred_at,
      }))
      .filter((p) => p.text.length >= 10);
  }, [events]);

  if (pastes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Clipboard className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Inserted Text
          </h2>
        </div>
        <p className="text-xs text-gray-500 pt-3 font-sans">
          No paste events recorded. All content in this document was entered directly in the editor.
        </p>
      </div>
    );
  }

  const totalWords = pastes.reduce((sum, p) => {
    return sum + p.text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clipboard className="w-4 h-4 text-[#0047FF]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Inserted Text
          </h2>
        </div>
        <span className="text-xs font-mono text-gray-500">
          {pastes.length} event{pastes.length > 1 ? 's' : ''} · ~{totalWords} words
        </span>
      </div>

      <p className="text-xs text-gray-500 font-sans">
        The following text was entered via paste event.
      </p>

      <div className="space-y-2">
        {pastes.map((paste, idx) => {
          const isOpen = expandedId === paste.id;
          const preview = paste.text.length > 100 ? paste.text.slice(0, 100) + '…' : paste.text;
          const wordCount = paste.text.trim().split(/\s+/).filter(Boolean).length;
          const urls = paste.text.match(/https?:\/\/[^\s<>"']+/g) || [];

          return (
            <div key={paste.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : paste.id)}
                aria-expanded={isOpen}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-[#F9F8F6] transition-colors cursor-pointer"
              >
                {/* Paste number badge */}
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0 space-y-1">
                  {/* Preview text */}
                  <p className="text-xs text-gray-800 leading-relaxed line-clamp-2 font-sans italic">
                    "{preview}"
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                    <span>{wordCount} words ({paste.length} chars)</span>
                    {paste.isHtml && (
                      <span className="px-1.5 py-0.5 bg-[#0047FF]/10 text-[#0047FF] rounded font-bold">
                        HTML
                      </span>
                    )}
                    {urls.length > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-600">
                        <ExternalLink className="w-2.5 h-2.5" />
                        {urls.length} link{urls.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {paste.occurredAt && (
                      <span>
                        · {new Date(paste.occurredAt * 1000).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 mt-0.5">
                  {isOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 bg-[#FFFDF5] p-4 space-y-3">
                  <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs font-sans text-gray-800 leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto">
                    {paste.text}
                  </div>
                  {urls.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        Embedded Links
                      </div>
                      {urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#0047FF] hover:underline truncate font-mono"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
