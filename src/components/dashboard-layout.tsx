import type { ReactNode } from 'react';

type DashboardLayoutProps = {
  setup: ReactNode;
  result: ReactNode;
  calculate?: ReactNode;
};

/** Native stays a single column. The web file places the result beside the setup. */
export function DashboardLayout({ setup, result }: DashboardLayoutProps) {
  return (
    <>
      {setup}
      {result}
    </>
  );
}
