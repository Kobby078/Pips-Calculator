import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import type { HelpTopic } from '@/lib/help-content';

type HelpContextValue = {
  activeTopic: HelpTopic | null;
  openHelp: (topic: HelpTopic) => void;
  closeHelp: () => void;
  toggleHelp: (topic: HelpTopic) => void;
  isHelpOpen: (topic: HelpTopic) => boolean;
};

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [activeTopic, setActiveTopic] = useState<HelpTopic | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !activeTopic) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTopic(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTopic]);

  const value = useMemo(
    () => ({
      activeTopic,
      openHelp: (topic: HelpTopic) => setActiveTopic(topic),
      closeHelp: () => setActiveTopic(null),
      toggleHelp: (topic: HelpTopic) => setActiveTopic((curr) => (curr === topic ? null : topic)),
      isHelpOpen: (topic: HelpTopic) => activeTopic === topic,
    }),
    [activeTopic],
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
