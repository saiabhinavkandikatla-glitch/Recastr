
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    // Check if it's a Response object (from getRequestUser)
    if (error instanceof Response) {
      // Return the response as-is to preserve the correct status code
      return new Response(error.body, { 
        status: error.status,
        headers: error.headers
      });
    }
    // For other errors, return 500
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      type: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

