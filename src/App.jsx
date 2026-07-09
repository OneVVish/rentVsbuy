import { useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from './useDebouncedValue.js'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Building2,
  Check,
  Home,
  KeyRound,
  Landmark,
  LineChart as LineChartIcon,
  MapPin,
  Presentation,
  Printer,
  RotateCcw,
  Save,
  Share2,
  Trophy,
} from 'lucide-react'
import { getCaliforniaDefaults } from './data/californiaZipDefaults.js'
import { DEPRECIATION_PERIOD_YEARS, runSimulation } from './simulation.js'
import { runMonteCarlo } from './monteCarlo.js'
import { buildShareUrl, getStateFromUrl } from './shareState.js'
import { loadUserDefaults, saveUserDefaults } from './userDefaults.js'
import ScreenshotImport from './ScreenshotImport.jsx'
import PrintReport from './PrintReport.jsx'
import { formatCurrency } from './format.js'

function Slider({ label, value, onChange, min, max, step, format, accent = '#6366f1', description }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm font-semibold text-white tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--track-color': accent, '--track-fill': `${pct}%` }}
      />
      {description && <p className="mt-1.5 text-xs text-slate-500">{description}</p>}
    </div>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-300">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-indigo-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-indigo-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function StatCard({ label, value, accentClass }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${accentClass}`}>{value}</p>
    </div>
  )
}

const tooltipFormatter = (value, name) => [formatCurrency(value, false), name]

function MonteCarloTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
      <p className="mb-1 font-semibold">Year {label}</p>
      <p className="text-indigo-400">
        Buying: {formatCurrency(point.buyerMedian, false)} median (
        {formatCurrency(point.buyerP10, false)}–{formatCurrency(point.buyerP90, false)})
      </p>
      <p className="text-emerald-400">
        Renting: {formatCurrency(point.renterMedian, false)} median (
        {formatCurrency(point.renterP10, false)}–{formatCurrency(point.renterP90, false)})
      </p>
    </div>
  )
}

const DEFAULT_INPUTS = {
  homePrice: 650000,
  monthlyRent: 2800,
  downPaymentPct: 20,
  mortgageRate: 6.5,
  propertyTaxRate: 1.1,
  monthlyHOA: 250,
  homeInsuranceAnnual: 1200,
  yearlyMaintenance: 3000,
  applyProp13Cap: true,
  sellingCostPct: 7,
  applyItemizedDeduction: true,
  marginalTaxRate: 24,
  stateTaxRate: 9.3,
  stockReturn: 7,
  investmentVehicle: 'stocks',
  homeAppreciation: 3.5,
  rentInflation: 3,
  insuranceInflation: 4,
  maintenanceInflation: 3,
  capitalGainsTaxRate: 15,
  marriedFilingJointly: true,
  landValue: 130000,
  landlordOccupancyRate: 95,
  landlordManagementFeePct: 8,
}

const INVESTMENT_VEHICLES = {
  stocks: {
    label: 'Stock Market Return',
    portfolioLabel: 'Stock Portfolio',
    defaultReturn: 7,
    description:
      'S&P 500, bootstrapped from real 1987–2025 annual returns, matched to the same year\'s home-price movement, in Monte Carlo mode.',
    sourceLabel: '1987–2025 S&P 500 annual total returns (NYU Stern), matched by year to home prices',
  },
  treasuries: {
    label: 'Treasury Bond Return',
    portfolioLabel: 'Treasury Portfolio',
    defaultReturn: 4.5,
    description:
      '10-year U.S. Treasury bonds — steady and low-volatility, bootstrapped from real 1987–2025 returns matched by year to home prices.',
    sourceLabel: '1987–2025 10-year U.S. Treasury bond annual returns (NYU Stern), matched by year to home prices',
  },
  gold: {
    label: 'Gold Return',
    portfolioLabel: 'Gold Portfolio',
    defaultReturn: 5,
    description:
      'Gold price appreciation only (no yield) — historically choppier than stocks or bonds, bootstrapped from real 1987–2025 returns matched by year to home prices.',
    sourceLabel: '1987–2025 gold price annual changes (NYU Stern), matched by year to home prices',
  },
}

// Read once at module load — a shared link's inputs/chartView seed the initial state below.
const sharedState = getStateFromUrl()

