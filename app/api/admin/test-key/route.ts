
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL } = process.env;
    if (!SUPABASE_SERVICE_ROLE_KEY || !NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Try to fetch the _meta endpoint
    const { data, error } = await supabaseAdmin
      .from('_meta')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

