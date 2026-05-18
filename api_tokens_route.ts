// src/app/api/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin, checkDailyLogin, addTokens } from '@/lib/supabase'
import { createHash } from 'crypto'

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count < maxRequests) {
    userLimit.count++
    return true
  }

  return false
}

// ==========================================
// GET - Get user tokens balance
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with tokens
    const { data: profile, error } = await supabase
      .from('users_profile')
      .select('tokens_balance, tokens_earned, subscription_level')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If checking daily login bonus
    if (action === 'check-daily-login') {
      const claimed = await checkDailyLogin(user.id)

      if (claimed) {
        const updated = await supabase
          .from('users_profile')
          .select('tokens_balance')
          .eq('id', user.id)
          .single()

        return NextResponse.json({
          success: true,
          claimed: true,
          tokens_balance: updated.data?.tokens_balance,
          message: 'Daily login bonus claimed',
        })
      }

      return NextResponse.json({
        success: true,
        claimed: false,
        tokens_balance: profile.tokens_balance,
        message: 'Daily bonus already claimed',
      })
    }

    return NextResponse.json({
      success: true,
      tokens_balance: profile.tokens_balance,
      tokens_earned: profile.tokens_earned,
      subscription_level: profile.subscription_level,
    })
  } catch (error) {
    console.error('GET /api/tokens error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ==========================================
// POST - Add tokens (admin only)
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, user_id, amount, description } = body

    // Verify admin/service role (from backend only)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.ADMIN_API_KEY

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    if (!action || !user_id || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Rate limiting
    if (!checkRateLimit(user_id, 10, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Add tokens using database function
    const success = await addTokens(
      user_id,
      amount,
      action,
      description || `Token action: ${action}`
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add tokens' },
        { status: 500 }
      )
    }

    // Get updated balance
    const { data: profile } = await supabase
      .from('users_profile')
      .select('tokens_balance')
      .eq('id', user_id)
      .single()

    return NextResponse.json({
      success: true,
      tokens_added: amount,
      new_balance: profile?.tokens_balance,
      message: `${amount} tokens added`,
    })
  } catch (error) {
    console.error('POST /api/tokens error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ==========================================
// PUT - Use tokens (spend)
// ==========================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, action, description } = body

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Rate limiting
    if (!checkRateLimit(user.id, 20, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Check balance
    const { data: profile } = await supabase
      .from('users_profile')
      .select('tokens_balance')
      .eq('id', user.id)
      .single()

    if (!profile || profile.tokens_balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient tokens' },
        { status: 400 }
      )
    }

    // Deduct tokens
    const success = await addTokens(
      user.id,
      -amount,
      action || 'spend',
      description || 'Token spent'
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to spend tokens' },
        { status: 500 }
      )
    }

    // Get updated balance
    const { data: updated } = await supabase
      .from('users_profile')
      .select('tokens_balance')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      tokens_spent: amount,
      new_balance: updated?.tokens_balance,
      message: `${amount} tokens spent`,
    })
  } catch (error) {
    console.error('PUT /api/tokens error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
