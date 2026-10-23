import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    try {
      const client = await clientPromise;
      const db = client.db('highroller');
      const configCollection = db.collection('casino_config');

      const doc = await configCollection.findOne({ _id: 'winrates' });
      if (doc) {
        return res.status(200).json({
          success: true,
          config: {
            slotsWinRate: doc.slotsWinRate ?? 32,
            blackjackWinRate: doc.blackjackWinRate ?? 38,
            rouletteWinRate: doc.rouletteWinRate ?? 36,
            pokerWinRate: doc.pokerWinRate ?? 35,
            updatedAt: doc.updatedAt,
            updatedBy: doc.updatedBy,
          },
        });
      }

      return res.status(200).json({
        success: true,
        config: {
          slotsWinRate: 32,
          blackjackWinRate: 38,
          rouletteWinRate: 36,
          pokerWinRate: 35,
        },
      });
    } catch (err) {
      console.error('MongoDB get config error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { slotsWinRate, blackjackWinRate, rouletteWinRate, pokerWinRate, updatedBy } = req.body || {};

      const cleanSlots = Math.max(1, Math.min(100, Number(slotsWinRate) || 50));
      const cleanBJ = Math.max(1, Math.min(100, Number(blackjackWinRate) || 50));
      const cleanRoulette = Math.max(1, Math.min(100, Number(rouletteWinRate) || 50));
      const cleanPoker = Math.max(1, Math.min(100, Number(pokerWinRate) || 50));

      const payload = {
        _id: 'winrates',
        slotsWinRate: cleanSlots,
        blackjackWinRate: cleanBJ,
        rouletteWinRate: cleanRoulette,
        pokerWinRate: cleanPoker,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || 'patcherx500@gmail.com',
      };

      const client = await clientPromise;
      const db = client.db('highroller');
      const configCollection = db.collection('casino_config');

      await configCollection.updateOne(
        { _id: 'winrates' },
        { $set: payload },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Casino win rates synced to MongoDB successfully',
        config: payload,
      });
    } catch (err) {
      console.error('MongoDB post config error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
