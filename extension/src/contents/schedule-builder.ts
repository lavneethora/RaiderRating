import type { PlasmoCSConfig } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { isValidProfessorName } from "~lib/name-parser"
import type { ProfessorRating, BatchLookupResponse } from "~lib/types"

const storage = new Storage()

export const config: PlasmoCSConfig = {
  matches: ["https://schedulebuilder.ttu.edu/*"],
  run_at: "document_idle",
}

const DEBUG = process.env.NODE_ENV === "development"
const BADGE_ATTR = "data-proflens"
const PROCESSED_ATTR = "data-proflens-processed"

function getRatingColor(rating: number): string {
  if (rating >= 4.0) return "#4CAF50"
  if (rating >= 3.0) return "#FFC107"
  return "#F44336"
}

function getTextColor(rating: number): string {
  if (rating >= 3.0 && rating < 4.0) return "#333"
  return "#fff"
}

function el(tag: string, styles: Record<string, string>, text?: string): HTMLElement {
  const node = document.createElement(tag)
  Object.assign(node.style, styles)
  if (text !== undefined) node.textContent = text
  return node
}

function createBadge(professor: ProfessorRating): HTMLElement {
  const badge = document.createElement("span")
  badge.setAttribute(BADGE_ATTR, "true")

  const rating = professor.avgRating
  const bgColor = professor.numRatings > 0 ? getRatingColor(rating) : "#9E9E9E"
  const textColor = professor.numRatings > 0 ? getTextColor(rating) : "#fff"

  Object.assign(badge.style, {
    display: "inline-block",
    marginLeft: "6px",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    background: bgColor,
    color: textColor,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    verticalAlign: "middle",
    lineHeight: "1.4",
    position: "relative",
  })

  if (professor.numRatings === 0) {
    badge.textContent = "No ratings"
  } else {
    const wtaText = professor.wouldTakeAgainPercent >= 0
      ? ` | ${professor.wouldTakeAgainPercent}% again`
      : ""
    badge.textContent = `⭐ ${rating.toFixed(1)} | Diff: ${professor.avgDifficulty.toFixed(1)}${wtaText}`
  }

  badge.addEventListener("click", (e) => {
    e.stopPropagation()
    e.preventDefault()
    showTooltip(badge, professor)
  })

  return badge
}

function createStatBox(value: string, label: string): HTMLElement {
  const box = el("div", {
    textAlign: "center",
    padding: "6px",
    background: "#f5f5f5",
    borderRadius: "6px",
  })
  box.appendChild(el("div", { fontSize: "16px", fontWeight: "700" }, value))
  box.appendChild(el("div", { fontSize: "10px", color: "#666" }, label))
  return box
}

function showTooltip(anchor: HTMLElement, prof: ProfessorRating) {
  const existing = document.getElementById("proflens-tooltip")
  if (existing) existing.remove()

  const tooltip = document.createElement("div")
  tooltip.id = "proflens-tooltip"
  Object.assign(tooltip.style, {
    position: "absolute",
    zIndex: "999999",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
    width: "280px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  })

  const ratingColor = prof.numRatings > 0 ? getRatingColor(prof.avgRating) : "#9E9E9E"

  const header = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "10px",
  })

  const ratingCircle = el("div", {
    width: "50px",
    height: "50px",
    borderRadius: "8px",
    background: ratingColor,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "700",
  }, prof.numRatings > 0 ? prof.avgRating.toFixed(1) : "?")

  const info = document.createElement("div")
  info.appendChild(el("div", { fontWeight: "700", fontSize: "14px" }, prof.name))
  info.appendChild(el("div", { color: "#666", fontSize: "12px" }, prof.department))

  header.appendChild(ratingCircle)
  header.appendChild(info)
  tooltip.appendChild(header)

  const statsGrid = el("div", {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    marginBottom: "12px",
  })

  const wtaDisplay = prof.wouldTakeAgainPercent >= 0
    ? `${prof.wouldTakeAgainPercent}%`
    : "N/A"

  statsGrid.appendChild(createStatBox(prof.avgDifficulty.toFixed(1), "Difficulty"))
  statsGrid.appendChild(createStatBox(wtaDisplay, "Take Again"))
  statsGrid.appendChild(createStatBox(String(prof.numRatings), "Reviews"))
  tooltip.appendChild(statsGrid)

  const link = document.createElement("a")
  link.href = prof.rmpUrl
  link.target = "_blank"
  link.rel = "noopener"
  link.textContent = "View on Rate My Professors"
  Object.assign(link.style, {
    display: "block",
    textAlign: "center",
    padding: "8px",
    background: "#2196F3",
    color: "#fff",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "600",
  })
  tooltip.appendChild(link)

  document.body.appendChild(tooltip)

  const rect = anchor.getBoundingClientRect()
  tooltip.style.left = `${rect.left + window.scrollX}px`
  tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`

  const tooltipRect = tooltip.getBoundingClientRect()
  if (tooltipRect.right > window.innerWidth) {
    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10 + window.scrollX}px`
  }

  const closeHandler = (e: MouseEvent) => {
    if (!tooltip.contains(e.target as Node) && e.target !== anchor) {
      tooltip.remove()
      document.removeEventListener("click", closeHandler)
    }
  }
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      tooltip.remove()
      document.removeEventListener("keydown", escHandler)
    }
  }

  setTimeout(() => {
    document.addEventListener("click", closeHandler)
    document.addEventListener("keydown", escHandler)
  }, 10)
}

