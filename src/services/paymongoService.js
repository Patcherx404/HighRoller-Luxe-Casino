// PayMongo Service for Dynamic QRPH (GCash, Maya, ShopeePay & PH Banks)

const PAYMONGO_AUTH_HEADER =
  'Basic c2tfbGl2ZV9EVU41YlczcGFSdzU0VWpoWGZDSGRkVGs6cGtfbGl2ZV9QdHoxZGsySDJVSlFNSjN6TVFEdjF3N1U=';

/**
 * Generates a dynamic Philippine QRPH QR code for payment
 * @param {number} amountInPHP - Amount in Philippine Peso (e.g. 1, 50, 100, 500, 1000)
 */
export async function generatePayMongoQR(amountInPHP) {
  const parsedAmount = Math.max(1, Number(amountInPHP) || 1);
  const transactionAmountCentavos = Math.round(parsedAmount * 100);
  const createdAtSec = Math.floor(Date.now() / 1000);

  // 1. Try server-side proxy route first (/api/paymongo/generate-qr)
  try {
    const proxyRes = await fetch('/api/paymongo/generate-qr', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ amount: parsedAmount }),
    });

    if (proxyRes.ok) {
      const json = await proxyRes.json();
      const rawData = json.data?.attributes || json.data || {};
      return {
        success: true,
        id: json.data?.id || 'qr_' + Date.now(),
        paymentIntentId: json.data?.payment_intent_id || json.data?.id,
        qrImage: rawData.qr_image || json.data?.qr_image,
        qrString: rawData.qr_string || json.data?.qr_string,
        merchantName: 'LUXE CASINO',
        amount: parsedAmount,
        currency: 'PHP',
        createdAt: createdAtSec,
        expiresAt: rawData.expires_at || json.data?.expires_at,
      };
    }
  } catch (proxyErr) {
    console.warn('Proxy route error, attempting direct API:', proxyErr);
  }

  // 2. Direct fallback using Payment Intent + Payment Method (qrph)
  try {
    // 2a. Create Payment Intent
    const piRes = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: PAYMONGO_AUTH_HEADER,
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

    const piData = await piRes.json();
    const piId = piData.data?.id;

    if (piId) {
      // 2b. Create Payment Method (type: qrph)
      const pmRes = await fetch('https://api.paymongo.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: PAYMONGO_AUTH_HEADER,
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

      const pmData = await pmRes.json();
      const pmId = pmData.data?.id;

      if (pmId) {
        // 2c. Attach Payment Method to Payment Intent
        const attachRes = await fetch(
          `https://api.paymongo.com/v1/payment_intents/${piId}/attach`,
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              authorization: PAYMONGO_AUTH_HEADER,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  payment_method: pmId,
                  return_url:
                    'https://ais-pre-s3pzzlwmbzrragxoavt7y6-173837153115.asia-southeast1.run.app/Wallet/buyTokens',
                },
              },
            }),
          }
        );

        const attachData = await attachRes.json();
        const nextAction = attachData.data?.attributes?.next_action;
        const qrImage = nextAction?.code?.image_url;
        if (qrImage) {
          return {
            success: true,
            id: nextAction?.code?.id || piId,
            paymentIntentId: piId,
            qrImage,
            qrString: nextAction?.code?.qr_string,
            merchantName: 'LUXE CASINO',
            amount: parsedAmount,
            currency: 'PHP',
            createdAt: createdAtSec,
            expiresAt: createdAtSec + 1800,
          };
        }
      }
    }
  } catch (directErr) {
    console.error('Direct Payment Intent creation error:', directErr);
  }

  // 3. Fallback to /v3/qr/mpm/generate
  try {
    const directRes = await fetch('https://api.paymongo.com/v3/qr/mpm/generate', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: PAYMONGO_AUTH_HEADER,
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

    const json = await directRes.json();
    const rawData = json.data?.attributes || json.data || {};
    return {
      success: true,
      id: json.data?.id || 'qr_' + Date.now(),
      paymentIntentId: json.data?.id,
      qrImage: rawData.qr_image || json.data?.qr_image,
      qrString: rawData.qr_string || json.data?.qr_string,
      merchantName: 'LUXE CASINO',
      amount: parsedAmount,
      currency: 'PHP',
      createdAt: createdAtSec,
      expiresAt: rawData.expires_at || json.data?.expires_at,
    };
  } catch (mpmErr) {
    console.error('PayMongo direct MPM error:', mpmErr);
    throw mpmErr;
  }
}

/**
 * Automatically checks if the payment has succeeded
 */
export async function checkPayMongoPaymentStatus({
  qrId,
  paymentIntentId,
  createdAt,
  expectedAmount,
}) {
  const cleanQr = String(qrId || '').trim();
  const cleanPi = String(paymentIntentId || '').trim();

  // 1. Try server-side proxy checker first
  try {
    const params = new URLSearchParams({
      paymentIntentId: cleanPi,
      qrId: cleanQr,
      createdAfter: String(createdAt || 0),
      expectedAmount: String(expectedAmount || 0),
    });

    const res = await fetch(`/api/paymongo/check-payment?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.paid) {
        return {
          paid: true,
          amount: data.amount || expectedAmount,
          paymentId: data.paymentId || data.paymentIntentId || cleanPi,
        };
      }
    }
  } catch (err) {
    // ignore proxy fetch error, fall through to direct check
  }

  // 2. Direct Payment Intent check
  if (cleanPi && cleanPi.startsWith('pi_')) {
    try {
      const piRes = await fetch(`https://api.paymongo.com/v1/payment_intents/${cleanPi}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: PAYMONGO_AUTH_HEADER,
        },
      });

      if (piRes.ok) {
        const piJson = await piRes.json();
        const attrs = piJson.data?.attributes || {};
        if (attrs.status === 'succeeded') {
          return {
            paid: true,
            amount: attrs.amount / 100,
            paymentId: attrs.payments?.[0]?.id || cleanPi,
          };
        }
      }
    } catch (directPiErr) {
      // ignore
    }
  }

  // 3. Fallback to /v1/payments check
  try {
    const directRes = await fetch('https://api.paymongo.com/v1/payments?limit=20', {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: PAYMONGO_AUTH_HEADER,
      },
    });

    if (directRes.ok) {
      const json = await directRes.json();
      const payments = json.data || [];
      const expectedCentavos = expectedAmount ? Math.round(Number(expectedAmount) * 100) : null;
      const minCreatedAt = createdAt ? Number(createdAt) : 0;

      for (const p of payments) {
        const attrs = p.attributes || {};
        if (attrs.status === 'paid') {
          const providerCodeId = (attrs.source?.provider?.code_id || '').toLowerCase();
          const description = (attrs.description || '').toLowerCase();
          const pPaymentIntentId = (attrs.payment_intent_id || '').toLowerCase();
          const pCreatedAt = attrs.paid_at || attrs.created_at || 0;
          const pCentavos = attrs.amount || 0;

          const isIntentMatch =
            Boolean(cleanPi && pPaymentIntentId && pPaymentIntentId === cleanPi.toLowerCase());

          const isDirectMatch =
            Boolean(
              cleanQr &&
                (providerCodeId === cleanQr.toLowerCase() ||
                  description.includes(cleanQr.toLowerCase()))
            );

          if (isIntentMatch || isDirectMatch) {
            return {
              paid: true,
              amount: pCentavos / 100,
              paymentId: p.id,
            };
          }
        }
      }
    }
  } catch (directErr) {
    // ignore
  }

  return { paid: false };
}
