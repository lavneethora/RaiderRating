import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://registration.texastech.edu/*"],
  run_at: "document_idle",
}

function findCRNInputs(): HTMLInputElement[] {
  const inputs = document.querySelectorAll<HTMLInputElement>(
    'input[id*="crn" i], input[id*="CRN"], input[name*="crn" i]'
  )
  if (inputs.length > 0) return Array.from(inputs)
  const allInputs = document.querySelectorAll<HTMLInputElement>("input[type='text'], input:not([type])")
  const crnInputs: HTMLInputElement[] = []
  for (const input of allInputs) {
    const label = input.labels?.[0]
    if (label && /crn/i.test(label.textContent || "")) {
      crnInputs.push(input)
      continue
    }
    const parent = input.closest("div, td, tr")
    if (parent && /\bCRN\b/.test(parent.textContent || "")) {
      crnInputs.push(input)
    }
  }
  return crnInputs
}

function findAddButton(): HTMLElement | null {
  const links = document.querySelectorAll("a, button")
  for (const el of links) {
    if (/add\s+another\s+crn/i.test(el.textContent || "")) {
      return el as HTMLElement
    }
  }
  return null
}

function clickEnterCRNsTab(): boolean {
  const tabs = document.querySelectorAll("a, button, li, span")
  for (const el of tabs) {
    if (/^\s*enter\s+crns?\s*$/i.test(el.textContent || "")) {
      ;(el as HTMLElement).click()
      return true
    }
  }
  return false
}

function fillInput(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
  input.dispatchEvent(new Event("blur", { bubbles: true }))
}

function waitForElement(finder: () => HTMLElement | null, timeoutMs = 3000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const existing = finder()
    if (existing) { resolve(existing); return }
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 100
      if (elapsed > timeoutMs) {
        clearInterval(interval)
        reject(new Error("Timed out"))
        return
      }
      try {
        const el = finder()
        if (el) { clearInterval(interval); resolve(el) }
      } catch {
        clearInterval(interval)
        reject(new Error("Error finding element"))
      }
    }, 100)
  })
}

function waitForNewInput(currentCount: number): Promise<HTMLInputElement> {
  return new Promise((resolve, reject) => {
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 100
      if (elapsed > 3000) {
        clearInterval(interval)
        reject(new Error("Timed out waiting for new CRN input"))
        return
      }
      try {
        const inputs = findCRNInputs()
        if (inputs.length > currentCount) {
          clearInterval(interval)
          resolve(inputs[inputs.length - 1])
        }
      } catch {
        clearInterval(interval)
        reject(new Error("Error finding CRN inputs"))
      }
    }, 100)
  })
}

async function fillAllCRNs(crns: string[]): Promise<{ success: boolean; filled: number; error?: string }> {
  clickEnterCRNsTab()

  try {
    await waitForElement(() => findCRNInputs()[0] || null, 3000)
  } catch {
    return { success: false, filled: 0, error: "Could not find CRN inputs" }
  }

  try {
    const firstInput = findCRNInputs()[0]
    fillInput(firstInput, crns[0])
    let filled = 1

    for (let i = 1; i < crns.length; i++) {
      const addBtn = findAddButton()
      if (!addBtn) {
        return { success: false, filled, error: "Could not find Add Another CRN button" }
      }
      const countBefore = findCRNInputs().length
      addBtn.click()
      try {
        const newInput = await waitForNewInput(countBefore)
        fillInput(newInput, crns[i])
        filled++
      } catch {
        return { success: false, filled, error: `Timed out adding CRN ${i + 1}` }
      }
    }

    return { success: true, filled }
  } catch (err) {
    return { success: false, filled: 0, error: String(err) }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "fillCRNs" && Array.isArray(msg.crns)) {
    fillAllCRNs(msg.crns).then(sendResponse)
    return true
  }
})
