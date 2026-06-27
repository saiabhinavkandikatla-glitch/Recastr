
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Test getting session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return NextResponse.json({ 
        error: 'Session error', 
        message: sessionError.message 
      }, { status: 500 });
    }
    
    // Test getting user if session exists
    let user = null;
    let userErrorMessage: string | null = null;
    
    if (session) {
      const { data: { user: currentUser }, error: errorUser } = await supabase.auth.getUser();
      user = currentUser;
      userErrorMessage = errorUser?.message ?? null;
    }
    
    return NextResponse.json({
      supabaseCreated: !!supabase,
      session: session ? { ...session, user: undefined } : null, // Don't return user object for security
      sessionError: null,
      user: user ? { email: user.email } : null, // Only return email for security
      userError: userErrorMessage,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '[PRESENT]' : '[MISSING]',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '[PRESENT]' : '[MISSING]',
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Supabase client creation failed', 
      message,
    }, { status: 500 });
  }
}

