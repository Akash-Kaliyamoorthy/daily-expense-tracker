import { formatINR } from '../../utils/format';
import BrandMark from './BrandMark';

// Illustrative figures for the example month shown beside the form.
const SAMPLE = {
  salary: 125000,
  commitments: 56000,
  savings: 10000,
  days: 30,
};
const sampleToSpend = SAMPLE.salary - SAMPLE.commitments - SAMPLE.savings;

function LedgerLine({ label, value, sign = '', strong = false, highlight = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-ink-500/60 py-3 last:border-b-0">
      <dt className={strong ? 'font-medium text-white' : 'text-ink-200'}>{label}</dt>
      <dd
        className={`text-lg ${strong ? 'font-semibold text-white' : 'text-ink-100'} ${
          highlight ? 'rounded bg-marigold-400 px-2 py-0.5 text-ink-950' : ''
        }`}
      >
        {sign}
        {value}
      </dd>
    </div>
  );
}

/**
 * Shared frame for login and register. On large screens a worked example sits
 * beside the form, showing exactly what the app calculates.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <span className="font-display text-lg font-semibold">Daily Expense Tracker</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
          <p className="muted mt-2 leading-relaxed">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="muted mt-8 text-sm">{footer}</p>
        </div>
      </div>

      <aside
        className="hidden flex-col justify-center bg-ink-800 px-14 py-12 text-ink-100 lg:flex"
        aria-label="Example of the monthly budget"
      >
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-4xl font-semibold leading-tight text-white">
            Know what you can spend today.
          </h2>
          <p className="mt-4 leading-relaxed text-ink-200">
            Enter your salary, EMIs and fixed bills once a month. Log each expense in seconds. The
            app shows what is left for every remaining day.
          </p>

          <div className="mt-10 rounded-panel border border-ink-600 bg-ink-900/60 px-6 py-3">
            <p className="pt-3 text-sm text-ink-300">Example month with {SAMPLE.days} days</p>
            <dl>
              <LedgerLine label="Salary" value={formatINR(SAMPLE.salary)} />
              <LedgerLine
                label="EMIs and fixed bills"
                value={formatINR(SAMPLE.commitments)}
                sign="−"
              />
              <LedgerLine label="Savings goal" value={formatINR(SAMPLE.savings)} sign="−" />
              <LedgerLine label="Left to spend" value={formatINR(sampleToSpend)} strong />
              <LedgerLine
                label="Per day"
                value={formatINR(sampleToSpend / SAMPLE.days)}
                strong
                highlight
              />
            </dl>
          </div>
        </div>
      </aside>
    </div>
  );
}
