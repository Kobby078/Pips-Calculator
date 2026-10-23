/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  findInstrument,
  FOREX_PIP_SIZE,
  GOLD_CONTRACT_SIZE_OUNCES,
  GOLD_PIP_SIZE,
  JPY_FOREX_PIP_SIZE,
} from '../constants/instruments';
import {
  calculatePosition,
  cashRiskFromPercent,
  floorToLotIncrement,
  formatRiskInput,
  percentFromCashRisk,
  requiresManualConversion,
  RISK_WARNING_THRESHOLDS,
  type PositionCalculationInput,
  type PositionCalculationSuccess,
} from './trading-calculations';

const eurusd = findInstrument('EURUSD');
const usdjpy = findInstrument('USDJPY');
const gold = findInstrument('XAUUSD');
const silver = findInstrument('XAGUSD');
const us30 = findInstrument('US30');

function input(overrides: Partial<PositionCalculationInput> = {}): PositionCalculationInput {
  return {
    instrument: eurusd,
    direction: 'buy',
    balance: 100,
    riskMode: 'percent',
    riskValue: 1,
    entry: 1.1,
    stopLoss: 1.098,
    takeProfit: 'empty',
    accountCurrency: 'USD',
    minimumLot: 0.01,
    lotIncrement: 0.01,
    manualQuoteToAccountRate: 'empty',
    ...overrides,
  };
}

