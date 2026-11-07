import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://registration.texastech.edu/*"],
  run_at: "document_idle",
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function findCRNInputs(): HTMLInputElement[] {
  const byId = document.querySelectorAll<HTMLInputElement>(
    'input[id^="txt_crn"], input[id^="txtCrn"], input[id*="CRN_IN"], input[name*="CRN_IN"]'
  )
  if (byId.length > 0) return Array.from(byId)

  const byCaseInsensitive = document.querySelectorAll<HTMLInputElement>(
    'input[id*="crn" i]'
  )
  if (byCaseInsensitive.length > 0) return Array.from(byCaseInsensitive)

  const allInputs = document.querySelectorAll<HTMLInputElement>(
    "input[type='text'], input:not([type])"
  )
  const crnInputs: HTMLInputElement[] = []
  for (const input of allInputs) {
    const label = input.labels?.[0]
    if (label) {
      const labelText = (label.textContent || "").trim()
      if (/^CRN$/i.test(labelText)) {
        crnInputs.push(input)
        continue
      }
    }
    const parent = input.closest("div, td, tr, span")
    if (parent) {
      const directText = Array.from(parent.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => (n.textContent || "").trim())
        .join(" ")
      if (/^CRN$/i.test(directText)) {
        crnInputs.push(input)
      }
    }
  }
  return crnInputs
}

function findAddButton(): HTMLElement | null {
  const els = document.querySelectorAll("a, button")
  for (const el of els) {
    if (/add\s+another\s+crn/i.test(el.textContent || "")) {
      return el as HTMLElement
    }
  }
  return null
}

function clickEnterCRNsTab(): boolean {
  const tab = document.querySelector<HTMLElement>(
    'a[id*="enterCRN" i], a[id*="enter-crn" i], a[id*="entercrn" i]'
  )
  if (tab) {
    tab.click()
    return true
  }

  const links = document.querySelectorAll("a")
  for (const link of links) {
    const text = (link.textContent || "").trim()
    if (/^enter\s+crns?$/i.test(text)) {
      link.click()
      return true
    }
  }

  const allEls = document.querySelectorAll("li, span, button, div")
  for (const el of allEls) {
    const text = (el.textContent || "").trim()
    if (/^enter\s+crns?$/i.test(text)) {
      const innerLink = el.querySelector("a")
      ;(innerLink || (el as HTMLElement)).click()
      return true
    }
  }

  return false
}

async function typeValue(input: HTMLInputElement, value: string) {
  input.focus()
  input.dispatchEvent(new FocusEvent("focus", { bubbles: true }))
  input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
  await delay(50)

  input.value = ""
  for (const char of value) {
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: char,
        code: `Digit${char}`,
        keyCode: 48 + parseInt(char),
        which: 48 + parseInt(char),
        bubbles: true,
        cancelable: true,
      } as KeyboardEventInit)
    )
    input.dispatchEvent(
      new KeyboardEvent("keypress", {
        key: char,
        code: `Digit${char}`,
        keyCode: 48 + parseInt(char),
        which: 48 + parseInt(char),
        bubbles: true,
        cancelable: true,
      } as KeyboardEventInit)
    )

    input.value += char

    input.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: char,
        inputType: "insertText",
      })
    )
    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: char,
        code: `Digit${char}`,
        keyCode: 48 + parseInt(char),
        which: 48 + parseInt(char),
        bubbles: true,
      } as KeyboardEventInit)
    )
    await delay(30)
  }

  input.dispatchEvent(new Event("change", { bubbles: true }))
}

function blurAway(input: HTMLInputElement) {
  input.dispatchEvent(new FocusEvent("blur", { bubbles: false }))
  input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
  document.body.click()
}

function waitForNewInput(currentCount: number): Promise<HTMLInputElement> {
  return new Promise((resolve, reject) => {
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 100
      if (elapsed > 5000) {
        clearInterval(interval)
        reject(new Error("Timed out"))
        return
      }
      const inputs = findCRNInputs()
      if (inputs.length > currentCount) {
        clearInterval(interval)
        resolve(inputs[inputs.length - 1])
      }
    }, 100)
  })
}

async function fillAllCRNs(
  crns: string[]
): Promise<{ success: boolean; filled: number; error?: string }> {
  if (!crns || crns.length === 0) {
    return { success: false, filled: 0, error: "No CRNs provided" }
  }

  clickEnterCRNsTab()
  await delay(1000)

  let inputs = findCRNInputs()
  if (inputs.length === 0) {
    return { success: false, filled: 0, error: "Could not find CRN inputs" }
  }

  let filled = 0

  for (let i = 0; i < crns.length; i++) {
    if (i >= inputs.length) {
      const addBtn = findAddButton()
      if (!addBtn) {
        return {
          success: false,
          filled,
          error: "Could not find Add Another CRN button",
        }
      }
      const countBefore = inputs.length
      addBtn.click()
      try {
        await waitForNewInput(countBefore)
        await delay(500)
        inputs = findCRNInputs()
      } catch {
        return {
          success: false,
          filled,
          error: `Timed out adding CRN ${i + 1}`,
        }
      }
    }

    await typeValue(inputs[i], crns[i])
    await delay(200)
    blurAway(inputs[i])
    await delay(1500)
    inputs = findCRNInputs()
    filled++
  }

  return { success: true, filled }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return
  if (msg?.type !== "fillCRNs" || !Array.isArray(msg.crns)) return
  const crns = msg.crns.filter(
    (c: unknown): c is string => typeof c === "string" && /^\d{5}$/.test(c)
  )
  if (crns.length === 0) {
    sendResponse({ success: false, filled: 0, error: "No valid CRNs" })
    return true
  }
  fillAllCRNs(crns).then(sendResponse)
  return true
})