function findProfessorElements(): Map<string, HTMLElement[]> {
  const nameMap = new Map<string, HTMLElement[]>()
  const namePattern = /^([A-Za-z'-]+),\s+([A-Za-z'-]+(?:\s+[A-Za-z'-]+)?)$/

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node.parentElement?.closest(`[${BADGE_ATTR}]`)) return NodeFilter.FILTER_REJECT
        if (node.parentElement?.closest("#proflens-tooltip")) return NodeFilter.FILTER_REJECT
        const text = node.textContent?.trim() || ""
        if (namePattern.test(text) && isValidProfessorName(text)) {
          return NodeFilter.FILTER_ACCEPT
        }
        return NodeFilter.FILTER_REJECT
      }
    }
  )

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text
    const name = textNode.textContent!.trim()
    const el = textNode.parentElement
    if (!el || el.hasAttribute(PROCESSED_ATTR)) continue

    const existing = nameMap.get(name) || []
    existing.push(el)
    nameMap.set(name, existing)
  }

  if (DEBUG && nameMap.size > 0) {
    console.log("[ProfLens] Found professors:", Array.from(nameMap.keys()))
  }

  return nameMap
}

function removeBadges() {
  document.querySelectorAll(`[${BADGE_ATTR}]`).forEach(el => el.remove())
  document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => el.removeAttribute(PROCESSED_ATTR))
  const tooltip = document.getElementById("proflens-tooltip")
  if (tooltip) tooltip.remove()
}

async function injectRatings() {
  if (!isEnabled) return

  const nameMap = findProfessorElements()
  if (nameMap.size === 0) return

  const names = Array.from(nameMap.keys())
  if (DEBUG) console.log("[ProfLens] Looking up:", names)

  try {
    const response: BatchLookupResponse = await sendToBackground({
      name: "lookup",
      body: { names },
    })

    for (const [name, elements] of nameMap) {
      const result = response.results[name]
      for (const elem of elements) {
        if (elem.hasAttribute(PROCESSED_ATTR)) continue
        elem.setAttribute(PROCESSED_ATTR, "true")

        if (result?.found && result.professor) {
          const badge = createBadge(result.professor)
          elem.appendChild(badge)
        } else if (result && !result.found) {
          const badge = document.createElement("span")
          badge.setAttribute(BADGE_ATTR, "true")
          Object.assign(badge.style, {
            display: "inline-block",
            marginLeft: "6px",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            background: "#eee",
            color: "#999",
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            verticalAlign: "middle",
          })
          badge.textContent = "Not on RMP"
          elem.appendChild(badge)
        }
      }
    }
  } catch (err) {
    console.error("[ProfLens] Injection error:", err)
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isEnabled = true

function debouncedInject() {
  if (!isEnabled) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(injectRatings, 500)
}

const observer = new MutationObserver(debouncedInject)

observer.observe(document.body, {
  childList: true,
  subtree: true,
})

storage.get<boolean>("enabled").then((val) => {
  isEnabled = val !== false
  if (isEnabled) debouncedInject()
})

storage.watch({
  enabled: (change) => {
    isEnabled = change.newValue !== false
    if (!isEnabled) {
      if (debounceTimer) clearTimeout(debounceTimer)
      removeBadges()
    } else {
      debouncedInject()
    }
  }
})

if (DEBUG) console.log("[ProfLens] Content script loaded, watching for professor names...")
