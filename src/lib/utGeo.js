// Utah geography + contractor service-area coverage helpers.
// Shared by AdminServiceMaps and AdminMarketIntel.

// Utah counties — population-center anchor coords + "reach" (miles from anchor that
// still counts as inside the county, sized roughly to the populated area)
export const UT_COUNTIES = [
  { name: 'Salt Lake',  lat: 40.67, lng: -111.92, reach: 15, primary: true },
  { name: 'Utah',       lat: 40.25, lng: -111.68, reach: 20, primary: true },
  { name: 'Davis',      lat: 41.00, lng: -111.95, reach: 12, primary: true },
  { name: 'Weber',      lat: 41.24, lng: -111.97, reach: 12, primary: true },
  { name: 'Washington', lat: 37.10, lng: -113.55, reach: 20, primary: true },
  { name: 'Cache',      lat: 41.74, lng: -111.83, reach: 15 },
  { name: 'Tooele',     lat: 40.53, lng: -112.30, reach: 20 },
  { name: 'Summit',     lat: 40.65, lng: -111.50, reach: 20 },
  { name: 'Wasatch',    lat: 40.51, lng: -111.41, reach: 15 },
  { name: 'Box Elder',  lat: 41.51, lng: -112.02, reach: 20 },
  { name: 'Iron',       lat: 37.68, lng: -113.06, reach: 20 },
  { name: 'Morgan',     lat: 41.04, lng: -111.68, reach: 12 },
  { name: 'Juab',       lat: 39.71, lng: -111.84, reach: 20 },
  { name: 'Sanpete',    lat: 39.37, lng: -111.58, reach: 20 },
  { name: 'Sevier',     lat: 38.77, lng: -112.08, reach: 20 },
  { name: 'Carbon',     lat: 39.60, lng: -110.81, reach: 20 },
  { name: 'Emery',      lat: 39.02, lng: -110.96, reach: 25 },
  { name: 'Grand',      lat: 38.57, lng: -109.55, reach: 25 },
  { name: 'San Juan',   lat: 37.62, lng: -109.48, reach: 30 },
  { name: 'Uintah',     lat: 40.46, lng: -109.53, reach: 25 },
  { name: 'Duchesne',   lat: 40.30, lng: -110.01, reach: 25 },
  { name: 'Millard',    lat: 39.06, lng: -112.45, reach: 25 },
  { name: 'Beaver',     lat: 38.28, lng: -112.64, reach: 20 },
  { name: 'Garfield',   lat: 37.82, lng: -112.44, reach: 25 },
  { name: 'Kane',       lat: 37.05, lng: -112.53, reach: 25 },
  { name: 'Piute',      lat: 38.31, lng: -112.19, reach: 20 },
  { name: 'Wayne',      lat: 38.40, lng: -111.64, reach: 25 },
  { name: 'Rich',       lat: 41.83, lng: -111.32, reach: 20 },
  { name: 'Daggett',    lat: 40.99, lng: -109.72, reach: 25 },
]

export const STATE_COUNTIES = { UT: UT_COUNTIES }

