import type { PlasmoCSConfig } from "plasmo"
import { Storage } from "@plasmohq/storage"
import { getSavedCRNs } from "~lib/crn-storage"

const storage = new Storage()

export const config: PlasmoCSConfig = {
  matches: ["https://registration.texastech.edu/*"],
  run_at: "document_idle",
}

const BUTTON_ID = "raiderrating-crn-fill"

function createFillButton(count: number): HTMLButtonElement {
  const btn = document.createElement("button")
  btn.id = BUTTON_ID
  btn.type = "button"
  btn.textContent = `Fill ${count} CRNs from Schedule Builder`
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "999999",
    padding: "12px 20px",
    background: "#CC0000",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
  })
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#a00000"
  })
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) btn.style.background = "#CC0000"
  })
  return btn
}

function findCRNInputs(): HTMLInputElement[] {
  const inputs = document.querySelectorAll<HTMLInputElement>(
    'input[id*="crn" i], input[id*="CRN"], input[name*="crn" i]'
  )
  if (inputs.length > 0) return Array.from(inputs)
  const allInputs = document.querySelectorAll<HTMLInputElement>("input[type='text'], input:not([type])")
  const crnInputs: HTMLInputElement[] = []
  for (const input of allInputs) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
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

function fillInput(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
  input.dispatchEvent(new Event("blur", { bubbles: true }))
}

function waitForNewInput(currentCount: number): Promise<HTMLInputElement> {
  return new Promise((resolve, reject) => {
    let elapsed = 0
    const interval = setInterval(() => {
      const inputs = findCRNInputs()
      if (inputs.length > currentCount) {
        clearInterval(interval)
        resolve(inputs[inputs.length - 1])
        return
      }
      elapsed += 100
      if (elapsed > 3000) {
        clearInterval(interval)
        reject(new Error("Timed out waiting for new CRN input"))
      }
    }, 100)
  })
}

async function fillAllCRNs(crns: string[], btn: HTMLButtonElement) {
  btn.disabled = true
  btn.style.background = "#999"
  btn.textContent = "Filling..."
  btn.style.cursor = "default"

  try {
    const existingInputs = findCRNInputs()
    if (existingInputs.length === 0) {
      btn.textContent = "Could not find CRN inputs"
      btn.style.background = "#F44336"
      return
    }

    fillInput(existingInputs[0], crns[0])

    for (let i = 1; i < crns.length; i++) {
      const addBtn = findAddButton()
      if (!addBtn) {
        btn.textContent = `Filled ${i}/${crns.length} (could not find Add button)`
        btn.style.background = "#FF9800"
        return
      }
      const countBefore = findCRNInputs().length
      addBtn.click()
      try {
        const newInput = await waitForNewInput(countBefore)
        fillInput(newInput, crns[i])
      } catch {
        btn.textContent = `Filled ${i}/${crns.length} (timed out)`
        btn.style.background = "#FF9800"
        return
      }
    }

    btn.textContent = `Filled ${crns.length} CRNs`
    btn.style.background = "#4CAF50"
  } catch (err) {
    btn.textContent = "Error filling CRNs"
    btn.style.background = "#F44336"
    console.error("[RaiderRating] CRN fill error:", err)
  }
}

async function init() {
  const data = await getSavedCRNs()
  if (!data || data.crns.length === 0) return

  const existing = document.getElementById(BUTTON_ID)
  if (existing) existing.remove()

  const btn = createFillButton(data.crns.length)
  btn.addEventListener("click", () => fillAllCRNs(data.crns, btn))
  document.body.appendChild(btn)
}

init()

storage.watch({
  savedCRNs: () => {
    init()
  },
})
