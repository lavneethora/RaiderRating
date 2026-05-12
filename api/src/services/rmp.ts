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

function matchesName(node: RMPTeacherNode, firstName: string, lastName: string): boolean {
  const nodeFirst = node.firstName.toLowerCase()
  const nodeLast = node.lastName.toLowerCase()
  const queryFirst = firstName.toLowerCase()
  const queryLast = lastName.toLowerCase()

  if (nodeLast !== queryLast) return false
  if (!queryFirst) return true
  return nodeFirst.startsWith(queryFirst) || queryFirst.startsWith(nodeFirst)
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

  const match = edges.find(e => matchesName(e.node, firstName, lastName)) || edges[0]
  const node = match.node

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
