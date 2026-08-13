const express = require('express');
const { z } = require('zod');

const app = express();
app.use(express.json());

// Scoped STIX 2.1 Indicator Schema for the MVP
const IndicatorSchema = z.object({
  type: z.literal('indicator'),
  id: z.string().startsWith('indicator--'),
  created: z.string().datetime(),
  modified: z.string().datetime(),
  name: z.string(),
  description: z.string().optional(),
  pattern_type: z.literal('stix'),
  pattern: z.string(), // E.g., "[ipv4-addr:value = '198.51.100.1']"
  valid_from: z.string().datetime()
});

// Threat Report Submission Endpoint
app.post('/api/v1/threats', (req, res) => {
  // 1. Authenticate the Client via the header injected by Nginx
  const clientCN = req.headers['x-client-cert-cn'];
  
  if (!clientCN) {
    return res.status(401).json({ error: 'Unauthorized: Missing Client Certificate CN' });
  }

  // 2. Validate the Payload against the STIX Schema
  try {
    const stixData = IndicatorSchema.parse(req.body);
    
    // 3. Process the Threat (In a real app, save to PostgreSQL and add to HITL review queue)
    console.log(`[SUCCESS] Threat received from authenticated client: ${clientCN}`);
    console.log(`[DATA] Indicator: ${stixData.name} | Pattern: ${stixData.pattern}`);
    
    return res.status(201).json({ 
      message: 'Threat intelligence accepted.',
      client: clientCN,
      indicator_id: stixData.id
    });

  } catch (error) {
    console.error(`[ERROR] Invalid STIX payload from ${clientCN}:`, error.errors);
    return res.status(400).json({ error: 'Invalid STIX 2.1 Payload', details: error.errors });
  }
});

// Bind explicitly to 0.0.0.0 (inside Docker) so Nginx can proxy to it, 
// but it is not exposed directly to the host network via docker-compose.
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hub API listening on port ${PORT}`);
  console.log(`WARNING: This API trusts the X-Client-Cert-CN header. Ensure it is only accessible via the Nginx Reverse Proxy.`);
});
