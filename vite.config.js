import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';

const FALLBACK_MONGODB_URI =
  'mongodb+srv://Vercel-Admin-HIGHROLLER:FSBV2A58PpzALcqU@highroller.d8jezy5.mongodb.net/?retryWrites=true&w=majority';

function sanitizeMongoUri(raw) {
  if (!raw || typeof raw !== 'string') return FALLBACK_MONGODB_URI;
  let uri = raw.trim();
  if (uri.startsWith('MONGODB_URI=')) {
    uri = uri.slice('MONGODB_URI='.length).trim();
  }
  while ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }
  uri = uri.replace(/^["']+|["']+$/g, '').trim();
  if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
    if (uri.includes('<username>') || uri.includes('<password>')) {
      return FALLBACK_MONGODB_URI;
    }
    return uri;
  }
  return FALLBACK_MONGODB_URI;
}

const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI);

let devMongoClient = null;
async function getDevMongoDb() {
  if (!devMongoClient) {
    devMongoClient = new MongoClient(MONGODB_URI, {
      appName: 'devrel.vercel.integration',
      maxIdleTimeMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await devMongoClient.connect();
  }
  return devMongoClient.db('highroller');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// MongoDB Local Dev Server Auth Middleware Plugin
function mongoAuthDevPlugin() {
  return {
    name: 'mongo-auth-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 1. Registration endpoint
        if (req.url === '/api/auth/register' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const { username, password, phone } = JSON.parse(body || '{}');
              const cleanUser = String(username || '').trim();
              if (!cleanUser || cleanUser.length < 3 || cleanUser.length > 30) {
                res.statusCode = 400;
                return res.end(
                  JSON.stringify({ success: false, error: 'Username must be 3-30 characters long.' })
                );
              }

              // Validate Philippine mobile number: must start with 09 and be 11 digits
              const cleanPhone = String(phone || '').trim().replace(/[-\s]/g, '');
              const phoneRegex = /^09\d{9}$/;
              if (!phoneRegex.test(cleanPhone)) {
                res.statusCode = 400;
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Mobile number must start with 09 and be exactly 11 digits (e.g. 09171234567).',
                  })
                );
              }

              const cleanPassword = String(password || '');
              if (!cleanPassword || cleanPassword.length < 6) {
                res.statusCode = 400;
                return res.end(
                  JSON.stringify({ success: false, error: 'Password must be at least 6 characters long.' })
                );
              }

              const db = await getDevMongoDb();
              const users = db.collection('users');

              const existingUser = await users.findOne({
                username: { $regex: new RegExp(`^${cleanUser}$`, 'i') },
              });
              if (existingUser) {
                res.statusCode = 409;
                return res.end(
                  JSON.stringify({ success: false, error: 'Username is already taken. Please choose another.' })
                );
              }

              const existingPhone = await users.findOne({ phone: cleanPhone });
              if (existingPhone) {
                res.statusCode = 409;
                return res.end(
                  JSON.stringify({ success: false, error: 'Mobile number is already registered. Please log in.' })
                );
              }

              const { hash, salt } = hashPassword(cleanPassword);
              const initialChips = 1000;
              const doc = {
                username: cleanUser,
                phone: cleanPhone,
                passwordHash: hash,
                salt: salt,
                chips: initialChips,
                vipTier: 'Bronze',
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              };

              const result = await users.insertOne(doc);
              res.statusCode = 201;
              return res.end(
                JSON.stringify({
                  success: true,
                  message: 'Registration successful! Welcome to Luxe Highroller Casino.',
                  user: {
                    id: result.insertedId.toString(),
                    username: cleanUser,
                    phone: cleanPhone,
                    chips: initialChips,
                    vipTier: 'Bronze',
                    createdAt: doc.createdAt,
                  },
                })
              );
            } catch (err) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 2. Login endpoint
        if (req.url === '/api/auth/login' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const { identifier, password } = JSON.parse(body || '{}');
              const cleanId = String(identifier || '').trim();
              const cleanPassword = String(password || '');

              if (!cleanId || !cleanPassword) {
                res.statusCode = 400;
                return res.end(
                  JSON.stringify({ success: false, error: 'Please enter username/mobile number and password.' })
                );
              }

              const db = await getDevMongoDb();
              const users = db.collection('users');

              const user = await users.findOne({
                $or: [
                  { username: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
                  { phone: cleanId.replace(/[-\s]/g, '') },
                ],
              });

              if (!user || !user.passwordHash || !user.salt) {
                res.statusCode = 401;
                return res.end(
                  JSON.stringify({ success: false, error: 'Invalid username, mobile number, or password.' })
                );
              }

              const isValid = verifyPassword(cleanPassword, user.passwordHash, user.salt);
              if (!isValid) {
                res.statusCode = 401;
                return res.end(
                  JSON.stringify({ success: false, error: 'Invalid username, mobile number, or password.' })
                );
              }

              await users.updateOne(
                { _id: user._id },
                { $set: { lastLoginAt: new Date().toISOString() } }
              );

              return res.end(
                JSON.stringify({
                  success: true,
                  message: `Welcome back, ${user.username}!`,
                  user: {
                    id: user._id.toString(),
                    username: user.username,
                    phone: user.phone,
                    chips: typeof user.chips === 'number' ? user.chips : Number(user.chips) || 0,
                    vipTier: user.vipTier || 'Bronze',
                    createdAt: user.createdAt,
                  },
                })
              );
            } catch (err) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 3. Update chips endpoint
        if (req.url === '/api/auth/update-chips' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const { userId, chips } = JSON.parse(body || '{}');
              if (!userId || typeof chips !== 'number') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Missing userId or chips' }));
              }
              const db = await getDevMongoDb();
              const users = db.collection('users');
              let query;
              try {
                query = { _id: new ObjectId(userId) };
              } catch (_) {
                query = { _id: userId };
              }
              await users.updateOne(query, {
                $set: {
                  chips: Math.max(0, Math.round(chips * 100) / 100),
                  updatedAt: new Date().toISOString(),
                },
              });
              return res.end(JSON.stringify({ success: true, chips }));
            } catch (err) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

const AUTH_HEADER =
  'Basic c2tfbGl2ZV9EVU41YlczcGFSdzU0VWpoWGZDSGRkVGs6cGtfbGl2ZV9QdHoxZGsySDJVSlFNSjN6TVFEdjF3N1U=';

// PayMongo local dev server middleware plugin
function paymongoDevPlugin() {
  return {
    name: 'paymongo-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // PayMongo QRPH Dynamic QR generator
        if (req.url === '/api/paymongo/generate-qr' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { amount } = JSON.parse(body || '{}');
              const parsedAmount = Math.max(1, Number(amount) || 1);
              const transactionAmountCentavos = Math.round(parsedAmount * 100);

              // 1. Create Payment Intent
              const piRes = await fetch('https://api.paymongo.com/v1/payment_intents', {
                method: 'POST',
                headers: {
                  accept: 'application/json',
                  authorization: AUTH_HEADER,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    attributes: {
                      amount: transactionAmountCentavos,
                      payment_method_allowed: ['qrph'],
                      currency: 'PHP',
                      description: `Luxe Casino ₱${parsedAmount} Deposit`,
                    },
                  },
                }),
              });
              const piJson = await piRes.json();
              const paymentIntentId = piJson.data?.id;

              // 2. Create Payment Method (type: qrph)
              const pmRes = await fetch('https://api.paymongo.com/v1/payment_methods', {
                method: 'POST',
                headers: {
                  accept: 'application/json',
                  authorization: AUTH_HEADER,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  data: {
                    attributes: {
                      type: 'qrph',
                      expiry_seconds: 1800,
                    },
                  },
                }),
              });
              const pmJson = await pmRes.json();
              const paymentMethodId = pmJson.data?.id;

              // 3. Attach PM to PI
              const attachRes = await fetch(
                `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`,
                {
                  method: 'POST',
                  headers: {
                    accept: 'application/json',
                    authorization: AUTH_HEADER,
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    data: {
                      attributes: {
                        payment_method: paymentMethodId,
                        return_url: 'https://ais-pre-s3pzzlwmbzrragxoavt7y6-173837153115.asia-southeast1.run.app/Wallet/buyTokens',
                      },
                    },
                  }),
                }
              );

              const attachJson = await attachRes.json();
              const nextAction = attachJson.data?.attributes?.next_action;
              const qrImage = nextAction?.code?.image_url;
              const qrId = nextAction?.code?.id;

              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  data: {
                    id: qrId || paymentIntentId,
                    payment_intent_id: paymentIntentId,
                    payment_method_id: paymentMethodId,
                    status: attachJson.data?.attributes?.status || 'awaiting_next_action',
                    transaction_amount: transactionAmountCentavos,
                    amount: parsedAmount,
                    currency: 'PHP',
                    merchant_name: 'LUXE CASINO',
                    qr_image: qrImage,
                    qr_string: nextAction?.code?.qr_string,
                    created_at: Math.floor(Date.now() / 1000),
                  },
                })
              );
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // PayMongo Payment status checker
        if (req.url.startsWith('/api/paymongo/check-payment') && req.method === 'GET') {
          try {
            const url = new URL(req.url, 'http://localhost:3000');
            const paymentIntentId = url.searchParams.get('paymentIntentId');
            const qrId = url.searchParams.get('qrId');

            if (paymentIntentId && paymentIntentId.startsWith('pi_')) {
              const piRes = await fetch(
                `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
                {
                  method: 'GET',
                  headers: {
                    accept: 'application/json',
                    authorization: AUTH_HEADER,
                  },
                }
              );

              if (piRes.ok) {
                const piJson = await piRes.json();
                const attrs = piJson.data?.attributes || {};
                if (attrs.status === 'succeeded') {
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(
                    JSON.stringify({
                      paid: true,
                      paymentIntentId,
                      paymentId: attrs.payments?.[0]?.id || paymentIntentId,
                      amount: attrs.amount / 100,
                      currency: attrs.currency,
                      status: 'succeeded',
                    })
                  );
                }
              }
            }

            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ paid: false, status: 'listening' }));
          } catch (err) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ paid: false, status: 'error', message: err.message }));
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/)) return null;
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    react(),
    paymongoDevPlugin(),
    mongoAuthDevPlugin(),
  ],
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});
