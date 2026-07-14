import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"

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

type Status = "checking" | "online" | "offline"

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

function IndexPopup() {
  const [enabled, setEnabled] = useState(true)
  const [apiStatus, setApiStatus] = useState<Status>("checking")

  useEffect(() => {
    storage.get<boolean>("enabled").then((val) => {
      setEnabled(val !== false)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    // 15s timeout — long enough to survive a Railway serverless cold start
    // (which can take 5-10s when the service has been idle).
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

      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 16 }}>
        Automatically shows Rate My Professors ratings and Grade Distribution on TTU Schedule Builder.
      </p>

      <div style={{ ...footerStyle, marginTop: 12 }}>
        Built for Texas Tech University
      </div>
      <div style={{ ...footerStyle, marginTop: 12 }}>
        Problem/Suggestions:{" "}
        <a
          href="mailto:31lavneet@gmail.com?subject=RaiderRating%20Feedback"
          style={{ color: "#aaa", textDecoration: "underline" }}>
          Contact Us
        </a>
      </div>
    </div>
  )
}

export default IndexPopup
