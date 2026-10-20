const express = require('express');

const AUTH_HEADER =
  'Basic c2tfbGl2ZV9EVU41YlczcGFSdzU0VWpoWGZDSGRkVGs6cGtfbGl2ZV9QdHoxZGsySDJVSlFNSjN6TVFEdjF3N1U=';

// In-memory cache of verified paid QRs and active payment intents
const paidSessions = new Map();
const recentPaidPayments = [];

function recordPaidPayment(key, paymentInfo) {
  if (key) {
    paidSessions.set(key.toLowerCase(), paymentInfo);
    paidSessions.set(key, paymentInfo);
  }
  recentPaidPayments.unshift(paymentInfo);
  if (recentPaidPayments.length > 50) recentPaidPayments.pop();
}

module.exports = function (app) {
  app.use(express.json());

  // PayMongo QRPH Payment Intent + Payment Method generator
  app.post('/api/paymongo/generate-qr', async (req, res) => {
    try {
      const { amount } = req.body;
      const parsedAmount = Math.max(1, Number(amount) || 1);
      // PayMongo transaction_amount in centavos (e.g. ₱1 -> 100, ₱100 -> 10000)
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

      if (!paymentIntentId) {
        throw new Error(piJson.errors?.[0]?.detail || 'Failed to create payment intent');
      }

      // 2. Create Payment Method (type: qrph) using the user's exact specification
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

      if (!paymentMethodId) {
        throw new Error(pmJson.errors?.[0]?.detail || 'Failed to create payment method');
      }

      // 3. Attach Payment Method to Payment Intent to generate QRPH image
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
                return_url:
                  'https://ais-pre-s3pzzlwmbzrragxoavt7y6-173837153115.asia-southeast1.run.app/Wallet/buyTokens',
              },
            },
          }),
        }
      );

      const attachJson = await attachRes.json();
      const nextAction = attachJson.data?.attributes?.next_action;
      const qrImage = nextAction?.code?.image_url;
      const qrId = nextAction?.code?.id;

      if (qrImage) {
        return res.json({
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
            created_at: attachJson.data?.attributes?.created_at || Math.floor(Date.now() / 1000),
          },
        });
      }

      // Fallback to /v3/qr/mpm/generate if attach did not return image_url
      const fallbackRes = await fetch('https://api.paymongo.com/v3/qr/mpm/generate', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: AUTH_HEADER,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          nation: 'ph',
          mode: 'p2p',
          type: 'dynamic',
          transaction_currency: 'PHP',
          transaction_amount: transactionAmountCentavos,
          expiry_seconds: 1800,
          qr_image: true,
        }),
      });

      const fallbackJson = await fallbackRes.json();
      return res.json(fallbackJson);
    } catch (err) {
      console.error('PayMongo generate-qr proxy error:', err);
      return res.status(500).json({
        error: err.message || 'Failed to communicate with PayMongo API',
      });
    }
  });

  // Automated Real-Time Payment Detection Polling Route
  app.get('/api/paymongo/check-payment', async (req, res) => {
    try {
      const { paymentIntentId, qrId, expectedAmount, createdAfter } = req.query;

      // 1. Direct Payment Intent status check (official & deterministic)
      if (paymentIntentId) {
        try {
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
              const paidInfo = {
                paid: true,
                paymentIntentId,
                paymentId: attrs.payments?.[0]?.id || paymentIntentId,
                amount: attrs.amount / 100,
                currency: attrs.currency,
                status: 'succeeded',
                paidAt: attrs.updated_at || Math.floor(Date.now() / 1000),
              };
              recordPaidPayment(paymentIntentId, paidInfo);
              if (qrId) recordPaidPayment(qrId, paidInfo);
              return res.json(paidInfo);
            }
          }
        } catch (piErr) {
          console.warn('Payment Intent status query warning:', piErr);
        }
      }

      const cleanQrId = qrId ? String(qrId).trim().toLowerCase() : '';

      // 2. Check in-memory webhook cache
      if (paymentIntentId && paidSessions.has(paymentIntentId.toLowerCase())) {
        return res.json(paidSessions.get(paymentIntentId.toLowerCase()));
      }
      if (cleanQrId && paidSessions.has(cleanQrId)) {
        return res.json(paidSessions.get(cleanQrId));
      }

      const expectedCentavos = expectedAmount ? Math.round(Number(expectedAmount) * 100) : null;
      const minCreatedAt = createdAfter ? Number(createdAfter) : 0;

      // 3. Query latest payments from PayMongo API live
      const paymentsRes = await fetch('https://api.paymongo.com/v1/payments?limit=20', {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: AUTH_HEADER,
        },
      });

      if (!paymentsRes.ok) {
        return res.json({ paid: false, status: 'listening' });
      }

      const paymentsJson = await paymentsRes.json();
      const payments = paymentsJson.data || [];

      for (const p of payments) {
        const attrs = p.attributes || {};
        if (attrs.status === 'paid') {
          const providerCodeId = (attrs.source?.provider?.code_id || '').toLowerCase();
          const description = (attrs.description || '').toLowerCase();
          const pPaymentIntentId = (attrs.payment_intent_id || '').toLowerCase();
          const pCreatedAt = attrs.paid_at || attrs.created_at || 0;
          const pCentavos = attrs.amount || 0;

          const isIntentMatch =
            Boolean(paymentIntentId && pPaymentIntentId && pPaymentIntentId === paymentIntentId.toLowerCase());

          const isDirectMatch =
            Boolean(cleanQrId && (providerCodeId === cleanQrId || description.includes(cleanQrId)));

          if (isIntentMatch || isDirectMatch) {
            const paidInfo = {
              paid: true,
              paymentId: p.id,
              paymentIntentId: attrs.payment_intent_id || paymentIntentId,
              qrId: cleanQrId,
              amount: pCentavos / 100,
              amountCentavos: pCentavos,
              currency: attrs.currency,
              paidAt: pCreatedAt,
              description: attrs.description,
            };
            if (paymentIntentId) recordPaidPayment(paymentIntentId, paidInfo);
            if (cleanQrId) recordPaidPayment(cleanQrId, paidInfo);
            return res.json(paidInfo);
          }
        }
      }

      return res.json({ paid: false, status: 'listening' });
    } catch (err) {
      console.error('PayMongo check-payment proxy error:', err);
      return res.json({ paid: false, status: 'error', message: err.message });
    }
  });

  // Webhook listener for PayMongo real-time events (payment.paid / qr.paid)
  app.post('/api/paymongo/webhook', (req, res) => {
    try {
      const event = req.body?.data?.attributes;
      const eventType = event?.type;
      const eventData = event?.data;

      if (eventType === 'payment.paid' || eventType === 'qr.paid') {
        const attrs = eventData?.attributes || {};
        const paymentIntentId = attrs.payment_intent_id || '';
        const qrId =
          attrs.source?.provider?.code_id ||
          eventData?.id ||
          '';
        const description = attrs.description || '';
        const pCentavos = attrs.amount || 0;

        const paidInfo = {
          paid: true,
          paymentId: eventData?.id,
          paymentIntentId,
          qrId,
          amount: pCentavos / 100,
          amountCentavos: pCentavos,
          currency: attrs.currency || 'PHP',
          paidAt: attrs.paid_at || attrs.created_at || Math.floor(Date.now() / 1000),
          description,
        };

        if (paymentIntentId) recordPaidPayment(paymentIntentId, paidInfo);
        if (qrId) recordPaidPayment(qrId, paidInfo);
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('PayMongo webhook handler error:', err);
      return res.status(200).json({ received: false });
    }
  });
};
