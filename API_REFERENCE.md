# 📡 API Reference

Complete API documentation for the Video Platform microservices.

---

## Base URLs

| Environment | URL |
|-------------|-----|
| **Production** | `http://<ALB_DNS>` |
| **Local** | `http://localhost:8080` |

---

## Authentication

### Overview

The API uses JWT (JSON Web Tokens) for authentication. Tokens are obtained through the login endpoint and must be included in the Authorization header for protected routes.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

---

## Endpoints

### Health Checks

#### Video API Health
```http
GET /healthz
```

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "service": "video-api",
  "timestamp": "2025-10-30T10:00:00.000Z"
}
```

#### Admin Service Health
```http
GET /api/admin/health
```

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "service": "admin-service",
  "timestamp": "2025-10-30T10:00:00.000Z"
}
```

---

### Authentication Endpoints

#### User Signup

Create a new user account.

```http
POST /api/auth/signup
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "message": "User created successfully",
  "userId": "abc123",
  "email": "user@example.com"
}
```

**Errors:**
- `400 Bad Request` - Invalid input (missing fields, invalid email)
- `409 Conflict` - Email already exists

#### User Login

Authenticate and receive JWT token.

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "expiresIn": "24h"
}
```

**Errors:**
- `400 Bad Request` - Missing credentials
- `401 Unauthorized` - Invalid credentials

---

### Video Endpoints

#### List All Videos

Retrieve all videos accessible to the user.

```http
GET /api/videos
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional) - Number of results (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)
- `status` (optional) - Filter by status: `processing`, `completed`, `failed`

**Response:** `200 OK`
```json
{
  "videos": [
    {
      "id": "video123",
      "title": "My Video",
      "description": "Video description",
      "status": "completed",
      "uploadedBy": "user123",
      "uploaderName": "John Doe",
      "originalUrl": "https://s3.../original.mp4",
      "thumbnailUrl": "https://s3.../thumb.jpg",
      "duration": 120,
      "size": 10485760,
      "createdAt": "2025-10-30T10:00:00.000Z",
      "updatedAt": "2025-10-30T10:05:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token

#### Get Video Details

Retrieve detailed information about a specific video.

```http
GET /api/videos/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "video123",
  "title": "My Video",
  "description": "Video description",
  "status": "completed",
  "uploadedBy": "user123",
  "uploaderName": "John Doe",
  "originalUrl": "https://s3.../original.mp4",
  "transcodedUrls": {
    "720p": "https://s3.../720p.mp4",
    "480p": "https://s3.../480p.mp4",
    "360p": "https://s3.../360p.mp4"
  },
  "thumbnailUrl": "https://s3.../thumb.jpg",
  "duration": 120,
  "size": 10485760,
  "views": 42,
  "metadata": {
    "codec": "h264",
    "resolution": "1920x1080",
    "framerate": 30,
    "bitrate": "5000kbps"
  },
  "createdAt": "2025-10-30T10:00:00.000Z",
  "updatedAt": "2025-10-30T10:05:00.000Z"
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Video not found

#### Upload Video

Upload a new video file.

```http
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `video` (required) - Video file (mp4, mov, avi)
- `title` (required) - Video title (max 255 chars)
- `description` (optional) - Video description (max 1000 chars)

**Example with curl:**
```bash
curl -X POST http://$ALB_DNS/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@video.mp4" \
  -F "title=My Video" \
  -F "description=This is my video"
```

**Response:** `200 OK`
```json
{
  "message": "Video uploaded successfully",
  "videoId": "video123",
  "status": "processing",
  "uploadUrl": "https://s3.../video123/original.mp4"
}
```

**Errors:**
- `400 Bad Request` - Missing required fields or invalid file
- `401 Unauthorized` - Missing or invalid token
- `413 Payload Too Large` - File exceeds size limit
- `415 Unsupported Media Type` - Invalid file format

#### Delete Video

Delete a video (owner or admin only).

```http
DELETE /api/videos/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Video deleted successfully",
  "videoId": "video123"
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not authorized to delete this video
- `404 Not Found` - Video not found

---

### Admin Endpoints

All admin endpoints require an admin role.

#### List All Users

