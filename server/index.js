import 'dotenv/config'
import cors from 'cors'
import admin from 'firebase-admin'
import express from 'express'
import { appendLeadToFile } from './lib/appendLeadFile.js'
import { getFirestore, initFirebase } from './lib/firebase.js'

const app = express()
const port = Number(process.env.PORT) || 5001

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
  }),
)
app.use(express.json({ limit: '32kb' }))

const memLeads = []

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, firestore: Boolean(getFirestore()) })
})

app.post('/api/leads', async (req, res) => {
  const { name, countryCode, phone, budget, diamondPreference } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' })
  }
  if (typeof countryCode !== 'string' || !countryCode.trim()) {
    return res.status(400).json({ message: 'Country code is required' })
  }
  if (typeof phone !== 'string' || !String(phone).replace(/\D/g, '')) {
    return res.status(400).json({ message: 'Phone is required' })
  }
  if (typeof budget !== 'string' || !budget.trim()) {
    return res.status(400).json({ message: 'Budget is required' })
  }

  const safeDiamond =
    diamondPreference === 'natural' ||
    diamondPreference === 'lab' ||
    diamondPreference === 'none' ||
    diamondPreference == null
      ? diamondPreference || 'none'
      : 'none'

  const createdAt = new Date().toISOString()
  const record = {
    name: name.trim().slice(0, 200),
    countryCode: countryCode.trim().slice(0, 8),
    phone: String(phone).replace(/\D/g, '').slice(0, 20),
    budget: budget.trim().slice(0, 200),
    diamondPreference: safeDiamond,
  }

  const forFileAndMem = {
    ...record,
    source: 'lead-form',
    createdAt,
  }

  try {
    await appendLeadToFile(forFileAndMem)
  } catch (e) {
    console.error('[leads] file append failed', e)
  }

  memLeads.push(forFileAndMem)

  const db = getFirestore()
  if (db) {
    try {
      await db.collection('leads').add({
        ...record,
        source: 'lead-form',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } catch (e) {
      console.error('Firestore write failed', e)
      return res
        .status(500)
        .json({ message: 'Could not save your request. Please try again.' })
    }
  } else {
    console.info(
      '[leads] Firestore not configured; in-memory + file. mem count:',
      memLeads.length,
    )
  }

  return res.json({ ok: true, id: 'saved' })
})

;(async () => {
  try {
    await initFirebase()
  } catch (e) {
    console.error('Firebase init', e)
  }
  app.listen(port, () => {
    console.log(`API http://localhost:${port}`)
  })
})()
