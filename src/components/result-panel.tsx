import { StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';
import { emptyMetricRows, type ResultRow } from '@/lib/present-position';

type ResultPanelProps = {
  status: 'empty' | 'outdated' | 'blocked' | 'ready';
  title?: string;
  body?: string;
  warning?: string | null;
  note?: string | null;
  summary?: ResultRow[];
  metrics?: ResultRow[];
};

export function ResultPanel({
  status,
  title,
  body,
  warning,
  note,
  summary = [],
  metrics,
}: ResultPanelProps) {
  const shownMetrics = metrics ?? emptyMetricRows();
  const heading =
    title ??
    (status === 'outdated'
      ? 'Results are out of date'
      : status === 'blocked'
        ? 'Cannot calculate'
        : 'No result yet');
  const copy =
    body ??
    (status === 'outdated'
      ? 'Inputs or settings changed after the last calculation. Tap Calculate to size the position again.'
      : 'Enter the trade details and tap Calculate. Position size, risk, and reward will appear here.');

  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>Result</Text>
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.body}>{copy}</Text>
      {warning ? <Text style={styles.warning}>{warning}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}

      {status === 'ready' && summary.length > 0 ? (
        <View style={styles.summary}>
          {summary.map((row) => (
            <SummaryRow key={row.label} label={row.label} value={row.value} />
          ))}
        </View>
      ) : null}

      <View style={styles.metrics}>
        {shownMetrics.map((row) => (
          <View key={row.label} style={styles.metricRow}>
            <Text style={styles.metricLabel}>{row.label}</Text>
            <Text style={styles.metricValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Palette.backgroundElement,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  kicker: {
    color: Palette.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  body: {
    color: Palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  warning: {
    color: Palette.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  note: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  summary: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Palette.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  summaryLabel: {
    color: Palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryValue: {
    color: Palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  metrics: {
    gap: Spacing.two,
  },
  metricRow: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Palette.accentSoft,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  metricLabel: {
    color: Palette.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    flexShrink: 1,
  },
  metricValue: {
    color: Palette.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'right',
  },
});
