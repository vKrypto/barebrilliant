import { appendFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

/** Default: ./data/leads.jsonl (one JSON object per line) relative to process.cwd() */
export function getLeadsFilePath() {
  return resolve(process.cwd(), process.env.LEADS_FILE || 'data/leads.jsonl')
}

/**
 * Appends a single lead as one JSON line (JSONL), UTF-8.
 * Creates the parent directory if needed.
 */
export async function appendLeadToFile(lead) {
  const filePath = getLeadsFilePath()
  const line = `${JSON.stringify(lead)}\n`
  await mkdir(dirname(filePath), { recursive: true })
  await appendFile(filePath, line, { encoding: 'utf8' })
}
