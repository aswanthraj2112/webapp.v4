# 🎬 Demo Video Quick Reference Card
**Print this and keep it beside you while recording!**

---

## ⏱️ Scene Timeline (Target: 12 minutes)

| Time | Scene | What to Show | Key Evidence |
|------|-------|--------------|--------------|
| 0:00 | Intro | Title slide + greeting | - |
| 0:30 | Architecture | ECS services (3 shown) | **Microservices (3 marks)** |
| 2:00 | ALB & HTTPS | Load balancer routing + curl | **HTTPS (2) + Load Dist (2)** |
| 3:30 | Frontend | Upload video demo | User flow |
| 5:00 | Lambda & SQS | CloudWatch logs + queue | **Serverless (2) + Comms (2)** |
| 7:00 | **Auto-Scaling** | Worker 0→1→processing | **Auto-Scale (3 marks)** ⭐ |
| 9:00 | DLQ | Dead letter queue + alarm | **DLQ (2 marks)** |
| 10:00 | Playback | Video plays successfully | Working app |
| 11:00 | Terraform | Show IaC files + count | **IaC (2 marks)** |
| 11:45 | CloudFront | CDN distribution | **Edge Cache (2 marks)** |
| 12:30 | Conclusion | Summary of all features | - |

**Total Evidence: 24 marks (10 core + 14 additional)**

---

## 🎯 Critical Scenes (Don't Skip!)

### 🔥 Scene 6: Auto-Scaling (7:00-9:00) - **MOST IMPORTANT**
**Worth 3 marks + shows microservices working**

**Must show:**
1. ✅ Transcode Worker desired count = **0** (before upload)
2. ✅ Upload video → wait 30-60 seconds
3. ✅ Refresh ECS service → desired count = **1** (auto-scaled)
4. ✅ Task status: PENDING → RUNNING
5. ✅ Click task → show logs processing video
6. ✅ SQS queue: 1 message → 0 messages (after processing)
7. ✅ Worker will scale back to 0 after cooldown (mention it)

**Script:**
> "Watch the Transcode Worker scale from zero to one automatically based on the SQS queue depth. This is the key advantage of event-driven architecture..."

---

### ⚡ Scene 3: Load Balancer (2:00-3:30) - **4 MARKS**
**Worth: HTTPS (2) + Load Distribution (2)**

**Must show:**
1. ✅ ALB Listeners: Port 443 (HTTPS), Port 80 (redirect)
2. ✅ Rules: `/api/admin/*` → Admin TG, `/api/*` → Video API TG
3. ✅ Target Groups: Show healthy targets (2-5, 1-3)
4. ✅ Run curl command:
   ```bash
   curl -I https://n11817143-videoapp.cab432.com/api/config
   # Should show: HTTP/2 200
   ```

---

### 🚀 Scene 5: Serverless (5:00-7:00) - **4 MARKS**
**Worth: Serverless (2) + Communication (2)**

**Must show:**
1. ✅ Lambda function: `n11817143-s3-to-sqs-lambda`
2. ✅ CloudWatch logs: Show recent invocation
3. ✅ SQS queue: Show message with video details
4. ✅ Explain flow: S3 → Lambda → SQS → Worker

---

## 📋 Pre-Recording Checklist

**5 Minutes Before Recording:**
- [ ] Close unnecessary tabs/windows
- [ ] Set Transcode Worker desired count to **0**
- [ ] Clear browser cache (or use incognito)
- [ ] Have test video ready (demo-video.mp4, 100-500MB)
- [ ] Zoom browser to 125% for readability
- [ ] Test microphone audio

**Open These Tabs:**
- [ ] Frontend: https://app.n11817143-videoapp.cab432.com
- [ ] AWS Console → ECS → Clusters
- [ ] AWS Console → Lambda
- [ ] AWS Console → SQS
- [ ] AWS Console → CloudFront
- [ ] AWS Console → EC2 → Load Balancers
- [ ] Terminal (SSH or local)

---

## 🎤 Key Phrases to Say

### Introduction
> "Hi, I'm Aswanth Raj, student n11817143. This demonstrates my CAB432 Assignment 3 microservices architecture."

### Microservices
> "I've deployed three microservices: Video API for user requests, Admin Service for management, and Transcode Worker for video processing."

### Auto-Scaling (Critical!)
> "Notice the worker is at zero tasks. When I upload a video, it will automatically scale up based on the SQS queue depth, process the video, then scale back to zero to save costs."

### Load Balancing
> "The ALB uses path-based routing. Admin requests go to the Admin Service, while API requests route to the Video API. HTTPS is enforced with automatic HTTP-to-HTTPS redirects."

### Serverless
> "When the video uploads to S3, it triggers a Lambda function that validates the file and sends a message to SQS. This decouples the upload from processing."

### DLQ
> "Failed jobs after three retries move to a dead letter queue. A CloudWatch alarm notifies me when this happens."

### IaC
> "All infrastructure is deployed with Terraform. These 35+ resources can be recreated with a single command."

---

## ⚠️ Common Mistakes to Avoid

