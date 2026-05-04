export async function apiGet(path: string) {
  const res = await fetch(path)
  return res.json()
}
