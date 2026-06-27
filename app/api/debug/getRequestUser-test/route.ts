
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const message = error instanceof Error ? error.message : 'Unknown error';
    const type = error instanceof Error ? error.constructor.name : typeof error;
    return NextResponse.json({ 
      error: message,
      type
    }, { status: 500 });
  }
}

