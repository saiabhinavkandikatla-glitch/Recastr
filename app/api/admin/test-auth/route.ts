
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing env' }, { status: 500 });
    }
    const url = supabaseUrl.replace(/\/+$/, '') + '/auth/v1/admin/users?limit=1';
    const headers = {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
    };
    const res = await fetch(url, { method: 'GET', headers });
    const text = await res.text();
    let json;
    try {
      JSON.parse(text);
    } catch {
      json = null;
    }
    return NextResponse.json({ status: res.status, statusText: res.statusText, body: text, json }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

