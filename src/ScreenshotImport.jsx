import { useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'
import { Camera, Loader2, X } from 'lucide-react'
import { parseZillowScreenshot } from './screenshotImport.js'

const FIELD_CONFIG = [
  { key: 'homePrice', label: 'Home Price', prefix: '$' },
  { key: 'monthlyRent', label: 'Monthly Rent', prefix: '$' },
  { key: 'propertyTaxRate', label: 'Property Tax Rate', prefix: '', suffix: '%' },
  { key: 'monthlyHOA', label: 'Monthly HOA', prefix: '$' },
]

export default function ScreenshotImport({ onApply }) {
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | processing | review | error
  const [draft, setDraft] = useState(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setStatus('processing')
    try {
      const worker = await createWorker('eng')
      const {
        data: { text },
      } = await worker.recognize(file)
      await worker.terminate()

      const parsed = parseZillowScreenshot(text)
      setDraft(parsed)
      setStatus('review')
    } catch {
      setStatus('error')
    }
  }

  const handleFieldChange = (key) => (e) => {
    const value = e.target.value === '' ? null : parseFloat(e.target.value)
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    const values = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => v != null && !Number.isNaN(v)),
    )
    onApply(values)
    setStatus('idle')
    setDraft(null)
  }

  const handleCancel = () => {
    setStatus('idle')
    setDraft(null)
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={status === 'processing'}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-indigo-400 hover:text-white disabled:opacity-60"
      >
        {status === 'processing' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Reading screenshot…
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" /> Import from Zillow Screenshot
          </>
        )}
      </button>
      {status === 'error' && (
        <p className="mt-1.5 text-xs text-amber-400">
          Couldn't read that image — try a clearer screenshot, or enter values manually.
        </p>
      )}

      {status === 'review' && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Review extracted values</h3>
              <button type="button" onClick={handleCancel} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Screenshot text recognition isn't perfect — check these before applying.
            </p>
            <div className="space-y-3">
              {FIELD_CONFIG.map(({ key, label, prefix, suffix }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-slate-300">{label}</label>
                  <div className="flex items-center gap-1">
                    {prefix && <span className="text-sm text-slate-500">{prefix}</span>}
                    <input
                      type="number"
                      value={draft[key] ?? ''}
                      onChange={handleFieldChange(key)}
                      placeholder="not found"
                      className="w-28 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-white placeholder-slate-600 focus:border-indigo-400 focus:outline-none"
                    />
                    {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
              >
                Apply to Calculator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
