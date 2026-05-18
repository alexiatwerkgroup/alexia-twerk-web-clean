// src/app/api/admin/users/[id]/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

async function getAdminUser(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handle set cookie errors
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, supabase: null, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { user: null, supabase: null, error: 'Forbidden' };
  }

  return { user, supabase, error: null };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error } = await getAdminUser(request);

  if (error) {
    return NextResponse.json(
      { error },
      { status: error === 'Unauthorized' ? 401 : 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      displayName,
      subscriptionLevel,
      tokensBalance,
      password,
    } = body;

    // Update profile data
    const updateData: any = {
      updated_at: new Date(),
    };

    if (displayName !== undefined) {
      updateData.display_name = displayName;
    }
    if (subscriptionLevel !== undefined) {
      updateData.subscription_level = subscriptionLevel;
    }
    if (tokensBalance !== undefined) {
      updateData.tokens_balance = tokensBalance;
    }

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If password update is requested
    if (password) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(
        params.id,
        { password }
      );
      if (pwError) throw pwError;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, supabase, error } = await getAdminUser(request);

  if (error) {
    return NextResponse.json(
      { error },
      { status: error === 'Unauthorized' ? 401 : 403 }
    );
  }

  try {
    // Delete user profile first (cascade will handle related data)
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id);

    if (deleteProfileError) throw deleteProfileError;

    // Delete auth user
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      params.id
    );

    if (deleteAuthError) throw deleteAuthError;

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