// Utah zip → approx coords (major cities), with 3-digit prefix fallback
export const UT_ZIP_COORDS = {
  // Salt Lake County
  '84020': [40.52, -111.86], '84044': [40.70, -112.10], '84047': [40.61, -111.90],
  '84065': [40.52, -111.98], '84070': [40.58, -111.89], '84084': [40.62, -111.96],
  '84088': [40.60, -111.97], '84092': [40.57, -111.83], '84093': [40.59, -111.83],
  '84094': [40.57, -111.86], '84095': [40.56, -111.98], '84096': [40.51, -112.03],
  '84006': [40.61, -112.10], '84009': [40.54, -112.02], '84118': [40.65, -111.99],
  '84119': [40.69, -111.94], '84120': [40.69, -112.00], '84121': [40.62, -111.82],
  '84123': [40.66, -111.92], '84106': [40.71, -111.85], '84109': [40.70, -111.81],
  '84117': [40.66, -111.83], '84124': [40.68, -111.82], '84128': [40.70, -112.05],
  // Utah County
  '84003': [40.38, -111.80], '84004': [40.46, -111.77], '84005': [40.31, -112.01],
  '84042': [40.34, -111.72], '84043': [40.39, -111.85], '84045': [40.35, -111.90],
  '84057': [40.31, -111.71], '84058': [40.28, -111.72], '84059': [40.31, -111.72],
  '84062': [40.36, -111.74], '84097': [40.31, -111.67], '84601': [40.23, -111.66],
  '84604': [40.27, -111.65], '84606': [40.22, -111.63], '84651': [40.03, -111.73],
  '84653': [40.05, -111.67], '84655': [39.97, -111.79], '84660': [40.11, -111.65],
  '84663': [40.17, -111.61], '84664': [40.13, -111.58],
  // Davis County
  '84010': [40.89, -111.88], '84014': [40.92, -111.87], '84015': [41.11, -112.03],
  '84025': [40.98, -111.89], '84037': [41.03, -111.94], '84040': [41.09, -111.94],
  '84041': [41.06, -111.97], '84054': [40.85, -111.91], '84056': [41.12, -111.99],
  '84075': [41.09, -112.06], '84087': [40.87, -111.90],
  // Weber County
  '84067': [41.16, -112.03], '84401': [41.22, -111.97], '84403': [41.19, -111.94],
  '84404': [41.27, -112.00], '84405': [41.17, -111.97], '84414': [41.31, -111.96],
  '84315': [41.16, -112.12], '84310': [41.31, -111.83],
  // Washington County
  '84770': [37.10, -113.58], '84780': [37.13, -113.51], '84790': [37.07, -113.55],
  '84765': [37.13, -113.65], '84737': [37.18, -113.29], '84745': [37.20, -113.27],
  '84738': [37.17, -113.68], '84767': [37.19, -112.99],
  // Cache / Box Elder
  '84321': [41.74, -111.83], '84341': [41.77, -111.81], '84335': [41.84, -111.83],
  '84302': [41.51, -112.02], '84337': [41.71, -112.17],
  // Tooele
  '84074': [40.53, -112.30], '84029': [40.60, -112.46],
  // Summit / Wasatch / Morgan
  '84060': [40.65, -111.50], '84098': [40.69, -111.54], '84036': [40.64, -111.28],
  '84017': [40.92, -111.40], '84032': [40.51, -111.41], '84049': [40.51, -111.47],
  '84050': [41.04, -111.68],
  // Southern / rural
  '84720': [37.68, -113.06], '84721': [37.71, -113.06], '84648': [39.71, -111.84],
  '84627': [39.36, -111.59], '84642': [39.27, -111.64], '84701': [38.77, -112.08],
  '84501': [39.60, -110.81], '84532': [38.57, -109.55], '84535': [37.87, -109.34],
  '84511': [37.62, -109.48], '84078': [40.46, -109.53], '84066': [40.30, -109.99],
  '84021': [40.16, -110.40], '84624': [39.35, -112.58], '84631': [38.97, -112.32],
  '84713': [38.28, -112.64], '84759': [37.82, -112.44], '84741': [37.05, -112.53],
  '84028': [41.95, -111.39], '84023': [40.99, -109.72], '84775': [38.30, -111.42],
  '84747': [38.40, -111.64],
}

export const UT_PREFIX_COORDS = {
  '840': [40.72, -111.95], '841': [40.76, -111.89], '842': [41.22, -111.97],
  '843': [41.74, -111.83], '844': [41.22, -111.97], '845': [39.30, -110.50],
  '846': [40.23, -111.66], '847': [38.00, -112.50],
}

export function zipToCoords(zip) {
  const z = String(zip || '').replace(/\D/g, '').slice(0, 5)
  if (z.length < 5) return null
  if (UT_ZIP_COORDS[z]) return UT_ZIP_COORDS[z]
  return UT_PREFIX_COORDS[z.slice(0, 3)] || null
}

