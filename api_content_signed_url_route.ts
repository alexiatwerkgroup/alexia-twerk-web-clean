// src/app/api/content/signed-url/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateSignedUrl, getContentBySlug, canAccessContent, recordWatchTime } from '@/lib/supabase'

// ==========================================
// GET - Get signed URL for content
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('content_id')
    const slug = searchParams.get('slug')

    if (!contentId && !slug) {
      return NextResponse.json(
        { error: 'Missing content_id or slug' },
        { status: 400 }
      )
    }

    // Get authenticated user (may be null for free content)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Fetch content
    let content = null

    if (slug) {
      content = await getContentBySlug(slug)
    } else {
      const { data } = await supabase
        .from('content')
        .select('*')
        .eq('id', contentId)
        .single()
      content = data
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    // Check access permission
    const hasAccess = await canAccessContent(user?.id || null, content.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized access to this content' },
        { status: 403 }
      )
    }

    // Generate signed URL (expires in 24 hours for security)
    const signedUrl = await generateSignedUrl(content.video_path, 86400)

    if (!signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    // Log content view
    if (user) {
      await supabase
        .from('content')
        .update({ views_count: (content.views_count || 0) + 1 })
        .eq('id', content.id)
    }

    return NextResponse.json({
      success: true,
      signed_url: signedUrl,
      content: {
        id: content.id,
        title: content.title,
        duration_seconds: content.duration_seconds,
        required_level: content.required_level,
      },
      expires_in: 86400,
    })
  } catch (error) {
    console.error('GET /api/content/signed-url error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ==========================================
// POST - Record watch time
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content_id, watch_time_seconds } = body

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!content_id || !watch_time_seconds) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (typeof watch_time_seconds !== 'number' || watch_time_seconds < 0) {
      return NextResponse.json(
        { error: 'Invalid watch_time_seconds' },
        { status: 400 }
      )
    }

    // Verify user has access to content
    const hasAccess = await canAccessContent(user.id, content_id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Record watch time
    const success = await recordWatchTime(user.id, content_id, watch_time_seconds)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record watch time' },
        { status: 500 }
      )
    }

    // Update content total watch time
    const { data: content } = await supabase
      .from('content')
      .select('watch_time_seconds')
      .eq('id', content_id)
      .single()

    if (content) {
      await supabase
        .from('content')
        .update({
          watch_time_seconds: (content.watch_time_seconds || 0) + watch_time_seconds,
        })
        .eq('id', content_id)
    }

    // Award tokens for watching (1 token per 60 seconds)
    const tokensEarned = Math.floor(watch_time_seconds / 60)

    if (tokensEarned > 0) {
      await supabase
        .rpc('add_tokens', {
          p_user_id: user.id,
          p_amount: tokensEarned,
          p_action: 'action',
          p_description: `Watched content for ${watch_time_seconds} seconds`,
          p_metadata: {
            content_id,
            watch_time_seconds,
          },
        })
    }

    return NextResponse.json({
      success: true,
      watch_time_recorded: watch_time_seconds,
      tokens_earned: tokensEarned,
      message: 'Watch time recorded',
    })
  } catch (error) {
    console.error('POST /api/content/signed-url error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
