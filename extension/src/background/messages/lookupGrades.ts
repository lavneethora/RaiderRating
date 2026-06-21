import type { PlasmoMessaging } from "@plasmohq/messaging"
import { batchLookupGrades } from "~lib/api-client"
import type {
  GradeBatchRequestItem,
  GradeBatchResponse,
} from "~lib/types"

export type RequestBody = {
  requests: GradeBatchRequestItem[]
}

export type ResponseBody = GradeBatchResponse

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (req, res) => {
  try {
    const requests = req.body?.requests || []
    if (!requests.length) {
      res.send({ results: {} })
      return
    }
    const data = await batchLookupGrades(requests)
    res.send(data)
  } catch (err) {
    console.error("[RaiderRating] Background grades lookup error:", err)
    res.send({ results: {} })
  }
}

export default handler
