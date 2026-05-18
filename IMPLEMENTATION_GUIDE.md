# Admin Dashboard & Auth APIs Implementation Guide

## 📋 Overview

This implementation adds a complete **Admin Dashboard** with **User Management** and **Content Management** capabilities, plus secure **Password Reset** functionality.

## 📦 Files Created in This Session

### 1. API Routes (Backend)

#### Content Management APIs
- **`src/app/api/admin/content/route.ts`**
  - `GET` - Fetch paginated videos with search and level filtering
  - `POST` - Create new video content
  - Admin authentication required

- **`src/app/api/admin/content/[id]/route.ts`**
  - `PUT` - Update video metadata
  - `DELETE` - Remove video from database
  - Requires admin role

#### User Management APIs
- **`src/app/api/admin/users/route.ts`**
  - `GET` - Fetch paginated users with search and subscription filtering
  - Returns user email, display name, subscription level, tokens balance
  - Admin authentication required

- **`src/app/api/admin/users/[id]/route.ts`**
  - `PUT` - Update user profile or reset password
  - `DELETE` - Remove user account and related data
  - Requires admin role

#### Authentication APIs
- **`src/app/api/auth/reset-password/route.ts`**
  - `POST` - Request password reset email
  - Sends reset link via Supabase email service
  - Public endpoint (no auth required for security reasons)

### 2. Frontend Components (UI)

#### Updated Components
- **`src/components/admin/ContentManager.tsx`** (UPDATED)
  - Full-featured video management interface
  - Search, filter by level, pagination
  - Modal for adding/editing videos
  - Delete functionality with confirmation
  - Real API calls to `/api/admin/content`

- **`src/components/admin/UserManagement.tsx`** (UPDATED)
  - User table with search and subscription filtering
  - Edit user dialog (display name, subscription, tokens)
  - Password reset modal
  - Delete user with confirmation
  - Real API calls to `/api/admin/users`

### 3. Pages (Routes)

- **`src/app/auth/reset-password/page.tsx`** (NEW)
  - Password reset confirmation page
  - Users click email link, enter new password
  - Success message with auto-redirect to login

## 🚀 Installation Steps

### Step 1: Copy API Routes

Copy the route files to your project:

```bash
# Content management
cp route-admin-content.ts src/app/api/admin/content/route.ts
cp route-admin-content-id.ts src/app/api/admin/content/[id]/route.ts

# User management
cp route-admin-users.ts src/app/api/admin/users/route.ts
cp route-admin-users-id.ts src/app/api/admin/users/[id]/route.ts

# Auth reset password
cp route-auth-reset-password.ts src/app/api/auth/reset-password/route.ts
```

### Step 2: Replace Components

Replace the placeholder components with the updated versions:

```bash
# Replace content manager
cp ContentManager-updated.tsx src/components/admin/ContentManager.tsx

# Replace user management
cp UserManagement-updated.tsx src/components/admin/UserManagement.tsx
```

### Step 3: Add Reset Password Page

```bash
mkdir -p src/app/auth/reset-password
cp page-reset-password.tsx src/app/auth/reset-password/page.tsx
```

### Step 4: Update Database Schema

Ensure your Supabase database has these tables with proper columns:

```sql
-- Content table (if not exists)
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  views INTEGER DEFAULT 0,
  required_level TEXT DEFAULT 'free',
  portal_id UUID REFERENCES portals(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Profiles table (should already exist)
-- Verify these columns exist:
-- - display_name TEXT
-- - subscription_level TEXT DEFAULT 'free'
-- - tokens_balance INTEGER DEFAULT 0
-- - last_active TIMESTAMP
```

### Step 5: Enable Supabase Email Service

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Verify "Confirm signup" and "Reset password" templates are enabled
3. Customize the reset password email if needed
4. Update the redirect URL in `route-auth-reset-password.ts` if your domain is different

## 🔐 Security Notes

### Authentication
- All admin endpoints require `admin` role in the user's profile
- Admin check happens on every request
- Passwords updated via Supabase admin API

### Password Reset Flow
1. User requests reset at login page
2. Supabase sends email with reset link (token in URL)
3. User visits reset page with token
4. User enters new password
5. Supabase validates token and updates password
6. User redirected to login

### Best Practices Implemented
- ✅ Email verification before password change
- ✅ Secure token handling via Supabase
- ✅ Redirect URL configured for security
- ✅ Don't reveal if email exists (generic response)
- ✅ Password validation (min 8 chars)
- ✅ Admin-only endpoints with role verification

## 📊 API Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/admin/content` | List videos | Admin |
| POST | `/api/admin/content` | Create video | Admin |
| PUT | `/api/admin/content/[id]` | Update video | Admin |
| DELETE | `/api/admin/content/[id]` | Delete video | Admin |
| GET | `/api/admin/users` | List users | Admin |
| PUT | `/api/admin/users/[id]` | Update user/reset pwd | Admin |
| DELETE | `/api/admin/users/[id]` | Delete user | Admin |
| POST | `/api/auth/reset-password` | Request reset email | Public |

## 🧪 Testing

### Test Content Management
```bash
# Create video
curl -X POST http://localhost:3000/api/admin/content \
  -H "Content-Type: application/json" \
  -b "auth_token=your_token" \
  -d '{
    "title": "Sample Video",
    "description": "A test video",
    "duration": 300,
    "required_level": "free",
    "video_url": "https://example.com/video.mp4"
  }'

# Get videos
curl http://localhost:3000/api/admin/content?page=1 \
  -b "auth_token=your_token"
```

### Test Password Reset
```bash
# Request reset
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Response (generic for security):
# {"message": "If an account with that email exists, a password reset link has been sent."}
```

## ⚙️ Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key  # For admin operations
```

## 📝 Next Steps

After implementation:

1. **Test Admin Dashboard**
   - Navigate to `/admin`
   - Verify all tabs load correctly
   - Test search, filter, and pagination

2. **Test Content Management**
   - Create a test video
   - Edit and delete it
   - Verify videos appear in main feed

3. **Test User Management**
   - Edit a user's subscription level
   - Test password reset
   - Delete a test user

4. **Email Configuration**
   - Request password reset
   - Check inbox for reset email
   - Verify reset link works

## 🔗 Related Files (Already Exist)

- `src/components/AdminDashboard.tsx` - Main dashboard container
- `src/components/admin/AnalyticsDashboard.tsx` - Analytics tab
- `src/app/admin/page.tsx` - Admin route
- `src/app/api/admin/stats/route.ts` - Stats API

## 💡 Tips

- **Pagination**: Default is 10 items per content page, 20 per users page
- **Search**: Works on title/description for content, email/name for users
- **Filtering**: By subscription level or required level
- **Modals**: Use Framer Motion for smooth animations
- **Error Handling**: All endpoints return detailed error messages

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Ensure user is logged in and has admin role |
| 403 Forbidden | User exists but doesn't have admin role |
| Password reset email not received | Check Supabase email templates are enabled |
| API errors | Check browser console and server logs for details |
| Content not appearing | Verify required_level matches user subscription |

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-22  
**Status**: Ready for Integration
