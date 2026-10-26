import type { ReactNode } from 'react';

import css from '@/components/dashboard.module.css';

type DashboardLayoutProps = {
  setup: ReactNode;
  result: ReactNode;
  calculate?: ReactNode;
};

export function DashboardLayout({ setup, result, calculate }: DashboardLayoutProps) {
  return (
    <div className={css.grid}>
      <div className={css.setup}>
        {setup}
        <div className={css.desktopCalculate}>{calculate}</div>
      </div>
      <div className={css.result}>{result}</div>
    </div>
  );
}
