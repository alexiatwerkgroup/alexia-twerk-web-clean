// TWERKHUB Type Definitions

export type SubscriptionLevel = 'free' | 'basic' | 'medium' | 'full'
export type PortalType = 'free' | 'private' | 'playlist'
export type TokenAction = 'login' | 'action' | 'referral' | 'purchase' | 'admin'
export type ReferralStatus = 'pending' | 'registered' | 'active'

// User Profile
export interface UserProfile {
  id: string
  username: string
  email: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  tokens_balance: number
  tokens_earned: number
  subscription_level: SubscriptionLevel
  subscription_end_date: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  referral_code: string
  referrer_id: string | null
  created_at: string
  updated_at: string
}

// Token Log Entry
export interface TokenLog {
  id: string
  user_id: string
  amount: number
  action: TokenAction
  description: string | null
  metadata: Record<string, any> | null
  created_at: string
}

// Referral Record
export interface Referral {
  id: string
  inviter_id: string
  invited_id: string | null
  referred_email: string
  status: ReferralStatus
  visited_at: string | null
  registered_at: string | null
  activated_at: string | null
  reward_tokens: number
  reward_claimed: boolean
  created_at: string
}

// Content Item
export interface Content {
  id: string
  title: string
  description: string | null
  slug: string
  portal: PortalType
  video_path: string
  thumbnail_url: string | null
  duration_seconds: number | null
  required_level: SubscriptionLevel
  views_count: number
  watch_time_seconds: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// Watch History
export interface WatchHistory {
  id: string
  user_id: string
  content_id: string
  watch_time_seconds: number
  completed: boolean
  last_watched_at: string
}

// Subscription
export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  level: SubscriptionLevel
  status: 'active' | 'canceled' | 'past_due' | 'incomplete'
  started_at: string
  ended_at: string | null
  current_period_start: string | null
  current_period_end: string | null
}

// Daily Login
export interface DailyLogin {
  id: string
  user_id: string
  login_date: string
  token_reward_claimed: boolean
  created_at: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pricing Tier
export interface PricingTier {
  id: SubscriptionLevel
  name: string
  price: number
  features: string[]
  color: string
  stripe_price_id: string
}

// Portal Definition
export interface Portal {
  id: PortalType
  title: string
  description: string
  icon: string
  color: string
  required_level: SubscriptionLevel
}

// Auth Session
export interface AuthSession {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Referral Stats
export interface ReferralStats {
  total_referrals: number
  active_referrals: number
  registered_referrals: number
  pending_referrals: number
  total_rewards_earned: number
  total_rewards_claimed: number
}

// User Stats
export interface UserStats {
  tokens_balance: number
  tokens_earned: number
  total_views: number
  total_watch_time: number
  content_completed: number
  subscription_days_remaining: number | null
  referral_code: string
  referrals: ReferralStats
}

// Stripe Event Payload
export interface StripeEventPayload {
  id: string
  object: string
  data: {
    object: {
      id: string
      object: string
      customer: string
      status: string
      [key: string]: any
    }
  }
  type: string
  [key: string]: any
}

// Content Filter
export interface ContentFilter {
  portal?: PortalType
  level?: SubscriptionLevel
  search?: string
  sortBy?: 'recent' | 'popular' | 'trending'
  limit?: number
  offset?: number
}
