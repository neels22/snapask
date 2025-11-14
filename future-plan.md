# SnapAsk - Future Development Plan

## 🎯 Project Vision

Transform SnapAsk from a simple screenshot AI tool into a **production-ready, distributed system** that demonstrates advanced software engineering concepts. This project will serve as a **portfolio piece** for technical interviews, showcasing:

- **Distributed Systems Architecture**
- **Microservices Design**
- **Scalability & Performance Optimization**
- **Real-time Synchronization**
- **Fault Tolerance & Reliability**

---

## 📋 Table of Contents

1. [Phase 1: Multi-Device Sync (Distributed State Management)](#phase-1-multi-device-sync-distributed-state-management)
2. [Phase 2: Microservices Architecture](#phase-2-microservices-architecture)
3. [Phase 3: Caching & Performance](#phase-3-caching--performance)
4. [Phase 4: Event-Driven Architecture](#phase-4-event-driven-architecture)
5. [Phase 5: Scalability & Reliability](#phase-5-scalability--reliability)
6. [Complete Feature Roadmap](#complete-feature-roadmap)
7. [Tech Stack Recommendations](#tech-stack-recommendations)
8. [Interview Talking Points](#interview-talking-points)
9. [Architecture Diagrams](#architecture-diagrams)
10. [Implementation Timeline](#implementation-timeline)

---

## Phase 1: Multi-Device Sync (Distributed State Management)

### 🎯 Objective
Enable users to access their screenshot conversations from any device (Mac, iPhone, iPad, Web) with real-time synchronization.

### 📐 Distributed Systems Concepts

#### 1. **Conflict Resolution**
- **Problem:** User queries on Mac and iPhone simultaneously
- **Solution Options:**
  - **CRDTs (Conflict-Free Replicated Data Types):** Automatic conflict resolution
  - **Last-Write-Wins (LWW):** Simple timestamp-based resolution
  - **Operational Transformation:** For collaborative editing
- **Implementation:**
  ```javascript
  // Example: Last-Write-Wins with version vectors
  {
    conversationId: "conv_123",
    version: 2,
    timestamp: "2024-01-15T10:30:00Z",
    lastModifiedBy: "device_mac_001",
    conflicts: []
  }
  ```

#### 2. **Eventual Consistency**
- **Model:** Accept that sync may lag slightly (seconds, not minutes)
- **Strategy:**
  - Immediate local updates (optimistic UI)
  - Background sync to server
  - Conflict resolution on sync
- **User Experience:**
  - User sees their changes instantly
  - Other devices sync within 1-2 seconds
  - Conflicts resolved automatically

#### 3. **State Synchronization**
- **Technologies:**
  - **WebSockets:** Real-time bidirectional communication
  - **Server-Sent Events (SSE):** One-way server-to-client
  - **Polling:** Fallback for unreliable connections
- **Protocol:**
  ```
  Client → Server: { type: "sync", conversationId, data }
  Server → All Clients: { type: "update", conversationId, data }
  ```

#### 4. **Database Replication**
- **Primary Database:** PostgreSQL (write operations)
- **Read Replicas:** Multiple PostgreSQL instances (read operations)
- **Benefits:**
  - Improved read performance
  - Geographic distribution
  - High availability

### 🏗️ Implementation Details

#### **Database Schema:**
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Devices table
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  device_type VARCHAR(50), -- 'macos', 'ios', 'web'
  device_token VARCHAR(255),
  last_sync_at TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  screenshot_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  version INTEGER DEFAULT 1
);

-- Messages table (with conflict tracking)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  device_id UUID REFERENCES devices(id),
  prompt TEXT,
  response TEXT,
  created_at TIMESTAMP,
  version INTEGER,
  conflict_resolved BOOLEAN DEFAULT false
);
```

#### **Sync Service Architecture:**
```javascript
// Sync Service (Node.js)
class SyncService {
  async syncConversation(deviceId, conversationData) {
    // 1. Check for conflicts
    const conflicts = await this.detectConflicts(conversationData);
    
    // 2. Resolve conflicts
    const resolved = await this.resolveConflicts(conflicts);
    
    // 3. Update database
    await this.updateDatabase(resolved);
    
    // 4. Broadcast to other devices
    await this.broadcastUpdate(deviceId, resolved);
  }
  
  async detectConflicts(conversationData) {
    // Compare versions, timestamps
    // Return list of conflicts
  }
  
  async resolveConflicts(conflicts) {
    // Apply conflict resolution strategy
    // Return resolved data
  }
}
```

### 📊 Interview Talking Points

**Q: "How do you handle conflicts when a user queries on 2 devices simultaneously?"**

**A:** 
- We use **version vectors** to track changes
- Each message has a `version` number and `timestamp`
- On sync, we compare versions:
  - If versions differ, we use **Last-Write-Wins** (newer timestamp wins)
  - For critical data, we could use **CRDTs** for automatic merging
- User sees their local change immediately (optimistic UI)
- Server resolves conflicts and broadcasts resolved state

**Q: "How do you ensure data consistency across devices?"**

**A:**
- **Eventual consistency model:** We accept slight delays (1-2 seconds)
- **Optimistic UI:** Users see changes instantly locally
- **WebSocket sync:** Real-time updates to other devices
- **Version vectors:** Track which device made which change
- **Conflict resolution:** Automatic resolution with manual override option

**Q: "What happens if the network is down?"**

**A:**
- **Offline-first design:** All data stored locally (SQLite on device)
- **Queue sync operations:** When network returns, sync queued changes
- **Conflict detection:** On reconnect, detect and resolve conflicts
- **User notification:** Show sync status in UI

---

## Phase 2: Microservices Architecture

### 🎯 Objective
Split the monolithic application into independent, scalable microservices that can be developed, deployed, and scaled independently.

### 🏗️ Service Architecture

```
┌─────────────────┐
│  Client (Mac)   │
│   (Electron)    │
└────────┬────────┘
         │ HTTPS/REST API
         │
┌────────▼─────────────────────────────────┐
│         API Gateway                       │
│  - Authentication (JWT)                   │
│  - Rate Limiting                          │
│  - Request Routing                        │
│  - Load Balancing                         │
└────────┬──────────────────────────────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    │         │          │          │          │
┌───▼───┐ ┌──▼───┐  ┌───▼───┐  ┌───▼───┐  ┌──▼───┐
│  AI   │ │ Sync │  │Storage│  │Analytics│ │Auth │
│Service│ │Service│ │Service│  │ Service │ │Svc  │
└───┬───┘ └──┬───┘  └───┬───┘  └───┬───┘  └──┬───┘
    │        │          │          │         │
    │    ┌───▼──────────▼──────────▼─────────┘
    │    │      Message Queue (Redis/RabbitMQ)
    │    │
┌───▼────▼──────────────────────────────────┐
│         PostgreSQL (Primary)              │
│         + Read Replicas                   │
└───────────────────────────────────────────┘
```

### 📦 Service Breakdown

#### **1. API Gateway Service**

**Responsibilities:**
- Authentication & Authorization (JWT validation)
- Rate limiting (per user, per IP)
- Request routing to appropriate microservice
- Request/Response transformation
- API versioning
- CORS handling

**Tech Stack:**
- **Framework:** Express.js or Fastify
- **Rate Limiting:** `express-rate-limit` or Redis-based
- **Auth:** `jsonwebtoken` for JWT validation
- **Load Balancing:** Nginx or built-in round-robin

**Implementation:**
```javascript
// API Gateway (Express.js)
const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Route to AI Service
app.post('/api/v1/ask', authenticate, limiter, async (req, res) => {
  const response = await fetch('http://ai-service:3001/ask', {
    method: 'POST',
    body: JSON.stringify(req.body),
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  res.json(data);
});

// Route to Sync Service
app.post('/api/v1/sync', authenticate, limiter, async (req, res) => {
  const response = await fetch('http://sync-service:3002/sync', {
    method: 'POST',
    body: JSON.stringify(req.body),
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  res.json(data);
});
```

#### **2. AI Service**

**Responsibilities:**
- Handle all AI/LLM API calls (Gemini, OpenAI, etc.)
- Image processing and optimization
- Response caching
- Queue-based async processing
- Retry logic with exponential backoff

**Tech Stack:**
- **Framework:** Express.js
- **AI SDKs:** `@google/generative-ai`, `openai`
- **Queue:** Bull (Redis-based) or RabbitMQ
- **Image Processing:** Sharp or ImageMagick

**Implementation:**
```javascript
// AI Service
const Queue = require('bull');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const aiQueue = new Queue('ai-processing', {
  redis: { host: 'redis', port: 6379 }
});

// Process AI requests asynchronously
aiQueue.process(async (job) => {
  const { prompt, imageDataUrl, userId } = job.data;
  
  // Initialize AI
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  // Process image
  const base64Image = imageDataUrl.split(',')[1];
  const imagePart = {
    inlineData: { data: base64Image, mimeType: 'image/png' }
  };
  
  // Generate response
  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  
  return { text: response.text(), userId };
});

// API endpoint
app.post('/ask', async (req, res) => {
  const job = await aiQueue.add({
    prompt: req.body.prompt,
    imageDataUrl: req.body.imageDataUrl,
    userId: req.user.id
  });
  
  // Return job ID for status checking
  res.json({ jobId: job.id, status: 'processing' });
});

// Status endpoint
app.get('/status/:jobId', async (req, res) => {
  const job = await aiQueue.getJob(req.params.jobId);
  if (job.finished()) {
    res.json({ status: 'completed', result: await job.finished() });
  } else {
    res.json({ status: 'processing' });
  }
});
```

#### **3. Storage Service**

**Responsibilities:**
- Upload screenshots to cloud storage (S3, Cloudflare R2)
- Generate signed URLs for secure access
- Image optimization (resize, compress)
- CDN integration
- File metadata management

**Tech Stack:**
- **Storage:** AWS S3 or Cloudflare R2
- **SDK:** `@aws-sdk/client-s3` or `@cloudflare/r2`
- **Image Processing:** Sharp
- **CDN:** Cloudflare CDN

**Implementation:**
```javascript
// Storage Service
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

app.post('/upload', async (req, res) => {
  const { imageDataUrl, userId } = req.body;
  
  // Convert base64 to buffer
  const buffer = Buffer.from(imageDataUrl.split(',')[1], 'base64');
  
  // Optimize image (resize, compress)
  const optimized = await sharp(buffer)
    .resize(1200, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  // Upload to S3
  const key = `${userId}/${Date.now()}.jpg`;
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: optimized,
    ContentType: 'image/jpeg'
  }));
  
  // Generate signed URL (valid for 1 hour)
  const url = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key
  }), { expiresIn: 3600 });
  
  res.json({ url, key });
});
```

#### **4. Sync Service**

**Responsibilities:**
- Real-time synchronization across devices
- Conflict detection and resolution
- WebSocket connection management
- Device registration and management

**Tech Stack:**
- **WebSocket:** Socket.io or ws
- **Database:** PostgreSQL
- **Queue:** Redis for pub/sub

**Implementation:**
```javascript
// Sync Service
const io = require('socket.io')(server);
const redis = require('redis');

const redisClient = redis.createClient();
const pubClient = redis.createClient();
const subClient = redis.createClient();

// WebSocket connection
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  const deviceId = socket.handshake.auth.deviceId;
  
  // Join user's room
  socket.join(`user:${userId}`);
  
  // Handle sync request
  socket.on('sync', async (data) => {
    const { conversationId, messages } = data;
    
    // Detect conflicts
    const conflicts = await detectConflicts(conversationId, messages);
    
    // Resolve conflicts
    const resolved = await resolveConflicts(conflicts);
    
    // Update database
    await updateDatabase(resolved);
    
    // Broadcast to other devices (except sender)
    socket.to(`user:${userId}`).emit('update', resolved);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Device ${deviceId} disconnected`);
  });
});
```

#### **5. Analytics Service (Optional)**

**Responsibilities:**
- Track user usage patterns
- Performance metrics
- Error tracking
- Business intelligence

**Tech Stack:**
- **Analytics:** PostHog, Mixpanel, or custom
- **Database:** PostgreSQL + TimescaleDB (for time-series data)
- **Visualization:** Grafana

---

## Phase 3: Caching & Performance

### 🎯 Objective
Reduce API costs, improve response times, and handle high traffic loads through intelligent caching strategies.

### 📐 Distributed Systems Concepts

#### **1. Redis Distributed Cache**

**Use Cases:**
- **Query Result Caching:** Cache AI responses for similar screenshots
- **Session Management:** Store user sessions
- **Rate Limiting:** Track API call counts
- **Image Hash Cache:** Cache image hashes for deduplication

**Implementation:**
```javascript
const redis = require('redis');
const crypto = require('crypto');

const redisClient = redis.createClient();

// Cache AI responses
async function getCachedResponse(imageHash, prompt) {
  const cacheKey = `ai:${imageHash}:${hashPrompt(prompt)}`;
  const cached = await redisClient.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  return null;
}

async function cacheResponse(imageHash, prompt, response) {
  const cacheKey = `ai:${imageHash}:${hashPrompt(prompt)}`;
  // Cache for 24 hours
  await redisClient.setex(cacheKey, 86400, JSON.stringify(response));
}

// Image deduplication
async function getImageHash(imageBuffer) {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

async function checkDuplicate(imageHash) {
  const existing = await redisClient.get(`image:${imageHash}`);
  return existing ? JSON.parse(existing) : null;
}
```

#### **2. Cache Invalidation Strategies**

**Strategies:**
- **TTL (Time-To-Live):** Automatic expiration
- **LRU (Least Recently Used):** Evict old entries
- **Manual Invalidation:** On data updates
- **Cache-Aside Pattern:** Check cache, then database

**Implementation:**
```javascript
// Cache-aside pattern
async function getConversation(conversationId) {
  // 1. Check cache
  const cached = await redisClient.get(`conv:${conversationId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. Check database
  const conversation = await db.getConversation(conversationId);
  
  // 3. Cache result
  if (conversation) {
    await redisClient.setex(`conv:${conversationId}`, 3600, JSON.stringify(conversation));
  }
  
  return conversation;
}

// Invalidate on update
async function updateConversation(conversationId, data) {
  // 1. Update database
  await db.updateConversation(conversationId, data);
  
  // 2. Invalidate cache
  await redisClient.del(`conv:${conversationId}`);
}
```

#### **3. CDN for Static Assets**

**Use Cases:**
- Serve screenshots from CDN
- Reduce server load
- Improve global performance

**Implementation:**
- Upload screenshots to S3/Cloudflare R2
- Configure CDN (Cloudflare) to cache images
- Use signed URLs for security

#### **4. Load Balancing**

**Strategies:**
- **Round-Robin:** Distribute requests evenly
- **Least Connections:** Route to server with fewest connections
- **IP Hash:** Route based on client IP (session affinity)

**Implementation:**
```nginx
# Nginx load balancer configuration
upstream ai_service {
  least_conn;
  server ai-service-1:3001;
  server ai-service-2:3001;
  server ai-service-3:3001;
}

server {
  listen 80;
  
  location /api/v1/ask {
    proxy_pass http://ai_service;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

### 📊 Interview Talking Points

**Q: "How do you reduce API costs?"**

**A:**
- **Image Deduplication:** Hash images, cache responses for identical screenshots
- **Query Caching:** Cache AI responses for similar prompts on similar images
- **Smart Rate Limiting:** Prevent abuse while allowing legitimate use
- **Image Optimization:** Compress images before sending to AI (reduces token usage)
- **Batch Processing:** Queue requests and process in batches during off-peak hours

**Q: "What's your cache invalidation strategy?"**

**A:**
- **TTL-based:** Most caches expire after 24 hours
- **Cache-Aside Pattern:** Check cache first, then database, then update cache
- **Manual Invalidation:** When user updates a conversation, invalidate related caches
- **Version-based:** Use version numbers to detect stale cache entries

**Q: "How do you handle cache misses?"**

**A:**
- **Graceful Degradation:** If cache miss, fetch from database
- **Warm-up Strategy:** Pre-populate cache with frequently accessed data
- **Fallback:** If Redis is down, fall back to database (slower but functional)

---

## Phase 4: Event-Driven Architecture

### 🎯 Objective
Decouple services using events, enabling async processing, scalability, and fault tolerance.

### 📐 Distributed Systems Concepts

#### **1. Message Queues**

**Use Cases:**
- **Async AI Processing:** Don't block UI while AI processes
- **Event Broadcasting:** Notify all services of important events
- **Retry Logic:** Automatically retry failed operations
- **Load Leveling:** Smooth out traffic spikes

**Implementation:**
```javascript
// Using Bull (Redis-based queue)
const Queue = require('bull');

const aiQueue = new Queue('ai-processing', {
  redis: { host: 'redis', port: 6379 }
});

// Producer (API Gateway)
app.post('/api/v1/ask', async (req, res) => {
  const job = await aiQueue.add({
    prompt: req.body.prompt,
    imageDataUrl: req.body.imageDataUrl,
    userId: req.user.id
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
  
  res.json({ jobId: job.id, status: 'queued' });
});

// Consumer (AI Service)
aiQueue.process(async (job) => {
  try {
    const result = await processAIRequest(job.data);
    return result;
  } catch (error) {
    // Will automatically retry based on queue config
    throw error;
  }
});
```

#### **2. Pub/Sub Pattern**

**Use Cases:**
- **Real-time Sync:** Broadcast updates to all devices
- **Event Broadcasting:** Notify multiple services of events
- **Decoupling:** Services don't need to know about each other

**Implementation:**
```javascript
// Publisher (Sync Service)
const redis = require('redis');
const pubClient = redis.createClient();

async function publishUpdate(userId, data) {
  await pubClient.publish(`user:${userId}:updates`, JSON.stringify(data));
}

// Subscriber (All devices)
const subClient = redis.createClient();
subClient.subscribe(`user:${userId}:updates`);

subClient.on('message', (channel, message) => {
  const data = JSON.parse(message);
  // Update local UI
  updateUI(data);
});
```

#### **3. Event Sourcing (Advanced)**

**Concept:** Store all events (not just current state)

**Benefits:**
- Complete audit trail
- Time travel debugging
- Replay events to rebuild state

**Implementation:**
```javascript
// Event Store
const events = [
  { type: 'screenshot_captured', timestamp: '...', data: {...} },
  { type: 'ai_query_sent', timestamp: '...', data: {...} },
  { type: 'ai_response_received', timestamp: '...', data: {...} }
];

// Rebuild state from events
function rebuildState(events) {
  let state = {};
  events.forEach(event => {
    state = applyEvent(state, event);
  });
  return state;
}
```

### 🏗️ Event Flow Architecture

```
Screenshot Captured
      ↓
  [Event: screenshot_captured]
      ↓
  ┌───┴───┐
  │ Queue │
  └───┬───┘
      ↓
  [Event: ai_query_queued]
      ↓
  AI Service Processes
      ↓
  [Event: ai_response_received]
      ↓
  ┌───┴───┐
  │ Pub/Sub│
  └───┬───┘
      ↓
  Broadcast to Devices
      ↓
  [Event: sync_completed]
```

---

## Phase 5: Scalability & Reliability

### 🎯 Objective
Ensure the system can handle high traffic, recover from failures, and maintain high availability.

### 📐 Distributed Systems Concepts

#### **1. Rate Limiting**

**Strategies:**
- **Token Bucket:** Allow bursts, limit average rate
- **Sliding Window:** Limit requests in time window
- **Per-User Limits:** Different limits for free vs premium users

**Implementation:**
```javascript
// Redis-based rate limiting
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => {
    // Premium users get 1000 requests, free users get 100
    const user = await getUser(req.user.id);
    return user.isPremium ? 1000 : 100;
  }
});

app.use('/api/v1/', limiter);
```

#### **2. Circuit Breaker Pattern**

**Purpose:** Prevent cascading failures when a service is down

**States:**
- **Closed:** Normal operation
- **Open:** Service is down, reject requests immediately
- **Half-Open:** Testing if service recovered

**Implementation:**
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

// Usage
const breaker = new CircuitBreaker();

app.post('/api/v1/ask', async (req, res) => {
  try {
    const result = await breaker.execute(() => 
      callAIService(req.body)
    );
    res.json(result);
  } catch (error) {
    // Fallback to cached response or error message
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});
```

#### **3. Retry Logic with Exponential Backoff**

**Purpose:** Automatically retry failed operations with increasing delays

**Implementation:**
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await sleep(delay);
    }
  }
}

// Usage
const result = await retryWithBackoff(() => 
  aiService.generateResponse(prompt, image)
);
```

#### **4. Health Checks**

**Purpose:** Monitor service health and automatically restart failed services

**Implementation:**
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      aiService: await checkAIService()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(c => c === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return 'ok';
  } catch (error) {
    return 'error';
  }
}
```

#### **5. Monitoring & Observability**

**Tools:**
- **Prometheus:** Metrics collection
- **Grafana:** Visualization
- **Sentry:** Error tracking
- **ELK Stack:** Log aggregation

**Implementation:**
```javascript
// Prometheus metrics
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path, status: res.statusCode },
      duration
    );
  });
  next();
});
```

---

## Complete Feature Roadmap

### **MVP (Weeks 1-2) - Current State**
- ✅ Screenshot capture with global shortcut
- ✅ Floating window UI
- ✅ Google Gemini AI integration
- ✅ Basic conversation flow

### **Phase 1: Core Improvements (Weeks 3-4)**
- [ ] **Customizable Shortcuts**
  - Settings window to change hotkey
  - Multiple shortcut profiles
- [ ] **Extract Text Feature**
  - macOS Vision framework for OCR
  - Extract text before sending to AI (saves tokens)
- [ ] **Save Conversations Locally**
  - SQLite database for local storage
  - Conversation history UI
- [ ] **Quick Action Buttons**
  - "Extract text", "Summarize", "Explain" presets
  - Custom prompt templates

### **Phase 2: Backend Foundation (Weeks 5-6)**
- [ ] **User Authentication**
  - Sign up / Sign in
  - JWT token management
  - Password reset flow
- [ ] **API Gateway**
  - Express.js server
  - Rate limiting
  - Request routing
- [ ] **PostgreSQL Database**
  - User accounts
  - Conversations
  - Screenshots metadata
- [ ] **Storage Service**
  - Upload screenshots to S3/Cloudflare R2
  - Generate signed URLs

### **Phase 3: Microservices (Weeks 7-8)**
- [ ] **AI Service (Separate Microservice)**
  - Queue-based processing
  - Retry logic
  - Multiple AI provider support
- [ ] **Sync Service**
  - WebSocket server
  - Real-time sync
  - Conflict resolution
- [ ] **Message Queue**
  - Redis/RabbitMQ setup
  - Async processing
  - Event publishing

### **Phase 4: Distributed Systems (Weeks 9-10)**
- [ ] **Redis Caching**
  - Query result caching
  - Session management
  - Rate limiting counters
- [ ] **Load Balancing**
  - Multiple AI service instances
  - Nginx load balancer
  - Health checks
- [ ] **Database Replication**
  - Read replicas
  - Write/read separation

### **Phase 5: Multi-Device (Weeks 11-12)**
- [ ] **iOS App (React Native)**
  - Screenshot capture
  - Conversation sync
  - Push notifications
- [ ] **Web Dashboard**
  - View all conversations
  - Search history
  - Settings management
- [ ] **Real-time Sync**
  - WebSocket connections
  - Conflict resolution
  - Offline support

### **Phase 6: Production Ready (Weeks 13-14)**
- [ ] **Docker Containerization**
  - Dockerfiles for each service
  - Docker Compose for local development
- [ ] **Kubernetes Deployment**
  - K8s manifests
  - Auto-scaling
  - Service discovery
- [ ] **CI/CD Pipeline**
  - GitHub Actions
  - Automated testing
  - Deployment automation
- [ ] **Monitoring**
  - Prometheus metrics
  - Grafana dashboards
  - Error tracking (Sentry)

### **Phase 7: Advanced Features (Weeks 15+)**
- [ ] **Premium Tier**
  - Subscription management
  - Usage limits
  - Advanced features
- [ ] **Analytics Service**
  - Usage tracking
  - Performance metrics
  - Business intelligence
- [ ] **Advanced AI Features**
  - Multiple model support
  - Custom prompts
  - Batch processing

---

## Tech Stack Recommendations

### **Backend Services**
- **API Gateway:** Express.js or Fastify
- **Microservices:** Node.js (Express.js)
- **Database:** PostgreSQL (primary) + Redis (cache)
- **Message Queue:** Redis Streams or RabbitMQ
- **Storage:** AWS S3 or Cloudflare R2
- **Authentication:** JWT tokens

### **Infrastructure**
- **Containerization:** Docker
- **Orchestration:** Kubernetes (or Docker Compose for simpler)
- **Load Balancer:** Nginx
- **CDN:** Cloudflare
- **Monitoring:** Prometheus + Grafana
- **Error Tracking:** Sentry
- **CI/CD:** GitHub Actions

### **Frontend**
- **macOS App:** Electron (current)
- **iOS App:** React Native (optional)
- **Web Dashboard:** React/Next.js (optional)

### **Development Tools**
- **Package Manager:** npm or yarn
- **Type Checking:** TypeScript (optional but recommended)
- **Testing:** Jest, Mocha
- **Linting:** ESLint
- **Documentation:** Swagger/OpenAPI

---

## Interview Talking Points

### **System Design Questions**

#### **Q: "How does your app handle 10,000 concurrent users?"**

**A:**
- **Horizontal Scaling:** Multiple instances of each microservice
- **Load Balancing:** Nginx distributes requests across instances
- **Caching:** Redis caches common queries (reduces database load by 80%)
- **Async Processing:** Queue-based AI processing (doesn't block requests)
- **Database Optimization:** Read replicas for read-heavy operations
- **CDN:** Screenshots served from CDN (reduces server load)

**Metrics:**
- API Gateway: 3 instances (handles 3,333 users each)
- AI Service: 5 instances (processes 2,000 requests each)
- Database: 1 primary + 2 read replicas
- Redis: 1 instance (handles all caching)

#### **Q: "How do you ensure data consistency across devices?"**

**A:**
- **Eventual Consistency Model:** Accept slight delays (1-2 seconds)
- **Optimistic UI:** Users see changes instantly locally
- **WebSocket Sync:** Real-time updates to other devices
- **Version Vectors:** Track which device made which change
- **Conflict Resolution:** Last-write-wins with manual override option
- **Offline Support:** Queue changes when offline, sync on reconnect

#### **Q: "What happens if the AI service is down?"**

**A:**
- **Circuit Breaker:** Detects failures, stops sending requests
- **Fallback:** Return cached responses if available
- **Queue Messages:** Failed requests queued for retry
- **Graceful Degradation:** Show user-friendly error message
- **Health Monitoring:** Alert when service is down
- **Auto-Recovery:** Circuit breaker tests recovery periodically

#### **Q: "How do you scale the AI service?"**

**A:**
- **Horizontal Scaling:** Add more AI service instances
- **Load Balancer:** Distribute requests evenly
- **Queue-Based:** Process requests asynchronously (doesn't block)
- **Rate Limiting:** Prevent any single user from overwhelming system
- **Caching:** Cache responses to reduce API calls
- **Auto-Scaling:** Kubernetes auto-scales based on queue length

#### **Q: "How do you reduce costs?"**

**A:**
- **Image Deduplication:** Hash images, cache responses for identical screenshots
- **Query Caching:** Cache AI responses for similar prompts (Redis)
- **Image Optimization:** Compress images before sending (reduces token usage by 60%)
- **Smart Rate Limiting:** Prevent abuse
- **Batch Processing:** Queue requests, process in batches during off-peak
- **CDN:** Serve screenshots from CDN (reduces storage costs)

---

## Architecture Diagrams

### **High-Level Architecture**

```
                    ┌─────────────────┐
                    │   macOS App      │
                    │   (Electron)     │
                    └────────┬─────────┘
                             │ HTTPS
                             │
                    ┌────────▼─────────────────────────┐
                    │      API Gateway                 │
                    │  - Auth (JWT)                   │
                    │  - Rate Limiting                 │
                    │  - Load Balancing                │
                    └────────┬─────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌─────▼─────┐        ┌────▼────┐
   │   AI    │         │   Sync    │        │ Storage │
   │ Service │         │  Service  │        │ Service │
   └────┬────┘         └─────┬─────┘        └────┬────┘
        │                    │                    │
        │              ┌─────▼─────┐              │
        │              │   Queue   │              │
        │              │  (Redis)  │              │
        │              └───────────┘              │
        │                                         │
   ┌────▼────────────────────────────────────────▼──┐
   │         PostgreSQL (Primary + Replicas)        │
   │         Redis (Cache + Queue)                  │
   │         S3/Cloudflare R2 (Storage)             │
   └────────────────────────────────────────────────┘
```

### **Data Flow Diagram**

```
User Action: Screenshot + Query
      ↓
macOS App (Electron)
      ↓
API Gateway (Auth + Rate Limit)
      ↓
┌─────┴─────┐
│           │
Queue    Storage Service
│           │ (Upload to S3)
│           │
AI Service  │
│           │
│      ┌────▼────┐
│      │ Database│
│      └────┬────┘
│           │
│      Sync Service
│           │
│      WebSocket
│           │
│      ┌────▼────┐
│      │ Devices │
│      └─────────┘
│
Response → User
```

---

## Implementation Timeline

### **Month 1: Foundation (Weeks 1-4)**
- **Week 1-2:** Core improvements (shortcuts, extract text, save conversations)
- **Week 3-4:** Backend setup (API Gateway, Database, Auth)

### **Month 2: Microservices (Weeks 5-8)**
- **Week 5-6:** Split into microservices (AI, Storage, Sync)
- **Week 7-8:** Message queue and async processing

### **Month 3: Distributed Systems (Weeks 9-12)**
- **Week 9-10:** Caching, load balancing, database replication
- **Week 11-12:** Multi-device sync (iOS app, web dashboard)

### **Month 4: Production (Weeks 13-16)**
- **Week 13-14:** Docker, Kubernetes, CI/CD
- **Week 15-16:** Monitoring, documentation, polish

---

## Success Metrics

### **Technical Metrics**
- **Response Time:** < 2 seconds for cached queries, < 10 seconds for AI queries
- **Uptime:** 99.9% availability
- **Scalability:** Handle 10,000+ concurrent users
- **Cost Efficiency:** Reduce AI API costs by 60% through caching

### **User Metrics**
- **User Satisfaction:** 4.5+ stars
- **Daily Active Users:** Track growth
- **Query Success Rate:** > 95%
- **Sync Latency:** < 2 seconds across devices

---

## Next Steps

1. **Start with Phase 1:** Custom shortcuts, extract text, save conversations
2. **Build Backend:** API Gateway + Database
3. **Split Services:** Microservices architecture
4. **Add Caching:** Redis implementation
5. **Multi-Device:** iOS app + web dashboard
6. **Production:** Docker, K8s, monitoring

---

**This plan transforms SnapAsk into a production-ready, interview-worthy distributed system!** 🚀

---

*Last Updated: October 2024*
*Version: 1.0*

