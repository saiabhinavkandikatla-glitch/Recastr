
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    return NextResponse.json({ 
      hello: 'world',
      supabaseCreated: !!supabase
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to create Supabase client',
      message: error.message,
      stack: error.stack?.toString()
    }, { status: 500 });
  }
}

