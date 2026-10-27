
'use client';

import { useState } from 'react';

export default function InvoiceLateFeeCalculator() {
  const [amount, setAmount] = useState('1000');
  const [annualRate, setAnnualRate] = useState('8');
  const [daysOverdue, setDaysOverdue] = useState('30');
  const [currency, setCurrency] = useState('KES');
  const [result, setResult] = useState<{
    fee: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState('');

  function calculateFee() {
    const principal = Number(amount);
    const rate = Number(annualRate);
    const days = Number(daysOverdue);

    if (
      amount.trim() === '' ||
      annualRate.trim() === '' ||
      daysOverdue.trim() === '' ||
      !Number.isFinite(principal) ||
      !Number.isFinite(rate) ||
      !Number.isFinite(days) ||
      principal <= 0 ||
      rate < 0 ||
      days < 0 ||
      !Number.isInteger(days)
    ) {
      setError(
        'Enter a positive invoice amount, a non-negative annual rate, and a whole number of overdue days.'
      );
      setResult(null);
      return;
    }

    const fee = principal * (rate / 100) * (days / 365);

    setError('');
    setResult({
      fee,
      total: principal + fee,
    });
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <a
          href="/"
          className="text-sm text-indigo-700 hover:underline"
        >
          ← Back to home
        </a>

        <header className="mb-8 mt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
            Free business tool
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Invoice Late Fee Calculator
          </h1>
          <p className="mt-3 text-slate-600">
            Estimate the late fee on an overdue invoice using a simple
            annual-rate calculation.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="currency"
                className="mb-1 block text-sm font-medium"
              >
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value);
                  setResult(null);
                }}
                className="w-full rounded-lg border border-slate-300 p-3"
              >
                <option value="KES">KES · Kenyan shilling</option>
                <option value="USD">USD · US dollar</option>
                <option value="GBP">GBP · British pound</option>
                <option value="EUR">EUR · Euro</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-1 block text-sm font-medium"
              >
                Original invoice amount
              </label>
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setResult(null);
                }}
                className="w-full rounded-lg border border-slate-300 p-3"
                placeholder="e.g. 10000"
              />
            </div>

            <div>
              <label
                htmlFor="rate"
                className="mb-1 block text-sm font-medium"
              >
                Annual late fee rate (%)
              </label>
              <input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                value={annualRate}
                onChange={(event) => {
                  setAnnualRate(event.target.value);
                  setResult(null);
                }}
                className="w-full rounded-lg border border-slate-300 p-3"
                placeholder="e.g. 8"
              />
            </div>

            <div>
              <label
                htmlFor="days"
                className="mb-1 block text-sm font-medium"
              >
                Days overdue
              </label>
              <input
                id="days"
                type="number"
                min="0"
                step="1"
                value={daysOverdue}
                onChange={(event) => {
                  setDaysOverdue(event.target.value);
                  setResult(null);
                }}
                className="w-full rounded-lg border border-slate-300 p-3"
                placeholder="e.g. 30"
              />
            </div>

            <button
              type="button"
              onClick={calculateFee}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Calculate late fee
            </button>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            {result && (
              <div
                aria-live="polite"
                className="space-y-4 rounded-xl bg-indigo-50 p-5"
              >
                <div>
                  <p className="text-sm text-slate-600">
                    Estimated late fee
                  </p>
                  <p className="text-2xl font-bold text-indigo-800">
                    {formatMoney(result.fee)}
                  </p>
                </div>

                <div className="border-t border-indigo-200 pt-4">
                  <p className="text-sm text-slate-600">
                    Total estimated amount owed
                  </p>
                  <p className="text-3xl font-bold">
                    {formatMoney(result.total)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const summary = [
                      'Invoice Late Fee Estimate',
                      `Original amount: ${formatMoney(Number(amount))}`,
                      `Annual rate: ${annualRate}%`,
                      `Days overdue: ${daysOverdue}`,
                      `Estimated fee: ${formatMoney(result.fee)}`,
                      `Estimated total: ${formatMoney(result.total)}`,
                    ].join('\n');

                    void navigator.clipboard.writeText(summary);
                  }}
                  className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium hover:bg-indigo-100"
                >
                  Copy calculation
                </button>
              </div>
            )}
          </div>
        </section>

        <p className="mt-5 text-sm leading-6 text-slate-600">
          This estimate uses simple interest: invoice amount × annual rate
          × days overdue ÷ 365. It assumes the rate is applicable for the
          full overdue period. Actual charges depend on the contract,
          applicable law, and any relevant payment terms. This calculator
          does not determine whether a fee is legally permitted.
        </p>
      </div>
    </main>
  );
}