export default function App() {
  const [inputs, setInputs] = useState(() => ({ ...DEFAULT_INPUTS, ...sharedState?.inputs }))
  const [copied, setCopied] = useState(false)
  const [savedDefaults, setSavedDefaults] = useState(false)

  const [zipCode, setZipCode] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const zipMatch = useMemo(() => getCaliforniaDefaults(zipCode), [zipCode])

  useEffect(() => {
    if (!zipMatch) return
    setInputs((prev) => ({
      ...prev,
      homePrice: zipMatch.homePrice,
      monthlyRent: zipMatch.monthlyRent,
      propertyTaxRate: zipMatch.propertyTaxRate,
    }))
  }, [zipMatch])

  const setField = (key) => (value) => setInputs((prev) => ({ ...prev, [key]: value }))

  const handleVehicleChange = (vehicle) =>
    setInputs((prev) => ({
      ...prev,
      investmentVehicle: vehicle,
      stockReturn: INVESTMENT_VEHICLES[vehicle].defaultReturn,
    }))

  const { data, mortgagePayment, downPayment, breakEvenYear } = useMemo(
    () => runSimulation(inputs),
    [inputs],
  )

  const finalYear = data[data.length - 1]

  const [chartView, setChartView] = useState(() => sharedState?.chartView ?? 'deterministic')
  // Sub-view within the "Buy & Rent Out" tab only — not persisted via Share
  // Scenario/Save Defaults, since it's a viewing preference, not an input.
  const [landlordSubView, setLandlordSubView] = useState('networth')

  // Monte Carlo runs 500 trials of a 30-year monthly simulation, so re-running it on every
  // slider-drag tick would jank the UI. Debounce it and let the deterministic view (cheap)
  // stay instantly responsive while a Monte Carlo recompute is pending.
  const debouncedInputs = useDebouncedValue(inputs, 300)
  const isMonteCarloStale = chartView === 'montecarlo' && debouncedInputs !== inputs

  const monteCarlo = useMemo(() => {
    if (chartView !== 'montecarlo') return null
    return runMonteCarlo(debouncedInputs)
  }, [debouncedInputs, chartView])

  const isMonteCarlo = chartView === 'montecarlo'
  const mcFinalYear = monteCarlo?.data[monteCarlo.data.length - 1]
  const mcBreakEvenPoint = monteCarlo?.data.find((d) => d.buyerMedian > d.renterMedian)

  const displayBreakEvenYear = isMonteCarlo ? (mcBreakEvenPoint?.year ?? null) : breakEvenYear
  const displayBuyerNetWorth = isMonteCarlo ? mcFinalYear?.buyerMedian : finalYear?.buyerNetWorth
  const displayRenterNetWorth = isMonteCarlo ? mcFinalYear?.renterMedian : finalYear?.renterNetWorth
  const buyerWinsAt30 =
    displayBuyerNetWorth != null &&
    displayRenterNetWorth != null &&
    displayBuyerNetWorth > displayRenterNetWorth

  const handleShare = async () => {
    const url = buildShareUrl({ inputs, chartView })
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard API may be unavailable; the URL bar itself is already updated.
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveDefaults = () => {
    saveUserDefaults(inputs)
    setSavedDefaults(true)
    setTimeout(() => setSavedDefaults(false), 2000)
  }

  const handleResetToDefaults = () => {
    setInputs({ ...DEFAULT_INPUTS, ...loadUserDefaults() })
    setZipCode('')
    setPropertyAddress('')
    setChartView('deterministic')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="no-print mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Hyper-Local Rent vs. Buy{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                Opportunity Cost
              </span>{' '}
              Calculator
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Most calculators ignore the opportunity cost of your down payment. This one invests
              it in the stock market and tracks a true 30-year net worth comparison.
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <a
              href={`${import.meta.env.BASE_URL}rent-vs-buy-pitch.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
            >
              <Presentation className="h-4 w-4" /> Pitch Deck
            </a>
            <button
              type="button"
              onClick={() => {
                // Nudge the hidden report's charts to remeasure before print layout kicks in.
                window.dispatchEvent(new Event('resize'))
                window.print()
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
            >
              <Printer className="h-4 w-4" /> Download PDF Report
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> Share Scenario
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSaveDefaults}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
            >
              {savedDefaults ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" /> Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save as My Defaults
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleResetToDefaults}
              title="Resets all inputs to your saved defaults (or the built-in defaults if none are saved)"
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" /> Reset to Defaults
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          {/* Inputs */}
          <div className="space-y-5">
            <SectionCard icon={Home} title="The Property">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Property Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main St, San Jose, CA 95123"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <label className="text-sm font-medium text-slate-300">
                    Zip Code (California)
                  </label>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="e.g. 94110"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                />
                {zipMatch && (
                  <p className="mt-1.5 text-xs text-emerald-400">
                    Loaded {zipMatch.matchType === 'exact' ? '' : `${zipMatch.matchType} `}defaults
                    for {zipMatch.label}
                  </p>
                )}
                {zipCode.length === 5 && !zipMatch && (
                  <p className="mt-1.5 text-xs text-amber-400">
                    Not recognized as a California zip code — only CA is supported right now.
                  </p>
                )}
              </div>
              <ScreenshotImport
                onApply={(values) => setInputs((prev) => ({ ...prev, ...values }))}
              />
              <Slider
                label="Home Price"
                value={inputs.homePrice}
                onChange={setField('homePrice')}
                min={100000}
                max={5000000}
                step={5000}
                format={(v) => formatCurrency(v)}
              />
              <Slider
                label="Monthly Rent (comparable)"
                value={inputs.monthlyRent}
                onChange={setField('monthlyRent')}
                min={500}
                max={10000}
                step={50}
                format={(v) => formatCurrency(v)}
              />
            </SectionCard>

            <SectionCard icon={Building2} title="Homeownership Costs">
              <Slider
                label="Down Payment"
                value={inputs.downPaymentPct}
                onChange={setField('downPaymentPct')}
                min={0}
                max={100}
                step={1}
                format={(v) => `${v}% (${formatCurrency(downPayment)})`}
              />
              <Slider
                label="Mortgage Rate"
                value={inputs.mortgageRate}
                onChange={setField('mortgageRate')}
                min={0}
                max={12}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <Slider
                label="Property Tax Rate"
                value={inputs.propertyTaxRate}
                onChange={setField('propertyTaxRate')}
                min={0}
                max={4}
                step={0.05}
                format={(v) => `${v.toFixed(2)}%`}
              />
              <Slider
                label="Monthly HOA"
                value={inputs.monthlyHOA}
                onChange={setField('monthlyHOA')}
                min={0}
                max={2000}
                step={10}
                format={(v) => formatCurrency(v)}
              />
              <Slider
                label="Annual Home Insurance"
                value={inputs.homeInsuranceAnnual}
                onChange={setField('homeInsuranceAnnual')}
                min={0}
                max={6000}
                step={50}
                format={(v) => formatCurrency(v)}
              />
              <Slider
                label="Yearly Maintenance"
                value={inputs.yearlyMaintenance}
                onChange={setField('yearlyMaintenance')}
                min={0}
                max={15000}
                step={100}
                format={(v) => formatCurrency(v)}
              />
              <Slider
                label="Selling Costs (when you sell)"
                value={inputs.sellingCostPct}
                onChange={setField('sellingCostPct')}
                min={0}
                max={12}
                step={0.5}
                format={(v) => `${v.toFixed(1)}%`}
              />
            </SectionCard>

            <SectionCard icon={Landmark} title="Taxes">
              <Toggle
                label="California Prop 13 Tax Cap"
                description="Caps the property-tax assessment's annual growth at 2%, even if the home appreciates faster."
                checked={inputs.applyProp13Cap}
                onChange={setField('applyProp13Cap')}
              />
              <Toggle
                label="Itemize Mortgage & Property Tax Deductions"
                description="Deducts mortgage interest (up to $750K of loan) and property tax (up to $10K SALT cap) when it exceeds the standard deduction."
                checked={inputs.applyItemizedDeduction}
                onChange={setField('applyItemizedDeduction')}
              />
              <Slider
                label="Federal Marginal Tax Rate"
                value={inputs.marginalTaxRate}
                onChange={setField('marginalTaxRate')}
                min={0}
                max={50}
                step={1}
                format={(v) => `${v}%`}
              />
              <Slider
                label="Federal Capital Gains Tax Rate"
                value={inputs.capitalGainsTaxRate}
                onChange={setField('capitalGainsTaxRate')}
                min={0}
                max={40}
                step={1}
                format={(v) => `${v}%`}
                accent="#818cf8"
              />
              <Slider
                label="State Tax Rate"
                value={inputs.stateTaxRate}
                onChange={setField('stateTaxRate')}
                min={0}
                max={13.3}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                accent="#34d399"
                description="California taxes capital gains as ordinary income, so this stacks on top of both the marginal and capital gains rates above."
              />
              <Toggle
                label="Married Filing Jointly"
                description="Sets the standard deduction ($30K vs $15K) and home-sale capital gains exclusion ($500K vs $250K) used above."
                checked={inputs.marriedFilingJointly}
                onChange={setField('marriedFilingJointly')}
              />
            </SectionCard>

            <SectionCard icon={LineChartIcon} title="Market Assumptions">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Renter's Investment
                </label>
                <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
                  {Object.entries(INVESTMENT_VEHICLES).map(([key, vehicle]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleVehicleChange(key)}
                      className={`flex-1 rounded-md px-3 py-1.5 font-medium capitalize transition ${
                        inputs.investmentVehicle === key
                          ? 'bg-indigo-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
              <Slider
                label={INVESTMENT_VEHICLES[inputs.investmentVehicle].label}
                value={inputs.stockReturn}
                onChange={setField('stockReturn')}
                min={0}
                max={15}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                accent="#34d399"
                description={INVESTMENT_VEHICLES[inputs.investmentVehicle].description}
              />
              <Slider
                label="Home Appreciation"
                value={inputs.homeAppreciation}
                onChange={setField('homeAppreciation')}
                min={0}
                max={10}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                accent="#818cf8"
              />
              <Slider
                label="Rent Inflation"
                value={inputs.rentInflation}
                onChange={setField('rentInflation')}
                min={0}
                max={10}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                accent="#34d399"
              />
              <Slider
                label="Insurance Inflation"
                value={inputs.insuranceInflation}
                onChange={setField('insuranceInflation')}
                min={0}
                max={10}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                accent="#818cf8"
              />
              <Slider
                label="Maintenance Inflation"
                value={inputs.maintenanceInflation}
                onChange={setField('maintenanceInflation')}
                min={0}
                max={10}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                accent="#34d399"
              />
            </SectionCard>

            <SectionCard icon={KeyRound} title="Landlord Scenario">
              <Slider
                label="Land Value"
                value={inputs.landValue}
                onChange={setField('landValue')}
                min={0}
                max={2000000}
                step={5000}
                format={(v) => formatCurrency(v)}
                accent="#f472b6"
                description="Excluded from depreciation — only the building (Home Price minus this) depreciates."
              />
              <Slider
                label="Occupancy Rate"
                value={inputs.landlordOccupancyRate}
                onChange={setField('landlordOccupancyRate')}
                min={0}
                max={100}
                step={1}
                format={(v) => `${v}%`}
                accent="#f472b6"
                description="Percent of the year the unit is actually rented; vacancy reduces rental income but not carrying costs."
              />
              <Slider
                label="Annual Management Fee"
                value={inputs.landlordManagementFeePct}
                onChange={setField('landlordManagementFeePct')}
                min={0}
                max={15}
                step={0.5}
                format={(v) => `${v.toFixed(1)}%`}
                accent="#f472b6"
                description="Property-management fee as a percentage of collected rent (0% if you self-manage)."
              />
            </SectionCard>
          </div>

          {/* Visualization */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 shadow-lg shadow-black/20">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      displayBreakEvenYear ? 'bg-indigo-500/20' : 'bg-emerald-500/20'
                    }`}
                  >
                    <Trophy
                      className={`h-5 w-5 ${
                        displayBreakEvenYear ? 'text-indigo-400' : 'text-emerald-400'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      Break-Even Point{isMonteCarlo && ' (Median)'}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {displayBreakEvenYear ? `Year ${displayBreakEvenYear}` : 'Renting Wins'}
                    </p>
                  </div>
                </div>
                <p className="max-w-xs text-sm text-slate-400">
                  {isMonteCarlo
                    ? displayBreakEvenYear
                      ? `In the median simulated scenario, buying overtakes renting in year ${displayBreakEvenYear}.`
                      : 'In the median simulated scenario, renting beats buying over 30 years.'
                    : displayBreakEvenYear
                      ? `Buying overtakes renting's investment returns in year ${displayBreakEvenYear}.`
                      : 'Over 30 years, investing the down payment beats buying in this scenario.'}
                </p>
              </div>

              <div
                className={`mt-5 grid grid-cols-2 gap-3 ${
                  chartView === 'landlord' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
                }`}
              >
                <StatCard
                  label="Mortgage (P&I) / mo"
                  value={formatCurrency(mortgagePayment, false)}
                  accentClass="text-white"
                />
                <StatCard
                  label={`Buyer Net Worth (Yr 30)${isMonteCarlo ? ', median' : ''}`}
                  value={displayBuyerNetWorth != null ? formatCurrency(displayBuyerNetWorth, false) : '-'}
                  accentClass={buyerWinsAt30 ? 'text-indigo-400' : 'text-slate-300'}
                />
                <StatCard
                  label={`Renter Net Worth (Yr 30)${isMonteCarlo ? ', median' : ''}`}
                  value={displayRenterNetWorth != null ? formatCurrency(displayRenterNetWorth, false) : '-'}
                  accentClass={!buyerWinsAt30 ? 'text-emerald-400' : 'text-slate-300'}
                />
                {chartView === 'landlord' && (
                  <StatCard
                    label="Buy & Rent Out Net Worth (Yr 30)"
                    value={finalYear ? formatCurrency(finalYear.landlordNetWorth, false) : '-'}
                    accentClass="text-pink-400"
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-300">30-Year Net Worth Projection</h3>
                <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartView('deterministic')}
                    className={`rounded-md px-3 py-1.5 font-medium transition ${
                      chartView === 'deterministic'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Deterministic
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('landlord')}
                    className={`rounded-md px-3 py-1.5 font-medium transition ${
                      chartView === 'landlord'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Buy & Rent Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('montecarlo')}
                    className={`rounded-md px-3 py-1.5 font-medium transition ${
                      chartView === 'montecarlo'
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Monte Carlo
                  </button>
                </div>
              </div>

              {chartView === 'landlord' && (
                <div className="mb-3 text-xs text-slate-400">
                  <p>
                    Models buying this property and renting it out at the same Monthly Rent used
                    for the renter comparison, instead of living in it, reduced by the Landlord
                    Scenario section's Occupancy Rate and Annual Management Fee. Assumes
                    straight-line depreciation over {DEPRECIATION_PERIOD_YEARS} years on the
                    building only (Home Price minus Land Value), and taxes the sale with standard
                    depreciation-recapture rules — 25% federal + state on recaptured depreciation,
                    ordinary capital-gains rates on any gain beyond that — with no
                    primary-residence exclusion, since this is a rental property. Rental losses are
                    assumed fully deductible against other income each year; real
                    passive-activity-loss limits and tenant turnover costs aren't modeled. Months
                    where the rental runs a cash-flow deficit draw down the Invested Surplus
                    (below) rather than coming from an untracked outside source — the same rule
                    applies to the Renter path whenever rent costs more than buying that month.
                    {landlordSubView === 'cashflow' &&
                      ' Cash flow is net of the tax effect above, including its one-year lag.'}
                    {landlordSubView === 'breakdown' &&
                      ' Property Equity is the after-tax value if sold that year; Invested Surplus is the after-tax value of reinvested cash flow.'}
                  </p>
                  <div className="mt-2 inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setLandlordSubView('networth')}
                      className={`rounded-md px-2.5 py-1 font-medium transition ${
                        landlordSubView === 'networth'
                          ? 'bg-indigo-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Net Worth
                    </button>
                    <button
                      type="button"
                      onClick={() => setLandlordSubView('cashflow')}
                      className={`rounded-md px-2.5 py-1 font-medium transition ${
                        landlordSubView === 'cashflow'
                          ? 'bg-indigo-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Cash Flow
                    </button>
                    <button
                      type="button"
                      onClick={() => setLandlordSubView('breakdown')}
                      className={`rounded-md px-2.5 py-1 font-medium transition ${
                        landlordSubView === 'breakdown'
                          ? 'bg-indigo-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Equity vs Investment
                    </button>
                  </div>
                </div>
              )}

              {chartView === 'montecarlo' && monteCarlo && (
                <div className="mb-3 space-y-1 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Buying wins in{' '}
                      <span className="font-semibold text-white">
                        {Math.round(monteCarlo.buyerWinProbability * 100)}%
                      </span>{' '}
                      of {monteCarlo.trials} simulated 30-year scenarios.
                      {isMonteCarloStale && (
                        <span className="ml-2 animate-pulse text-amber-400">Updating…</span>
                      )}
                    </span>
                    <span>Shaded bands show the 10th–90th percentile range.</span>
                  </div>
                  <p>
                    Each simulated year draws one real historical calendar year (1987–2025) and
                    applies that same year's {INVESTMENT_VEHICLES[inputs.investmentVehicle].label}{' '}
                    and home-price change together — so a simulated 2008 pairs the real
                    stock/bond/gold return with the real Case-Shiller home-price drop from 2008,
                    keeping downturns that historically hit both housing and investments together
                    paired. Both are re-centered to your{' '}
                    {INVESTMENT_VEHICLES[inputs.investmentVehicle].label} and Home Appreciation
                    sliders respectively.
                  </p>
                </div>
              )}

              <div
                className={`h-[420px] w-full transition-opacity ${
                  isMonteCarloStale ? 'opacity-60' : 'opacity-100'
                }`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'landlord' && landlordSubView === 'cashflow' ? (
                    <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="year"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        label={{ value: 'Years', position: 'insideBottom', offset: -3, fill: '#64748b' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(v) => formatCurrency(v)}
                        width={70}
                      />
                      <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={(year) => `Year ${year}`}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '0.75rem',
                          color: '#e2e8f0',
                        }}
                      />
                      <ReferenceLine y={0} stroke="#475569" />
                      <Bar dataKey="landlordCashFlow" name="Annual Cash Flow">
                        {data.map((d) => (
                          <Cell key={d.year} fill={d.landlordCashFlow >= 0 ? '#34d399' : '#f87171'} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : chartView === 'landlord' && landlordSubView === 'breakdown' ? (
                    <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="year"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        label={{ value: 'Years', position: 'insideBottom', offset: -3, fill: '#64748b' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(v) => formatCurrency(v)}
                        width={70}
                      />
                      <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={(year) => `Year ${year}`}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '0.75rem',
                          color: '#e2e8f0',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                      <Bar
                        dataKey="landlordPropertyEquity"
                        name="Property Equity"
                        stackId="landlord"
                        fill="#818cf8"
                      />
                      <Bar
                        dataKey="landlordInvestedSurplus"
                        name="Invested Surplus"
                        stackId="landlord"
                        fill="#f472b6"
                      />
                    </BarChart>
                  ) : chartView === 'deterministic' || chartView === 'landlord' ? (
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="year"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        label={{ value: 'Years', position: 'insideBottom', offset: -3, fill: '#64748b' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(v) => formatCurrency(v)}
                        width={70}
                      />
                      <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={(year) => `Year ${year}`}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '0.75rem',
                          color: '#e2e8f0',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                      {breakEvenYear && (
                        <ReferenceLine
                          x={breakEvenYear}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          label={{ value: 'Break-even', fill: '#f59e0b', fontSize: 11, position: 'top' }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="buyerNetWorth"
                        name="Buying (Home Equity)"
                        stroke="#818cf8"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="renterNetWorth"
                        name={`Renting (${INVESTMENT_VEHICLES[inputs.investmentVehicle].portfolioLabel})`}
                        stroke="#34d399"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      {chartView === 'landlord' && (
                        <Line
                          type="monotone"
                          dataKey="landlordNetWorth"
                          name="Buy & Rent Out"
                          stroke="#f472b6"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      )}
                    </LineChart>
                  ) : (
                    <ComposedChart
                      data={monteCarlo?.data ?? []}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="year"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        label={{ value: 'Years', position: 'insideBottom', offset: -3, fill: '#64748b' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(v) => formatCurrency(v)}
                        width={70}
                      />
                      <Tooltip content={<MonteCarloTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
                        payload={[
                          { value: 'Buying (median, 10th–90th pct)', type: 'line', color: '#818cf8' },
                          { value: 'Renting (median, 10th–90th pct)', type: 'line', color: '#34d399' },
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
                        fill="#818cf8"
                        fillOpacity={0.18}
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
                        fill="#34d399"
                        fillOpacity={0.18}
                        isAnimationActive={false}
                        legendType="none"
                      />
                      <Line
                        type="monotone"
                        dataKey="buyerMedian"
                        stroke="#818cf8"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                        legendType="none"
                      />
                      <Line
                        type="monotone"
                        dataKey="renterMedian"
                        stroke="#34d399"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                        legendType="none"
                      />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrintReport
        inputs={inputs}
        data={data}
        mortgagePayment={mortgagePayment}
        downPayment={downPayment}
        breakEvenYear={breakEvenYear}
        finalYear={finalYear}
        zipCode={zipCode}
        zipMatch={zipMatch}
        propertyAddress={propertyAddress}
        monteCarlo={monteCarlo}
        chartView={chartView}
      />
    </div>
  )
}
