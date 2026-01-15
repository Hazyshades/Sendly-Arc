/**
 * zkTLS HTTP API Service
 * 
 * HTTP API wrapper for the3cloud/zktls binary
 * 
 * Input JSON format is based on testdata/input.json from zktls repository
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;
const ZKTLS_BINARY = process.env.ZKTLS_BINARY || process.env.ZKTLS_PATH || '/root/Sendly/zktls-service/zktls/target/release/zktls';
// Default to r0 (Risc0) backend to avoid InvalidCertificate issue in SP1 with Twitter API
// Can switch to sp1 via env: ZKTLS_BACKEND=sp1
const ZKTLS_BACKEND = process.env.ZKTLS_BACKEND || 'r0';
const API_KEY = process.env.ZKTLS_API_KEY;

// Reclaim Protocol (kept on backend; do NOT expose secrets to frontend)
const RECLAIM_APP_ID = process.env.RECLAIM_APP_ID;
const RECLAIM_APP_SECRET = process.env.RECLAIM_APP_SECRET;
// Optional callback URL for server-to-server proof delivery
const RECLAIM_APP_CALLBACK_URL = process.env.RECLAIM_APP_CALLBACK_URL; // e.g. https://your-domain.com/api/reclaim/callback

// Provider IDs (configure per env; twitter default from Reclaim Dev Tool)
const RECLAIM_PROVIDER_ID_TWITTER =
  process.env.RECLAIM_PROVIDER_ID_TWITTER || 'e6fe962d-8b4e-4ce5-abcc-3d21c88bd64a';
const RECLAIM_PROVIDER_ID_TELEGRAM = process.env.RECLAIM_PROVIDER_ID_TELEGRAM;
const RECLAIM_PROVIDER_ID_INSTAGRAM = process.env.RECLAIM_PROVIDER_ID_INSTAGRAM;
const RECLAIM_PROVIDER_ID_TIKTOK = process.env.RECLAIM_PROVIDER_ID_TIKTOK;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Simple API key authentication (optional)
const requireAuth = (req, res, next) => {
  if (!API_KEY) {
    return next();
  }
  
  const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Reclaim endpoints don't require auth (they use Reclaim's own security)
const noAuth = (req, res, next) => next();

/**
 * Convert string to hex format (0x...)
 */
function stringToHex(str) {
  return '0x' + Buffer.from(str, 'utf8').toString('hex');
}

/**
 * Parse URL and extract host, port, path
 */
