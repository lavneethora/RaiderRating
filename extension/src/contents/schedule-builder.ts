import type { PlasmoCSConfig } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { isValidProfessorName } from "~lib/name-parser"
import type {
  ProfessorRating,
  BatchLookupResponse,
  GradeEntry,
  GradeBatchResponse,
} from "~lib/types"

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

// Walks up from a professor name node to find the closest ancestor whose
// innerText contains a course code like "CS 1382". Filters out building/room
// codes (5-digit numbers) by requiring exactly 4 digits and no trailing digit.
const COURSE_CODE_RE = /\b([A-Z]{2,5})\s+(\d{4})(?!\d)/
const MAX_ANCESTOR_DEPTH = 30

function extractCourseCode(textNode: Text): string | null {
  let node: HTMLElement | null = textNode.parentElement
  for (let i = 0; i < MAX_ANCESTOR_DEPTH && node; i++) {
    const txt = (node.innerText || "").replace(/\s+/g, " ")
    const m = txt.match(COURSE_CODE_RE)
    if (m) return `${m[1]} ${m[2]}`
    node = node.parentElement
  }
  return null
}

function createBadge(
  professor: ProfessorRating,
  courseCode: string | null = null,
  gradeEntry: GradeEntry | null = null,
): HTMLElement {
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
    showTooltip(badge, professor, courseCode, gradeEntry)
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

function showTooltip(
  anchor: HTMLElement,
  prof: ProfessorRating,
  courseCode: string | null = null,
  gradeEntry: GradeEntry | null = null,
) {
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

  // Grade distribution button — only when we have both a detected course code
  // and grade data exists for this (professor, course) pair.
  if (courseCode && gradeEntry) {
    const gradeBtn = document.createElement("button")
    gradeBtn.type = "button"
    gradeBtn.textContent = "📊 View Grade Distribution"
    Object.assign(gradeBtn.style, {
      display: "block",
      width: "100%",
      textAlign: "center",
      marginTop: "8px",
      padding: "8px",
      background: "#FF9800",
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "600",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    })
    gradeBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      showGradeModal(anchor, prof.name, courseCode, gradeEntry)
    })
    tooltip.appendChild(gradeBtn)
  }

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

const GRADE_BUCKETS: Array<{ key: keyof import("~lib/types").GradeCounts; label: string; color: string }> = [
  { key: "A", label: "A", color: "#4CAF50" },
  { key: "B", label: "B", color: "#8BC34A" },
  { key: "C", label: "C", color: "#FFC107" },
  { key: "D", label: "D", color: "#FF9800" },
  { key: "F", label: "F", color: "#F44336" },
  { key: "W", label: "W", color: "#9E9E9E" },
]

function buildGradeChart(counts: import("~lib/types").GradeCounts, total: number): HTMLElement {
  const wrap = el("div", { display: "flex", flexDirection: "column", gap: "4px" })
  if (total <= 0) {
    wrap.appendChild(el("div", { fontSize: "12px", color: "#666" }, "No grades recorded"))
    return wrap
  }
  for (const bucket of GRADE_BUCKETS) {
    const count = counts[bucket.key] || 0
    const pct = Math.round((count / total) * 100)
    const row = el("div", { display: "flex", alignItems: "center", gap: "8px" })
    row.appendChild(el(
      "div",
      { width: "16px", fontSize: "11px", fontWeight: "700", color: "#333" },
      bucket.label,
    ))
    const track = el("div", {
      flex: "1",
      height: "12px",
      background: "#eee",
      borderRadius: "3px",
      overflow: "hidden",
    })
    track.appendChild(el("div", {
      width: `${pct}%`,
      height: "100%",
      background: bucket.color,
    }))
    row.appendChild(track)
    row.appendChild(el(
      "div",
      { width: "60px", fontSize: "11px", color: "#666", textAlign: "right" },
      `${count} (${pct}%)`,
    ))
    wrap.appendChild(row)
  }
  return wrap
}

