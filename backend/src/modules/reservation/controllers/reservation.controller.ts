import { Request, Response } from 'express'
import { ReservationService } from '../services/reservation.service'

const service = new ReservationService()

export async function createReservation(req: Request, res: Response) {
  try {
    const result = await service.create(req.body)
    return res.status(201).json(result)
  } catch (err) {
    return res.status(500).json({ error: 'internal' })
  }
}

export default { createReservation }
