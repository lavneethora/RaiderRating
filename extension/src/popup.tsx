import { useEffect, useState } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import type { SavedCRNData } from "~lib/crn-storage"
import { clearCRNs } from "~lib/crn-storage"

const storage = new Storage()

const API_BASE = "https://proflens-api-production.up.railway.app"

const containerStyle: React.CSSProperties = {
  width: 300,
  padding: 20,
  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 16,
}

const logoStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: "#CC0000",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 700,
  fontSize: 16,
}

const footerStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#aaa",
  textAlign: "center",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
}

type Status = "checking" | "online" | "offline"
type FormState = "idle" | "sending" | "sent" | "error"

const STATUS_COLORS: Record<Status, string> = {
  checking: "#aaa",
  online: "#4CAF50",
  offline: "#F44336",
}

const STATUS_LABELS: Record<Status, string> = {
  checking: "Checking",
  online: "Online",
  offline: "Offline",
}

function StatusIndicator({ status }: { status: Status }) {
  const color = STATUS_COLORS[status]
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginLeft: "auto",
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        animation: status === "checking" ? "none" : "rr-blink 1.4s ease-in-out infinite",
      }} />
      <span style={{ fontSize: 12, fontWeight: 600, color }}>
        {STATUS_LABELS[status]}
      </span>
    </div>
  )
}

const sendBg = sendToBackground as unknown as (msg: { name: string; body: unknown }) => Promise<unknown>

