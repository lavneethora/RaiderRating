import type { PlasmoMessaging } from "@plasmohq/messaging"

const API_BASE = "https://proflens-api-production.up.railway.app"

export type RequestBody = {
  subject: string
  message: string
  email: string
}

export type ResponseBody = {
  success: boolean
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (req, res) => {
  try {
    const { subject, message, email } = req.body || {}
    if (!subject || !message || !email) {
      res.send({ success: false, error: "All fields are required." })
      return
    }

    const response = await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, email }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      res.send({ success: false, error: (data as any).error || "Failed to send." })
      return
    }

    res.send({ success: true })
  } catch (err) {
    console.error("[RaiderRating] Feedback submit error:", err)
    res.send({ success: false, error: "Network error. Please try again." })
  }
}

export default handler
