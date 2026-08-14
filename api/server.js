const express = require('express');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_prod';
const ANOMALY_THRESHOLD = parseInt(process.env.ANOMALY_THRESHOLD || '20');

// Scoped STIX 2.1 Indicator Schema
const IndicatorSchema = z.object({
  type: z.literal('indicator'),
  id: z.string().startsWith('indicator--'),
  created: z.string().datetime(),
  modified: z.string().datetime(),
  name: z.string(),
  description: z.string().optional(),
  pattern_type: z.literal('stix'),
  pattern: z.string(),
  valid_from: z.string().datetime()
});

// Middleware for mTLS Authentication (Agents)
async function requireAgent(req, res, next) {
  const cn = req.headers['x-client-cert-cn'];
  if (!cn) {
    return res.status(401).json({ error: 'Unauthorized: Missing Client Certificate CN' });
  }

  // Ensure client exists in DB using upsert to avoid concurrency issues under load
  let client = await prisma.client.upsert({
      where: { cn },
      update: {},
      create: { cn }
  });

  req.client = client;
  next();
}

// Middleware for UI Authentication (Analysts)
async function requireAnalyst(req, res, next) {
  const token = req.cookies.session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing session cookie' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.analystId = decoded.analystId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session' });
  }
}

// Middleware for CSRF Protection (Double-Submit Cookie)
function requireCsrf(req, res, next) {
  const tokenHeader = req.headers['x-csrf-token'];
  const tokenCookie = req.cookies.csrf_token;
  
  // Explicit presence and strict equality check prevents undefined === undefined bypass
  if (!tokenHeader || !tokenCookie || tokenHeader !== tokenCookie) {
    return res.status(403).json({ error: 'Forbidden: Invalid or missing CSRF token' });
  }
  
  next();
}

// ==========================================
// 1. INGESTION & DISTRIBUTION (mTLS on Port 443)
// ==========================================

app.post('/api/v1/threats', requireAgent, async (req, res) => {
  const client = req.client;

  if (client.is_quarantined) {
    return res.status(403).json({ error: 'Forbidden: Client is quarantined. Contact an administrator.' });
  }

  try {
    const stixData = IndicatorSchema.parse(req.body);

    // Anomaly Detection Math
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const countSince1h = client.quarantine_reset_at && client.quarantine_reset_at > oneHourAgo ? client.quarantine_reset_at : oneHourAgo;
    const countSince7d = client.quarantine_reset_at && client.quarantine_reset_at > sevenDaysAgo ? client.quarantine_reset_at : sevenDaysAgo;

    const hourlyCount = await prisma.threat.count({
      where: { client_id: client.id, created_at: { gte: countSince1h } }
    });

    const weeklyCount = await prisma.threat.count({
      where: { client_id: client.id, created_at: { gte: countSince7d } }
    });

    // Average per hour over 7 days (168 hours)
    const averageHourly = weeklyCount / 168;

    // Quarantine Threshold: Max of (Static Default OR 5x their normal average)
    const dynamicThreshold = Math.max(ANOMALY_THRESHOLD, averageHourly * 5);

    if (hourlyCount + 1 > dynamicThreshold) {
      // Flag as quarantined
      await prisma.client.update({
        where: { id: client.id },
        data: { is_quarantined: true }
      });
      console.warn(`[QUARANTINE] Client ${client.cn} quarantined! Exceeded threshold: ${hourlyCount + 1} > ${dynamicThreshold}`);
      return res.status(429).json({ error: 'Too Many Requests: Anomaly detected. Client quarantined pending review.' });
    }

    // Save threat
    await prisma.threat.create({
      data: {
        stix_id: stixData.id,
        client_id: client.id,
        stix_data: stixData,
        status: 'pending_review'
      }
    });

    return res.status(201).json({ message: 'Threat intelligence accepted.', indicator_id: stixData.id });

  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid STIX 2.1 Payload', details: error.errors });
    }
    // E.g. Unique constraint failure on stix_id
    return res.status(409).json({ error: 'Threat already exists or server error.' });
  }
});

