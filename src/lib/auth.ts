import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'cbt_exam_prep_platform_jwt_cookie_secret_key_change_me_in_prod';
const key = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  role: 'user' | 'admin';
}

// Sign Token
export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

// Verify Token
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as JWTPayload;
  } catch (err) {
    return null;
  }
}

// Get Session Token from Cookies
export function getTokenFromRequest(req: NextRequest): string | null {
  const cookie = req.cookies.get('cbt_session');
  return cookie ? cookie.value : null;
}

// Verify Request User Session
export async function getSessionUser(req: NextRequest): Promise<JWTPayload | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return await verifyJWT(token);
}
