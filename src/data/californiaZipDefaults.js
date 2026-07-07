// Approximate, illustrative market defaults for California ZIP codes.
// Sourced from general 2025/2026 metro-level home price and rent knowledge,
// not a live feed — treat as a reasonable starting point, not an appraisal.

// Exact matches for well-known ZIP codes, for a bit more precision in major metros.
export const CA_ZIP_OVERRIDES = {
  94102: { city: 'San Francisco', homePrice: 1150000, monthlyRent: 3100, propertyTaxRate: 1.18 },
  94110: { city: 'San Francisco (Mission)', homePrice: 1350000, monthlyRent: 3400, propertyTaxRate: 1.18 },
  94117: { city: 'San Francisco (Haight)', homePrice: 1500000, monthlyRent: 3500, propertyTaxRate: 1.18 },
  94301: { city: 'Palo Alto', homePrice: 3200000, monthlyRent: 4200, propertyTaxRate: 1.14 },
  94040: { city: 'Mountain View', homePrice: 2100000, monthlyRent: 3600, propertyTaxRate: 1.14 },
  94043: { city: 'Mountain View', homePrice: 2050000, monthlyRent: 3550, propertyTaxRate: 1.14 },
  95014: { city: 'Cupertino', homePrice: 2400000, monthlyRent: 3400, propertyTaxRate: 1.14 },
  95110: { city: 'San Jose', homePrice: 1150000, monthlyRent: 2900, propertyTaxRate: 1.17 },
  95125: { city: 'San Jose (Willow Glen)', homePrice: 1450000, monthlyRent: 3100, propertyTaxRate: 1.17 },
  94610: { city: 'Oakland (Piedmont Ave)', homePrice: 950000, monthlyRent: 2600, propertyTaxRate: 1.19 },
  94612: { city: 'Oakland (Downtown)', homePrice: 650000, monthlyRent: 2400, propertyTaxRate: 1.19 },
  94704: { city: 'Berkeley', homePrice: 1050000, monthlyRent: 2900, propertyTaxRate: 1.19 },
  90001: { city: 'Los Angeles (South LA)', homePrice: 550000, monthlyRent: 1900, propertyTaxRate: 1.16 },
  90024: { city: 'Los Angeles (Westwood)', homePrice: 1350000, monthlyRent: 3300, propertyTaxRate: 1.16 },
  90045: { city: 'Los Angeles (Westchester)', homePrice: 1150000, monthlyRent: 3000, propertyTaxRate: 1.16 },
  90210: { city: 'Beverly Hills', homePrice: 4200000, monthlyRent: 6000, propertyTaxRate: 1.16 },
  90291: { city: 'Venice', homePrice: 1900000, monthlyRent: 3600, propertyTaxRate: 1.16 },
  90401: { city: 'Santa Monica', homePrice: 1750000, monthlyRent: 3500, propertyTaxRate: 1.16 },
  90802: { city: 'Long Beach', homePrice: 700000, monthlyRent: 2200, propertyTaxRate: 1.16 },
  92037: { city: 'La Jolla', homePrice: 2100000, monthlyRent: 3800, propertyTaxRate: 1.14 },
  92101: { city: 'San Diego (Downtown)', homePrice: 850000, monthlyRent: 2800, propertyTaxRate: 1.14 },
  92109: { city: 'San Diego (Pacific Beach)', homePrice: 1150000, monthlyRent: 3100, propertyTaxRate: 1.14 },
  92130: { city: 'San Diego (Carmel Valley)', homePrice: 1550000, monthlyRent: 3600, propertyTaxRate: 1.14 },
  92602: { city: 'Irvine', homePrice: 1350000, monthlyRent: 3300, propertyTaxRate: 1.09 },
  92651: { city: 'Laguna Beach', homePrice: 2800000, monthlyRent: 4200, propertyTaxRate: 1.09 },
  92660: { city: 'Newport Beach', homePrice: 3100000, monthlyRent: 4400, propertyTaxRate: 1.09 },
  95814: { city: 'Sacramento (Downtown)', homePrice: 480000, monthlyRent: 2100, propertyTaxRate: 1.1 },
  95822: { city: 'Sacramento (Land Park)', homePrice: 460000, monthlyRent: 2000, propertyTaxRate: 1.1 },
  93101: { city: 'Santa Barbara', homePrice: 1750000, monthlyRent: 3300, propertyTaxRate: 1.09 },
  95060: { city: 'Santa Cruz', homePrice: 1350000, monthlyRent: 3200, propertyTaxRate: 1.09 },
  93701: { city: 'Fresno (Downtown)', homePrice: 320000, monthlyRent: 1400, propertyTaxRate: 1.04 },
  93720: { city: 'Fresno (North)', homePrice: 460000, monthlyRent: 1750, propertyTaxRate: 1.04 },
  93301: { city: 'Bakersfield', homePrice: 320000, monthlyRent: 1400, propertyTaxRate: 1.04 },
  95202: { city: 'Stockton', homePrice: 400000, monthlyRent: 1650, propertyTaxRate: 1.08 },
  95350: { city: 'Modesto', homePrice: 420000, monthlyRent: 1700, propertyTaxRate: 1.08 },
  92501: { city: 'Riverside', homePrice: 530000, monthlyRent: 2200, propertyTaxRate: 1.17 },
  92401: { city: 'San Bernardino', homePrice: 430000, monthlyRent: 1950, propertyTaxRate: 1.17 },
  91761: { city: 'Ontario', homePrice: 580000, monthlyRent: 2250, propertyTaxRate: 1.17 },
}

