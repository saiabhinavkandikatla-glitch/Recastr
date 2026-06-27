import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if user exists
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    const existingUser = usersData.users?.find(u => u.email === email);
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists', userId: existingUser.id }, { status: 200 });
    }

    // Create user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;
    return NextResponse.json({ message: 'User created', userId: newUser.user.id }, { status: 201 });
  } catch (error) {
    console.error('Error in create-demo-user-if-missing:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
