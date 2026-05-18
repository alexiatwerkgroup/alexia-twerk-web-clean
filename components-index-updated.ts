// src/components/index.ts
/**
 * Centralized component exports
 * Updated for Admin Dashboard integration
 */

// ============================================
// Core Components
// ============================================
export { ErrorBoundary } from './ErrorBoundary';
export { VideoPlayer } from './VideoPlayer';
export { ReferralModal } from './ReferralModal';
export { ProtectedContent } from './ProtectedContent';
export { AccessChecker } from './AccessChecker';

// ============================================
// Dashboard Components
// ============================================
export { AdminDashboard } from './AdminDashboard';
export { AnalyticsDashboard } from './admin/AnalyticsDashboard';

// ============================================
// Admin Panel Components
// ============================================
// Updated with real API integration
export { ContentManager } from './admin/ContentManager';
export { UserManagement } from './admin/UserManagement';

// ============================================
// Page Components
// ============================================
// Add to exports when using in routes
// export { ResetPasswordPage } from '@/app/auth/reset-password/page';

// ============================================
// Type Exports
// ============================================
export type {
  Video,
  User,
  DashboardStats,
  AnalyticsData,
  ContentManagerProps,
  UserManagementProps,
  AnalyticsDashboardProps,
  AdminDashboardProps,
} from '@/types/admin';

// ============================================
// Hook Exports
// ============================================
export { useAuth } from '@/hooks/useAuth';
export { useAdminAuth } from '@/hooks/useAdminAuth';

/**
 * Usage Guide:
 *
 * Import components:
 * import { ContentManager, UserManagement, AdminDashboard } from '@/components';
 *
 * Import types:
 * import type { User, Video, DashboardStats } from '@/components';
 *
 * Admin Dashboard structure:
 * <AdminDashboard>
 *   ├─ AnalyticsDashboard (Overview tab)
 *   ├─ ContentManager (Content tab)
 *   ├─ UserManagement (Users tab)
 *   └─ Settings (Settings tab)
 */
