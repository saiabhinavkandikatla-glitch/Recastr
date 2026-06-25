
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    return NextResponse.json({ 
      success: true,
      user: user ? { 
        id: user.id, 
        email: user.email,
        plan: user.plan,
        role: user.role
      } : null
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      type: error.constructor.name
    }, { status: 500 });
  }
}

