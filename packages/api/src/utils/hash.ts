// path: packages/api/src/utils/hash.ts
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, SALT_ROUNDS)
}

export async function compareHash(plain: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(plain, hashed)
}
