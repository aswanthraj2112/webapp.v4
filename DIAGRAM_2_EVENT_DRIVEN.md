# Diagram 2: Event-Driven Processing Architecture
## Video Transcoding App - Asynchronous Video Processing Pipeline

### Purpose
Show how videos are processed asynchronously after upload, from S3 event trigger through transcoding to final storage

---

## Layout Structure (Top to Bottom Pipeline Flow)

### STAGE 1 - VIDEO UPLOAD (Top)
**User Action:**
- Icon: User with upload arrow
- Label: "User Uploads Video"
- Subtitle: "Via presigned S3 URL from Video API"

### STAGE 2 - S3 STORAGE & EVENT (Upper Middle)

**Main Component:**
- S3 Video Bucket (large icon)
  - Label: "S3 Video Storage"
  - "Bucket: n11817143-a2"
  
**Show folder structure inside:**
```
📁 raw/
   └─ {userId}/{videoId}.mp4
   
📁 transcoded/
   ├─ 720p/{userId}/{videoId}_720p.mp4
   └─ 1080p/{userId}/{videoId}_1080p.mp4
```

**Event Configuration:**
- Small callout box attached to S3:
  - "S3 Event Notification"
  - "Trigger: ObjectCreated"
  - "Prefix filter: raw/*"
  - "Target: Lambda Function"

### STAGE 3 - EVENT VALIDATION (Middle Left)

**Lambda Function:**
- Icon: AWS Lambda (orange)
- Label: "S3-to-SQS Lambda"
- Function details:
  - "Name: n11817143-app-s3-to-sqs"
  - "Runtime: Container (Node.js 18)"
  - "Memory: 256MB"
  - "Timeout: 30 seconds"
  
**Processing Steps** (show as numbered list inside):
```
1️⃣ Receive S3 event
2️⃣ Validate file extension
   (.mp4, .mov, .avi, .mkv, .webm, .flv)
3️⃣ Extract metadata from object key
   • userId
   • videoId
   • filename
4️⃣ Create transcode job message
5️⃣ Send to SQS queue
```

**Error Handling** (small box below Lambda):
```
❌ Invalid File → CloudWatch Log → End
✅ Valid File → Continue to SQS
```

### STAGE 4 - MESSAGE QUEUE (Middle Center)

**Group in box labeled "MESSAGE QUEUE SYSTEM":**

**Main Queue:**
- SQS Main Queue (icon)
  - Label: "Transcode Job Queue"
  - "Queue: n11817143-A3"
  - Config details:
    - "Visibility timeout: 600s (10 min)"
    - "Long polling: 20s"
    - "Max receives: 3"
    - "Retention: 4 days"

**Dead Letter Queue:**
- SQS DLQ (icon, slightly grayed)
  - Label: "Failed Jobs (DLQ)"
  - "Queue: n11817143-A3-dlq"
  - Config:
    - "Retention: 14 days"
    - "Triggered after 3 failed attempts"

**CloudWatch Alarm:**
- Small alarm icon attached to DLQ
  - "Alarm: DLQ message count > 0"
  - "Action: SNS notification to admins"

### STAGE 5 - WORKER PROCESSING (Middle Right)

**Transcode Worker Service:**
- Icon: AWS ECS (orange, larger than others)
- Label: "Transcode Worker"
- Container details:
  - "ECS Fargate Serverless"
  - "Tasks: 0-10 (Auto-scaling)"
  - "CPU: 1 vCPU"
  - "Memory: 2GB RAM"
  - "Includes: FFmpeg"
  
**Worker Process Flow** (show as vertical steps):
```
🔄 Worker Loop (Continuous):

1. Poll SQS Queue
   └─ Long polling (20s wait)

2. Receive Message
   └─ Visibility timeout starts (600s)

3. Download Raw Video from S3
   └─ Folder: raw/{userId}/{videoId}.ext

4. Transcode Video (FFmpeg)
   ├─ If quality=720p:
   │  └─ Output: H.264, 1280x720, 2Mbps
   └─ If quality=1080p:
      └─ Output: H.264, 1920x1080, 4Mbps
   
5. Upload Transcoded Video to S3
   └─ Folder: transcoded/{quality}/{userId}/{videoId}_{quality}.mp4

6. Update DynamoDB Status
   └─ Set status: "completed"
   └─ Add transcodedUrl

7. Delete Message from SQS
   └─ Job completed successfully

🔁 Repeat (or scale to zero if queue empty)
```