// Broader fallback bands keyed by 3-digit ZIP prefix range, used when the exact
// ZIP isn't in CA_ZIP_OVERRIDES. Covers the full CA ZIP range (900xx-961xx).
export const CA_REGION_BANDS = [
  { min: 900, max: 908, region: 'Los Angeles metro', homePrice: 950000, monthlyRent: 2800, propertyTaxRate: 1.16 },
  { min: 910, max: 912, region: 'San Fernando Valley / Glendale / Pasadena', homePrice: 1050000, monthlyRent: 2900, propertyTaxRate: 1.16 },
  { min: 913, max: 918, region: 'San Gabriel Valley / Santa Clarita / Inland Empire west', homePrice: 750000, monthlyRent: 2500, propertyTaxRate: 1.16 },
  { min: 919, max: 921, region: 'San Diego north county', homePrice: 950000, monthlyRent: 3000, propertyTaxRate: 1.14 },
  { min: 922, max: 925, region: 'San Diego / Riverside desert', homePrice: 620000, monthlyRent: 2300, propertyTaxRate: 1.15 },
  { min: 926, max: 928, region: 'Orange County / Inland Empire', homePrice: 1050000, monthlyRent: 3000, propertyTaxRate: 1.1 },
  { min: 930, max: 931, region: 'Ventura / Santa Barbara', homePrice: 1150000, monthlyRent: 2900, propertyTaxRate: 1.09 },
  { min: 932, max: 934, region: 'Central Coast', homePrice: 850000, monthlyRent: 2400, propertyTaxRate: 1.08 },
  { min: 935, max: 935, region: 'Bakersfield / Kern County', homePrice: 340000, monthlyRent: 1450, propertyTaxRate: 1.04 },
  { min: 936, max: 939, region: 'Fresno / Central Valley', homePrice: 380000, monthlyRent: 1550, propertyTaxRate: 1.04 },
  { min: 940, max: 941, region: 'San Francisco', homePrice: 1300000, monthlyRent: 3300, propertyTaxRate: 1.18 },
  { min: 942, max: 942, region: 'Sacramento', homePrice: 500000, monthlyRent: 2100, propertyTaxRate: 1.1 },
  { min: 943, max: 944, region: 'Peninsula (Palo Alto / San Mateo)', homePrice: 2200000, monthlyRent: 3800, propertyTaxRate: 1.14 },
  { min: 945, max: 946, region: 'East Bay (Oakland / Richmond)', homePrice: 850000, monthlyRent: 2600, propertyTaxRate: 1.19 },
  { min: 947, max: 947, region: 'Berkeley', homePrice: 1100000, monthlyRent: 2900, propertyTaxRate: 1.19 },
  { min: 948, max: 949, region: 'Marin / Peninsula south', homePrice: 1450000, monthlyRent: 3200, propertyTaxRate: 1.14 },
  { min: 950, max: 951, region: 'San Jose / Santa Cruz', homePrice: 1300000, monthlyRent: 3000, propertyTaxRate: 1.17 },
  { min: 952, max: 954, region: 'Stockton / Modesto / Central Valley', homePrice: 420000, monthlyRent: 1700, propertyTaxRate: 1.08 },
  { min: 955, max: 955, region: 'Vallejo / Napa', homePrice: 550000, monthlyRent: 2200, propertyTaxRate: 1.12 },
  { min: 956, max: 959, region: 'Sacramento metro', homePrice: 500000, monthlyRent: 2100, propertyTaxRate: 1.1 },
  { min: 960, max: 961, region: 'Northern California (Redding / Chico)', homePrice: 380000, monthlyRent: 1500, propertyTaxRate: 1.05 },
]

export const CA_STATEWIDE_DEFAULT = {
  region: 'California (statewide average)',
  homePrice: 785000,
  monthlyRent: 2600,
  propertyTaxRate: 1.1,
}

// California ZIP codes fall roughly in the 90001-96162 range.
function isCaliforniaZip(zip) {
  const num = Number(zip)
  return num >= 90001 && num <= 96162
}

export function getCaliforniaDefaults(zip) {
  if (!/^\d{5}$/.test(zip) || !isCaliforniaZip(zip)) {
    return null
  }

  const override = CA_ZIP_OVERRIDES[zip]
  if (override) {
    return { matchType: 'exact', label: override.city, ...override }
  }

  const prefix = Number(zip.slice(0, 3))
  const band = CA_REGION_BANDS.find((b) => prefix >= b.min && prefix <= b.max)
  if (band) {
    return { matchType: 'region', label: band.region, ...band }
  }

  return { matchType: 'statewide', label: CA_STATEWIDE_DEFAULT.region, ...CA_STATEWIDE_DEFAULT }
}