function parseUrl(urlString) {
  try {
    const url = new URL(urlString);
    const host = url.hostname;
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    const path = url.pathname + url.search;
    
    return {
      host,
      port: parseInt(port, 10),
      path: path || '/',
      isHttps: url.protocol === 'https:',
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${urlString}`);
  }
}

/**
 * Build RAW HTTP request
 */
function buildRawHttpRequest(url, method = 'GET', headers = {}) {
  const parsed = parseUrl(url);
  const hostHeader = parsed.port === 443 || parsed.port === 80
    ? parsed.host
    : `${parsed.host}:${parsed.port}`;
  
  // Base headers
  const defaultHeaders = {
    'Host': hostHeader,
    'Accept': '*/*',
    'User-Agent': 'zkTLS/1.0',
  };
  
  // Merge headers
  const allHeaders = { ...defaultHeaders, ...headers };
  
  // Build RAW HTTP request
  const requestLine = `${method} ${parsed.path} HTTP/1.1\r\n`;
  const headerLines = Object.entries(allHeaders)
    .map(([key, value]) => `${key}: ${value}\r\n`)
    .join('');
  
  const rawRequest = requestLine + headerLines + '\r\n';
  
  return {
    rawRequest,
    parsedUrl: parsed,
  };
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      version: '1.0.0',
      service: 'zktls-service',
      reclaim_configured: !!(RECLAIM_APP_ID && RECLAIM_APP_SECRET),
      port: PORT,
    };
    
    // Try to check zktls binary if configured (optional)
    if (ZKTLS_BINARY && ZKTLS_BINARY !== '/root/Sendly/zktls-service/zktls/target/release/zktls') {
      try {
        const { stdout } = await execAsync(`${ZKTLS_BINARY} --version`, { timeout: 5000 });
        health.zktls_version = stdout.trim();
        health.backend = ZKTLS_BACKEND;
      } catch (error) {
        health.zktls_note = 'zktls binary not available (optional for Reclaim Protocol)';
      }
    }
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service error',
      message: error.message,
    });
  }
});

function getReclaimProviderId(platform) {
  const p = String(platform || '').toLowerCase();
  if (p === 'twitter' || p === 'x') return RECLAIM_PROVIDER_ID_TWITTER;
  if (p === 'telegram') return RECLAIM_PROVIDER_ID_TELEGRAM;
  if (p === 'instagram') return RECLAIM_PROVIDER_ID_INSTAGRAM;
  if (p === 'tiktok') return RECLAIM_PROVIDER_ID_TIKTOK;
  return undefined;
}

/**
 * Reclaim: build proof request config (server-side)
 * Docs: https://docs.reclaimprotocol.org/js-sdk/preparing-request
 */
app.get('/api/reclaim/config', noAuth, async (req, res) => {
  try {
    if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
      return res.status(500).json({
        error: 'Reclaim is not configured on backend',
        required: ['RECLAIM_APP_ID', 'RECLAIM_APP_SECRET'],
      });
    }

    const { platform, username, paymentId, recipient, redirectUrl } = req.query;
    if (!platform) {
      return res.status(400).json({ error: 'Missing required query param: platform' });
    }

    const providerId = getReclaimProviderId(platform);
    if (!providerId) {
      return res.status(400).json({
        error: 'Unsupported platform or missing RECLAIM_PROVIDER_ID_* env var',
        platform,
      });
    }

    const { ReclaimProofRequest } = await import('@reclaimprotocol/js-sdk');

    const reclaimProofRequest = await ReclaimProofRequest.init(
      RECLAIM_APP_ID,
      RECLAIM_APP_SECRET,
      providerId
    );

    // Context is returned in proof and helps correlate with zkSEND payment
    const contextAddress = recipient || 'anonymous';
    const contextMessage = JSON.stringify({ platform, username, paymentId, recipient });
    reclaimProofRequest.setContext(contextAddress, contextMessage);

    // Optional: redirect user after proof generation (useful for mobile QR flow)
    if (redirectUrl) {
      try {
        reclaimProofRequest.setRedirectUrl(String(redirectUrl));
      } catch (_) {}
    }

    // Optional: set backend callback url (Reclaim will POST proofs server-to-server)
    if (RECLAIM_APP_CALLBACK_URL) {
      // useJson=true => send proof as raw JSON
      reclaimProofRequest.setAppCallbackUrl(RECLAIM_APP_CALLBACK_URL, true);
    }

    const reclaimProofRequestConfig = reclaimProofRequest.toJsonString();
    return res.json({ reclaimProofRequestConfig });
  } catch (error) {
    console.error('[Reclaim] Failed to build config:', error);
    return res.status(500).json({ error: error.message || 'Failed to build Reclaim config' });
  }
});

/**
 * Reclaim: verify proofs (server-side)
 * Docs: https://docs.reclaimprotocol.org/js-sdk/verifying-proofs
 */
app.post('/api/reclaim/verify', noAuth, async (req, res) => {
  try {
    const proofs = req.body?.proofs;
    if (!proofs) {
      return res.status(400).json({ error: 'Missing body.proofs' });
    }

    const { verifyProof } = await import('@reclaimprotocol/js-sdk');
    const isValid = await verifyProof(proofs);

    // Best-effort context extraction (structure varies by provider/SDK)
    const proof0 = Array.isArray(proofs) ? proofs[0] : proofs;
    const claimData = proof0?.claimData || proof0?.claim || proof0?.claimInfo || null;
    const contextStr = claimData?.context || proof0?.context || null;

    let context = null;
    if (contextStr && typeof contextStr === 'string') {
      try {
        context = JSON.parse(contextStr);
      } catch (_) {
        context = { raw: contextStr };
      }
    }

    return res.json({ isValid, context });
  } catch (error) {
    console.error('[Reclaim] verify failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to verify proofs' });
  }
});

/**
 * Reclaim: optional server-to-server callback endpoint.
 * If you enable `setAppCallbackUrl` on the request, Reclaim will POST proofs here.
 */
app.post('/api/reclaim/callback', noAuth, async (req, res) => {
  try {
    const body = req.body;
    const proofs =
      typeof body === 'string'
        ? JSON.parse(body)
        : typeof body?.proofs === 'string'
        ? JSON.parse(body.proofs)
        : body?.proofs || body;

    const { verifyProof } = await import('@reclaimprotocol/js-sdk');
    const isValid = await verifyProof(proofs);

    return res.json({ ok: true, isValid });
  } catch (error) {
    console.error('[Reclaim] callback failed:', error);
    return res.status(400).json({ ok: false, error: error.message || 'Invalid callback payload' });
  }
});

// Generate proof
app.post('/api/proof/generate', requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { platform, targetUrl, extractionPattern, oauthToken } = req.body;

    // Validation
    if (!platform || !targetUrl || !oauthToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['platform', 'targetUrl', 'oauthToken'],
      });
    }

    if (!extractionPattern || typeof extractionPattern !== 'object') {
      return res.status(400).json({
        error: 'extractionPattern must be an object',
      });
    }

    console.log(`[zkTLS] Generating proof for platform: ${platform}, URL: ${targetUrl}, backend: ${ZKTLS_BACKEND}`);

    // Build RAW HTTP request with OAuth token
    const headers = {
      'Authorization': `Bearer ${oauthToken}`,
      'Accept': 'application/json',
    };
    
    const { rawRequest, parsedUrl } = buildRawHttpRequest(targetUrl, 'GET', headers);
    
    // Convert to hex
    const requestHex = stringToHex(rawRequest);
    
    // Build remote_addr (host:port)
    const remoteAddr = parsedUrl.isHttps 
      ? `${parsedUrl.host}:443`
      : parsedUrl.port === 80
      ? `${parsedUrl.host}:80`
      : `${parsedUrl.host}:${parsedUrl.port}`;
    
    // Build response_template based on extractionPattern
    // IMPORTANT: Temporarily using empty array, as in testdata/input.json
    // TODO: Figure out response_template format for populated arrays
    const responseTemplate = [];
    
    // Temporarily disabled - causes "missing field `type`" error
    // if (extractionPattern.username) {
    //   responseTemplate.push({
    //     keyName: 'username',
    //     parseType: 'string',
    //     parsePath: platform === 'twitter' ? '$.data.username' : '$.username',
    //   });
    // }
    // if (extractionPattern.userId) {
    //   responseTemplate.push({
    //     keyName: 'userId',
    //     parseType: 'string',
    //     parsePath: platform === 'twitter' ? '$.data.id' : '$.id',
    //   });
    // }

    // Create input JSON in zktls format (based on testdata/input.json)
    const inputData = {
      version: 1,
      request_info: {
        request: requestHex,
        remote_addr: remoteAddr,
        server_name: parsedUrl.host,
      },
      response_template: responseTemplate,
      target: {
        // Using values from testdata/input.json for testing
        client: "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5",
        prover_id: "0xe19cb336d24b30c013e7bdb2e93659d6086672be7191a02262a7e032ceb43fc9",
        submit_network_id: 1,
      },
      origin: {
        type: "secp256k1",
        // Using signature from testdata/input.json for testing
        // In production, need to use real signature
        signature: "0x61600537178396fc1cb1abf2d880d6f0805d8969f672c4181857436ae5d0225875ffd4a212ced58dabe760b7e248a3f9ab1c9acf32bce1983e05c1ba9e3e228700",
        nonce: 0,
      },
    };

    const inputFile = path.join(os.tmpdir(), `zktls_input_${crypto.randomUUID()}.json`);
    await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2));
    
    // Log created JSON for debugging
    console.log('[zkTLS] Input JSON:', JSON.stringify(inputData, null, 2));

    try {
      console.log(`[zkTLS] Calling zktls binary: ${ZKTLS_BINARY}`);
      const command = `${ZKTLS_BINARY} prove -i ${inputFile} -t evm -p ${ZKTLS_BACKEND}`;
      console.log(`[zkTLS] Using backend: ${ZKTLS_BACKEND}`);
      console.log(`[zkTLS] Command: ${command}`);
      
      // Increase timeout to 10 minutes (600000 ms) for proof generation
      // Generation can take 5-10 minutes depending on complexity
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 600000, // 10 minutes
        maxBuffer: 50 * 1024 * 1024, // 50MB for large proofs
        env: { ...process.env, RUST_LOG: 'info' },
        killSignal: 'SIGKILL', // Use SIGKILL instead of SIGTERM for more reliable termination
      });

      if (stderr && !stdout) {
        throw new Error(`zktls stderr: ${stderr}`);
      }

      let proofData;
      try {
        proofData = JSON.parse(stdout);
      } catch (parseError) {
        console.error('[zkTLS] Failed to parse JSON output:', stdout);
        throw new Error(`Failed to parse zktls output: ${parseError.message}`);
      }

      // Don't delete file on error for debugging
      // await fs.unlink(inputFile).catch(() => {});
      console.log(`[zkTLS] Input file preserved at: ${inputFile}`);

      const duration = Date.now() - startTime;
      console.log(`[zkTLS] Proof generated successfully in ${duration}ms`);

      // Return in format expected by frontend
      const response = {
        proof: proofData.proof || proofData.proof_hex || proofData.proof_data || JSON.stringify(proofData),
        publicInputs: proofData.public_inputs || proofData.publicInputs || proofData.public_inputs_array || [],
        verificationResult: {
          usernameHash: proofData.username_hash || proofData.usernameHash || proofData.verification_result?.usernameHash || '',
          userId: proofData.user_id || proofData.userId || proofData.verification_result?.userId,
          platform: platform,
        },
        expiresAt: Date.now() + 3600000,
        generatedAt: Date.now(),
      };

      if (!response.proof) {
        throw new Error('Proof not found in zktls output');
      }

      if (!Array.isArray(response.publicInputs) || response.publicInputs.length === 0) {
        console.warn('[zkTLS] Warning: publicInputs is empty or not an array');
      }

      res.json(response);
    } catch (error) {
      // Don't delete file on error for debugging
      // await fs.unlink(inputFile).catch(() => {});
      console.log(`[zkTLS] Input file preserved at: ${inputFile}`);
      const duration = Date.now() - startTime;
      console.error(`[zkTLS] Error generating proof (${duration}ms):`, error);
      
      // Log file content for debugging
      try {
        const fileContent = await fs.readFile(inputFile, 'utf8');
        console.error('[zkTLS] Input file content:', fileContent);
      } catch (readError) {
        // Ignore read error
      }
      
      res.status(500).json({
        error: 'Failed to generate proof',
        message: error.message,
        stderr: error.stderr || error.message,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[zkTLS] Unexpected error (${duration}ms):`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[zkTLS] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 zkTLS Service running on port ${PORT}`);
  console.log(`📦 zktls binary: ${ZKTLS_BINARY}`);
  console.log(`⚙️  Backend: ${ZKTLS_BACKEND}`);
  console.log(`🔑 API Key: ${API_KEY ? 'Configured' : 'Not configured (public access)'}`);
  console.log(`\n📖 Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/reclaim/config`);
  console.log(`   POST /api/reclaim/verify`);
  console.log(`   POST /api/reclaim/callback (optional)`);
  console.log(`   POST /api/proof/generate`);
});