function near(actual: number, expected: number, epsilon = 1e-8): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not near ${expected}`);
}

function success(overrides: Partial<PositionCalculationInput> = {}): PositionCalculationSuccess {
  const result = calculatePosition(input(overrides));
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected a successful calculation');
  }
  return result;
}

test('EURUSD USD account, $100, 1%, 20-pip stop has no 0.01 lot inside the budget', () => {
  const result = success();
  near(result.riskAmount, 1);
  near(result.riskPercent, 1);
  near(result.stopPips, 20);
  assert.equal(result.quoteToAccountRate, 1);
  assert.equal(result.conversionSource, 'quote-currency');
  near(result.theoreticalLots, 0.005);
  assert.equal(result.brokerLots, null);
  assert.equal(result.actualLoss, null);
  near(result.minimumPositionRisk, 2);
  assert.equal(result.warning, null);
});

test('a larger EURUSD budget rounds down onto the lot step and sizes reward from that lot', () => {
  const result = success({
    balance: 10_000,
    entry: 1.1,
    stopLoss: 1.098,
    takeProfit: 1.104,
  });
  near(result.riskAmount, 100);
  near(result.theoreticalLots, 0.5);
  near(result.brokerLots ?? NaN, 0.5);
  near(result.actualLoss ?? NaN, 100);
  near(result.reward ?? NaN, 200);
  near(result.riskRewardRatio ?? NaN, 2);
  near(result.takeProfitPips ?? NaN, 40);
});

test('EURUSD sell accepts a stop above entry and a target below entry', () => {
  const result = success({
    direction: 'sell',
    balance: 10_000,
    entry: 1.1,
    stopLoss: 1.102,
    takeProfit: 1.096,
  });
  near(result.stopPips, 20);
  near(result.brokerLots ?? NaN, 0.5);
  near(result.reward ?? NaN, 200);
  near(result.riskRewardRatio ?? NaN, 2);
});

test('buy and sell reject stops and targets on the wrong side', () => {
  const buyStop = calculatePosition(input({ stopLoss: 1.102 }));
  const sellStop = calculatePosition(input({ direction: 'sell', stopLoss: 1.098 }));
  const buyTarget = calculatePosition(input({ takeProfit: 1.09 }));
  const sellTarget = calculatePosition(input({ direction: 'sell', stopLoss: 1.102, takeProfit: 1.11 }));
  const equalStop = calculatePosition(input({ stopLoss: 1.1 }));

  assert.equal(buyStop.ok, false);
  assert.equal(sellStop.ok, false);
  assert.equal(buyTarget.ok, false);
  assert.equal(sellTarget.ok, false);
  assert.equal(equalStop.ok, false);
  if (!buyStop.ok && !sellStop.ok && !buyTarget.ok && !sellTarget.ok && !equalStop.ok) {
    assert.match(buyStop.errors[0].message, /buy/i);
    assert.match(sellStop.errors[0].message, /sell/i);
    assert.equal(buyTarget.errors.some((error) => error.field === 'takeProfit'), true);
    assert.equal(sellTarget.errors.some((error) => error.field === 'takeProfit'), true);
    assert.match(equalStop.errors[0].message, /different/i);
  }
});

test('switching between percent and cash preserves the risk amount', () => {
  assert.equal(cashRiskFromPercent(10_000, 1), 100);
  assert.equal(percentFromCashRisk(10_000, 100), 1);
  assert.equal(formatRiskInput(percentFromCashRisk(2500, 50)), '2');
  assert.equal(formatRiskInput(cashRiskFromPercent(100, 1)), '1');

  const fromPercent = success({ balance: 10_000, riskMode: 'percent', riskValue: 1 });
  const fromCash = success({ balance: 10_000, riskMode: 'amount', riskValue: 100 });
  assert.equal(fromCash.riskAmount, fromPercent.riskAmount);
  assert.equal(fromCash.riskPercent, fromPercent.riskPercent);
  assert.equal(fromCash.theoreticalLots, fromPercent.theoreticalLots);
});

test('USDJPY uses a 0.01 pip and converts from quote or base currency', () => {
  assert.equal(usdjpy?.spec?.pipSize, JPY_FOREX_PIP_SIZE);
  assert.notEqual(usdjpy?.spec?.pipSize, FOREX_PIP_SIZE);

  const quoteAccount = success({
    instrument: usdjpy,
    accountCurrency: 'JPY',
    balance: 2_000_000,
    entry: 150,
    stopLoss: 149.8,
    minimumLot: 0.01,
    lotIncrement: 0.01,
  });
  near(quoteAccount.stopPips, 20);
  assert.equal(quoteAccount.quoteToAccountRate, 1);
  near(quoteAccount.lossPerStandardLot, 20_000);
  near(quoteAccount.theoreticalLots, 1);
  near(quoteAccount.brokerLots ?? NaN, 1);

  const baseAccount = success({
    instrument: usdjpy,
    accountCurrency: 'USD',
    balance: 1000,
    riskValue: 1,
    entry: 150,
    stopLoss: 149.8,
  });
  assert.equal(baseAccount.conversionSource, 'base-price');
  assert.ok(Math.abs(baseAccount.quoteToAccountRate - 1 / 150) < 1e-12);
  assert.ok(Math.abs(baseAccount.theoreticalLots - 0.075) < 1e-12);
  assert.equal(baseAccount.brokerLots, 0.07);
  assert.ok(baseAccount.actualLoss !== null && baseAccount.actualLoss < baseAccount.riskAmount);
});

test('EURUSD account in the base currency converts with the pair price', () => {
  const result = success({
    accountCurrency: 'EUR',
    balance: 10_000,
    entry: 1.25,
    stopLoss: 1.248,
  });
  assert.equal(result.conversionSource, 'base-price');
  near(result.quoteToAccountRate, 0.8);
  near(result.lossPerStandardLot, 160);
  near(result.theoreticalLots, 0.625);
  assert.equal(result.brokerLots, 0.62);
});

test('a cross currency requires an entered rate and never assumes 1', () => {
  assert.equal(requiresManualConversion(eurusd?.spec ?? null, 'GBP'), true);
  const missing = calculatePosition(input({ accountCurrency: 'GBP', balance: 10_000 }));
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.errors.some((error) => error.field === 'conversion'), true);
    assert.equal(JSON.stringify(missing).includes('Infinity'), false);
    assert.equal(JSON.stringify(missing).includes('NaN'), false);
  }

  const entered = success({
    accountCurrency: 'GBP',
    balance: 10_000,
    manualQuoteToAccountRate: 0.8,
  });
  assert.equal(entered.conversionSource, 'manual');
  near(entered.quoteToAccountRate, 0.8);
  near(entered.lossPerStandardLot, 160);
});

test('gold uses the ounce contract and does not borrow the forex pip', () => {
  assert.equal(gold?.spec?.contractSize, GOLD_CONTRACT_SIZE_OUNCES);
  assert.equal(gold?.spec?.pipSize, GOLD_PIP_SIZE);
  assert.equal(gold?.spec?.brokerDependent, true);
  assert.notEqual(gold?.spec?.pipSize, FOREX_PIP_SIZE);
  assert.match(gold?.spec?.assumptionNote ?? '', /broker/i);

  const result = success({
    instrument: gold,
    balance: 10_000,
    riskValue: 10,
    entry: 2000,
    stopLoss: 1990,
  });
  assert.equal(result.lossPerStandardLot, 1000);
  assert.equal(result.stopPips, 1000);
  assert.equal(result.theoreticalLots, 1);
  assert.equal(result.brokerLots, 1);
  assert.match(result.assumptionNote ?? '', /100 troy ounces/);

  const needsRate = calculatePosition(
    input({
      instrument: gold,
      accountCurrency: 'EUR',
      balance: 10_000,
      riskValue: 10,
      entry: 2000,
      stopLoss: 1990,
    }),
  );
  assert.equal(needsRate.ok, false);
});

test('unconfigured instruments do not receive an invented size', () => {
  for (const instrument of [silver, us30]) {
    const result = calculatePosition(input({ instrument, balance: 10_000 }));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.errors[0].message, /no contract size or pip size/i);
    }
  }
});

test('broker lots step down from the minimum and never round up', () => {
  assert.equal(floorToLotIncrement(0.037, 0.01, 0.01), 0.03);
  assert.equal(floorToLotIncrement(0.02, 0.01, 0.01), 0.02);
  assert.equal(floorToLotIncrement(0.019, 0.01, 0.01), 0.01);
  assert.equal(floorToLotIncrement(0.009, 0.01, 0.01), null);
  assert.equal(floorToLotIncrement(0.049, 0.01, 0.02), 0.03);
  assert.equal(floorToLotIncrement(0.05, 0.01, 0.02), 0.05);

  const result = success({
    balance: 1000,
    riskValue: 0.74,
    minimumLot: 0.01,
    lotIncrement: 0.01,
  });
  near(result.theoreticalLots, 0.037);
  assert.equal(result.brokerLots, 0.03);
  assert.ok(result.actualLoss !== null && result.actualLoss <= result.riskAmount);
});

test('invalid balances, risk, prices, and lot settings are rejected', () => {
  const cases = [
    input({ balance: 0 as unknown as number }),
    input({ balance: 'empty' }),
    input({ balance: 'invalid' }),
    input({ riskValue: 0 as unknown as number }),
    input({ entry: 'invalid' }),
    input({ minimumLot: 'empty' }),
    input({ lotIncrement: 0 as unknown as number }),
  ];
  for (const candidate of cases) {
    const result = calculatePosition(candidate);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.length > 0);
      assert.equal(result.errors.some((error) => /NaN|Infinity/.test(error.message)), false);
    }
  }
});

test('risk warnings stay editable and do not block a finite size', () => {
  assert.equal(success({ riskValue: RISK_WARNING_THRESHOLDS.elevatedAbovePercent }).warning, null);

  const elevated = success({ riskValue: 2.5, balance: 10_000 });
  assert.equal(elevated.warning?.level, 'elevated');
  assert.equal(elevated.brokerLots, 1.25);

  const high = success({ riskValue: 6, balance: 10_000 });
  assert.equal(high.warning?.level, 'high');
  assert.equal(high.ok, true);

  const extreme = success({ riskMode: 'amount', riskValue: 150, balance: 100, minimumLot: 0.01 });
  assert.equal(extreme.warning?.level, 'extreme');
  assert.ok(extreme.theoreticalLots > 0);
  assert.equal(Number.isFinite(extreme.theoreticalLots), true);
});
