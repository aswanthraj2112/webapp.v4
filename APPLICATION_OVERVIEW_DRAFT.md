# Application Overview

This is a cloud-based video conversion and streaming platform that lets users upload videos, convert them to different quality formats (720p or 1080p), and stream or download the converted versions—all through a clean web interface. Built on AWS with a microservices architecture, the application handles everything from secure user authentication to on-demand video transcoding using FFmpeg, while maintaining a persistent video library where both original and converted files are stored in each user's profile. The platform leverages ECS Fargate for serverless container orchestration, auto-scaling workers for efficient transcoding, and CloudFront CDN for fast global content delivery, making it a one-stop solution for video storage, conversion, and streaming that's both cost-efficient and horizontally scalable.

---

Think of this project as building your own cloud-based video conversion and streaming platform. I built a web app that lets users upload their videos, convert them to different quality formats (720p or 1080p), stream them directly in the browser, and download the converted versions—all while keeping everything organized in their personal video library. It's basically a one-stop shop for video storage, conversion, and streaming that runs entirely in the cloud.

Here's how it works from a user's perspective: You create an account, log in through a clean React interface, and upload a video straight from your browser. Once uploaded, your original video is safely stored in your profile. Now here's where it gets cool—you can choose to convert your video to either 720p or 1080p quality depending on what you need. Maybe you want a smaller 720p version for quick sharing, or maybe you need high-quality 1080p for professional use—it's totally up to you. Click the convert button, select your desired quality, and the platform kicks off the transcoding process in the background using FFmpeg. Once the conversion is done (usually takes a few minutes depending on video length), the converted file gets stored right alongside your original in your video library. You can then stream any version of your video directly in the browser with a proper video player, or download the converted files to your device whenever you want. The best part? All your videos—both original and converted versions—stay in your profile permanently, so you can come back anytime and stream or download them without having to convert again. And thanks to CloudFront's global CDN, streaming is super fast no matter where you are in the world.

But what makes this interesting from a cloud architecture perspective is that it's not just one big monolithic application running on a single server—instead, it's broken into three independent microservices, each doing its own specialized job. The **Video API** is the main service that handles all the user-facing stuff like authentication (using AWS Cognito), managing your video library, coordinating uploads, and processing your conversion requests. The **Admin Service** runs separately to handle privileged operations like user management and system statistics without bogging down the main API. And then there's the **Transcode Worker**—that's the heavy lifter that does the actual CPU-intensive FFmpeg transcoding work when you request a conversion. The really cool part? When there are no conversion jobs in the queue, the worker automatically scales down to zero containers, saving money. But when multiple users request conversions at once—say everyone decides to convert their videos simultaneously—it can automatically spin up to 10 workers to handle all the jobs in parallel without anyone waiting too long.

The whole system is built on AWS using modern cloud-native services. I'm running everything on **ECS Fargate**, which means I don't have to manage any servers—AWS handles all that infrastructure complexity for me. There's a **Lambda function** that instantly reacts to S3 upload events and queues up transcoding jobs when you request a conversion. An **Application Load Balancer** distributes incoming traffic across multiple API instances with smart path-based routing. **DynamoDB** stores all the video metadata (including both original and converted versions), **ElastiCache** speeds up frequently accessed data, and **SQS queues** handle the conversion job queue so the system can process your conversion requests asynchronously without tying up the API. Everything is secured with proper authentication via AWS Cognito, runs over HTTPS with ACM certificates, and I've got CloudWatch monitoring the whole system for errors and performance issues.

What I'm particularly proud of is that the entire infrastructure is defined as code using **Terraform**—meaning I can rebuild the entire production environment with one command, or spin up a staging environment in minutes. The architecture is designed to be cost-efficient (it scales to zero when idle), horizontally scalable (add more containers under load), and maintainable (each service can be updated independently without taking down the whole system). It's basically what you'd want in a real-world cloud application: reliable, scalable, secure, and most importantly—it actually works without breaking the bank on AWS bills.

---

**Key Features:**
- ✅ User authentication with AWS Cognito (secure JWT-based login)
- ✅ Direct browser-to-S3 uploads using presigned URLs (no backend bottleneck)
- ✅ On-demand video transcoding with quality selection (720p or 1080p)
- ✅ Download converted videos directly to your device
- ✅ Persistent video library - all your videos (original & converted) stay in your profile
- ✅ Stream any video version directly in the browser with quality selector
- ✅ Global content delivery via CloudFront CDN (fast streaming worldwide)
- ✅ Responsive React frontend with real-time conversion status updates
- ✅ Auto-scaling infrastructure (0-10 workers, 1-5 API instances)
- ✅ Cost-optimized architecture (~$150/month with scale-to-zero capability)
- ✅ Full infrastructure automation with Terraform
- ✅ Production-grade monitoring with CloudWatch logs and alarms
- ✅ Event-driven architecture with SQS queues and Lambda functions

**Tech Stack:**
- **Frontend:** React 18 + Vite, AWS Amplify
- **Backend:** Node.js + Express (3 microservices)
- **Compute:** AWS ECS Fargate + Lambda
- **Storage:** Amazon S3 (videos), DynamoDB (metadata), ElastiCache (caching)
- **Networking:** Application Load Balancer, CloudFront CDN, Route53 DNS
- **Auth:** AWS Cognito with JWT tokens
- **IaC:** Terraform with modular architecture
- **Monitoring:** CloudWatch Logs, Metrics, and Alarms
- **CI/CD:** Docker + ECR with bash deployment scripts

**Live Deployment:**
- Frontend: https://app.n11817143-videoapp.cab432.com
- Backend API: https://n11817143-videoapp.cab432.com/api

---

*This application was built as part of CAB432 (Cloud Computing) Assignment 3 at Queensland University of Technology, demonstrating microservices architecture, serverless computing, container orchestration, and Infrastructure as Code principles.*


