import { prisma } from '../../infrastructure/database/prisma'

export class ReservationRepository {
  async create(data: any) {
    // placeholder - use prisma in real impl
    return { id: 'res_dummy' }
  }
}

export default new ReservationRepository()