❌ **DON'T:**
- Rush through auto-scaling (it's worth 3 marks!)
- Forget to show the worker scaling from 0→1
- Skip showing actual logs and metrics
- Show sensitive credentials or keys
- Record in resolution lower than 1080p
- Mumble or speak too quietly

✅ **DO:**
- Pause between scenes (easier to edit later)
- Explain WHY each component exists
- Show features WORKING (not just configuration)
- Keep energy in your voice
- Point out marks: "This demonstrates auto-scaling for 3 marks"
- Refresh pages to show real-time updates

---

## 🔧 Emergency Commands

### If Worker Won't Scale Automatically:
```bash
# Manually set to 1 for demo
aws ecs update-service \
  --cluster n11817143-app-cluster \
  --service transcode-worker \
  --desired-count 1
```

### If Services Are Down:
```bash
# Check service status
aws ecs describe-services \
  --cluster n11817143-app-cluster \
  --services video-api admin-service transcode-worker

# Restart service
aws ecs update-service \
  --cluster n11817143-app-cluster \
  --service <service-name> \
  --force-new-deployment
```

### If Frontend Won't Load:
- Check CloudFront distribution status
- Try direct S3 URL as fallback
- Clear browser cache and retry

### Test Everything Works:
```bash
# Test API
curl https://n11817143-videoapp.cab432.com/api/config

# List ECS services
aws ecs list-services --cluster n11817143-app-cluster

# Check Lambda
aws lambda list-functions | grep s3-to-sqs

# Check SQS queues
aws sqs list-queues | grep n11817143
```

---

## 📊 Mark Distribution (Know This!)

**Core Criteria (10 marks):**
- Microservices: 3 marks → Scene 2, 6
- Load Distribution: 2 marks → Scene 3
- Auto-Scaling: 3 marks → Scene 6 ⭐
- HTTPS: 2 marks → Scene 3

**Additional (Pick 7 for 14 marks):**
- Additional Microservices: 2 marks → Scene 5 (Lambda)
- Serverless Functions: 2 marks → Scene 5
- Container Orchestration: 2 marks → Scene 2
- Advanced Orchestration: 2 marks → Scene 6
- Communication Mechanisms: 2 marks → Scene 5
- Dead Letter Queue: 2 marks → Scene 7
- Edge Caching: 2 marks → Scene 10
- Infrastructure as Code: 2 marks → Scene 9

**Your goal: Demonstrate ALL of these!**

---

## 🎬 Recording Settings

**OBS Studio / Recording Software:**
- Resolution: 1920 x 1080 (1080p)
- Frame rate: 30 FPS
- Encoder: x264 or NVENC (H.264)
- Quality: High (CRF 18-23)
- Audio: 128-192 kbps
- Format: MP4

**Test Recording:**
1. Record 30 seconds
2. Play it back
3. Check audio is clear
4. Check text is readable
5. Adjust zoom/settings if needed

---

## 📦 After Recording

**Immediate:**
- [ ] Review video (watch entire thing)
- [ ] Check audio quality
- [ ] Check all scenes are present
- [ ] Note actual timestamps

**Editing (Optional):**
- [ ] Cut out mistakes/long pauses
- [ ] Speed up transcoding wait (2x-4x)
- [ ] Add text overlays for clarity
- [ ] Add intro/outro slides

**Export:**
- [ ] Format: MP4 (H.264)
- [ ] Resolution: 1920x1080
- [ ] Max size: 500MB (compress if needed)
- [ ] Filename: `n11817143_CAB432_A3_Demo.mp4`

**Upload:**
- [ ] YouTube (Unlisted) - Easiest option
- [ ] Or Google Drive / OneDrive
- [ ] Test link works (open in incognito)
- [ ] Copy link to report

**Update Report:**
- [ ] Replace all `[To be recorded during demo]` with timestamps
- [ ] Add video link to Executive Summary
- [ ] Format: `[Video: 5:00-7:00]`

---

## 💡 Pro Tips

1. **Practice once** before recording (don't memorize, just get familiar)
2. **Have water nearby** (dry mouth happens!)
3. **Take a deep breath** before starting each scene
4. **Smile while talking** (yes, it changes your voice tone!)
5. **If you mess up**, pause 3 seconds, then restart the sentence (edit later)
6. **Don't apologize** on camera ("Sorry, um, let me try again..." - just pause and redo)
7. **Energy level**: You're showing off something you built! Be proud!

---

## ✅ Final Submission Checklist

- [ ] Video uploaded (unlisted, not private)
- [ ] Video link works (tested in incognito browser)
- [ ] Video link added to report (Executive Summary)
- [ ] All timestamps updated in report
- [ ] Video duration: 8-12 minutes
- [ ] All marking criteria demonstrated
- [ ] Audio is clear
- [ ] Screen is readable (1080p)

---

**🎯 Remember: The auto-scaling demonstration (Scene 6) is THE MOST IMPORTANT part. Don't rush it!**

**Good luck! You've built something amazing - now show it off! 🚀**
