import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }
  // Mask the password in the URL
  const masked = url.replace(new RegExp('://[^:@]+:[^:@]+@'), '://:***@');
  return NextResponse.json({ databaseUrl: masked });
}

