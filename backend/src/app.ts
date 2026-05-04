import express from 'express'
import reservationRoutes from './api/routes/v1/reservation.routes'
import productRoutes from './api/routes/v1/product.routes'

export const app = express()
app.use(express.json())

app.use('/api/v1/reservations', reservationRoutes)
app.use('/api/v1/products', productRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

export default app
