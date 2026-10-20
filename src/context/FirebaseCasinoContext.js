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

  // Initialize chips: If public/guest, use isolated demo chips (never private user balance)
  const [chips, setChips] = useState(() => {
    try {
      const saved = localStorage.getItem('casino_public_demo_balance');
      return saved ? Number(saved) : PUBLIC_DEMO_CHIPS;
    } catch {
      return PUBLIC_DEMO_CHIPS;
    }
  });

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
    firebaseUser?.email && firebaseUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
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

  // Sync casino configuration from Firestore in real time
  useEffect(() => {
    const configRef = doc(db, 'casino_config', 'winrates');
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCasinoConfig({
            slotsWinRate: typeof data.slotsWinRate === 'number' ? data.slotsWinRate : 50,
            blackjackWinRate: typeof data.blackjackWinRate === 'number' ? data.blackjackWinRate : 50,
            rouletteWinRate: typeof data.rouletteWinRate === 'number' ? data.rouletteWinRate : 50,
            pokerWinRate: typeof data.pokerWinRate === 'number' ? data.pokerWinRate : 50,
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
              setStats({
                vipTier: data.vipTier || 'Bronze',
                totalWon: Number(data.totalWon) || 0,
                totalLost: Number(data.totalLost) || 0,
                gamesPlayed: Number(data.gamesPlayed) || 0,
                biggestWin: Number(data.biggestWin) || 0,
              });
            } else {
              // Create user record in Firestore if not present - starts with 0 PRIVATE BALANCE
              const initialData = {
                id: user.uid,
                email: user.email || '',
                username: user.displayName || user.email?.split('@')[0] || 'High Roller',
                avatar: user.photoURL || '👑',
                chips: 0,
                vipTier: 'Bronze',
                totalWon: 0,
                totalLost: 0,
                gamesPlayed: 0,
                biggestWin: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
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

  // Real-time chip credit (1:1 exact deposit ratio, idempotent by paymentId)
  const addChips = useCallback(
    async (amount, game, description, paymentId) => {
      const numAmount = Math.max(0, Number(amount) || 0);
      if (numAmount <= 0) return false;

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
          userId: firebaseUser?.uid || 'guest_depositor',
          userEmail: firebaseUser?.email || 'Guest QRPH Depositor',
          paymentId: cleanPaymentId,
          paymentMethod: 'PayMongo QRPH',
          status: 'paid',
          currency: 'PHP',
          createdAt: new Date().toISOString(),
        }, { merge: true }).catch((err) => console.warn('Could not record real_deposit:', err));
      }

      const isDeposit = typeof game === 'string' && game.toLowerCase().includes('deposit');

      setChips((prevChips) => {
        const currentChips = Number(prevChips) || 0;
        const newChips = currentChips + numAmount;

        setStats((prevStats) => {
          const newWon = (Number(prevStats.totalWon) || 0) + (!isDeposit ? numAmount : 0);
          const newBiggest = Math.max(Number(prevStats.biggestWin) || 0, !isDeposit ? numAmount : 0);
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
            amount: numAmount,
            balanceAfter: newChips,
            description,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        } else {
          // If guest, keep in isolated guest demo storage
          try {
            localStorage.setItem('casino_public_demo_balance', String(newChips));
          } catch (e) {}
        }

        return newChips;
      });

      const tx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        game,
        amount: numAmount,
        description,
        timestamp: Date.now(),
      };
      setTransactions((prev) => [tx, ...prev.slice(0, 50)]);
      return true;
    },
    [firebaseUser]
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
    } catch (e) {}

    // 4. Perform Firebase SignOut
    await firebaseSignOut();
  }, [firebaseUser, chips]);

  // Admin win rate update function (Restricted to patcherx500@gmail.com)
  const updateCasinoConfig = useCallback(
    async (newConfig) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Only patcherx500@gmail.com can adjust casino win rates.');
      }
      const configRef = doc(db, 'casino_config', 'winrates');
      const payload = {
        id: 'winrates',
        slotsWinRate: Math.max(1, Math.min(100, Number(newConfig.slotsWinRate) ?? 50)),
        blackjackWinRate: Math.max(1, Math.min(100, Number(newConfig.blackjackWinRate) ?? 50)),
        rouletteWinRate: Math.max(1, Math.min(100, Number(newConfig.rouletteWinRate) ?? 50)),
        pokerWinRate: Math.max(1, Math.min(100, Number(newConfig.pokerWinRate) ?? 50)),
        updatedAt: new Date().toISOString(),
        updatedBy: firebaseUser?.email || ADMIN_EMAIL,
      };
      await setDoc(configRef, payload, { merge: true });
      setCasinoConfig(payload);
      try {
        localStorage.setItem('casino_global_winrates', JSON.stringify(payload));
      } catch (e) {}
      return true;
    },
    [isAdmin, firebaseUser]
  );

  return (
    <CasinoContext.Provider
      value={{
        firebaseUser,
        authLoading,
        isAdmin,
        ADMIN_EMAIL,
        casinoConfig,
        updateCasinoConfig,
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