export function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Rough zip → state from the 3-digit prefix (Utah = 840-847)
export function zipToState(zip) {
  const p = parseInt(String(zip || '').replace(/\D/g, '').slice(0, 3), 10)
  if (isNaN(p)) return null
  if (p >= 840 && p <= 847) return 'UT'
  if (p >= 832 && p <= 839) return 'ID'
  if (p >= 800 && p <= 816) return 'CO'
  if (p >= 850 && p <= 865) return 'AZ'
  if (p >= 889 && p <= 898) return 'NV'
  if (p >= 820 && p <= 831) return 'WY'
  if (p >= 750 && p <= 799) return 'TX'
  if (p >= 900 && p <= 961) return 'CA'
  return null
}

// Nearest Utah county for a zip (null if zip isn't mappable)
export function zipToCountyName(zip) {
  const coords = zipToCoords(zip)
  if (!coords) return null
  let best = null
  let bestDist = Infinity
  for (const c of UT_COUNTIES) {
    const d = haversineMiles(coords[0], coords[1], c.lat, c.lng)
    if (d < bestDist) { bestDist = d; best = c.name }
  }
  return best
}

// Normalize a contractor's service_area (JSON, legacy joined-string, or null)
// into { kind: 'counties'|'radius'|'statewide', state, counties?, coords?, radius? }
export function parseServiceArea(raw) {
  if (!raw) return { kind: 'statewide', state: null }

  let sa = raw
  if (typeof sa === 'string') {
    try { sa = JSON.parse(sa) } catch { sa = null }
    if (!sa) {
      // Legacy admin-created format: "City, ST · 84043 · 25 radius"
      const str = String(raw)
      const zipMatch = str.match(/\b(\d{5})\b/)
      const stateMatch = str.match(/\b([A-Z]{2})\b/)
      const radiusMatch = str.match(/(\d+)\s*(?:mi|mile|radius)/i)
      if (zipMatch) {
        const coords = zipToCoords(zipMatch[1])
        if (coords) return { kind: 'radius', state: stateMatch?.[1] || 'UT', coords, radius: radiusMatch ? parseInt(radiusMatch[1]) : 25 }
      }
      return { kind: 'statewide', state: stateMatch?.[1] || null }
    }
  }

  const state = sa.state || null
  if (sa.type === 'radius' && sa.zip) {
    const coords = zipToCoords(sa.zip)
    if (coords) return { kind: 'radius', state, coords, radius: parseInt(sa.radius) || 25 }
    return { kind: 'statewide', state }
  }
  if (sa.type === 'county' && sa.counties) {
    const list = (Array.isArray(sa.counties) ? sa.counties : String(sa.counties).split(','))
      .map(c => String(c).replace(/county/i, '').trim().toLowerCase())
      .filter(Boolean)
    if (list.length) return { kind: 'counties', state, counties: list }
  }
  return { kind: 'statewide', state }
}

export function coversCounty(sa, county, stateCode) {
  if (sa.state && sa.state !== stateCode) return false
  if (county.statewide) return true
  if (sa.kind === 'statewide') return true
  if (sa.kind === 'counties') return sa.counties.includes(county.name.toLowerCase())
  if (sa.kind === 'radius') {
    return haversineMiles(sa.coords[0], sa.coords[1], county.lat, county.lng) <= sa.radius + county.reach
  }
  return false
}

// Short human label for a contractor's service area
export function serviceAreaLabel(sa) {
  if (sa.kind === 'counties') return sa.counties.map(c => c.replace(/\b\w/g, m => m.toUpperCase())).join(', ')
  if (sa.kind === 'radius') {
    const county = (() => {
      let best = null, bestDist = Infinity
      for (const c of UT_COUNTIES) {
        const d = haversineMiles(sa.coords[0], sa.coords[1], c.lat, c.lng)
        if (d < bestDist) { bestDist = d; best = c.name }
      }
      return best
    })()
    return county ? `${county} +${sa.radius}mi` : `${sa.radius}mi radius`
  }
  return sa.state ? `${sa.state} statewide` : 'Statewide'
}
