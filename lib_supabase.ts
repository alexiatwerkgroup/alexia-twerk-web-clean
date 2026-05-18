// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { UserProfile, Content, Referral, TokenLog, WatchHistory } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Client-side Supabase instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Server-side Supabase instance (admin access)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

// ==========================================
// USER PROFILE FUNCTIONS
// ==========================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  const { error } = await supabase
    .from('users_profile')
    .update(updates)
    .eq('id', userId)

  if (error) {
    console.error('Error updating user profile:', error)
    return false
  }

  return true
}

export async function getUserByReferralCode(code: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('referral_code', code)
    .single()

  if (error) {
    console.error('Error fetching user by referral code:', error)
    return null
  }

  return data
}

// ==========================================
// TOKEN FUNCTIONS
// ==========================================

export async function getTokenLogs(
  userId: string,
  limit: number = 50
): Promise<TokenLog[]> {
  const { data, error } = await supabase
    .from('tokens_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching token logs:', error)
    return []
  }

  return data || []
}

export async function addTokens(
  userId: string,
  amount: number,
  action: string,
  description?: string
): Promise<boolean> {
  const { error } = await supabase
    .rpc('add_tokens', {
      p_user_id: userId,
      p_amount: amount,
      p_action: action,
      p_description: description,
    })

  if (error) {
    console.error('Error adding tokens:', error)
    return false
  }

  return true
}

// ==========================================
// REFERRAL FUNCTIONS
// ==========================================

export async function createReferral(
  inviterId: string,
  referredEmail: string
): Promise<Referral | null> {
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      inviter_id: inviterId,
      referred_email: referredEmail,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating referral:', error)
    return null
  }

  return data
}

export async function getReferrals(userId: string): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('inviter_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching referrals:', error)
    return []
  }

  return data || []
}

export async function updateReferralStatus(
  referralId: string,
  status: 'registered' | 'active'
): Promise<boolean> {
  const { error } = await supabase
    .from('referrals')
    .update({
      status,
      [status === 'registered' ? 'registered_at' : 'activated_at']: new Date(),
    })
    .eq('id', referralId)

  if (error) {
    console.error('Error updating referral:', error)
    return false
  }

  return true
}

// ==========================================
// CONTENT FUNCTIONS
// ==========================================

export async function getContent(
  portal?: string,
  level?: string
): Promise<Content[]> {
  let query = supabase.from('content').select('*')

  if (portal) {
    query = query.eq('portal', portal)
  }

  if (level) {
    query = query.or(`required_level.eq.free,required_level.eq.${level}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching content:', error)
    return []
  }

  return data || []
}

export async function getContentBySlug(slug: string): Promise<Content | null> {
  const { data, error } = await supabase
    .from('content')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching content:', error)
    return null
  }

  return data
}

export async function recordWatchTime(
  userId: string,
  contentId: string,
  watchSeconds: number
): Promise<boolean> {
  const { error } = await supabase
    .from('user_watch_history')
    .upsert({
      user_id: userId,
      content_id: contentId,
      watch_time_seconds: watchSeconds,
      completed: watchSeconds >= 240, // 4 min = watched
    })

  if (error) {
    console.error('Error recording watch time:', error)
    return false
  }

  return true
}

// ==========================================
// DAILY LOGIN
// ==========================================

export async function checkDailyLogin(userId: string): Promise<boolean> {
  const { error } = await supabase.rpc('check_daily_login_bonus', {
    p_user_id: userId,
  })

  if (error) {
    // Login already claimed today
    return false
  }

  return true
}

// ==========================================
// CONTENT ACCESS
// ==========================================

export async function canAccessContent(
  userId: string | null,
  contentId: string
): Promise<boolean> {
  if (!userId) {
    // Check if content is free
    const content = await getContentBySlug(contentId)
    return content?.required_level === 'free' || false
  }

  const { data, error } = await supabase
    .rpc('can_access_content', {
      p_user_id: userId,
      p_content_id: contentId,
    })

  if (error) {
    console.error('Error checking content access:', error)
    return false
  }

  return data || false
}

// ==========================================
// STORAGE FUNCTIONS
// ==========================================

export async function generateSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('content')
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error('Error generating signed URL:', error)
    return null
  }

  return data.signedUrl
}

export async function uploadVideo(
  file: File,
  path: string
): Promise<boolean> {
  const { error } = await supabase.storage
    .from('content')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Error uploading video:', error)
    return false
  }

  return true
}

// ==========================================
// AUTH FUNCTIONS
// ==========================================

export async function signUp(
  email: string,
  password: string,
  metadata?: {
    username?: string
    display_name?: string
    referrer_id?: string
  }
): Promise<boolean> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })

  if (error) {
    console.error('Error signing up:', error)
    return false
  }

  return true
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Error signing in:', error)
    return false
  }

  return true
}

export async function signOut(): Promise<boolean> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error signing out:', error)
    return false
  }

  return true
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}
