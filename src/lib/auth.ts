import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function verifyAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin-session');

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token.value, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}
