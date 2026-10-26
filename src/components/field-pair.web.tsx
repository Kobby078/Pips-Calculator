import type { ReactNode } from 'react';

import css from '@/components/dashboard.module.css';

/** One column below 768px, two columns from tablet width up. */
export function FieldPair({ children }: { children: ReactNode }) {
  return <div className={css.pair}>{children}</div>;
}