function showGradeModal(
  anchor: HTMLElement,
  displayName: string,
  courseCode: string,
  gradeEntry: GradeEntry,
) {
  // Remove any existing grade modal (but leave the RMP tooltip open).
  const existing = document.getElementById("proflens-grade-modal")
  if (existing) existing.remove()

  const modal = document.createElement("div")
  modal.id = "proflens-grade-modal"
  Object.assign(modal.style, {
    position: "absolute",
    zIndex: "1000000",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "16px",
    width: "380px",
    maxHeight: "70vh",
    overflowY: "auto",
    boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  })

  // Header with close button
  const header = el("div", {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  })
  const title = el("div", { display: "flex", flexDirection: "column" })
  title.appendChild(el("div", { fontWeight: "700", fontSize: "14px" }, displayName))
  title.appendChild(el("div", { color: "#666", fontSize: "12px" }, courseCode))
  header.appendChild(title)
  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.textContent = "✕"
  Object.assign(closeBtn.style, {
    background: "none",
    border: "none",
    color: "#666",
    fontSize: "18px",
    cursor: "pointer",
    padding: "0 4px",
  })
  closeBtn.addEventListener("click", () => modal.remove())
  header.appendChild(closeBtn)
  modal.appendChild(header)

  const overallTotal = GRADE_BUCKETS.reduce(
    (s, b) => s + (gradeEntry.overall[b.key] || 0),
    0,
  )

  // Overall section
  modal.appendChild(el(
    "div",
    { fontSize: "12px", fontWeight: "700", margin: "8px 0 6px", color: "#333" },
    `All semesters (n=${overallTotal})`,
  ))
  modal.appendChild(buildGradeChart(gradeEntry.overall, overallTotal))

  // Per-semester sections
  for (const sem of gradeEntry.bySemester) {
    const semTotal = GRADE_BUCKETS.reduce((s, b) => s + (sem[b.key] || 0), 0)
    const divider = el("div", {
      height: "1px",
      background: "#eee",
      margin: "12px 0",
    })
    modal.appendChild(divider)
    modal.appendChild(el(
      "div",
      { fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "#333" },
      `${sem.semester} (n=${semTotal})`,
    ))
    modal.appendChild(buildGradeChart(sem, semTotal))
  }

  document.body.appendChild(modal)

  // Position near the anchor (badge), but reposition if it overflows.
  const rect = anchor.getBoundingClientRect()
  modal.style.left = `${rect.left + window.scrollX}px`
  modal.style.top = `${rect.bottom + window.scrollY + 6}px`
  const mrect = modal.getBoundingClientRect()
  if (mrect.right > window.innerWidth) {
    modal.style.left = `${window.innerWidth - mrect.width - 10 + window.scrollX}px`
  }

  // Dismiss on click-outside and Escape (independent of the RMP tooltip).
  const onClick = (e: MouseEvent) => {
    if (!modal.contains(e.target as Node)) {
      modal.remove()
      document.removeEventListener("click", onClick)
    }
  }
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      modal.remove()
      document.removeEventListener("keydown", onEsc)
    }
  }
  setTimeout(() => {
    document.addEventListener("click", onClick)
    document.addEventListener("keydown", onEsc)
  }, 10)
}

// Tracks the extracted course code per injection-target element. Same professor
// can teach multiple sections, each with its own course code.
const elementCourse = new WeakMap<HTMLElement, string | null>()

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
        if (node.parentElement?.closest("#proflens-grade-modal")) return NodeFilter.FILTER_REJECT
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

    // Extract this row's course code from the surrounding course card.
    // Cached on the element so we don't recompute later.
    if (!elementCourse.has(el)) {
      elementCourse.set(el, extractCourseCode(textNode))
    }

    const existing = nameMap.get(name) || []
    existing.push(el)
    nameMap.set(name, existing)
  }

  if (DEBUG && nameMap.size > 0) {
    console.log("[RaiderRating] Found professors:", Array.from(nameMap.keys()))
  }

  return nameMap
}

