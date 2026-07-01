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

const footerStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#aaa",
  textAlign: "center",
}

function IndexPopup() {
  const [enabled, setEnabled] = useState(true)

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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={logoStyle}>RR</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#333" }}>RaiderRating</div>
          <div style={{ fontSize: 12, color: "#888" }}>v{chrome.runtime.getManifest().version}</div>
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
