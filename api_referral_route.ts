// src/app/api/referral/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin, getReferrals, createReferral } from '@/lib/supabase'

// ==========================================
// GET - Get referral info and stats
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const referralCode = searchParams.get('code')

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // ACTION: Get referral stats
    if (action === 'stats' && user) {
      const referrals = await getReferrals(user.id)

      const stats = {
        total_referrals: referrals.length,
        active_referrals: referrals.filter((r) => r.status === 'active').length,
        registered_referrals: referrals.filter((r) => r.status === 'registered').length,
        pending_referrals: referrals.filter((r) => r.status === 'pending').length,
        total_rewards_earned: referrals.reduce((sum, r) => sum + (r.reward_tokens || 0), 0),
        total_rewards_claimed: referrals.reduce(
          (sum, r) => sum + (r.reward_claimed ? r.reward_tokens : 0),
          0
        ),
        referrals,
      }

      return NextResponse.json({
        success: true,
        stats,
      })
    }

    // ACTION: Check if code is valid (for signup)
    if (action === 'validate' && referralCode) {
      const { data: referrer, error } = await supabase
        .from('users_profile')
        .select('id, username')
        .eq('referral_code', referralCode)
        .single()

      if (error || !referrer) {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            message: 'Invalid referral code',
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        valid: true,
        referrer_id: referrer.id,
        referrer_username: referrer.username,
      })
    }

    // ACTION: Track referral visit
    if (action === 'track' && referralCode) {
      try {
        // Find referrer by code
        const { data: referrer } = await supabase
          .from('users_profile')
          .select('id')
          .eq('referral_code', referralCode)
          .single()

        if (referrer) {
          // Record visit in session (client-side session storage)
          // This will be used when user completes signup
          return NextResponse.json({
            success: true,
            referrer_id: referrer.id,
          })
        }
      } catch (error) {
        console.error('Error tracking referral:', error)
      }

      return NextResponse.json({
        success: false,
        message: 'Invalid referral code',
      })
    }

    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('GET /api/referral error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ==========================================
// POST - Create referral link
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase
      .from('users_profile')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already registered' },
        { status: 400 }
      )
    }

    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('inviter_id', user.id)
      .eq('referred_email', email)
      .single()

    if (existingReferral) {
      return NextResponse.json(
        { error: 'Referral already exists for this email' },
        { status: 400 }
      )
    }

    // Create referral
    const referral = await createReferral(user.id, email)

    if (!referral) {
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      )
    }

    // Get user's referral code
    const { data: userProfile } = await supabase
      .from('users_profile')
      .select('referral_code')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      referral_id: referral.id,
      referral_code: userProfile?.referral_code,
      referral_link: `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${userProfile?.referral_code}`,
    })
  } catch (error) {
    console.error('POST /api/referral error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ==========================================
// PUT - Claim referral rewards
// ==========================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { referral_id } = body

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!referral_id) {
      return NextResponse.json(
        { error: 'Missing referral_id' },
        { status: 400 }
      )
    }

    // Get referral record
    const { data: referral, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', referral_id)
      .eq('inviter_id', user.id)
      .single()

    if (error || !referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      )
    }

    // Check if already claimed
    if (referral.reward_claimed) {
      return NextResponse.json(
        { error: 'Reward already claimed' },
        { status: 400 }
      )
    }

    // Check if referral is active
    if (referral.status !== 'active') {
      return NextResponse.json(
        { error: 'Referral not active yet' },
        { status: 400 }
      )
    }

    // Process reward using database function
    const { error: rewardError } = await supabaseAdmin
      .rpc('process_referral_reward', {
        p_referral_id: referral_id,
      })

    if (rewardError) {
      console.error('Error processing referral reward:', rewardError)
      return NextResponse.json(
        { error: 'Failed to claim reward' },
        { status: 500 }
      )
    }

    // Get updated user tokens
    const { data: updated } = await supabase
      .from('users_profile')
      .select('tokens_balance')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      tokens_awarded: 100,
      new_balance: updated?.tokens_balance,
      message: 'Referral reward claimed successfully',
    })
  } catch (error) {
    console.error('PUT /api/referral error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
