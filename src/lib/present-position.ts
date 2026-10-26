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
  /** False when the risk budget cannot buy the minimum lot. */
  lotFits: boolean;
  /** Broker-step size inside the risk budget. Null when no supported lot fits. */
  recommendedLot: string | null;
  lotDetail: string;
  summary: ResultRow[];
  metrics: ResultRow[];
};

/** Shown with a finished estimate. The calculator form stays free of this copy. */
export const TRADING_RISK_DISCLOSURE =
  'Educational estimate only. Results ignore commission, spread, and slippage, and they are not a broker quote or a recommendation to trade.';

const EMPTY_METRICS: ResultRow[] = [
  { label: 'Risk budget', value: '—' },
  { label: 'Estimated loss', value: '—' },
  { label: 'Stop distance', value: '—' },
  { label: 'Theoretical lots', value: '—' },
  { label: 'Potential reward', value: '—' },
  { label: 'Risk / reward', value: '—' },
  { label: 'Risk percentage', value: '—' },
];

export function emptyMetricRows(): ResultRow[] {
  return EMPTY_METRICS.map((row) => ({ ...row }));
}

export function presentPosition(result: PositionCalculationSuccess): PresentedPosition {
  const currency = result.accountCurrency;
  const supported = result.brokerLots !== null && result.actualLoss !== null;
  const blockedReason = `No supported lot size fits this risk. The minimum position of ${formatLotSize(result.minimumLot)} lots would risk ${formatMoney(result.minimumPositionRisk, currency)}, which is above the ${formatMoney(result.riskAmount, currency)} budget.`;
  const body = supported
    ? 'Loss and reward use the broker lot, rounded down to the lot step. Nothing larger than the chosen risk is suggested.'
    : blockedReason;

  return {
    title: supported ? 'Position sized' : 'Risk budget is below the minimum lot',
    body,
    warning: result.warning?.message ?? null,
    note: result.assumptionNote,
    lotFits: supported,
    recommendedLot: supported && result.brokerLots !== null ? formatLotSize(result.brokerLots) : null,
    lotDetail: supported
      ? 'Largest size on the saved lot step that stays inside the risk budget.'
      : blockedReason,
    summary: [
      { label: 'Instrument', value: result.symbol },
      { label: 'Direction', value: result.direction === 'buy' ? 'Buy' : 'Sell' },
      { label: 'Quote to account', value: conversionLabel(result) },
    ],
    metrics: [
      { label: 'Risk budget', value: formatMoney(result.riskAmount, currency) },
      {
        label: 'Estimated loss',
        value: result.actualLoss === null ? '—' : formatMoney(result.actualLoss, currency),
      },
      result.symbol === 'XAUUSD'
        ? { label: 'Price distance', value: `${formatMoney(result.stopDistance, result.quoteCurrency)}` }
        : { label: 'Stop distance', value: `${formatPips(result.stopPips)} pips` },
      { label: 'Theoretical lots', value: formatLotSize(result.theoreticalLots) },
      {
        label: 'Potential reward',
        value: result.reward === null ? '—' : formatMoney(result.reward, currency),
      },
      { label: 'Risk / reward', value: formatRiskReward(result.riskRewardRatio) },
      { label: 'Risk percentage', value: `${formatPips(result.riskPercent)}%` },
    ],
  };
}

function conversionLabel(result: PositionCalculationSuccess): string {
  if (result.conversionSource === 'quote-currency') {
    return `${result.accountCurrency} matches the quote currency`;
  }
  const rate = formatRate(result.quoteToAccountRate);
  const pair = `1 ${result.quoteCurrency} = ${rate} ${result.accountCurrency}`;
  if (result.conversionSource === 'base-price') {
    return `${pair}, from the ${result.symbol} price`;
  }
  return `${pair}, entered rate`;
}

/** Label a rate the user applied from the reference feed. The sizing math is unchanged. */
export function markIndicativeConversion(rows: ResultRow[]): ResultRow[] {
  return rows.map((row) =>
    row.label === 'Quote to account'
      ? { ...row, value: row.value.replace(/, entered rate$/, ', indicative reference rate') }
      : row,
  );
}

function formatRiskReward(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) {
    return '—';
  }
  return `1 : ${formatPips(ratio)}`;
}

function formatMoney(value: number, currency: string): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const cents = value.toFixed(2);
  if ((cents === '0.00' || cents === '-0.00') && value !== 0) {
    return `${trimNumber(value, 8)} ${currency}`;
  }
  return `${cents} ${currency}`;
}

/** Keep extra precision such as 0.005, and show hundredths for sizes like 0.10. */
function formatLotSize(value: number): string {
  const precise = trimNumber(value, 8);
  if (precise === '—') {
    return precise;
  }
  const fraction = precise.split('.')[1] ?? '';
  if (fraction.length >= 2) {
    return precise;
  }
  return Number(precise).toFixed(2);
}

function formatPips(value: number): string {
  return trimNumber(value, 8);
}

function formatRate(value: number): string {
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
