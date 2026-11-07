import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const STORAGE_KEY = "savedCRNs"

export interface SavedCRNData {
  crns: string[]
  savedAt: number
}

export async function saveCRNs(crns: string[]): Promise<void> {
  const data: SavedCRNData = { crns, savedAt: Date.now() }
  await storage.set(STORAGE_KEY, data)
}

export async function getSavedCRNs(): Promise<SavedCRNData | null> {
  const data = await storage.get<SavedCRNData>(STORAGE_KEY)
  return data ?? null
}

export async function clearCRNs(): Promise<void> {
  await storage.remove(STORAGE_KEY)
}
