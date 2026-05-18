// src/app/api/admin/content/[id]/route.ts
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
    const { title, description, duration, required_level, portal_id } = body;

    const { data, error: updateError } = await supabase
      .from('content')
      .update({
        title,
        description,
        duration,
        required_level,
        portal_id,
        updated_at: new Date(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
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
    const { error: deleteError } = await supabase
      .from('content')
      .delete()
      .eq('id', params.id);

    if (deleteError) throw deleteError;

    return NextResponse.json(
      { message: 'Content deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
