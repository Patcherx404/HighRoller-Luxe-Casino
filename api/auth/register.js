import crypto from 'crypto';
import clientPromise from '../lib/mongodb.js';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, password, phone } = req.body || {};

    // 1. Validate Username
    const cleanUser = String(username || '').trim();
    if (!cleanUser || cleanUser.length < 3 || cleanUser.length > 30) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 3 and 30 characters long.',
      });
    }

    // 2. Validate Phone Number (must start with 09 and be exactly 11 digits)
    const cleanPhone = String(phone || '').trim().replace(/[-\s]/g, '');
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number must start with 09 and be exactly 11 digits (e.g. 09171234567).',
      });
    }

    // 3. Validate Password
    const cleanPassword = String(password || '');
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    const client = await clientPromise;
    const db = client.db('highroller');
    const usersCollection = db.collection('users');

    // 4. Check if Username already exists
    const existingUser = await usersCollection.findOne({
      username: { $regex: new RegExp(`^${cleanUser}$`, 'i') },
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username is already taken. Please choose another username.',
      });
    }

    // 5. Check if Phone Number already exists
    const existingPhone = await usersCollection.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        error: 'Mobile number is already registered. Please log in instead.',
      });
    }

    // 6. Hash Password and Create User
    const { hash, salt } = hashPassword(cleanPassword);
    const initialChips = 1000; // ₱1,000 Welcome Bonus Chips

    const newUserDoc = {
      username: cleanUser,
      phone: cleanPhone,
      passwordHash: hash,
      salt: salt,
      chips: initialChips,
      vipTier: 'Bronze',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const insertResult = await usersCollection.insertOne(newUserDoc);

    const safeUser = {
      id: insertResult.insertedId.toString(),
      username: cleanUser,
      phone: cleanPhone,
      chips: initialChips,
      vipTier: 'Bronze',
      createdAt: newUserDoc.createdAt,
    };

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Luxe Highroller Casino.',
      user: safeUser,
    });
  } catch (err) {
    console.error('Registration API Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during registration.',
    });
  }
}