Retrieve all users (admin only).

```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)
- `role` (optional) - Filter by role: `user`, `admin`

**Response:** `200 OK`
```json
{
  "users": [
    {
      "id": "user123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "status": "active",
      "videoCount": 5,
      "totalStorage": 52428800,
      "createdAt": "2025-10-30T10:00:00.000Z",
      "lastLogin": "2025-10-30T11:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not an admin user

#### Get User Details

Retrieve detailed information about a specific user.

```http
GET /api/admin/users/:id
Authorization: Bearer <admin_token>
```

**Response:** `200 OK`
```json
{
  "id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "status": "active",
  "videoCount": 5,
  "totalStorage": 52428800,
  "videos": [
    {
      "id": "video123",
      "title": "My Video",
      "status": "completed",
      "createdAt": "2025-10-30T10:00:00.000Z"
    }
  ],
  "createdAt": "2025-10-30T10:00:00.000Z",
  "lastLogin": "2025-10-30T11:00:00.000Z"
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not an admin user
- `404 Not Found` - User not found

#### Delete User

Delete a user account (admin only).

```http
DELETE /api/admin/users/:id
Authorization: Bearer <admin_token>
```

**Response:** `200 OK`
```json
{
  "message": "User deleted successfully",
  "userId": "user123"
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not an admin user
- `404 Not Found` - User not found

#### Get System Statistics

Retrieve system-wide statistics.

```http
GET /api/admin/stats
Authorization: Bearer <admin_token>
```

**Response:** `200 OK`
```json
{
  "users": {
    "total": 100,
    "active": 85,
    "admins": 5,
    "newThisMonth": 15
  },
  "videos": {
    "total": 500,
    "processing": 5,
    "completed": 490,
    "failed": 5,
    "totalSize": 10737418240,
    "newThisMonth": 50
  },
  "system": {
    "storageUsed": "10GB",
    "storageAvailable": "990GB",
    "transcodingQueue": 5,
    "avgTranscodeTime": "2m 30s",
    "requestsPerMinute": 150
  },
  "timestamp": "2025-10-30T11:00:00.000Z"
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not an admin user

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid input data",
  "details": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "details": "Please provide a valid JWT token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Access denied",
  "details": "Admin privileges required"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found",
  "details": "Video with id 'video123' not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "requestId": "req-abc123"
}
```

---

## Rate Limiting

| Endpoint Type | Rate Limit |
|---------------|------------|
| Authentication | 5 requests/minute |
| Video Upload | 10 requests/hour |
| Video List/Get | 100 requests/minute |
| Admin Endpoints | 50 requests/minute |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635600000
```

**Rate Limit Exceeded Response:** `429 Too Many Requests`
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## CORS

The API supports CORS for web applications:

**Allowed Origins:**
- `http://localhost:3000` (development)
- `http://<ALB_DNS>:3000` (production)

**Allowed Methods:**
- GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers:**
- Authorization, Content-Type

---

## Examples

### Complete Authentication Flow

```bash
# 1. Sign up
curl -X POST http://$ALB_DNS/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'

# 2. Log in
RESPONSE=$(curl -X POST http://$ALB_DNS/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }')

# 3. Extract token
TOKEN=$(echo $RESPONSE | jq -r '.token')

# 4. Use token for authenticated requests
curl http://$ALB_DNS/api/videos \
  -H "Authorization: Bearer $TOKEN"
```

### Upload and Track Video

```bash
# 1. Upload video
UPLOAD_RESPONSE=$(curl -X POST http://$ALB_DNS/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@video.mp4" \
  -F "title=My Video" \
  -F "description=Test upload")

# 2. Extract video ID
VIDEO_ID=$(echo $UPLOAD_RESPONSE | jq -r '.videoId')

# 3. Check processing status
curl http://$ALB_DNS/api/videos/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN"

# 4. Wait for completion (status: "completed")
# 5. Get transcoded URLs
curl http://$ALB_DNS/api/videos/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.transcodedUrls'
```

---

## Webhooks (Future Enhancement)

Coming soon: Webhook notifications for video processing events.

---

**Last Updated:** October 30, 2025  
**Version:** 1.0  
**Student:** n11817143
