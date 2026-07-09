const COLUMNS = [
  { key: 'year', label: 'Year' },
  { key: 'buyerNetWorth', label: 'Buyer Net Worth' },
  { key: 'renterNetWorth', label: 'Renter Net Worth' },
  { key: 'renterCashFlow', label: 'Renter Cash Flow' },
  { key: 'landlordNetWorth', label: 'Buy & Rent Out Net Worth' },
  { key: 'landlordCashFlow', label: 'Buy & Rent Out Cash Flow' },
  { key: 'landlordPropertyEquity', label: 'Buy & Rent Out Property Equity' },
  { key: 'landlordInvestedSurplus', label: 'Buy & Rent Out Invested Surplus' },
  { key: 'homeValue', label: 'Home Value' },
  { key: 'monthlyRent', label: 'Monthly Rent' },
]

export function buildCsv(data) {
  const header = COLUMNS.map((c) => c.label).join(',')
  const rows = data.map((d) => COLUMNS.map((c) => d[c.key]).join(','))
  return [header, ...rows].join('\n')
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
