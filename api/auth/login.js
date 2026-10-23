import crypto from 'crypto';
import clientPromise from '../lib/mongodb.js';

function verifyPassword(password, hash, salt) {
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verify;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { identifier, password } = req.body || {};

    const cleanId = String(identifier || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanId || !cleanPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your username/mobile number and password.',
      });
    }

    const client = await clientPromise;
    const db = client.db('highroller');
    const usersCollection = db.collection('users');

    // Search by username (case-insensitive) OR by exact phone number
    const user = await usersCollection.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { phone: cleanId.replace(/[-\s]/g, '') },
      ],
    });

    if (!user || !user.passwordHash || !user.salt) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username, mobile number, or password.',
      });
    }

    const isValid = verifyPassword(cleanPassword, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username, mobile number, or password.',
      });
    }

    // Update lastLoginAt
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date().toISOString() } }
    );

    const hasDeposited = Boolean(user.hasDeposited);
    const depositCount = Number(user.depositCount) || (hasDeposited ? 1 : 0);

    const safeUser = {
      id: user._id.toString(),
      username: user.username,
      phone: user.phone,
      chips: typeof user.chips === 'number' ? user.chips : Number(user.chips) || 0,
      hasDeposited: hasDeposited,
      depositCount: depositCount,
      firstDepositBonusEligible: !hasDeposited,
      vipTier: user.vipTier || 'Bronze',
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.username}!`,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login API Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during login.',
    });
  }
}
