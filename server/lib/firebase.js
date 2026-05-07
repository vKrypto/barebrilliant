import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import admin from 'firebase-admin'

let firestore = null

export function getFirestore() {
  return firestore
}

export async function initFirebase() {
  if (firestore) return firestore

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  if (json) {
    const parsed = JSON.parse(json)
    admin.initializeApp({ credential: admin.credential.cert(parsed) })
  } else if (credPath) {
    const filePath = resolve(credPath)
    const buf = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(buf)
    admin.initializeApp({ credential: admin.credential.cert(parsed) })
  } else {
    console.warn(
      '[firebase] Set GOOGLE_APPLICATION_CREDENTIALS (path) or FIREBASE_SERVICE_ACCOUNT_JSON to persist leads. Otherwise leads are only stored in server memory for development.',
    )
    return null
  }

  firestore = admin.firestore()
  return firestore
}