app.get('/api/v1/feed', requireAgent, async (req, res) => {
  const { since } = req.query;
  const where = { status: 'approved' };
  
  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate)) {
      // Use reviewed_at to sync changes that happened after the poll time
      where.reviewed_at = { gt: sinceDate };
    }
  }

  const threats = await prisma.threat.findMany({
    where,
    orderBy: { reviewed_at: 'asc' },
    select: { stix_data: true, reviewed_at: true }
  });

  res.json({
    count: threats.length,
    data: threats.map(t => t.stix_data),
    timestamp: new Date()
  });
});

// ==========================================
// 2. ANALYST CONTROL PLANE (Session on Port 8443)
// ==========================================

app.post('/api/v1/auth/login', async (req, res) => {
  const { username, password } = req.body;

  const analyst = await prisma.analyst.findUnique({ where: { username } });
  if (!analyst) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, analyst.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ analystId: analyst.id }, JWT_SECRET, { expiresIn: '8h' });
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // CSRF Protection via SameSite=Strict and HttpOnly
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development', // Needs true if over HTTPS
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });
  
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false, // Must be readable by frontend JS
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });

  res.json({ message: 'Logged in successfully', username: analyst.username });
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.clearCookie('session');
  res.clearCookie('csrf_token');
  res.json({ message: 'Logged out' });
});

app.get('/api/v1/ui/queue', requireAnalyst, async (req, res) => {
  const threats = await prisma.threat.findMany({
    where: { status: 'pending_review' },
    include: { client: { select: { cn: true, reputation: true, is_quarantined: true } } },
    orderBy: { created_at: 'desc' }
  });
  res.json(threats);
});

app.post('/api/v1/ui/queue/:id/approve', requireAnalyst, requireCsrf, async (req, res) => {
  try {
    const threatId = parseInt(req.params.id);
    const result = await prisma.threat.updateMany({
      where: { id: threatId, status: 'pending_review' },
      data: {
        status: 'approved',
        reviewed_at: new Date(),
        reviewed_by_id: req.analystId
      }
    });

    if (result.count === 0) {
      const current = await prisma.threat.findUnique({ where: { id: threatId } });
      if (!current) return res.status(404).json({ error: 'Threat not found' });
      if (current.status === 'approved') return res.status(409).json({ error: 'Already approved by another analyst' });
      if (current.status === 'rejected') return res.status(409).json({ error: 'Already rejected by another analyst' });
      return res.status(409).json({ error: 'Threat is no longer pending review' });
    }

    res.json({ message: 'Approved' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to approve' });
  }
});

app.post('/api/v1/ui/queue/:id/reject', requireAnalyst, requireCsrf, async (req, res) => {
  try {
    const threatId = parseInt(req.params.id);
    const result = await prisma.threat.updateMany({
      where: { id: threatId, status: 'pending_review' },
      data: {
        status: 'rejected',
        reviewed_at: new Date(),
        reviewed_by_id: req.analystId
      }
    });

    if (result.count === 0) {
      const current = await prisma.threat.findUnique({ where: { id: threatId } });
      if (!current) return res.status(404).json({ error: 'Threat not found' });
      if (current.status === 'approved') return res.status(409).json({ error: 'Already approved by another analyst' });
      if (current.status === 'rejected') return res.status(409).json({ error: 'Already rejected by another analyst' });
      return res.status(409).json({ error: 'Threat is no longer pending review' });
    }

    res.json({ message: 'Rejected' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reject' });
  }
});

app.post('/api/v1/ui/clients/:id/unquarantine', requireAnalyst, requireCsrf, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    await prisma.client.update({
      where: { id: clientId },
      data: {
        is_quarantined: false,
        quarantine_reset_at: new Date(),
        unquarantined_by_id: req.analystId
      }
    });
    res.json({ message: 'Client un-quarantined successfully. Submission counters reset.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to un-quarantine client' });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hub API listening on port ${PORT}`);
});
