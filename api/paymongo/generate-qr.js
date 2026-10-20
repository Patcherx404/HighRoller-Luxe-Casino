const AUTH_HEADER =
  process.env.PAYMONGO_AUTH_HEADER ||
  'Basic c2tfbGl2ZV9EVU41YlczcGFSdzU0VWpoWGZDSGRkVGs6cGtfbGl2ZV9QdHoxZGsySDJVSlFNSjN6TVFEdjF3N1U=';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount } = req.body || {};
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

    if (!paymentIntentId) {
      return res.status(400).json(piJson);
    }

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

    if (!paymentMethodId) {
      return res.status(400).json(pmJson);
    }

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
              return_url: req.headers.origin || 'https://vercel.app',
            },
          },
        }),
      }
    );

    const attachJson = await attachRes.json();
    const nextAction = attachJson.data?.attributes?.next_action;
    const qrImage = nextAction?.code?.image_url;
    const qrId = nextAction?.code?.id;

    return res.status(200).json({
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
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
