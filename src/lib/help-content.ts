export type HelpTopic =
  | 'balance'
  | 'risk'
  | 'entry'
  | 'stopLoss'
  | 'takeProfit'
  | 'minimumLot'
  | 'lotIncrement'
  | 'spread'
  | 'priceMode'
  | 'conversion'
  | 'lots';

export type HelpItem = {
  title: string;
  body: string;
};

export const HELP_CONTENT: Record<HelpTopic, HelpItem> = {
  balance: {
    title: 'Account balance',
    body: 'Your total trading equity in your account currency. The calculator sizes your cash risk directly from this balance.',
  },
  risk: {
    title: 'Risk sizing',
    body: 'The maximum loss you are willing to take if your stop loss is triggered. Can be set as a percentage of balance or a fixed cash amount.',
  },
  entry: {
    title: 'Entry price',
    body: 'The market level where your trade opens. When spread adjustment is enabled on chart levels, Buy orders execute at Ask (entry + spread).',
  },
  stopLoss: {
    title: 'Stop loss',
    body: 'The protective price where your trade automatically closes to limit loss. The distance between entry and stop loss determines your position size.',
  },
  takeProfit: {
    title: 'Take profit',
    body: 'Optional target level where your trade closes in profit. Used to estimate your monetary reward and risk/reward ratio.',
  },
  minimumLot: {
    title: 'Minimum lot',
    body: 'The smallest trade volume accepted by your broker. If your risk budget is too small for this minimum position, no size is recommended.',
  },
  lotIncrement: {
    title: 'Lot increment',
    body: 'The allowed volume step above the minimum lot (e.g., 0.01 or 0.001). Sizes always step down to never exceed your intended risk budget.',
  },
  spread: {
    title: 'Broker spread',
    body: 'The difference between Bid and Ask prices. Entered in pips for forex pairs, and as a USD dollar difference per ounce for gold (XAUUSD).',
  },
  priceMode: {
    title: 'Price levels mode',
    body: 'Chart levels model Bid/Ask execution friction (Ask entry on buys, Ask exit on sells). Executable prices use your entered levels directly without double-counting.',
  },
  conversion: {
    title: 'Currency conversion',
    body: 'The exchange rate needed when your account currency differs from the instrument quote currency to calculate exact monetary risk.',
  },
  lots: {
    title: 'Theoretical vs broker lot',
    body: 'Theoretical lots is the exact mathematical size for your risk budget. Broker lot is rounded down to your broker volume step so actual loss never exceeds risk.',
  },
};