**Error Handling** (box below worker):
```
⚠️ If Error (FFmpeg fails, S3 error, etc.):
   1. Don't delete message from SQS
   2. Message returns to queue after visibility timeout
   3. Retry up to 3 times
   4. After 3 failures → Move to DLQ
```

### STAGE 6 - DATA UPDATES (Bottom)

**Left side - DynamoDB:**
- Icon: AWS DynamoDB
- Label: "Video Metadata Database"
- "Table: n11817143-VideoApp"
- Status update:
  ```
  Before: status = "processing"
  After:  status = "completed"
          transcodedUrl = "s3://..."
          transcodedAt = timestamp
  ```

**Right side - S3 Final Storage:**
- Icon: AWS S3 (with checkmark)
- Label: "Transcoded Videos"
- Show output structure:
  ```
  ✅ transcoded/720p/{userId}/{videoId}_720p.mp4
  ✅ transcoded/1080p/{userId}/{videoId}_1080p.mp4
  ```

### STAGE 7 - MONITORING (Bottom Right)

**CloudWatch Services:**
- Icon: AWS CloudWatch
- Label: "Monitoring & Logging"
- Components:
  ```
  📊 Metrics:
  • SQS Queue Depth
  • Worker Task Count
  • Processing Time
  • Error Rate
  
  📝 Logs:
  • Lambda execution logs
  • Worker processing logs
  • FFmpeg output
  
  🔔 Alarms:
  • Queue depth > 50 (scale up)
  • DLQ messages > 0 (alert admin)
  • Worker errors > 5% (alert)
  ```

---

## Connections (Draw as Arrows)

### Pipeline Flow (Main Path)
1. User → S3 raw/ folder
   - Label: "Upload video via presigned URL"
   - Type: Thick blue solid arrow
   
2. S3 → Lambda
   - Label: "S3 Event: ObjectCreated (raw/*)"
   - Type: Thick orange dashed arrow
   - Annotate: "⚡ Triggers within 1-2 seconds"
   
3. Lambda → SQS Main Queue
   - Label: "SendMessage (transcode job)"
   - Type: Thick green solid arrow
   - Annotate: "JSON payload with metadata"
   
4. SQS Main Queue → Transcode Worker
   - Label: "ReceiveMessage (long polling)"
   - Type: Thick purple solid arrow
   - Annotate: "🔄 Continuous polling, 20s wait"
   
5. Transcode Worker → S3 raw/ folder
   - Label: "Download raw video"
   - Type: Blue solid arrow
   
6. Transcode Worker → S3 transcoded/ folder
   - Label: "Upload processed video"
   - Type: Green solid arrow
   - Annotate: "✅ 720p and/or 1080p"
   
7. Transcode Worker → DynamoDB
   - Label: "Update status: completed"
   - Type: Teal solid arrow
   
8. Transcode Worker → SQS Main Queue
   - Label: "DeleteMessage (success)"
   - Type: Red solid arrow with X

### Error Handling Flow (Secondary Path)
9. SQS Main Queue → SQS DLQ
   - Label: "Move after 3 failed attempts"
   - Type: Red dashed arrow
   - Annotate: "❌ Redrive policy"
   
10. SQS DLQ → CloudWatch Alarm
    - Label: "Trigger alarm"
    - Type: Orange dotted arrow
    
11. CloudWatch Alarm → Admin (notification icon)
    - Label: "SNS notification"
    - Type: Orange dotted arrow

### Monitoring Connections
12. Lambda → CloudWatch Logs
    - Label: "Execution logs"
    - Type: Gray dotted arrow
    
13. Transcode Worker → CloudWatch Logs
    - Label: "Processing logs + FFmpeg output"
    - Type: Gray dotted arrow
    
14. SQS Queue → CloudWatch Metrics
    - Label: "Queue depth, message count"
    - Type: Gray dotted arrow

---

## Auto-Scaling Behavior (Show as Side Panel)

**Add a side panel box labeled "🔽 SCALE-TO-ZERO CAPABILITY":**

