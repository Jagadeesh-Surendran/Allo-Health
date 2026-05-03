import express from 'express'

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Placeholder API routes
app.get('/api/products', (req, res) => {
  res.json({ message: 'Products endpoint - coming soon' })
})

app.post('/api/reservations', (req, res) => {
  res.json({ message: 'Create reservation endpoint - coming soon' })
})

app.listen(PORT, () => {
  console.log(`✓ Backend server running on http://localhost:${PORT}`)
})
