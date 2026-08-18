import React, { useMemo } from 'react';
import { ExternalLink, Link2, FileText, ClipboardCheck, Globe } from 'lucide-react';

export default function SourcesAndLinks({ events, rawContent = '' }) {
  const { directPct, insertedPct, links, pasteCount } = useMemo(() => {
    let typedChars = 0;
    let pastedChars = 0;
    let pasteCount = 0;

    for (const e of events || []) {
      if (e.type === 'paste') {
        pasteCount++;
        const text = e.data?.pasted_text || e.data?.text || '';
        const len = text.length || e.data?.pasted_text_length || e.data?.length || 0;
        pastedChars += len;
      } else if (e.type === 'step' || e.type === 'keystroke') {
        typedChars += 1;
      }
    }

    const total = Math.max(typedChars + pastedChars, 1);
    const directPct = Math.round((typedChars / total) * 100);
    const insertedPct = Math.round((pastedChars / total) * 100);

    // Extract links and citations from content
    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
    const matches = String(rawContent).match(urlRegex) || [];
    const uniqueUrls = Array.from(new Set(matches));

    const linkEntries = uniqueUrls.slice(0, 8).map((url) => {
      let hostname = url;
      try {
        hostname = new URL(url).hostname.replace(/^www\./, '');
      } catch {}
      return {
        url,
        hostname,
      };
    });

    return {
      directPct,
      insertedPct,
      pasteCount,
      links: linkEntries,
    };
  }, [events, rawContent]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#0047FF]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Text Sources & References
          </h3>
        </div>
      </div>

      {/* Composition Source Ratio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span className="text-gray-700">Typed directly: {directPct}%</span>
          <span className="text-amber-800">Inserted / pasted: {insertedPct}%</span>
        </div>

        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
          <div className="bg-[#0047FF] h-full" style={{ width: `${directPct}%` }} />
          <div className="bg-amber-400 h-full" style={{ width: `${insertedPct}%` }} />
        </div>
      </div>

      {/* Extracted Links & Sources */}
      {links.length > 0 && (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
            Detected Links ({links.length})
          </div>
          <div className="space-y-1.5">
            {links.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-xl bg-[#F9F8F6] hover:bg-blue-50 border border-gray-200 transition-colors text-xs text-gray-700 hover:text-[#0047FF] group cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Globe className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0047FF] shrink-0" />
                  <span className="truncate font-mono text-[11px]">{item.hostname}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-500 font-sans leading-snug">
        {insertedPct > 0
          ? `${insertedPct}% of content was inserted across ${pasteCount} paste ${pasteCount === 1 ? 'event' : 'events'}.`
          : 'All text content was entered directly in the editor.'}
      </p>
    </div>
  );
}
