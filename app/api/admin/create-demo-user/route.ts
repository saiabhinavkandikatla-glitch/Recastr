
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL } = process.env;
    if (!SUPABASE_SERVICE_ROLE_KEY || !NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing environment variables');
    }

    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, try to create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      // If the error is that the user already exists, we will update the password
      // We need to find the user by email. Since the admin API does not support filtering,
      // we will list all users (not ideal but acceptable for a one-time operation).
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        throw listError;
      }
      const existingUser = usersData.users.find((u) => u.email === email);
      if (!existingUser) {
        throw createError; // rethrow if not found
      }
      // Update the password for the existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password }
      );
      if (updateError) {
        throw updateError;
      }
      return NextResponse.json({ message: 'User password updated', userId: existingUser.id });
    }

    return NextResponse.json({ message: 'User created', userId: newUser.user.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating demo user:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

