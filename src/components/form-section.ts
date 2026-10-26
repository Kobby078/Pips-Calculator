import type { ReactNode } from 'react';

export type FormSection = {
  key: string;
  title: string;
  /** Already has its own card, so the web layout does not wrap it again. */
  plain?: boolean;
  children: ReactNode;
};
