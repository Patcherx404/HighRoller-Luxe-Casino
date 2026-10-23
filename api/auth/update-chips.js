import { ObjectId } from 'mongodb';
import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId, chips, hasDeposited, depositCount } = req.body || {};
    if (!userId || typeof chips !== 'number') {
      return res.status(400).json({ success: false, error: 'Missing userId or chips amount' });
    }

    const client = await clientPromise;
    const db = client.db('highroller');
    const usersCollection = db.collection('users');

    let query;
    try {
      query = { _id: new ObjectId(userId) };
    } catch (_) {
      query = { _id: userId };
    }

    const setPayload = {
      chips: Math.max(0, Math.round(chips * 100) / 100),
      updatedAt: new Date().toISOString(),
    };
    if (typeof hasDeposited === 'boolean') {
      setPayload.hasDeposited = hasDeposited;
    }
    if (typeof depositCount === 'number') {
      setPayload.depositCount = depositCount;
    }

    const result = await usersCollection.updateOne(
      query,
      {
        $set: setPayload,
      }
    );

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
      chips: chips,
    });
  } catch (err) {
    console.error('Update chips error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
