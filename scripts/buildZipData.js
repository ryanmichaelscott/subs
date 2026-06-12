import { createReadStream } from 'fs'
import { writeFile, mkdir } from 'fs/promises'
import { parse } from 'csv-parse'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.join(__dirname, '..', 'uszips.csv')
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'zipData.json')

const result = {}
let count = 0

const parser = createReadStream(CSV_PATH).pipe(
  parse({ columns: true, skip_empty_lines: true, trim: true })
)

for await (const row of parser) {
  const zip = row.zip
  const lat = parseFloat(row.lat)
  const lng = parseFloat(row.lng)
  const county = row.county_name
  const state = row.state_name
  const stateAbbr = row.state_id

  if (!zip || !county || !state || isNaN(lat) || isNaN(lng)) continue

  result[zip] = {
    county,
    state,
    state_abbr: stateAbbr,
    lat,
    lng,
  }
  count++
}

await mkdir(path.dirname(OUT_PATH), { recursive: true })
await writeFile(OUT_PATH, JSON.stringify(result))
console.log(`✓ Written ${count} zip codes to src/data/zipData.json`)
