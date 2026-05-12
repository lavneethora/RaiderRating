import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

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

function IndexPopup() {
  const [enabled, setEnabled] = useState(true)
  const [cacheCleared, setCacheCleared] = useState(false)

  useEffect(() => {
    storage.get<boolean>("enabled").then((val) => {
      setEnabled(val !== false)
    })
  }, [])

  const handleToggle = async () => {
    const next = !enabled
    setEnabled(next)
    await storage.set("enabled", next)
  }

  const handleClearCache = async () => {
    try {
      await fetch("https://proflens-api-production.up.railway.app/api/cache/clear", { method: "POST" })
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 2000)
    } catch {
      // silently fail
    }
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={logoStyle}>RR</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#333" }}>RaiderRating</div>
          <div style={{ fontSize: 12, color: "#888" }}>v0.1.0</div>
        </div>
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
        Automatically shows Rate My Professors ratings next to professor names
        on TTU Schedule Builder.
      </p>

      <button
        style={{
          width: "100%",
          padding: "10px 0",
          border: "1px solid #ddd",
          borderRadius: 6,
          background: cacheCleared ? "#4CAF50" : "#fff",
          color: cacheCleared ? "#fff" : "#333",
          cursor: "pointer",
          fontSize: 13,
          marginBottom: 8,
        }}
        onClick={handleClearCache}>
        {cacheCleared ? "Cache Cleared!" : "Clear Rating Cache"}
      </button>

      <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 12 }}>
        Built for Texas Tech University
      </div>
    </div>
  )
}

export default IndexPopup
