import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

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
                    merchant_name: 'HOTFASTPH',
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