```
Queue Status → Worker Tasks:

📊 Queue Depth = 0
   └─ Workers: 0 tasks
   └─ Cost: $0/hour
   └─ State: Sleeping 💤

📊 Queue Depth = 1-10
   └─ Workers: 1 task
   └─ Processing: ~10 jobs/hour
   └─ State: Active 🟢

📊 Queue Depth = 20-50
   └─ Workers: 3-5 tasks
   └─ Processing: ~30-50 jobs/hour
   └─ State: Scaling Up ⬆️

📊 Queue Depth = 100+
   └─ Workers: 10 tasks (max)
   └─ Processing: ~100 jobs/hour
   └─ State: Max Capacity 🔴

⏱️ Scale-down after 5 min of empty queue
💰 Savings: ~$1,315/month vs always-on
```

---

## Timing Annotations (Add as Callout Boxes)

**Near S3 Event:**
```
⏱️ Event Latency:
S3 upload → Lambda trigger
Average: 1-2 seconds
Max: 5 seconds
```

**Near Lambda:**
```
⏱️ Lambda Execution:
Validation + SQS send
Average: 100-200ms
Cold start: ~500ms
```

**Near Worker:**
```
⏱️ Transcoding Time:
720p (5 min video): ~30-45 seconds
1080p (5 min video): ~60-90 seconds
Depends on: video length, complexity, codec
```

**Total Pipeline:**
```
⏱️ End-to-End:
Upload → Available transcoded
Typical: 2-5 minutes
Heavy load: 5-15 minutes (queue backlog)
```

---

## Styling

### Colors by Stage
- **Upload Stage:** Blue (#1976D2)
- **S3 Storage:** Green (#388E3C)
- **Lambda Processing:** Orange (#F57C00)
- **Queue System:** Purple (#7B1FA2)
- **Worker Processing:** Teal (#00897B)
- **Final Storage:** Green (#4CAF50)
- **Monitoring:** Gray (#616161)
- **Error Path:** Red (#D32F2F)

### Box Styles
- Pipeline stages: Rounded rectangles with gradient
- Error handling: Dashed red border
- Scale-to-zero panel: Light green background with 🔽 icon
- Timing callouts: Yellow background (#FFF59D), small font

### Arrow Styles
- Main pipeline: Thick (3-4px), solid
- Error path: Dashed, red
- Monitoring: Thin (1px), dotted, gray
- Success operations: Green
- Delete operations: Red with X

### Icons
- S3: Use folder icon with AWS logo
- Lambda: Use AWS Lambda icon (orange)
- SQS: Use AWS SQS icon (purple/pink)
- ECS: Use AWS ECS icon (orange)
- CloudWatch: Use AWS CloudWatch icon (red/orange)
- DynamoDB: Use AWS DynamoDB icon (blue)

---

## Legend (Bottom Left)

```
Arrow Types:
━━━━ Main processing pipeline
┄┄┄┄ Error handling path
········ Monitoring/logging

Process States:
🟢 Active processing
💤 Idle (scaled to zero)
⬆️ Scaling up
⬇️ Scaling down
❌ Failed job
✅ Completed successfully

Timing:
⏱️ Average processing time
⚡ Real-time event trigger
🔄 Continuous polling
```

---

## Annotations (Key Points)

### Near Lambda
```
💡 Why Lambda?
• Only runs on S3 events (100x/month)
• Cost: $0.00 (free tier)
• Alternative: Always-on ECS = $45/month
• Perfect for event-driven validation
```

### Near SQS
```
💡 Why SQS?
• Decouples upload from transcoding
• Enables retry logic (3 attempts)
• Allows worker scale-to-zero
• Prevents job loss during worker scaling
```

### Near Worker
```
💡 Why Separate Worker?
• CPU-intensive (FFmpeg uses 100% CPU)
• Can't run in API service (would block requests)
• Needs more resources (1 vCPU vs 0.5)
• Can scale independently (0-10 tasks)
```

---

## Title and Description

**Main Title:** "Event-Driven Video Processing Pipeline"

**Subtitle:** "Asynchronous transcoding workflow from upload to completion"

**Description box (top):**
```
This diagram shows the background video processing pipeline.
When a user uploads a video, S3 triggers a Lambda function that validates
the file and queues a transcode job. Workers poll the queue, process videos
using FFmpeg, and upload results back to S3. The system scales to zero when
idle, saving ~$1,315/month compared to always-on workers.
```

---

## Simplified Message
This diagram answers: **"What happens after I upload a video?"**

Focus on the **asynchronous event-driven workflow**, not real-time request handling.

Show the pipeline as a **top-to-bottom flow** for easy comprehension.
