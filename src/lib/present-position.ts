import type { PositionCalculationSuccess } from './trading-calculations';

export type ResultRow = {
  label: string;
  value: string;
};

export type PresentedPosition = {
  title: string;
  body: string;
  warning: string | null;
  note: string | null;
  summary: ResultRow[];
  metrics: ResultRow[];
};

const EMPTY_METRICS: ResultRow[] = [
  { label: 'Theoretical lots', value: '—' },
  { label: 'Broker lots', value: '—' },
  { label: 'Stop distance', value: '—' },
  { label: 'Cash risk', value: '—' },
  { label: 'Risk percentage', value: '—' },
  { label: 'Estimated loss', value: '—' },
  { label: 'Potential reward', value: '—' },
  { label: 'Risk / reward', value: '—' },
];

export function emptyMetricRows(): ResultRow[] {
  return EMPTY_METRICS.map((row) => ({ ...row }));
}

export function presentPosition(result: PositionCalculationSuccess): PresentedPosition {
  const currency = result.accountCurrency;
  const supported = result.brokerLots !== null && result.actualLoss !== null;
  const body = supported
    ? 'Loss and reward use the broker lot, rounded down to the lot step. Nothing larger than the chosen risk is suggested.'
    : `No supported lot size fits this risk. The minimum position of ${formatLots(result.minimumLot)} lots would risk ${formatMoney(result.minimumPositionRisk, currency)}, which is above the ${formatMoney(result.riskAmount, currency)} budget.`;

  return {
    title: supported ? 'Position sized' : 'Risk budget is below the minimum lot',
    body,
    warning: result.warning?.message ?? null,
    note: result.assumptionNote,
    summary: [
      { label: 'Instrument', value: result.symbol },
      { label: 'Direction', value: result.direction === 'buy' ? 'Buy' : 'Sell' },
      { label: 'Conversion', value: conversionLabel(result) },
    ],
    metrics: [
      { label: 'Theoretical lots', value: formatLots(result.theoreticalLots) },
      { label: 'Broker lots', value: result.brokerLots === null ? 'None' : formatLots(result.brokerLots) },
      { label: 'Stop distance', value: `${formatLots(result.stopPips)} pips` },
      { label: 'Cash risk', value: formatMoney(result.riskAmount, currency) },
      { label: 'Risk percentage', value: `${formatLots(result.riskPercent)}%` },
      {
        label: 'Estimated loss',
        value: result.actualLoss === null ? '—' : formatMoney(result.actualLoss, currency),
      },
      {
        label: 'Potential reward',
        value: result.reward === null ? '—' : formatMoney(result.reward, currency),
      },
      { label: 'Risk / reward', value: formatRiskReward(result.riskRewardRatio) },
    ],
  };
}

function conversionLabel(result: PositionCalculationSuccess): string {
  const rate = formatLots(result.quoteToAccountRate);
  const pair = `1 ${result.quoteCurrency} = ${rate} ${result.accountCurrency}`;
  if (result.conversionSource === 'base-price') {
    return `${pair}, from the ${result.symbol} price`;
  }
  if (result.conversionSource === 'manual') {
    return `${pair}, entered rate`;
  }
  return pair;
}

function formatRiskReward(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) {
    return '—';
  }
  return `1 : ${formatLots(ratio)}`;
}

function formatMoney(value: number, currency: string): string {
  return `${trimNumber(value, 2)} ${currency}`;
}

function formatLots(value: number): string {
  return trimNumber(value, 8);
}

function trimNumber(value: number, decimals: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value
    .toFixed(decimals)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}
