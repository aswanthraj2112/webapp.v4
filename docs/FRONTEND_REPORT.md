# Frontend Application Report

**Project**: Video Transcoding Web Application  
**Technology Stack**: React 18.2.0 + Vite + AWS Amplify  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Core Features](#core-features)
5. [User Workflows](#user-workflows)
6. [Component Documentation](#component-documentation)
7. [Security Features](#security-features)
8. [Performance Optimizations](#performance-optimizations)
9. [API Integration](#api-integration)

---

## Executive Summary

The Video Transcoding Web Application is a modern, single-page application (SPA) built with React that enables users to upload, manage, transcode, and stream video content. The application leverages AWS Cognito for authentication, provides multi-factor authentication (MFA) support, and offers real-time transcoding status updates. Users can upload videos directly to S3, trigger transcoding jobs to convert videos to different resolutions (720p/1080p), and stream content with quality selection capabilities.

### Key Highlights
- **Secure Authentication**: AWS Cognito with MFA support (SMS, TOTP)
- **Direct S3 Uploads**: Client-side uploads using presigned URLs
- **Real-time Updates**: Live transcoding progress monitoring
- **Video Streaming**: HTML5 video player with quality switching
- **Admin Portal**: User and video management for administrators
- **Responsive Design**: Modern, user-friendly interface

---

## Technology Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI framework |
| React DOM | 18.2.0 | DOM rendering |
| Vite | 7.1.7 | Build tool and dev server |
| AWS Amplify | 6.15.6 | AWS Cognito integration |
| JWT Decode | 4.0.0 | Token parsing |

### Development Tools
- **ESLint**: Code quality and consistency
- **Vite Plugin React**: Fast refresh and JSX transform
- **Globals**: Environment variable management

### Build Configuration
- **Dev Server Port**: 3000
- **Host**: 0.0.0.0 (allows external connections)
- **CORS**: Enabled for API communication

---

## Architecture Overview

### Application Structure

```
client/
├── src/
│   ├── main.jsx                 # Application entry point
│   ├── App.jsx                  # Root component with routing
│   ├── api.js                   # API client wrapper
│   ├── styles.css              # Global styles
│   ├── components/
│   │   ├── NavBar.jsx          # Navigation header
│   │   ├── Uploader.jsx        # File upload component
│   │   ├── VideoList.jsx       # Video grid display
│   │   └── VideoPlayer.jsx     # Video playback modal
│   └── pages/
│       ├── Login.jsx           # Authentication page
│       ├── Dashboard.jsx       # Main user interface
│       └── Admin.jsx           # Admin portal
├── public/                     # Static assets
├── vite.config.js             # Vite configuration
└── package.json               # Dependencies
```

### Component Hierarchy

```
App (Root)
├── ToastContext (Global notifications)
├── NavBar
│   ├── Navigation links
│   └── User profile & sign out
└── Main Content (Conditional rendering)
    ├── Login Page (Unauthenticated)
    │   ├── Sign In form
    │   ├── Sign Up form
    │   ├── Confirmation form
    │   └── MFA challenges
    ├── Dashboard (Authenticated Users)
    │   ├── Welcome section
    │   ├── Uploader
    │   ├── VideoList
    │   │   └── Video cards (grid)
    │   └── VideoPlayer (Modal)
    └── Admin Page (Admin Users Only)
        ├── Users tab
        └── Videos tab
```

---

## Core Features

### 1. Authentication System

#### AWS Cognito Integration
- **User Pool Authentication**: Secure user management via AWS Cognito
- **JWT Token Management**: Automatic token refresh and validation
- **Session Persistence**: Maintains user session across page reloads

#### Multi-Factor Authentication (MFA)
The application supports multiple MFA methods:

**SMS MFA**
- Verification code sent via SMS
- User enters 6-digit code to complete sign-in

**TOTP (Time-based One-Time Password)**
- Support for authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)
- QR code generation for easy setup
- Manual secret key entry option
- Step-by-step setup wizard

**MFA Setup Flow**
1. User signs in with username/password
2. System detects MFA_SETUP challenge
3. Application generates TOTP secret
4. QR code displayed for scanning
5. User enters verification code from authenticator app
6. MFA setup confirmed
7. Future logins require MFA code

#### Authentication Modes

**Sign In**
- Username and password authentication
- Challenge handling (MFA, password reset, new password required)
- Automatic session creation

**Sign Up**
- User registration with email verification
- Password requirements enforcement
- Email confirmation code delivery
- Account activation flow

**Password Management**
- New password required challenge
- Secure password update flow

#### Error Handling
- Graceful handling of authentication challenges
- User-friendly error messages
- Suppression of technical auth errors in console
- Retry logic for session fetching

---

### 2. Video Upload System

#### Upload Methods
1. **Drag and Drop**: Visual drop zone with drag feedback
2. **File Browser**: Traditional file picker via click

#### Upload Process

**Three-Phase Upload**
```
Phase 1: Request Presigned URL
├── Client sends file metadata to backend
├── Backend generates S3 presigned URL
└── Returns URL + video ID

Phase 2: Direct S3 Upload
├── Client uploads file directly to S3
├── Uses PUT request with presigned URL
└── Bypasses backend server (performance optimization)

Phase 3: Finalize Upload
├── Client sends upload confirmation to backend
├── Includes metadata: name, size, duration, S3 key
└── Backend records video in database
```

#### Metadata Extraction
- **Client-side Duration Detection**: Extracts video duration before upload using HTML5 Video API
- **File Information**: Captures original filename, size, content type
- **Upload Timestamp**: Automatically recorded by backend

#### User Experience
- **Visual Feedback**: Upload progress indication
- **Drag State**: Visual highlight when dragging over drop zone
- **File Validation**: Accepts video MIME types only
- **Success Notifications**: Toast message on successful upload

---

### 3. Video Management

#### Video List Display

**Grid Layout**
- Responsive video card grid (6 videos per page)
- Thumbnail previews with duration overlay
- Video metadata display (size, upload date)
- Status badges (ready, transcoding, transcoded, failed)

**Pagination**
- Page navigation controls (Previous/Next)
- Page counter (current page / total pages)
- Configurable items per page (default: 6)

**Thumbnail System**
- Authenticated thumbnail URLs via presigned URLs
- Fallback placeholder for missing thumbnails
- Video emoji (📹) as default icon
- Error handling for failed thumbnail loads

#### Video Information Display

Each video card shows:
- **Thumbnail**: Visual preview with duration overlay
- **Filename**: Original upload name
- **Status**: Current processing state
- **File Size**: Formatted in B/KB/MB/GB
- **Upload Date**: Human-readable date format
- **Duration**: Formatted as MM:SS or HH:MM:SS
- **Transcoding Progress**: Percentage bar (when transcoding)
- **Transcoded Indicator**: Checkmark when HD version available

#### Status Types
| Status | Description | Visual Indicator |
|--------|-------------|------------------|
| `ready` | Video uploaded and ready | Green badge |
| `transcoding` | Currently being processed | Yellow badge + progress bar |
| `transcoded` | HD version available | Blue badge + checkmark |
| `failed` | Transcoding error | Red badge |

---

### 4. Video Transcoding

#### Transcoding Options
- **720p HD**: Standard high-definition transcoding
- **1080p HD**: Full high-definition transcoding
- **Original**: Preserve original video quality

#### Transcoding Workflow

**Initiation**
1. User clicks "Transcode 720p" or "Transcode 1080p" button
2. Frontend sends request to backend API
3. Backend triggers AWS transcoding job (MediaConvert/FFmpeg)
4. Video status updated to "transcoding"
5. UI immediately reflects new status

**Progress Monitoring**
- **Smart Polling**: Only polls when transcoding is active
- **5-Second Intervals**: Checks status every 5 seconds
- **Progress Bar**: Visual percentage indicator (0-100%)
- **Real-time Updates**: Status changes reflected immediately

**Completion Handling**
- **Success Notification**: Toast message when transcoding completes
- **UI Update**: "Play HD" button becomes available
- **Stop Polling**: Automatic polling termination
- **Error Notification**: Alert if transcoding fails

#### Multiple Resolutions
Users can transcode the same video to multiple resolutions sequentially. Each transcoding job is independent and tracked separately.

---

### 5. Video Playback

#### Video Player Features

**HTML5 Video Player**
- Native browser video controls
- Play/pause, volume, fullscreen
- Seek bar with timeline
- Playback speed control (browser native)

**Quality Selection**
- **Original**: Plays uploaded video
- **HD (720p/1080p)**: Plays transcoded version
- **Seamless Switching**: Preserves playback position when changing quality
- **Real-time Loading**: Fetches presigned URL on demand

**Player Controls**
- Quality selector dropdown
- Download current quality button
- Close button to return to dashboard

**Streaming Architecture**
```
User clicks "Play"
├── Frontend requests presigned streaming URL
├── Backend generates time-limited S3 URL
├── Frontend loads URL into HTML5 video element
└── Browser handles streaming (byte-range requests)
```

**Modal Design**
- Overlay modal for focused viewing
- Responsive video player
- Loading state indication
- Error handling for failed loads

---

### 6. Download Functionality

#### Download Options

**From Video List**
- Download Original: Full quality uploaded file
- Download 720p: Transcoded HD version (if available)

**From Video Player**
- Download current quality being viewed
- One-click download with proper filename

#### Download Process
1. Request presigned download URL with `download=true` flag
2. Backend generates S3 URL with Content-Disposition header
3. Client creates hidden anchor element
4. Trigger programmatic click to start download
5. Browser saves file with proper filename

#### Filename Format
- `{original_name}_{quality_variant}`
- Example: `vacation_video_720p.mp4`

---

### 7. Video Deletion

#### User-Level Deletion
- Users can delete their own videos
- Confirmation dialog before deletion
- Removes video from S3 and database
- Updates video list after deletion
- Closes video player if deleted video was playing

#### Admin-Level Deletion
- Admins can delete any user's videos
- Requires video ID and owner user ID
- Additional confirmation prompt
- Complete cleanup of all related resources

---

### 8. Admin Portal

#### Access Control
- Restricted to users in admin groups:
  - `admin`
  - `admins`
  - `Administrators`
- Navigation tab only visible to authorized users
- API endpoints validate admin permissions server-side

#### Users Management Tab

**User List Display**
| Column | Description |
|--------|-------------|
| Username | Cognito username |
| Email | User email address |
| Status | Account status (CONFIRMED, FORCE_CHANGE_PASSWORD, etc.) |
| Groups | Comma-separated group membership |
| Actions | Delete user button |

**User Operations**
- **List All Users**: Fetches complete user list from Cognito
- **Delete User**: Removes user from Cognito user pool
- **Confirmation**: Requires confirmation before deletion
- **Refresh**: Manual refresh button to reload user list

#### Videos Management Tab

**Video List Display**
| Column | Description |
|--------|-------------|
| Video | Original filename |
| Owner | Username of video owner |
| Status | Processing status |
| Created | Upload date |
| Actions | Delete video button |

**Video Operations**
- **List All Videos**: Shows videos from all users
- **Delete Any Video**: Remove any user's video
- **Cross-user Management**: Full video administration
- **Refresh**: Manual refresh capability

#### Tab Navigation
- Toggle between Users and Videos tabs
- Independent data loading per tab
- Loading states during data fetch

---

## User Workflows

### Workflow 1: New User Registration

```
1. User visits application
   ↓
2. Click "Need an account? Register"
   ↓
3. Enter username, email, password
   ↓
4. Submit registration form
   ↓
5. Receive confirmation code via email
   ↓
6. Enter confirmation code
   ↓
7. Account activated
   ↓
8. Redirected to sign-in
   ↓
9. Sign in with credentials
   ↓
10. Access dashboard
```

### Workflow 2: MFA Setup

```
1. Admin enables MFA requirement
   ↓
2. User signs in with credentials
   ↓
3. System detects MFA_SETUP challenge
   ↓
4. Application shows MFA setup page
   ↓
5. User clicks "Set up authenticator app"
   ↓
6. QR code generated and displayed
   ↓
7. User scans QR with authenticator app
   ↓
8. Authenticator app generates 6-digit code
   ↓
9. User enters code to verify setup
   ↓
10. MFA configuration confirmed
   ↓
11. Future logins require MFA code
```

### Workflow 3: Video Upload and Transcoding

```
1. User drags video file to upload zone
   ↓
2. Application extracts video duration
   ↓
3. Request presigned S3 URL from backend
   ↓
4. Upload file directly to S3
   ↓
5. Send finalization request with metadata
   ↓
6. Video appears in list with "ready" status
   ↓
7. User clicks "Transcode 720p"
   ↓
8. Backend initiates transcoding job
   ↓
9. Status changes to "transcoding"
   ↓
10. Progress bar shows percentage
    ↓
11. Frontend polls status every 5 seconds
    ↓
12. Transcoding completes
    ↓
13. Status changes to "transcoded"
    ↓
14. "Play HD" button becomes available
    ↓
15. User plays HD version
```

### Workflow 4: Video Playback

```
1. User clicks "Play" or "Play HD" button
   ↓
2. Frontend requests presigned streaming URL
   ↓
3. Backend generates time-limited S3 URL
   ↓
4. Video player modal opens
   ↓
5. Video loads in HTML5 player
   ↓
6. User can:
   - Watch video
   - Switch quality (original ↔ HD)
   - Download current quality
   - Close player
   ↓
7. Quality switch preserves playback position
```

### Workflow 5: Admin User Management

```
1. Admin user signs in
   ↓
2. Click "Admin" tab in navigation
   ↓
3. Admin portal loads with Users tab active
   ↓
4. View all registered users
   ↓
5. Admin clicks "Delete" on a user
   ↓
6. Confirmation dialog appears
   ↓
7. Admin confirms deletion
   ↓
8. User removed from Cognito
   ↓
9. User list refreshed
   ↓
10. Success notification displayed
```

---

## Component Documentation

### App.jsx (Root Component)

**Purpose**: Main application orchestrator handling authentication, routing, and global state.

**State Management**
- `authConfigured`: Cognito configuration status
- `user`: Current authenticated user object
- `loadingUser`: Initial session load state
- `activePage`: Current page ('dashboard' or 'admin')
- `configError`: Configuration error messages
- `toast`: Global notification state

**Key Functions**

| Function | Purpose |
|----------|---------|
| `safeFetchAuthSession()` | Safely fetches auth session with error handling |
| `buildUserFromSession()` | Extracts user info from JWT tokens |
| `handleSignOut()` | Signs out user and clears state |
| `handleAuthenticated()` | Processes successful authentication |

**Effects**
1. **Configuration Effect**: Loads Cognito config on mount
2. **Session Effect**: Checks for existing user session
3. **Hub Listener**: Monitors authentication events
4. **Unhandled Rejection Handler**: Suppresses auth-related console errors

**Context Provided**
- `ToastContext`: Global notification system for all child components

---

### Login.jsx (Authentication Page)

**Purpose**: Handles all authentication flows including sign-in, sign-up, MFA, and password challenges.

**State Management**
- `mode`: Current mode ('signIn', 'signUp', 'confirm')
- `form`: Form input values
- `pendingUsername`: Username awaiting confirmation
- `challengeUser`: User object during auth challenges
- `challengeType`: Type of auth challenge ('mfa', 'newPassword', 'setupMfa')
- `totpSetupUrl`: Generated TOTP QR code URL
- `submitting`: Form submission state

**Modes**

**1. Sign In Mode**
- Username/password form
- Handles challenges: MFA, new password, MFA setup
- Redirects to dashboard on success

**2. Sign Up Mode**
- Registration form (username, email, password)
- Sends verification code via email
- Transitions to confirm mode

**3. Confirm Mode**
- Email verification with code
- Resend code option
- Back to sign-in link

**4. MFA Challenge Mode**
- 6-digit code input
- Verifies SMS or TOTP code
- Completes sign-in on success

**5. New Password Mode**
- New password input
- Updates password and continues sign-in

**6. MFA Setup Mode**
- Two-step setup process:
  1. Generate QR code and secret key
  2. Verify with authenticator code
- QR code using external service (qrserver.com)
- Manual key entry option

**Key Functions**

| Function | Purpose |
|----------|---------|
| `handleSignIn()` | Processes sign-in with challenge detection |
| `handleSignUp()` | Registers new user |
| `handleConfirm()` | Confirms email with code |
| `handleResend()` | Resends confirmation code |
| `handleSubmitMfa()` | Verifies MFA code |
| `handleSubmitNewPassword()` | Updates password |
| `handleSetupTotp()` | Initiates TOTP setup |
| `handleConfirmTotpSetup()` | Verifies TOTP setup |

---

### Dashboard.jsx (Main User Interface)

**Purpose**: Primary user interface for video management, upload, playback, and transcoding.

**State Management**
- `videos`: Current page of video items
- `page`: Current pagination page
- `limit`: Items per page (6)
- `total`: Total video count
- `loading`: Data loading state
- `uploading`: Upload in progress state
- `selectedVideo`: Video selected for playback
- `transcodingVideos`: Set of video IDs currently transcoding

**Key Functions**

| Function | Purpose |
|----------|---------|
| `loadVideos()` | Fetches paginated video list |
| `handleUpload()` | Manages three-phase upload process |
| `handleSelect()` | Opens video player |
| `handleDownload()` | Downloads video variant |
| `handleTranscode()` | Initiates transcoding job |
| `handleDelete()` | Deletes video with confirmation |
| `getVideoDuration()` | Extracts video duration client-side |

**Effects**

**1. Video Loading Effect**
- Triggers on page change
- Fetches video list for current page
- Initializes transcoding status

**2. Polling Effect**
- Only active when videos are transcoding
- Polls status every 5 seconds
- Updates progress in real-time
- Stops polling when transcoding completes
- Shows notifications on completion/failure

**Child Components**
- Uploader: File upload interface
- VideoList: Grid display of videos
- VideoPlayer: Modal video player (conditional)

---

### Admin.jsx (Admin Portal)

**Purpose**: Administrative interface for user and video management.

**State Management**
- `users`: List of all users
- `videos`: List of all videos
- `loading`: Data loading state
- `activeTab`: Current tab ('users' or 'videos')

**Key Functions**

| Function | Purpose |
|----------|---------|
| `loadUsers()` | Fetches all Cognito users |
| `loadVideos()` | Fetches all videos across users |
| `handleDeleteUser()` | Removes user from Cognito |
| `handleDeleteVideo()` | Deletes any user's video |

**Effects**
- **Tab Change Effect**: Loads appropriate data when tab switches
- Prevents unnecessary API calls by checking active tab

**UI Sections**
1. **Header**: Tab switcher and refresh button
2. **Users Tab**: Table of all users with delete action
3. **Videos Tab**: Table of all videos with delete action

---

### NavBar.jsx (Navigation Header)

**Purpose**: Application navigation and user information display.

**Props**
- `user`: Current authenticated user
- `canManageUsers`: Admin permission flag
- `activePage`: Current active page
- `onNavigate`: Page change handler
- `onLogout`: Sign-out handler

**UI Elements**
- **Brand**: Application name/logo
- **Navigation**: Dashboard and Admin (conditional) links
- **User Info**: Displays username
- **Actions**: Sign out button

**Conditional Rendering**
- Admin link only shown to authorized users
- Active page styling
- Welcome message for unauthenticated users

---

### Uploader.jsx (File Upload Component)

**Purpose**: Drag-and-drop file upload interface.

**State Management**
- `dragging`: Drag-over state for visual feedback

**Props**
- `onUpload`: Callback with selected file
- `uploading`: Upload in progress flag

**Event Handlers**

| Handler | Purpose |
|---------|---------|
| `handleDrop()` | Processes dropped files |
| `handleDragOver()` | Enables drop and updates UI |
| `handleDragLeave()` | Resets drag state |
| `triggerFilePicker()` | Opens file browser on click |
| `onInputChange()` | Handles file input selection |

**Features**
- Visual drag feedback with CSS class
- Click-to-browse fallback
- Accepts video MIME types only
- Disabled state during upload
- Hidden file input element

---

### VideoList.jsx (Video Grid Component)

**Purpose**: Displays paginated grid of video cards with actions.

**State Management**
- `transcodingVideos`: Local tracking of transcoding jobs
- `thumbnailUrls`: Cached presigned thumbnail URLs

**Props**
- `videos`: Array of video objects
- `loading`: Loading state
- `page`: Current page number
- `limit`: Items per page
- `total`: Total video count
- `onPageChange`: Page navigation handler
- `onSelect`: Video selection handler
- `onDownload`: Download handler
- `onTranscode`: Transcoding handler
- `onDelete`: Deletion handler

**Effects**
- **Thumbnail Loading Effect**: Loads authenticated thumbnail URLs for visible videos

**Helper Functions**

| Function | Purpose |
|----------|---------|
| `formatBytes()` | Formats file size (B/KB/MB/GB) |
| `formatDuration()` | Formats duration (MM:SS or HH:MM:SS) |
| `goToPage()` | Validates and navigates to page |
| `handleTranscode()` | Manages transcoding UI state |

**Video Card Structure**
```
Video Card
├── Thumbnail (or placeholder)
│   └── Duration overlay
├── Video Info
│   ├── Name
│   ├── Status badge
│   ├── Progress bar (if transcoding)
│   ├── Transcoded indicator
│   └── Metadata (size, date)
└── Actions
    ├── Play button
    ├── Play HD button (conditional)
    ├── Download options
    ├── Transcode buttons (conditional)
    └── Delete button
```

---

### VideoPlayer.jsx (Video Playback Component)

**Purpose**: Modal video player with quality selection and download.

**State Management**
- `selectedQuality`: Current quality ('original' or 'transcoded')
- `currentStreamUrl`: Presigned streaming URL
- `loading`: Video loading state
- `currentTime`: Playback position for quality switching

**Props**
- `video`: Video object to play
- `onClose`: Close modal handler

**Effects**
- **Video Loading Effect**: Fetches streaming URL when quality changes
- **Quality Switch Effect**: Preserves playback position

**Quality Options**
- Original: Always available
- HD (720p/1080p): Only if transcoded version exists

**Key Functions**

| Function | Purpose |
|----------|---------|
| `loadVideo()` | Fetches presigned streaming URL |
| `handleQualityChange()` | Switches quality and preserves position |
| `handleVideoLoaded()` | Restores playback position |
| `handleDownloadCurrent()` | Downloads currently playing quality |

**UI Layout**
```
Modal Overlay
└── Modal Container
    ├── Header
    │   ├── Video title
    │   └── Controls
    │       ├── Quality selector
    │       ├── Download button
    │       └── Close button
    └── Content
        └── HTML5 Video Player
            └── Native controls
```

---

## Security Features

### 1. Authentication Security

**AWS Cognito Integration**
- Industry-standard OAuth 2.0 / OpenID Connect
- Secure password hashing (bcrypt)
- Token-based authentication (JWT)
- Automatic token refresh

**Multi-Factor Authentication**
- SMS-based MFA
- TOTP authenticator app support
- Mandatory MFA enforcement (configurable)
- Secure secret generation

### 2. Authorization

**Role-Based Access Control**
- User groups managed in Cognito
- Admin group permissions
- API-level permission validation
- Frontend UI conditional rendering

**Token Validation**
- Bearer token authentication
- JWT signature verification
- Token expiration checking
- Automatic session refresh

### 3. Secure Communication

**API Security**
- HTTPS communication (production)
- CORS configuration
- Bearer token in Authorization header
- Request/response encryption

**Presigned URLs**
- Time-limited S3 access
- Read-only or write-only permissions
- Automatic expiration
- URL signature validation

### 4. Data Protection

**Client-Side Security**
- No sensitive data in local storage
- Tokens in memory only
- Automatic session cleanup on sign-out
- XSS protection via React

**Input Validation**
- File type validation
- Form input sanitization
- Email format validation
- Password complexity requirements

### 5. Error Handling

**Secure Error Messages**
- Generic error messages to users
- Detailed logs for debugging (console only)
- Suppression of sensitive information
- No stack traces exposed to users

---

## Performance Optimizations

### 1. Upload Performance

**Direct S3 Upload**
- Bypasses backend server
- Parallel upload capability
- Reduces server load
- Faster upload times

**Presigned URL Strategy**
- Client requests temporary upload URL
- Direct browser-to-S3 transfer
- No file passing through server

### 2. Streaming Performance

**Presigned Streaming URLs**
- Direct S3 streaming
- Browser byte-range requests
- Adaptive streaming support
- Minimal server involvement

**Video Player Optimization**
- Native HTML5 video element
- Browser-native controls
- Hardware acceleration
- Efficient buffering

### 3. Polling Optimization

**Conditional Polling**
- Only polls when transcoding is active
- Stops polling on completion
- 5-second intervals (balance between responsiveness and efficiency)
- Per-video status tracking

**State Management**
- Set data structure for O(1) lookup
- Minimal re-renders
- Efficient status updates

### 4. Rendering Performance

**React Optimizations**
- useCallback for memoized functions
- useMemo for expensive computations
- Conditional effects with dependency arrays
- Virtual DOM diffing

**Lazy Loading**
- Pagination reduces initial load
- Thumbnails loaded as needed
- Video content loaded on demand

### 5. Build Optimization

**Vite Build Tool**
- Fast hot module replacement (HMR)
- ES modules for development
- Optimized production builds
- Tree shaking for smaller bundles
- Code splitting

**Production Bundle**
- Minified JavaScript
- Compressed assets
- Optimized dependencies
- Source maps for debugging

### 6. Caching Strategy

**Thumbnail Caching**
- Presigned URLs cached in state
- Prevents redundant API calls
- Reduces S3 request costs

**API Response Caching**
- Browser cache headers respected
- Conditional requests supported

---

## API Integration

### API Client Architecture

**Centralized API Module** (`api.js`)
- Single source of truth for all API calls
- Consistent error handling
- Automatic authentication header injection
- Environment-based URL configuration

### Base URL Configuration

```javascript
// Environment variable or default
VITE_API_URL = process.env.VITE_API_URL || '/api'

// Normalized base URL
API_BASE_URL = normalizeBaseUrl(VITE_API_URL)
```

### Authentication Flow

**Token Acquisition**
```javascript
1. Fetch auth session from Amplify
2. Extract access token from session
3. Handle auth challenges gracefully
4. Retry with force refresh if needed
5. Return token or throw error
```

**Request Authorization**
```javascript
// All authenticated requests
headers: {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

### API Endpoints

#### Public Endpoints

**GET /config**
- Purpose: Fetch Cognito configuration
- Auth: None
- Response: `{ cognito: { region, userPoolId, clientId } }`

#### User Endpoints

**GET /auth/me**
- Purpose: Get current user information
- Auth: Required
- Response: User profile object

**GET /videos?page={page}&limit={limit}**
- Purpose: List user's videos (paginated)
- Auth: Required
- Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- Response: `{ items: [], total: number, page: number, limit: number }`

**GET /videos/{id}**
- Purpose: Get single video metadata
- Auth: Required
- Response: Video object

**GET /videos/{id}/stream?variant={variant}&download={download}**
- Purpose: Get presigned streaming/download URL
- Auth: Required
- Parameters:
  - `variant`: 'original', 'transcoded', 'thumbnail'
  - `download`: '1' for download, omit for streaming
- Response: `{ url: string }`

**POST /videos/presign**
- Purpose: Request upload presigned URL
- Auth: Required
- Body: `{ fileName: string, contentType: string }`
- Response: `{ uploadUrl: string, videoId: string, s3Key: string }`

**POST /videos/finalize**
- Purpose: Complete upload and save metadata
- Auth: Required
- Body: `{ videoId, originalName, s3Key, sizeBytes, durationSeconds?, contentType }`
- Response: Video object

**DELETE /videos/{id}**
- Purpose: Delete user's own video
- Auth: Required
- Response: `{ message: string }`

#### Transcoding Endpoints

**POST /videos/{id}/transcode**
- Purpose: Start transcoding job
- Auth: Required
- Body: `{ resolution: '720p' | '1080p' }`
- Response: `{ message: string, jobId: string }`

**GET /videos/{id}/transcoding-status**
- Purpose: Get transcoding job status
- Auth: Required
- Response: `{ status: string, transcodingProgress: number, hasTranscodedVersion: boolean, hasThumbnail: boolean }`

**GET /videos/transcoding/resolutions**
- Purpose: Get supported resolution options
- Auth: Required
- Response: `{ resolutions: string[] }`

#### Admin Endpoints

**GET /admin/users**
- Purpose: List all Cognito users
- Auth: Required (Admin only)
- Response: `{ users: [] }`

**DELETE /admin/users/{username}**
- Purpose: Delete any user
- Auth: Required (Admin only)
- Response: `{ message: string }`

**GET /admin/videos**
- Purpose: List all videos across all users
- Auth: Required (Admin only)
- Response: `{ items: [] }`

**DELETE /admin/videos/{videoId}**
- Purpose: Delete any user's video
- Auth: Required (Admin only)
- Body: `{ userId: string }`
- Response: `{ message: string }`

### Error Handling

**Client-Side Error Handling**
```javascript
try {
  const response = await fetch(url, options)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Request failed')
  }
  
  return await response.json()
} catch (error) {
  // Log error
  console.error('API request failed:', error)
  
  // Show user-friendly message
  notify(error.message, 'error')
  
  // Re-throw for component handling
  throw error
}
```

**HTTP Status Codes**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

### Request/Response Format

**Standard Request Format**
```json
{
  "headers": {
    "Authorization": "Bearer {token}",
    "Content-Type": "application/json"
  },
  "body": {
    // Request payload
  }
}
```

**Standard Response Format**
```json
{
  "data": {
    // Response data
  },
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## Conclusion

The Video Transcoding Web Application frontend is a modern, secure, and performant React application that provides a comprehensive video management solution. Key achievements include:

### Technical Excellence
✅ **Modern Stack**: React 18 + Vite for optimal development experience  
✅ **Security First**: AWS Cognito with MFA support  
✅ **Performance**: Direct S3 uploads and streaming  
✅ **Real-time Updates**: Live transcoding progress monitoring  

### User Experience
✅ **Intuitive Interface**: Drag-and-drop uploads, grid layouts  
✅ **Responsive Design**: Works across devices  
✅ **Clear Feedback**: Toast notifications, progress bars  
✅ **Quality Options**: Multiple resolution support  

### Admin Capabilities
✅ **User Management**: Complete user administration  
✅ **Video Management**: Cross-user video control  
✅ **Role-Based Access**: Secure permission system  

### Scalability
✅ **Pagination**: Efficient handling of large video libraries  
✅ **Conditional Polling**: Resource-efficient status updates  
✅ **Caching**: Optimized API usage  

The application successfully demonstrates a production-ready video transcoding platform with enterprise-grade security, excellent user experience, and efficient resource utilization.

---

**Document Version**: 1.0  
**Author**: System Documentation  
