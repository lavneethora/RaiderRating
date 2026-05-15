import type { RMPTeacherNode, ProfessorRating } from '../types'

const RMP_GRAPHQL_URL = process.env.RMP_GRAPHQL_URL || 'https://www.ratemyprofessors.com/graphql'
const RMP_AUTH_HEADER = process.env.RMP_AUTH_TOKEN || 'Basic dGVzdDp0ZXN0'
const TTU_SCHOOL_ID = process.env.TTU_SCHOOL_ID || 'U2Nob29sLTEwMTE='

const SEARCH_QUERY = `
query TeacherSearchResultsPageQuery($text: String!, $schoolID: ID!) {
  newSearch {
    teachers(query: { text: $text, schoolID: $schoolID }) {
      edges {
        node {
          id
          legacyId
          firstName
          lastName
          department
          school {
            id
            name
          }
          avgRating
          avgDifficulty
          numRatings
          wouldTakeAgainPercent
        }
      }
    }
  }
}
`

async function graphqlRequest(query: string, variables: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(RMP_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': RMP_AUTH_HEADER,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`RMP API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json() as { data?: unknown; errors?: Array<{ message: string }> }
  if (json.errors?.length) {
    throw new Error(`RMP GraphQL error: ${json.errors[0].message}`)
  }

  return json.data
}

interface SearchResponse {
  newSearch: {
    teachers: {
      edges: Array<{ node: RMPTeacherNode }>
    }
  }
}

function scoreMatch(node: RMPTeacherNode, firstName: string, lastName: string): number {
  const nodeFirst = node.firstName.toLowerCase().trim()
  const nodeLast = node.lastName.toLowerCase().trim()
  const queryFirst = firstName.toLowerCase().trim()
  const queryLast = lastName.toLowerCase().trim()

  // Last name must match exactly
  if (nodeLast !== queryLast) return 0

  // No first name provided — last name match only
  if (!queryFirst) return 1

  // Exact first name match
  if (nodeFirst === queryFirst) return 3

  // First name initial match (e.g., "H" matches "Hamed")
  if (queryFirst.length === 1 && nodeFirst.startsWith(queryFirst)) return 2

  // No match
  return 0
}

export async function searchProfessor(
  firstName: string,
  lastName: string
): Promise<ProfessorRating | null> {
  const searchText = `${firstName} ${lastName}`.trim()

  const data = await graphqlRequest(SEARCH_QUERY, {
    text: searchText,
    schoolID: TTU_SCHOOL_ID,
  }) as SearchResponse

  const edges = data.newSearch.teachers.edges
  if (!edges.length) return null

  // Score all results and pick the best match
  let bestScore = 0
  let bestNode: RMPTeacherNode | null = null

  for (const edge of edges) {
    const score = scoreMatch(edge.node, firstName, lastName)
    if (score > bestScore) {
      bestScore = score
      bestNode = edge.node
    }
  }

  // No match found — don't return a random professor
  if (!bestNode) return null

  const node = bestNode

  return {
    name: `${node.firstName} ${node.lastName}`,
    firstName: node.firstName,
    lastName: node.lastName,
    department: node.department,
    avgRating: node.avgRating,
    avgDifficulty: node.avgDifficulty,
    wouldTakeAgainPercent: Math.round(node.wouldTakeAgainPercent),
    numRatings: node.numRatings,
    rmpUrl: `https://www.ratemyprofessors.com/professor/${node.legacyId}`,
  }
}
