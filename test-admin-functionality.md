# Admin Functionality Test Guide

## Overview
The video web app now supports two user groups with different permissions:

### User Group (default users):
- Can upload videos
- Can view and play transcoded videos  
- Can delete **only their own** uploads

### Admin Group:
- Everything a user can do, plus:
- Can delete **any user's video**
- Can delete users themselves
- Can view all videos across all users

## Testing the Functionality

### Step 1: Login as Regular User
1. Navigate to http://localhost:3000
2. Login as `username` or any non-admin user
3. Try to access Admin page - should be blocked (no Admin link in navbar)
4. Upload some videos
5. Try to delete only your own videos - should work

### Step 2: Login as Admin
1. Navigate to http://localhost:3000  
2. Login as `ashilrvd` (who is in the `admin` group)
3. Notice "Admin" link appears in the navbar
4. Click Admin link to access admin panel

### Step 3: Test Admin Video Management
1. In Admin panel, click "Videos" tab
2. See all videos from all users
3. Try deleting another user's video - should work (admin power!)
4. Confirm the video is deleted from that user's account

### Step 4: Test User Management
1. In Admin panel, click "Users" tab  
2. See all users with their groups
3. Try deleting a user - should work

## Demo Flow
**Perfect demo scenario:**
1. Login as regular user (`username`) → upload video → try to delete another user's video → backend rejects
2. Login as admin (`ashilrvd`) → same delete operation → works!

## API Endpoints Added

### Admin Video Management:
- `GET /api/admin/videos` - List all videos (admin only)
- `DELETE /api/admin/videos/:videoId` - Delete any video (admin only)

### Admin User Management (existed):
- `GET /api/admin/users` - List all users  
- `DELETE /api/admin/users/:username` - Delete user

## Security Implementation
- All admin endpoints protected by `ensureAdmin` middleware
- Checks for `admin` group membership in JWT token
- Regular video deletion still restricted to video owner
- Admin deletion bypasses ownership check

## Current Users in System
- `ashilrvd` - Admin user (in `admin` group)
- `username` - Regular user  
- `zoro` - Regular user