export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body?.data?.attributes;
    const eventType = event?.type;
    console.log('Received PayMongo webhook event on Vercel:', eventType);
    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(200).json({ received: false });
  }
}
