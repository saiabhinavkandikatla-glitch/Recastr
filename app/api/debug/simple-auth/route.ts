
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ 
    demoMode: env.demoMode,
    requireAuth: env.requireAuth,
    hasSupabaseUrl: !!env.supabaseUrl,
    hasSupabaseAnonKey: !!env.supabaseAnonKey,
    canUseDemoUser: env.demoMode && !env.requireAuth
  });
}