function removeBadges() {
  document.querySelectorAll(`[${BADGE_ATTR}]`).forEach(el => el.remove())
  document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => el.removeAttribute(PROCESSED_ATTR))
  const tooltip = document.getElementById("proflens-tooltip")
  if (tooltip) tooltip.remove()
  const gradeModal = document.getElementById("proflens-grade-modal")
  if (gradeModal) gradeModal.remove()
}

function gradeKey(name: string, course: string): string {
  return `${name}|${course}`
}

async function injectRatings() {
  if (!isEnabled) return

  const nameMap = findProfessorElements()
  if (nameMap.size === 0) return

  const names = Array.from(nameMap.keys())
  if (DEBUG) console.log("[RaiderRating] Looking up:", names)

  // Build deduped (name, course) pairs to query grades for.
  const gradeRequestSet = new Set<string>()
  const gradeRequests: Array<{ professor: string; course: string }> = []
  for (const [name, elements] of nameMap) {
    for (const elem of elements) {
      const course = elementCourse.get(elem) || null
      if (!course) continue
      const k = gradeKey(name, course)
      if (gradeRequestSet.has(k)) continue
      gradeRequestSet.add(k)
      gradeRequests.push({ professor: name, course })
    }
  }

  try {
    // Fire RMP and grades lookups in parallel. Grades failure must not block ratings.
    // `sendToBackground` is typed against Plasmo's message folder; the lookupGrades
    // handler is new and may not be in its type cache yet — `any` until build regenerates.
    const sendBg = sendToBackground as unknown as (msg: { name: string; body: unknown }) => Promise<unknown>
    const [ratingResp, gradesResp] = await Promise.allSettled([
      sendBg({ name: "lookup", body: { names } }) as Promise<BatchLookupResponse>,
      gradeRequests.length
        ? (sendBg({ name: "lookupGrades", body: { requests: gradeRequests } }) as Promise<GradeBatchResponse>)
        : Promise.resolve({ results: {} } as GradeBatchResponse),
    ])

    const ratings: BatchLookupResponse =
      ratingResp.status === "fulfilled" ? ratingResp.value : { results: {} }
    const grades: GradeBatchResponse =
      gradesResp.status === "fulfilled" ? gradesResp.value : { results: {} }

    for (const [name, elements] of nameMap) {
      const result = ratings.results[name]
      for (const elem of elements) {
        if (elem.hasAttribute(PROCESSED_ATTR)) continue
        elem.setAttribute(PROCESSED_ATTR, "true")

        const course = elementCourse.get(elem) || null
        const gradeResult = course ? grades.results[gradeKey(name, course)] : null
        const gradeEntry = gradeResult?.found ? gradeResult.entry : null

        if (result?.found && result.professor) {
          const badge = createBadge(result.professor, course, gradeEntry)
          elem.appendChild(badge)
        } else if (result && !result.found) {
          const badge = document.createElement("span")
          badge.setAttribute(BADGE_ATTR, "true")
          const clickable = !!(course && gradeEntry)
          Object.assign(badge.style, {
            display: "inline-block",
            marginLeft: "6px",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            background: "#9E9E9E",
            color: "#fff",
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            verticalAlign: "middle",
            lineHeight: "1.4",
            cursor: clickable ? "pointer" : "default",
          })
          badge.textContent = clickable ? "Not on RMP · 📊 Grades" : "Not on RMP"
          if (clickable) {
            const safeCourse = course as string
            const safeGrade = gradeEntry as GradeEntry
            const displayName = safeGrade.instructor || name
            badge.addEventListener("click", (e) => {
              e.stopPropagation()
              e.preventDefault()
              showGradeModal(badge, displayName, safeCourse, safeGrade)
            })
          }
          elem.appendChild(badge)
        }
      }
    }
  } catch (err) {
    console.error("[RaiderRating] Injection error:", err)
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

if (DEBUG) console.log("[RaiderRating] Content script loaded, watching for professor names...")
