const AUTH_HEADER =
  process.env.PAYMONGO_AUTH_HEADER ||
  'Basic c2tfbGl2ZV9EVU41YlczcGFSdzU0VWpoWGZDSGRkVGs6cGtfbGl2ZV9QdHoxZGsySDJVSlFNSjN6TVFEdjF3N1U=';

export default async function handler(req, res) {
  try {
    const { paymentIntentId } = req.query;

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
          return res.status(200).json({
            paid: true,
            paymentIntentId,
            paymentId: attrs.payments?.[0]?.id || paymentIntentId,
            amount: attrs.amount / 100,
            currency: attrs.currency,
            status: 'succeeded',
          });
        }
      }
    }

    return res.status(200).json({ paid: false, status: 'listening' });
  } catch (err) {
    return res.status(200).json({ paid: false, status: 'error', message: err.message });
  }
}
