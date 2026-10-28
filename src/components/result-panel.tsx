import { StyleSheet, Text, View } from 'react-native';

import { HelpButton, HelpCallout } from '@/components/help-info';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { emptyMetricRows, TRADING_RISK_DISCLOSURE, type ResultRow } from '@/lib/present-position';

type ResultPanelProps = {
  status: 'empty' | 'outdated' | 'blocked' | 'ready';
  title?: string;
  body?: string;
  warning?: string | null;
  note?: string | null;
  lotFits?: boolean;
  recommendedLot?: string | null;
  lotDetail?: string | null;
  summary?: ResultRow[];
  metrics?: ResultRow[];
  disclosure?: string;
};

export function ResultPanel({
  status,
  title,
  body,
  warning,
  note,
  lotFits,
  recommendedLot,
  lotDetail,
  summary = [],
  metrics,
  disclosure,
}: ResultPanelProps) {
  const styles = useThemedStyles(createStyles);
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
      {status === 'ready' && lotFits && recommendedLot ? (
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <Text style={[styles.heroLabel, styles.positive]}>Broker lot</Text>
            <HelpButton topic="lots" />
          </View>
          <HelpCallout topic="lots" />
          <Text style={styles.heroValue}>{recommendedLot}</Text>
          {lotDetail ? <Text style={styles.heroDetail}>{lotDetail}</Text> : null}
        </View>
      ) : null}
      {status === 'ready' && lotFits === false ? (
        <View style={styles.heroBlocked}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>No supported lot</Text>
            <HelpButton topic="minimumLot" />
          </View>
          <HelpCallout topic="minimumLot" />
          <Text style={styles.heroReason}>{body}</Text>
        </View>
      ) : null}
      {status === 'ready' && lotFits === false ? null : <Text style={styles.body}>{copy}</Text>}
      {warning ? <Text style={styles.warning}>{warning}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}

      {status === 'ready' && summary.length > 0 ? (
        <View style={styles.summary}>
          {summary.map((row) => (
            <SummaryRow key={row.label} label={row.label} value={row.value} styles={styles} />
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
      {status === 'ready' ? <Text style={styles.note}>{disclosure ?? TRADING_RISK_DISCLOSURE}</Text> : null}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  panel: {
    backgroundColor: colors.backgroundElement,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  hero: {
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBlocked: {
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  heroLabel: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  positive: {
    color: colors.positive,
  },
  heroValue: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
  },
  heroDetail: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  heroReason: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  warning: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  summary: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryValue: {
    color: colors.text,
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
    backgroundColor: colors.accentSoft,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    flexShrink: 1,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'right',
  },
});
}
