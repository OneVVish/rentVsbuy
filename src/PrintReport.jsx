import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from './format.js'

const VEHICLE_LABELS = {
  stocks: {
    portfolio: 'Stock Portfolio',
    name: 'Stock Market',
    returnLabel: 'Stock Market Return',
    sourceLabel: '1928–2025 S&P 500 annual total returns',
  },
  treasuries: {
    portfolio: 'Treasury Portfolio',
    name: 'Treasury Bonds',
    returnLabel: 'Treasury Bond Return',
    sourceLabel: '1928–2025 10-year U.S. Treasury bond annual returns',
  },
  gold: {
    portfolio: 'Gold Portfolio',
    name: 'Gold',
    returnLabel: 'Gold Return',
    sourceLabel: '1972–2025 gold price annual changes',
  },
}

function InputRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-200 py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  )
}

export default function PrintReport({
  inputs,
  data,
  mortgagePayment,
  downPayment,
  breakEvenYear,
  finalYear,
  zipCode,
  zipMatch,
  monteCarlo,
}) {
  const buyerWinsAt30 = finalYear && finalYear.buyerNetWorth > finalYear.renterNetWorth
  const vehicle = VEHICLE_LABELS[inputs.investmentVehicle] ?? VEHICLE_LABELS.stocks
  const generatedOn = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="print-only bg-white p-10 text-slate-900">
      <header className="mb-6 border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-bold">Hyper-Local Rent vs. Buy Opportunity Cost Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generated {generatedOn}
          {zipCode && zipMatch ? ` — ${zipMatch.label} (${zipCode})` : ''}
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Bottom Line
        </h2>
        <p className="mb-3 text-base">
          {breakEvenYear
            ? `Buying overtakes renting's investment returns in year ${breakEvenYear}.`
            : "Over 30 years, investing the down payment beats buying in this scenario."}
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Mortgage (P&amp;I) / mo</p>
            <p className="text-lg font-bold">{formatCurrency(mortgagePayment, false)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Buyer Net Worth (Yr 30)</p>
            <p className={`text-lg font-bold ${buyerWinsAt30 ? 'text-indigo-600' : ''}`}>
              {finalYear ? formatCurrency(finalYear.buyerNetWorth, false) : '-'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Renter Net Worth (Yr 30)</p>
            <p className={`text-lg font-bold ${!buyerWinsAt30 ? 'text-emerald-600' : ''}`}>
              {finalYear ? formatCurrency(finalYear.renterNetWorth, false) : '-'}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6" style={{ breakInside: 'avoid' }}>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          30-Year Net Worth Projection
        </h2>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis
                stroke="#475569"
                tick={{ fill: '#475569', fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v)}
                width={65}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {breakEvenYear && (
                <ReferenceLine x={breakEvenYear} stroke="#f59e0b" strokeDasharray="4 4" />
              )}
              <Line
                type="monotone"
                dataKey="buyerNetWorth"
                name="Buying (Home Equity)"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="renterNetWorth"
                name={`Renting (${vehicle.portfolio})`}
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {monteCarlo && (
        <section className="mb-6" style={{ breakInside: 'avoid' }}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Monte Carlo Simulation
          </h2>
          <p className="mb-3 text-sm">
            Buying wins in <strong>{Math.round(monteCarlo.buyerWinProbability * 100)}%</strong> of{' '}
            {monteCarlo.trials} simulated 30-year scenarios, bootstrapped from real{' '}
            {vehicle.sourceLabel} and the 1987–2025 FRED Case-Shiller home price index.
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monteCarlo.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#475569" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v)}
                  width={65}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  payload={[
                    { value: 'Buying (median, 10th–90th pct)', type: 'line', color: '#6366f1' },
                    { value: `Renting (median, ${vehicle.portfolio})`, type: 'line', color: '#10b981' },
                  ]}
                />
                <Area
                  dataKey="buyerLow"
                  stackId="buyer"
                  stroke="none"
                  fill="transparent"
                  isAnimationActive={false}
                  legendType="none"
                />
                <Area
                  dataKey="buyerRange"
                  stackId="buyer"
                  stroke="none"
                  fill="#6366f1"
                  fillOpacity={0.15}
                  isAnimationActive={false}
                  legendType="none"
                />
                <Area
                  dataKey="renterLow"
                  stackId="renter"
                  stroke="none"
                  fill="transparent"
                  isAnimationActive={false}
                  legendType="none"
                />
                <Area
                  dataKey="renterRange"
                  stackId="renter"
                  stroke="none"
                  fill="#10b981"
                  fillOpacity={0.15}
                  isAnimationActive={false}
                  legendType="none"
                />
                <Line
                  type="monotone"
                  dataKey="buyerMedian"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  legendType="none"
                />
                <Line
                  type="monotone"
                  dataKey="renterMedian"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mb-6 grid grid-cols-2 gap-x-10" style={{ breakInside: 'avoid' }}>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            The Property
          </h2>
          <InputRow label="Home Price" value={formatCurrency(inputs.homePrice, false)} />
          <InputRow label="Monthly Rent (comparable)" value={formatCurrency(inputs.monthlyRent, false)} />

          <h2 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-slate-500">
            Homeownership Costs
          </h2>
          <InputRow label="Down Payment" value={`${inputs.downPaymentPct}% (${formatCurrency(downPayment, false)})`} />
          <InputRow label="Mortgage Rate" value={`${inputs.mortgageRate.toFixed(1)}%`} />
          <InputRow label="Property Tax Rate" value={`${inputs.propertyTaxRate.toFixed(2)}%`} />
          <InputRow label="Monthly HOA" value={formatCurrency(inputs.monthlyHOA, false)} />
          <InputRow label="Annual Home Insurance" value={formatCurrency(inputs.homeInsuranceAnnual, false)} />
          <InputRow label="Yearly Maintenance" value={formatCurrency(inputs.yearlyMaintenance, false)} />
          <InputRow label="Selling Costs" value={`${inputs.sellingCostPct.toFixed(1)}%`} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Taxes</h2>
          <InputRow label="CA Prop 13 Tax Cap" value={inputs.applyProp13Cap ? 'On' : 'Off'} />
          <InputRow
            label="Itemize Deductions"
            value={inputs.applyItemizedDeduction ? 'On' : 'Off'}
          />
          <InputRow label="Federal Marginal Tax Rate" value={`${inputs.marginalTaxRate}%`} />
          <InputRow label="Federal Capital Gains Tax Rate" value={`${inputs.capitalGainsTaxRate}%`} />
          <InputRow label="State Tax Rate" value={`${inputs.stateTaxRate.toFixed(1)}%`} />
          <InputRow
            label="Filing Status"
            value={inputs.marriedFilingJointly ? 'Married Filing Jointly' : 'Single'}
          />

          <h2 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-slate-500">
            Market Assumptions
          </h2>
          <InputRow label="Renter's Investment" value={vehicle.name} />
          <InputRow label={vehicle.returnLabel} value={`${inputs.stockReturn.toFixed(1)}%`} />
          <InputRow label="Home Appreciation" value={`${inputs.homeAppreciation.toFixed(1)}%`} />
          <InputRow label="Rent Inflation" value={`${inputs.rentInflation.toFixed(1)}%`} />
          <InputRow label="Insurance Inflation" value={`${inputs.insuranceInflation.toFixed(1)}%`} />
          <InputRow label="Maintenance Inflation" value={`${inputs.maintenanceInflation.toFixed(1)}%`} />
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-400">
        onevvish.github.io/rentVsbuy — Hyper-Local Rent vs. Buy Opportunity Cost Calculator.
        Figures are illustrative projections based on the assumptions above, not financial advice.
      </footer>
    </div>
  )
}
