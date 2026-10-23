import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  db,
  signInWithGoogle,
  logOut as firebaseSignOut,
  OperationType,
  handleFirestoreError
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';

const CasinoContext = createContext();

const PUBLIC_DEMO_CHIPS = 10000;

export const useFirebaseCasino = () => {
  const context = useContext(CasinoContext);
  if (!context) {
    throw new Error('useFirebaseCasino must be used within a FirebaseCasinoProvider');
  }
  return context;
};

// Global set of processed payment/deposit IDs to prevent any duplicate crediting
const processedDepositIds = new Set();
try {
  const saved = JSON.parse(localStorage.getItem('casino_processed_deposits') || '[]');
  if (Array.isArray(saved)) {
    saved.forEach((id) => processedDepositIds.add(String(id)));
  }
} catch (e) {
  // ignore
}

function markDepositProcessed(id) {
  if (!id) return;
  processedDepositIds.add(String(id));
  try {
    localStorage.setItem(
      'casino_processed_deposits',
      JSON.stringify([...processedDepositIds].slice(-100))
    );
  } catch (e) {
    // ignore
  }
}

export const FirebaseCasinoProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // MongoDB User Session (Registered with Username, 09 Phone, and Password)
  const [mongoUser, setMongoUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mongo_casino_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed) {
        const hasDep = Boolean(parsed.hasDeposited || (Number(parsed.depositCount) > 0) || parsed.firstDepositBonusEligible === false);
        parsed.hasDeposited = hasDep;
        parsed.depositCount = Number(parsed.depositCount) || (hasDep ? 1 : 0);
        parsed.firstDepositBonusEligible = !hasDep;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Initialize chips: If MongoDB user is logged in, use their balance; otherwise public demo chips
  const [chips, setChips] = useState(() => {
    try {
      const savedMongo = localStorage.getItem('mongo_casino_user');
      if (savedMongo) {
        const parsed = JSON.parse(savedMongo);
        if (typeof parsed?.chips === 'number') return parsed.chips;
      }
      const saved = localStorage.getItem('casino_public_demo_balance');
      return saved ? Number(saved) : PUBLIC_DEMO_CHIPS;
    } catch {
      return PUBLIC_DEMO_CHIPS;
    }
  });

  const [firebaseHasDeposited, setFirebaseHasDeposited] = useState(false);
  const [guestHasDeposited, setGuestHasDeposited] = useState(() => {
    try {
      const val = localStorage.getItem('casino_guest_has_deposited') === 'true';
      const count = Number(localStorage.getItem('casino_guest_deposit_count')) || 0;
      return val || count > 0;
    } catch {
      return false;
    }
  });

  // User requirement: 2X bonus ONLY appears and applies on the VERY FIRST deposit.
  // If user has deposited even once (second deposit onward), no more bonus!
  const isFirstDepositEligible = Boolean(
    mongoUser
      ? (!mongoUser.hasDeposited && (Number(mongoUser.depositCount) || 0) === 0 && mongoUser.firstDepositBonusEligible !== false)
      : firebaseUser
      ? (!firebaseHasDeposited)
      : (!guestHasDeposited)
  );

  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    vipTier: 'Bronze',
    totalWon: 0,
    totalLost: 0,
    gamesPlayed: 0,
    biggestWin: 0,
  });

  const ADMIN_EMAIL = 'patcherx500@gmail.com';
  const isAdmin = Boolean(
    (firebaseUser?.email && firebaseUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) ||
    (mongoUser?.username && mongoUser.username.trim().toLowerCase() === 'admin') ||
    (mongoUser?.phone === '09171234567')
  );

  const [casinoConfig, setCasinoConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('casino_global_winrates');
      return saved
        ? JSON.parse(saved)
        : {
            slotsWinRate: 32,
            blackjackWinRate: 38,
            rouletteWinRate: 36,
            pokerWinRate: 35,
          };
    } catch {
      return {
        slotsWinRate: 32,
        blackjackWinRate: 38,
        rouletteWinRate: 36,
        pokerWinRate: 35,
      };
    }
  });

  // Calculate VIP Tier dynamically
  const calculateVip = (currentChips, won) => {
    const score = currentChips + won;
    if (score >= 1000000) return 'Diamond High Roller';
    if (score >= 250000) return 'Platinum';
    if (score >= 75000) return 'Gold';
    if (score >= 20000) return 'Silver';
    return 'Bronze';
  };

  // Total Real Money Deposits and 40% Synced Cosmic Progressive Jackpot
  const [totalRealDeposits, setTotalRealDeposits] = useState(0);
  const [cosmicJackpot, setCosmicJackpot] = useState(0);

  // Sync Total Real Money Deposits from Users & 40% Cosmic Progressive Jackpot
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'real_deposits'),
      (snapshot) => {
        let total = 0;
        snapshot.forEach((d) => {
          total += Number(d.data().amount) || 0;
        });
        setTotalRealDeposits(total);
        // User Requirement: Exact 40% of Total Deposits from Users (e.g. 120 total deposits -> 40% of 120 = 48)
        const computedJackpot = Math.round(total * 0.40 * 100) / 100;
        setCosmicJackpot(computedJackpot);
      },
      (err) => {
        console.warn('Real deposits listener error:', err);
      }
    );
    return () => unsub();
  }, []);

  // Sync casino win rates configuration from MongoDB and Firestore
  useEffect(() => {
    // 1. Initial fetch from MongoDB casino_config collection
    fetch('/api/casino/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setCasinoConfig((prev) => ({
            ...prev,
            slotsWinRate: typeof data.config.slotsWinRate === 'number' ? data.config.slotsWinRate : prev.slotsWinRate,
            blackjackWinRate: typeof data.config.blackjackWinRate === 'number' ? data.config.blackjackWinRate : prev.blackjackWinRate,
            rouletteWinRate: typeof data.config.rouletteWinRate === 'number' ? data.config.rouletteWinRate : prev.rouletteWinRate,
            pokerWinRate: typeof data.config.pokerWinRate === 'number' ? data.config.pokerWinRate : prev.pokerWinRate,
          }));
        }
      })
      .catch((err) => {
        console.warn('MongoDB initial config fetch error:', err);
      });

    // 2. Real-time listener from Cloud Firestore
    const configRef = doc(db, 'casino_config', 'winrates');
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCasinoConfig({
            slotsWinRate: typeof data.slotsWinRate === 'number' ? data.slotsWinRate : 32,
            blackjackWinRate: typeof data.blackjackWinRate === 'number' ? data.blackjackWinRate : 38,
            rouletteWinRate: typeof data.rouletteWinRate === 'number' ? data.rouletteWinRate : 36,
            pokerWinRate: typeof data.pokerWinRate === 'number' ? data.pokerWinRate : 35,
          });
          try {
            localStorage.setItem('casino_global_winrates', JSON.stringify(data));
          } catch (e) {}
        }
      },
      (err) => {
        console.warn('Config snapshot listener:', err);
      }
    );
    return () => unsub();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    let unsubUserDoc = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);

      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (user) {
        // User is LOGGED IN: Sync exclusively with their private user document in Firestore
        const userRef = doc(db, 'users', user.uid);
        unsubUserDoc = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              // Sync strictly to the authenticated user's private balance (defaults to 0)
              const userBalance = typeof data.chips === 'number' ? data.chips : (Number(data.chips) || 0);
              setChips(userBalance);
              const userHasDeposited = Boolean(
                data.hasDeposited ||
                (Number(data.depositCount) > 0) ||
                data.firstDepositBonusUsed === true ||
                data.firstDepositBonusEligible === false
              );
              setFirebaseHasDeposited(userHasDeposited);
              setStats({
                vipTier: data.vipTier || 'Bronze',
                totalWon: Number(data.totalWon) || 0,
                totalLost: Number(data.totalLost) || 0,
                gamesPlayed: Number(data.gamesPlayed) || 0,
                biggestWin: Number(data.biggestWin) || 0,
              });
            } else {
              // Create user record in Firestore if not present - starts with 0 balance
              // User requirement: First time registered user needs to deposit first to receive 2X bonus
              const initialData = {
                id: user.uid,
                email: user.email || '',
                username: user.displayName || user.email?.split('@')[0] || 'High Roller',
                avatar: user.photoURL || '👑',
                chips: 0,
                hasDeposited: false,
                depositCount: 0,
                firstDepositBonusEligible: true,
                vipTier: 'Bronze',
                totalWon: 0,
                totalLost: 0,
                gamesPlayed: 0,
                biggestWin: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setFirebaseHasDeposited(false);
              setDoc(userRef, initialData).catch((err) =>
                handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`)
              );
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          }
        );
      } else {
        // User is LOGGED OUT (Public mode):
        // Private balance remains secured in user's Firestore doc, never exposed in public
        try {
          const guestSaved = localStorage.getItem('casino_public_demo_balance');
          setChips(guestSaved ? Number(guestSaved) : PUBLIC_DEMO_CHIPS);
        } catch {
          setChips(PUBLIC_DEMO_CHIPS);
        }
        setStats({
          vipTier: 'Bronze',
          totalWon: 0,
          totalLost: 0,
          gamesPlayed: 0,
          biggestWin: 0,
        });
        setTransactions([]);
      }
    });

    return () => {
      if (unsubUserDoc) unsubUserDoc();
      unsubscribe();
    };
  }, []);

  // Save guest-only demo chips (never contains authenticated user private balance)
  useEffect(() => {
    if (!firebaseUser) {
      try {
        localStorage.setItem('casino_public_demo_balance', String(chips));
      } catch {
        // ignore
      }
    }
  }, [chips, firebaseUser]);

  // Real-time chip credit (Supports 2X First Deposit Match Bonus, idempotent by paymentId)
  const addChips = useCallback(
    async (amount, game, description, paymentId) => {
      const numAmount = Math.max(0, Number(amount) || 0);
      if (numAmount <= 0) return false;

      const isDeposit =
        typeof game === 'string' &&
        (game.toLowerCase().includes('deposit') ||
          game.toLowerCase().includes('credit') ||
          game.toLowerCase().includes('paymongo'));

      // Check if user is eligible for the First Deposit 2X Bonus (STRICTLY first deposit only!)
      let currentIsFirstDeposit = false;
      if (mongoUser) {
        currentIsFirstDeposit = Boolean(
          !mongoUser.hasDeposited &&
          (Number(mongoUser.depositCount) || 0) === 0 &&
          mongoUser.firstDepositBonusEligible !== false
        );
      } else if (firebaseUser) {
        currentIsFirstDeposit = !firebaseHasDeposited;
      } else {
        const guestDep = localStorage.getItem('casino_guest_has_deposited') === 'true';
        const guestCnt = Number(localStorage.getItem('casino_guest_deposit_count')) || 0;
        currentIsFirstDeposit = !guestHasDeposited && !guestDep && guestCnt === 0;
      }

      let creditedChips = numAmount;
      let appliedFirstDepositBonus = false;

      // User requirement: First-time registered users receive 2X bonus on their first deposit only.
      // Every subsequent deposit (second deposit onward): strictly 1:1, NO MORE BONUS!
      if (isDeposit && currentIsFirstDeposit) {
        creditedChips = numAmount * 2;
        appliedFirstDepositBonus = true;
      } else {
        creditedChips = numAmount;
        appliedFirstDepositBonus = false;
      }

      // Check idempotency for deposits
      const cleanPaymentId = paymentId ? String(paymentId) : null;
      if (cleanPaymentId && processedDepositIds.has(cleanPaymentId)) {
        console.warn('Duplicate deposit blocked:', cleanPaymentId);
        return false;
      }
      if (cleanPaymentId) {
        markDepositProcessed(cleanPaymentId);
        // Record verified real-money deposit in real_deposits ledger for admin tracking
        const depositRef = doc(db, 'real_deposits', cleanPaymentId);
        setDoc(depositRef, {
          id: cleanPaymentId,
          amount: numAmount,
          creditedChips: creditedChips,
          firstDepositBonus: appliedFirstDepositBonus,
          userId: mongoUser?.id || firebaseUser?.uid || 'guest_depositor',
          userEmail: mongoUser?.username || firebaseUser?.email || 'Guest QRPH Depositor',
          paymentId: cleanPaymentId,
          paymentMethod: 'PayMongo QRPH',
          status: 'paid',
          currency: 'PHP',
          createdAt: new Date().toISOString(),
        }, { merge: true }).catch((err) => console.warn('Could not record real_deposit:', err));
      }

      let updatedDescription = description;
      if (appliedFirstDepositBonus) {
        updatedDescription = `${description || 'Deposit'} [🎁 2X FIRST DEPOSIT BONUS: ₱${numAmount} x 2 = ₱${creditedChips} Chips Credited!]`;
      }

      setChips((prevChips) => {
        const currentChips = Number(prevChips) || 0;
        const newChips = currentChips + creditedChips;

        setStats((prevStats) => {
          const newWon = (Number(prevStats.totalWon) || 0) + (!isDeposit ? creditedChips : 0);
          const newBiggest = Math.max(Number(prevStats.biggestWin) || 0, !isDeposit ? creditedChips : 0);
          const newVip = calculateVip(newChips, newWon);

          return {
            ...prevStats,
            totalWon: newWon,
            biggestWin: newBiggest,
            vipTier: newVip,
            gamesPlayed: isDeposit ? prevStats.gamesPlayed : prevStats.gamesPlayed + 1,
          };
        });

        // If authenticated with Google, sync strictly to user's private Firestore doc
        if (firebaseUser) {
          const userUpdate = {
            chips: newChips,
            updatedAt: new Date().toISOString(),
          };
          if (isDeposit) {
            userUpdate.hasDeposited = true;
            userUpdate.depositCount = currentIsFirstDeposit ? 1 : 2;
            userUpdate.firstDepositBonusUsed = true;
            userUpdate.firstDepositBonusEligible = false;
            setFirebaseHasDeposited(true);
          }

          const userRef = doc(db, 'users', firebaseUser.uid);
          updateDoc(userRef, userUpdate).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`)
          );

          const txCollection = collection(db, 'users', firebaseUser.uid, 'transactions');
          addDoc(txCollection, {
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            userId: firebaseUser.uid,
            game,
            amount: creditedChips,
            rawAmount: numAmount,
            firstDepositBonus: appliedFirstDepositBonus,
            balanceAfter: newChips,
            description: updatedDescription,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        } else if (mongoUser) {
          // If authenticated with MongoDB, sync to MongoDB users collection
          const prevCount = Number(mongoUser.depositCount) || (mongoUser.hasDeposited ? 1 : 0);
          const newCount = isDeposit ? prevCount + 1 : prevCount;

          const mongoPayload = {
            userId: mongoUser.id,
            chips: newChips,
          };
          if (isDeposit) {
            mongoPayload.hasDeposited = true;
            mongoPayload.depositCount = newCount;
            mongoPayload.firstDepositBonusEligible = false;
          }

          fetch('/api/auth/update-chips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mongoPayload),
          }).catch((err) => console.warn('Could not sync mongo chips:', err));

          const updatedUser = {
            ...mongoUser,
            chips: newChips,
            hasDeposited: isDeposit ? true : Boolean(mongoUser.hasDeposited),
            depositCount: isDeposit ? newCount : mongoUser.depositCount,
            firstDepositBonusEligible: isDeposit ? false : Boolean(mongoUser.firstDepositBonusEligible),
          };
          setMongoUser(updatedUser);
          try {
            localStorage.setItem('mongo_casino_user', JSON.stringify(updatedUser));
          } catch (_) {}
        } else {
          // If guest, record in guest demo storage
          if (isDeposit) {
            try {
              localStorage.setItem('casino_guest_has_deposited', 'true');
              const prevCnt = Number(localStorage.getItem('casino_guest_deposit_count')) || 0;
              localStorage.setItem('casino_guest_deposit_count', String(prevCnt + 1));
            } catch (_) {}
            setGuestHasDeposited(true);
          }
          try {
            localStorage.setItem('casino_public_demo_balance', String(newChips));
          } catch (e) {}
        }

        return newChips;
      });

      const tx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        game,
        amount: creditedChips,
        rawAmount: numAmount,
        firstDepositBonus: appliedFirstDepositBonus,
        description: updatedDescription,
        timestamp: Date.now(),
      };
      setTransactions((prev) => [tx, ...prev.slice(0, 50)]);
      return { success: true, credited: creditedChips, originalAmount: numAmount, is2xBonus: appliedFirstDepositBonus };
    },
    [firebaseUser, mongoUser, firebaseHasDeposited, guestHasDeposited]
  );

  // Real-time chip debit
  const deductChips = useCallback(
    async (amount, game, description) => {
      const numAmount = Math.max(0, Number(amount) || 0);
      if (numAmount <= 0) return false;

      let success = false;

      setChips((prevChips) => {
        const currentChips = Number(prevChips) || 0;
        if (currentChips < numAmount) {
          success = false;
          return currentChips;
        }

        success = true;
        const newChips = currentChips - numAmount;
        const isWithdraw = typeof game === 'string' && game.toLowerCase().includes('withdraw');

        setStats((prevStats) => {
          const newLost = (Number(prevStats.totalLost) || 0) + (!isWithdraw ? numAmount : 0);
          const newVip = calculateVip(newChips, Number(prevStats.totalWon) || 0);

          return {
            ...prevStats,
            totalLost: newLost,
            vipTier: newVip,
            gamesPlayed: isWithdraw ? prevStats.gamesPlayed : prevStats.gamesPlayed + 1,
          };
        });

        // If authenticated with Google, sync strictly to user's private Firestore doc
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          updateDoc(userRef, {
            chips: newChips,
            updatedAt: new Date().toISOString(),
          }).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`)
          );

          const txCollection = collection(db, 'users', firebaseUser.uid, 'transactions');
          addDoc(txCollection, {
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            userId: firebaseUser.uid,
            game,
            amount: -numAmount,
            balanceAfter: newChips,
            description,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        } else if (mongoUser) {
          // If authenticated with MongoDB, sync to MongoDB users collection
          fetch('/api/auth/update-chips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: mongoUser.id, chips: newChips }),
          }).catch((err) => console.warn('Could not sync mongo chips:', err));

          const updatedUser = { ...mongoUser, chips: newChips };
          setMongoUser(updatedUser);
          try {
            localStorage.setItem('mongo_casino_user', JSON.stringify(updatedUser));
          } catch (_) {}
        } else {
          // If guest, keep in isolated guest demo storage
          try {
            localStorage.setItem('casino_public_demo_balance', String(newChips));
          } catch (e) {}
        }

        return newChips;
      });

      if (success) {
        const tx = {
          id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          game,
          amount: -numAmount,
          description,
          timestamp: Date.now(),
        };
        setTransactions((prev) => [tx, ...prev.slice(0, 50)]);
      }

      return success;
    },
    [firebaseUser]
  );

  // Manual or automatic balance correction sync
  const syncBalance = useCallback(
    async (adjustment = 0) => {
      setChips((prev) => {
        const current = Number(prev) || 0;
        const updated = Math.max(0, current + adjustment);
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          updateDoc(userRef, {
            chips: updated,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        } else {
          try {
            localStorage.setItem('casino_public_demo_balance', String(updated));
          } catch (e) {}
        }
        return updated;
      });
    },
    [firebaseUser]
  );

  // Safe Logout: Flushes final balance to user's private Firestore document,
  // then resets public screen to public demo balance (never leaves private balance in public)
  const logOut = useCallback(async () => {
    try {
      if (firebaseUser) {
        // 1. Sync latest balance to user's private document in Firestore before signing out
        const userRef = doc(db, 'users', firebaseUser.uid);
        await updateDoc(userRef, {
          chips: Number(chips) || 0,
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.warn('Sync on logout failed:', err));
      }
    } catch (e) {
      console.warn('Error during logout sync:', e);
    }

    // 2. Clear private session state and reset to public demo
    setChips(PUBLIC_DEMO_CHIPS);
    setStats({
      vipTier: 'Bronze',
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
      biggestWin: 0,
    });
    setTransactions([]);

    // 3. Clear any legacy guest keys that might hold private balances
    try {
      localStorage.removeItem('casino_guest_chips');
      localStorage.removeItem('casino_fixed_dup_5php_v1');
      localStorage.removeItem('mongo_casino_user');
    } catch (e) {}

    setMongoUser(null);

    // 4. Perform Firebase SignOut
    await firebaseSignOut();
  }, [firebaseUser, chips]);

  // MongoDB Login with Username/Phone and Password
  const loginWithMongo = useCallback(async (identifier, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed' };
      }
      setMongoUser(data.user);
      if (typeof data.user.chips === 'number') {
        setChips(data.user.chips);
      }
      localStorage.setItem('mongo_casino_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // MongoDB Registration with Username, 09 11-digit phone, and Password
  const registerWithMongo = useCallback(async (username, phone, password) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, phone, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      setMongoUser(data.user);
      if (typeof data.user.chips === 'number') {
        setChips(data.user.chips);
      }
      localStorage.setItem('mongo_casino_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Logout from MongoDB session
  const logoutMongo = useCallback(() => {
    setMongoUser(null);
    localStorage.removeItem('mongo_casino_user');
    try {
      const guestSaved = localStorage.getItem('casino_public_demo_balance');
      setChips(guestSaved ? Number(guestSaved) : PUBLIC_DEMO_CHIPS);
    } catch {
      setChips(PUBLIC_DEMO_CHIPS);
    }
  }, []);

  // Admin win rate update function (Restricted to patcherx500@gmail.com)
  const updateCasinoConfig = useCallback(
    async (newConfig) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Only patcherx500@gmail.com can adjust casino win rates.');
      }
      const payload = {
        id: 'winrates',
        slotsWinRate: Math.max(1, Math.min(100, Number(newConfig.slotsWinRate) ?? 50)),
        blackjackWinRate: Math.max(1, Math.min(100, Number(newConfig.blackjackWinRate) ?? 50)),
        rouletteWinRate: Math.max(1, Math.min(100, Number(newConfig.rouletteWinRate) ?? 50)),
        pokerWinRate: Math.max(1, Math.min(100, Number(newConfig.pokerWinRate) ?? 50)),
        updatedAt: new Date().toISOString(),
        updatedBy: firebaseUser?.email || mongoUser?.username || ADMIN_EMAIL,
      };

      // 1. Save to Cloud Firestore
      const configRef = doc(db, 'casino_config', 'winrates');
      await setDoc(configRef, payload, { merge: true });

      // 2. Sync to MongoDB Atlas (casino_config collection)
      try {
        await fetch('/api/casino/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (mongoErr) {
        console.warn('MongoDB winrates sync warning:', mongoErr);
      }

      // 3. Update local state and fallback cache
      setCasinoConfig(payload);
      try {
        localStorage.setItem('casino_global_winrates', JSON.stringify(payload));
      } catch (e) {}
      return true;
    },
    [isAdmin, firebaseUser, mongoUser]
  );

  return (
    <CasinoContext.Provider
      value={{
        firebaseUser,
        mongoUser,
        currentUser: mongoUser || (firebaseUser ? { id: firebaseUser.uid, username: firebaseUser.displayName || firebaseUser.email?.split('@')[0], email: firebaseUser.email, photoURL: firebaseUser.photoURL } : null),
        loginWithMongo,
        registerWithMongo,
        logoutMongo,
        authLoading,
        isAdmin,
        ADMIN_EMAIL,
        casinoConfig,
        updateCasinoConfig,
        totalRealDeposits,
        cosmicJackpot,
        jackpotDepositCut: 0.40,
        isFirstDepositEligible,
        hasDeposited: !isFirstDepositEligible,
        chips,
        stats,
        transactions,
        addChips,
        deductChips,
        syncBalance,
        signInWithGoogle,
        logOut,
      }}
    >
      {children}
    </CasinoContext.Provider>
  );
};
