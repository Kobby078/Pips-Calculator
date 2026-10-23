import { StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

export type CapturedTrade = {
  instrument: string;
  balance: string;
  riskLabel: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
};

type ResultPanelProps = {
  trade: CapturedTrade | null;
};

const PLACEHOLDER_ROWS = [
  'Position size',
  'Risk amount',
  'Potential reward',
  'Risk / reward',
] as const;

export function ResultPanel({ trade }: ResultPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>Result</Text>
      <Text style={styles.title}>{trade ? 'Inputs captured' : 'No result yet'}</Text>
      <Text style={styles.body}>
        {trade
          ? 'These details are ready for a position-size calculation. Sizing formulas are not included yet, so the figures below stay blank.'
          : 'Enter the trade details and tap Calculate. Position size, risk, and reward will appear here.'}
      </Text>

      {trade ? (
        <View style={styles.summary}>
          <SummaryRow label="Instrument" value={trade.instrument} />
          <SummaryRow label="Account balance" value={trade.balance} />
          <SummaryRow label="Risk" value={trade.riskLabel} />
          <SummaryRow label="Entry" value={trade.entry} />
          <SummaryRow label="Stop loss" value={trade.stopLoss} />
          <SummaryRow label="Take profit" value={trade.takeProfit} />
        </View>
      ) : null}

      <View style={styles.metrics}>
        {PLACEHOLDER_ROWS.map((label) => (
          <View key={label} style={styles.metricRow}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>—</Text>
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
  },
  metricLabel: {
    color: Palette.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  metricValue: {
    color: Palette.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
});
