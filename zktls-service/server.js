/**
 * zkTLS HTTP API Service
 * 
 * HTTP API wrapper for the3cloud/zktls binary
 * 
 * Input JSON format is based on testdata/input.json from zktls repository
 */

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

app.use(express.json());

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
    const { stdout } = await execAsync(`${ZKTLS_BINARY} --version`, { timeout: 5000 });
    res.json({
      status: 'healthy',
      version: '1.0.0',
      zktls_version: stdout.trim(),
      backend: ZKTLS_BACKEND,
      backends: {
        risc0: 'available',
        sp1: 'available',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'zktls binary not available',
      message: error.message,
      path: ZKTLS_BINARY,
      service_status: 'running',
    });
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
  console.log(`   POST /api/proof/generate`);
});
