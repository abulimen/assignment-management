import { useEffect, useState } from 'react';
import { sectionPresenceFromStates } from '../utils/sectionPresence';

// Live map of sectionId -> remote users editing there. Recomputes on
// awareness updates and on document transactions (positions shift as the
// doc changes), throttled to one recompute per animation frame.
export function useSectionPresence(provider, editor) {
  const [presence, setPresence] = useState({});

  useEffect(() => {
    if (!provider || !editor) {
      setPresence({});
      return undefined;
    }
    let raf = null;
    const recompute = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const awareness = provider.awareness;
        if (!awareness || editor.isDestroyed) return;
        const states = [...awareness.getStates().entries()].map(([clientID, state]) => ({ clientID, state }));
        setPresence(sectionPresenceFromStates(editor.state.doc, states, awareness.clientID));
      });
    };
    provider.awareness?.on('update', recompute);
    editor.on('transaction', recompute);
    recompute();
    return () => {
      provider.awareness?.off('update', recompute);
      editor.off('transaction', recompute);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [provider, editor]);

  return presence;
}
