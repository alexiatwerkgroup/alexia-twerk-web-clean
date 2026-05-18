// src/app/api/admin/users/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get search and filter parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const subscriptionLevel = searchParams.get('subscription') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    let query = supabase
      .from('profiles')
      .select(
        `
        id,
        email: user_id,
        display_name,
        subscription_level,
        tokens_balance,
        created_at,
        last_active,
        auth_users!inner(email)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `display_name.ilike.%${search}%,auth_users.email.ilike.%${search}%`
      );
    }

    if (subscriptionLevel) {
      query = query.eq('subscription_level', subscriptionLevel);
    }

    const offset = (page - 1) * limit;
    const { data, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Format the response
    const formattedData = (data || []).map((user: any) => ({
      id: user.id,
      email: user.auth_users?.[0]?.email || user.email,
      displayName: user.display_name,
      subscriptionLevel: user.subscription_level,
      tokensBalance: user.tokens_balance,
      createdAt: user.created_at,
      lastActive: user.last_active,
    }));

    return NextResponse.json({
      data: formattedData,
      pagination: {
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
