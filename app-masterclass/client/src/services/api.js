const API_BASE = 'http://localhost:3000'

export const testApi = async () => {
  const res = await fetch(`${API_BASE}/`)
  const data = await res.text()
  return data
}