// src/types/admin.ts
/**
 * Admin Dashboard Types
 * Centralized type definitions for admin panel functionality
 */

// ============================================
// Content Management Types
// ============================================

export interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  views: number;
  required_level: 'free' | 'basic' | 'medium' | 'full';
  portal_id?: string;
  video_url: string;
  created_at: string;
  updated_at?: string;
}

export interface ContentCreateInput {
  title: string;
  description: string;
  duration: number;
  required_level: 'free' | 'basic' | 'medium' | 'full';
  video_url: string;
  portal_id?: string;
}

export interface ContentUpdateInput {
  title?: string;
  description?: string;
  duration?: number;
  required_level?: 'free' | 'basic' | 'medium' | 'full';
  video_url?: string;
  portal_id?: string;
}

export interface ContentListResponse {
  data: Video[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ============================================
// User Management Types
// ============================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  subscriptionLevel: 'free' | 'basic' | 'medium' | 'full';
  tokensBalance: number;
  createdAt: string;
  lastActive: string;
  role?: 'user' | 'admin';
}

export interface UserUpdateInput {
  displayName?: string;
  subscriptionLevel?: 'free' | 'basic' | 'medium' | 'full';
  tokensBalance?: number;
  password?: string;
}

export interface UserListResponse {
  data: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ============================================
// Dashboard Statistics Types
// ============================================

export interface DashboardStats {
  totalUsers: number;
  totalContent: number;
  totalWatchTime: number;
  totalRevenue: number;
  activeSubscriptions: number;
  tokensBurned: number;
}

export interface AnalyticsData {
  hourlyViews: {
    hour: string;
    views: number;
  }[];
  topVideos: {
    id: string;
    title: string;
    views: number;
    watchTime: number;
  }[];
  subscriptionBreakdown: {
    level: string;
    count: number;
    percentage: number;
  }[];
  tokenMetrics: {
    tokensEarned: number;
    tokensBurned: number;
    netChange: number;
  };
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  status?: number;
  details?: Record<string, unknown>;
}

// ============================================
// Component Props Types
// ============================================

export interface AdminDashboardProps {
  // No required props, uses auth context
}

export interface ContentManagerProps {
  isOpen: boolean;
}

export interface UserManagementProps {
  isOpen: boolean;
}

export interface AnalyticsDashboardProps {
  isOpen: boolean;
}

// ============================================
// Request/Query Types
// ============================================

export interface ContentQueryParams {
  search?: string;
  level?: string;
  page?: number;
  limit?: number;
}

export interface UserQueryParams {
  search?: string;
  subscription?: string;
  page?: number;
  limit?: number;
}

// ============================================
// Form State Types
// ============================================

export interface ContentFormState {
  title: string;
  description: string;
  duration: number;
  required_level: 'free' | 'basic' | 'medium' | 'full';
  video_url: string;
  portal_id: string;
}

export interface UserEditFormState {
  displayName: string;
  subscriptionLevel: 'free' | 'basic' | 'medium' | 'full';
  tokensBalance: number;
}

export interface PasswordResetFormState {
  password: string;
  confirmPassword: string;
}

// ============================================
// Modal State Types
// ============================================

export interface ContentModalState {
  isOpen: boolean;
  isEditing: boolean;
  editingId: string | null;
  formData: ContentFormState;
}

export interface UserModalState {
  editModal: {
    isOpen: boolean;
    user: User | null;
    formData: UserEditFormState;
  };
  resetModal: {
    isOpen: boolean;
    userId: string | null;
    password: string;
  };
}

// ============================================
// Filter/Sort Types
// ============================================

export type SortOrder = 'asc' | 'desc';
export type ContentSortBy = 'title' | 'views' | 'created_at' | 'duration';
export type UserSortBy = 'email' | 'created_at' | 'last_active' | 'tokens_balance';

export interface FilterOptions {
  search: string;
  sortBy: ContentSortBy | UserSortBy;
  sortOrder: SortOrder;
  page: number;
  limit: number;
}

// ============================================
// Webhook/Event Types
// ============================================

export interface AdminAction {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: 'content' | 'user';
  resourceId: string;
  timestamp: string;
  adminId: string;
  changes?: Record<string, unknown>;
}

// ============================================
// Permission Types
// ============================================

export interface AdminPermissions {
  canManageContent: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canEditSettings: boolean;
  canDeleteUsers: boolean;
}

export const getAdminPermissions = (role: string): AdminPermissions => {
  if (role === 'admin') {
    return {
      canManageContent: true,
      canManageUsers: true,
      canViewAnalytics: true,
      canEditSettings: true,
      canDeleteUsers: true,
    };
  }
  return {
    canManageContent: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canEditSettings: false,
    canDeleteUsers: false,
  };
};
