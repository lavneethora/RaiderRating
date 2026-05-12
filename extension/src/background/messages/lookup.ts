import type { PlasmoMessaging } from "@plasmohq/messaging"
import { batchLookup } from "~lib/api-client"
import type { BatchLookupResponse } from "~lib/types"

export type RequestBody = {
  names: string[]
}

export type ResponseBody = BatchLookupResponse

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (req, res) => {
  try {
    const names = req.body?.names || []
    if (!names.length) {
      res.send({ results: {} })
      return
    }
    const data = await batchLookup(names)
    res.send(data)
  } catch (err) {
    console.error("[ProfLens] Background lookup error:", err)
    res.send({ results: {} })
  }
}

export default handler
