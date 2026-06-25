
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '[PRESENT]' : '[MISSING]',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[PRESENT]' : '[MISSING]',
    DATABASE_URL: process.env.DATABASE_URL ? '[PRESENT]' : '[MISSING]',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ? 'true' : 'false',
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });
}