function IndexPopup() {
  const [enabled, setEnabled] = useState(true)
  const [apiStatus, setApiStatus] = useState<Status>("checking")
  const [crnData, setCrnData] = useState<SavedCRNData | null>(null)
  const [onScheduleBuilder, setOnScheduleBuilder] = useState(false)
  const [onRegistration, setOnRegistration] = useState(false)
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "no-schedule">("idle")
  const [pasteState, setPasteState] = useState<"idle" | "pasting" | "pasted" | "error">("idle")
  const [pasteError, setPasteError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [formState, setFormState] = useState<FormState>("idle")
  const [formError, setFormError] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    storage.get<boolean>("enabled").then((val) => {
      setEnabled(val !== false)
    })
    storage.get<SavedCRNData>("savedCRNs").then((val) => {
      setCrnData(val ?? null)
    })
    storage.watch({
      savedCRNs: (change) => {
        setCrnData(change.newValue ?? null)
      },
    })
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || ""
      setOnScheduleBuilder(url.includes("schedulebuilder.ttu.edu"))
      setOnRegistration(url.includes("registration.texastech.edu"))
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal })
        clearTimeout(timeout)
        if (!cancelled) setApiStatus(res.ok ? "online" : "offline")
      } catch {
        if (!cancelled) setApiStatus("offline")
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggle = async () => {
    const next = !enabled
    setEnabled(next)
    await storage.set("enabled", next)
  }

  const handleCopySchedule = async () => {
    setCopyState("copying")
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setCopyState("no-schedule")
        return
      }
      const response = await chrome.tabs.sendMessage(tab.id, { type: "extractCRNs" })
      if (response?.success && response.crns.length > 0) {
        setCopyState("copied")
        setTimeout(() => setCopyState("idle"), 2000)
      } else {
        setCopyState("no-schedule")
        setTimeout(() => setCopyState("idle"), 2000)
      }
    } catch {
      setCopyState("no-schedule")
      setTimeout(() => setCopyState("idle"), 2000)
    }
  }

  const handlePasteSchedule = async () => {
    if (!crnData || crnData.crns.length === 0) return
    setPasteState("pasting")
    setPasteError("")
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setPasteState("error")
        setPasteError("No active tab")
        return
      }
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "fillCRNs",
        crns: crnData.crns,
      }) as { success: boolean; filled: number; error?: string }
      if (response?.success) {
        setPasteState("pasted")
        setTimeout(() => setPasteState("idle"), 2000)
      } else {
        setPasteState("error")
        setPasteError(response?.error || "Failed to fill CRNs")
        setTimeout(() => setPasteState("idle"), 3000)
      }
    } catch {
      setPasteState("error")
      setPasteError("Could not reach registration page")
      setTimeout(() => setPasteState("idle"), 3000)
    }
  }

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !email.trim()) {
      setFormError("All fields are required.")
      return
    }
    setFormState("sending")
    setFormError("")
    try {
      const result = await sendBg({
        name: "submitFeedback",
        body: { subject: subject.trim(), message: message.trim(), email: email.trim() },
      }) as { success: boolean; error?: string }
      if (result.success) {
        setFormState("sent")
        setTimeout(() => {
          setShowForm(false)
          setFormState("idle")
          setSubject("")
          setMessage("")
          setEmail("")
        }, 2000)
      } else {
        setFormError(result.error || "Something went wrong.")
        setFormState("error")
      }
    } catch {
      setFormError("Network error. Please try again.")
      setFormState("error")
    }
  }

  if (showForm) {
    return (
      <div style={containerStyle}>
        <style>{`
          @keyframes rr-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.35; }
          }
        `}</style>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span
            onClick={() => { setShowForm(false); setFormState("idle"); setFormError("") }}
            style={{ cursor: "pointer", fontSize: 18, color: "#888", lineHeight: 1 }}>
            &#8592;
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>Message Us</span>
        </div>

        {formState === "sent" ? (
          <div style={{
            textAlign: "center",
            padding: "30px 0",
            color: "#4CAF50",
            fontSize: 14,
            fontWeight: 600,
          }}>
            Sent! Thanks for your feedback.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Bug report, Feature request"
                maxLength={200}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                maxLength={2000}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Your Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ttu.edu"
                style={inputStyle}
              />
            </div>

            {formError && (
              <div style={{ fontSize: 12, color: "#F44336", marginBottom: 10 }}>
                {formError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={formState === "sending"}
              style={{
                width: "100%",
                padding: "10px 0",
                border: "none",
                borderRadius: 6,
                background: formState === "sending" ? "#999" : "#CC0000",
                color: "#fff",
                cursor: formState === "sending" ? "default" : "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}>
              {formState === "sending" ? "Sending..." : "Send"}
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes rr-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>

      <div style={headerStyle}>
        <div style={logoStyle}>RR</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#333" }}>RaiderRating</div>
          <div style={{ fontSize: 12, color: "#888" }}>v{chrome.runtime.getManifest().version}</div>
        </div>
        <StatusIndicator status={apiStatus} />
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        background: enabled ? "#E8F5E9" : "#FAFAFA",
        borderRadius: 8,
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: enabled ? "#2E7D32" : "#999" }}>
          {enabled ? "Ratings Enabled" : "Ratings Disabled"}
        </span>
        <div
          onClick={handleToggle}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: enabled ? "#4CAF50" : "#ccc",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
          }}>
          <div style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            background: "#fff",
            position: "absolute",
            top: 2,
            left: enabled ? 22 : 2,
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </div>
      </div>

      {onScheduleBuilder && (
        <button
          onClick={handleCopySchedule}
          disabled={copyState === "copying"}
          style={{
            width: "100%",
            padding: "10px 0",
            border: "none",
            borderRadius: 6,
            background: copyState === "copied" ? "#4CAF50"
              : copyState === "no-schedule" ? "#F44336"
              : "#CC0000",
            color: "#fff",
            cursor: copyState === "copying" ? "default" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
          }}>
          {copyState === "copying" ? "Copying..."
            : copyState === "copied" ? "Schedule Copied!"
            : copyState === "no-schedule" ? "No schedule found"
            : "Copy Schedule"}
        </button>
      )}

      {crnData && crnData.crns.length > 0 && (
        <div style={{
          padding: "10px 12px",
          background: "#FFF3E0",
          borderRadius: 8,
          marginBottom: 12,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: onRegistration ? 8 : 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#E65100" }}>
              {crnData.crns.length} CRNs ready
            </span>
            <button
              onClick={() => clearCRNs()}
              style={{
                background: "none",
                border: "none",
                color: "#999",
                fontSize: 11,
                cursor: "pointer",
                textDecoration: "underline",
              }}>
              Clear
            </button>
          </div>
          {onRegistration && (
            <>
              <button
                onClick={handlePasteSchedule}
                disabled={pasteState === "pasting"}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  border: "none",
                  borderRadius: 6,
                  background: pasteState === "pasted" ? "#4CAF50"
                    : pasteState === "error" ? "#F44336"
                    : "#CC0000",
                  color: "#fff",
                  cursor: pasteState === "pasting" ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                {pasteState === "pasting" ? "Pasting..."
                  : pasteState === "pasted" ? "CRNs Filled!"
                  : pasteState === "error" ? pasteError
                  : "Paste Schedule"}
              </button>
            </>
          )}
        </div>
      )}

      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 16 }}>
        Automatically shows Rate My Professors ratings and Grade Distribution on TTU Schedule Builder.
      </p>

      <div style={{ ...footerStyle, marginTop: 12 }}>
        Built for Texas Tech University
      </div>
      <div style={{ ...footerStyle, marginTop: 12 }}>
        Problem/Suggestions:{" "}
        <span
          onClick={() => setShowForm(true)}
          style={{ color: "#aaa", textDecoration: "underline", cursor: "pointer" }}>
          Contact Us
        </span>
      </div>
    </div>
  )
}

export default IndexPopup
