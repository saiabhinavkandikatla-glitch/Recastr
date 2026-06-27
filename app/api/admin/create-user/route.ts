
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    console.log('START create-user');
    const { email, password } = await request.json();
    console.log('parsed body:', { email, password: '[REDACTED]' });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('has url:', !!supabaseUrl, 'has key:', !!supabaseServiceRoleKey);
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('supabase client created');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    console.log('createUser response:', { data, error });
    if (error) {
      console.log('createUser error:', error);
      // handle existing user
      if (error.status === 409 && error.message.includes('User already registered')) {
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        const existingUser = usersData.users?.find(u => u.email === email);
        if (existingUser) {
          return NextResponse.json({ message: 'User already exists', userId: existingUser.id }, { status: 200 });
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'User created', userId: data.user?.id }, { status: 201 });
  } catch (err: any) {
    console.error('ERROR in create-user:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

