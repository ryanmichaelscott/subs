import { haversineDistance } from './distance.js'

let _data = null
let _promise = null

export function loadZipData() {
  if (_data) return Promise.resolve(_data)
  if (!_promise) {
    _promise = fetch('/data/zipData.json')
      .then(r => r.json())
      .then(d => { _data = d; return d })
  }
  return _promise
}

export function getZipInfo(zip) {
  return _data ? (_data[zip] ?? null) : null
}

export function getCountiesForState(stateAbbr) {
  if (!_data) return []
  const set = new Set()
  for (const e of Object.values(_data)) {
    if (e.state_abbr === stateAbbr) set.add(e.county)
  }
  return [...set].sort()
}

export function matchesServiceArea(serviceArea, memberZip) {
  if (!serviceArea || !memberZip || !_data) return false
  const member = _data[memberZip]
  if (!member) return false

  const { type, state, counties, zip: cZip, radius } = serviceArea

  if (type === 'statewide') return member.state_abbr === state

  if (type === 'county') {
    return member.state_abbr === state &&
      Array.isArray(counties) && counties.includes(member.county)
  }

  if (type === 'radius') {
    const contractor = _data[cZip]
    if (!contractor) return false
    return haversineDistance(contractor.lat, contractor.lng, member.lat, member.lng) <= radius
  }

  return false
}
