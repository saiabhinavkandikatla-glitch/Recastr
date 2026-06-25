
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('Step 1: Checking env config');
    console.log('  - supabaseUrl:', !!env.supabaseUrl);
    console.log('  - supabaseAnonKey:', !!env.supabaseAnonKey);
    console.log('  - demoMode:', env.demoMode);
    console.log('  - requireAuth:', env.requireAuth);
    
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      console.log('Step 2: Supabase not configured');
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    console.log('Step 2: Supabase is configured');
    const canUseDemoUser = env.demoMode && !env.requireAuth;
    console.log('  - canUseDemoUser:', canUseDemoUser);
    
    console.log('Step 3: Creating Supabase client');
    const supabase = createSupabaseServerClient();
    console.log('  - client created:', !!supabase);
    
    console.log('Step 4: Getting session');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('  - session:', !!session);
    console.log('  - sessionError:', sessionError);
    
    let user = null;
    let userError = null;
    
    if (session) {
      console.log('Step 5: Session exists, getting user');
      const { data: { user: currentUser }, error: errorUser } = await supabase.auth.getUser();
      user = currentUser;
      userError = errorUser;
      console.log('  - user:', !!user);
      console.log('  - userError:', userError);
    } else {
      console.log('Step 5: No session, user remains null');
    }
    
    console.log('Step 6: Checking if we have valid user');
    if (!userError && user?.email) {
      console.log('  - Valid user found');
      return NextResponse.json({ 
        success: true, 
        user: { id: user.id, email: user.email } 
      });
    }
    
    console.log('Step 7: Checking fallback options');
    if (canUseDemoUser) {
      console.log('  - Using demo user');
      return NextResponse.json({ 
        success: true, 
        user: { id: 'demo-user', email: 'demo@recastr.app', plan: 'PRO', role: 'owner' },
        reason: 'demo user'
      });
    }
    if (!env.requireAuth) {
      console.log('  - Using local dev user');
      return NextResponse.json({ 
        success: true, 
        user: { id: 'local-user', email: 'local@recastr.app', plan: 'PRO', role: 'owner' },
        reason: 'local dev user'
      });
    }
    
    console.log('Step 8: No user available, returning 401');
    return NextResponse.json({ 
      error: 'Missing authorization token',
      reason: 'no token and no fallback'
    }, { status: 401 });
    
  } catch (error: any) {
    console.log('Step 9: Exception caught:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack?.toString(),
      type: error.constructor.name
    }, { status: 500 });
  }
}

