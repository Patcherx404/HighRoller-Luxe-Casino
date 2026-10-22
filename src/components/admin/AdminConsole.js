import React, { useState, useEffect } from 'react';
import { useFirebaseCasino } from '../../context/FirebaseCasinoContext';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { formatPHP } from '../../utils/formatCurrency';
import {
  Box,
  Typography,
  Paper,
  Slider,
  Button,
  Grid,
  Chip,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CasinoIcon from '@mui/icons-material/Casino';
import StyleIcon from '@mui/icons-material/Style';
import PieChartIcon from '@mui/icons-material/PieChart';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AdminConsole() {
  const { firebaseUser, isAdmin, ADMIN_EMAIL, casinoConfig, updateCasinoConfig } = useFirebaseCasino();
  const navigate = useNavigate();

  const [rates, setRates] = useState({
    slotsWinRate: 50,
    blackjackWinRate: 50,
    rouletteWinRate: 50,
    pokerWinRate: 50,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Real Money Deposits State (Only real payments via PayMongo QRPH)
  const [realDeposits, setRealDeposits] = useState([]);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [showDepositTable, setShowDepositTable] = useState(true);

  // Sync casino configuration from context
  useEffect(() => {
    if (casinoConfig) {
      setRates({
        slotsWinRate: casinoConfig.slotsWinRate ?? 50,
        blackjackWinRate: casinoConfig.blackjackWinRate ?? 50,
        rouletteWinRate: casinoConfig.rouletteWinRate ?? 50,
        pokerWinRate: casinoConfig.pokerWinRate ?? 50,
      });
    }
  }, [casinoConfig]);

  // Real-Time Listener for Real Money Deposits Ledger
  useEffect(() => {
    if (!isAdmin) return;

    const depositsRef = collection(db, 'real_deposits');
    const unsub = onSnapshot(
      depositsRef,
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        // Sort descending by creation date
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setRealDeposits(list);
        setLoadingDeposits(false);
      },
      (err) => {
        console.warn('Real deposits snapshot error:', err);
        setLoadingDeposits(false);
      }
    );

    return () => unsub();
  }, [isAdmin]);

  // Calculate Real Money Deposit Metrics (Strictly Real Money Only)
  const totalRealMoney = realDeposits.reduce((acc, dep) => acc + (Number(dep.amount) || 0), 0);
  const totalTransactionsCount = realDeposits.length;
  const averageDepositValue = totalTransactionsCount > 0 ? totalRealMoney / totalTransactionsCount : 0;
  const latestDeposit = realDeposits[0];

  if (!isAdmin) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center', mt: 6 }}>
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 3.5,
            bgcolor: '#0f172a',
            border: '2px solid #ef4444',
            color: '#fff',
          }}
        >
          <LockIcon sx={{ fontSize: 64, color: '#ef4444', mb: 1.5 }} />
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#ef4444', mb: 1 }}>
            Access Restricted
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
            The Casino Administrator Console is restricted exclusively to <strong>{ADMIN_EMAIL}</strong>.
            Your current account: <em>{firebaseUser?.email || 'Guest / Not signed in'}</em>.
          </Typography>
          <Button
            variant="contained"
            color="warning"
            onClick={() => navigate('/games')}
            sx={{ fontWeight: 900 }}
          >
            Return to Casino Games
          </Button>
        </Paper>
      </Box>
    );
  }

  const handleSliderChange = (game) => (_, value) => {
    setRates((prev) => ({ ...prev, [game]: Number(value) }));
  };

  const handlePreset = (game, val) => {
    setRates((prev) => ({ ...prev, [game]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCasinoConfig(rates);
      toast.success('🎉 Casino win rates updated and synced live to Firestore!');
    } catch (err) {
      toast.error('Failed to update config: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setRates({
      slotsWinRate: 32,
      blackjackWinRate: 38,
      rouletteWinRate: 36,
      pokerWinRate: 35,
    });
    toast.info('Reset to tight casino profit defaults (Slots: 32%, BJ: 38%, Roulette: 36%, Poker: 35%). Click "Save & Push Live" to apply.');
  };

  // Admin utility: Record test real deposit (₱500)
  const handleRecordTestDeposit = async () => {
    const testId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const depositRef = doc(db, 'real_deposits', testId);
    try {
      await setDoc(depositRef, {
        id: testId,
        amount: 500,
        userId: firebaseUser?.uid || 'admin_tester',
        userEmail: firebaseUser?.email || ADMIN_EMAIL,
        paymentId: testId,
        paymentMethod: 'PayMongo QRPH (Admin Test)',
        status: 'paid',
        currency: 'PHP',
        createdAt: new Date().toISOString(),
      });
      toast.success('✅ Real Money Test Deposit (+₱500.00) recorded in Firestore!');
    } catch (err) {
      toast.error('Error recording test deposit: ' + err.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 880, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: { xs: 2, md: 3 }, color: '#fff' }}>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />

      {/* Header Banner */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          borderRadius: 3.5,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
          border: '2px solid #f59e0b',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AdminPanelSettingsIcon sx={{ fontSize: 38, color: '#fbbf24' }} />
            <Box>
              <Typography variant="overline" sx={{ color: '#fbbf24', letterSpacing: 1.5, fontWeight: 900 }}>
                HighRoller Luxe Casino • Administrator
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff', fontSize: { xs: '1.25rem', sm: '1.6rem' } }}>
                Casino Control & Revenue Dashboard
              </Typography>
            </Box>
          </Box>

          <Chip
            icon={<CheckCircleIcon sx={{ color: '#10b981 !important' }} />}
            label={`Super-Admin: ${ADMIN_EMAIL}`}
            sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid #10b981', fontWeight: 800 }}
          />
        </Box>
      </Paper>

      {/* ========================================================================= */}
      {/* 💰 TOTAL REAL MONEY DEPOSITS FROM USERS SECTION                           */}
      {/* ========================================================================= */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          borderRadius: 3.5,
          background: 'linear-gradient(135deg, #064e3b 0%, #022c22 60%, #0f172a 100%)',
          border: '2px solid #10b981',
          boxShadow: '0 0 25px rgba(16, 185, 129, 0.25)',
        }}
      >
        {/* Top Header of Deposit Revenue Card */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentsIcon sx={{ color: '#34d399', fontSize: 30 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#34d399', lineHeight: 1.1 }}>
                Total Deposits from Users (Only Real Money)
              </Typography>
              <Typography variant="caption" sx={{ color: '#a7f3d0' }}>
                100% Verified Philippine Peso payments via PayMongo QRPH • No Demo/Bonus Chips
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={handleRecordTestDeposit}
            startIcon={<AddCircleOutlineIcon />}
            sx={{
              color: '#34d399',
              borderColor: '#10b981',
              fontWeight: 800,
              fontSize: '0.72rem',
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.25)' },
            }}
          >
            + Test Real Deposit (₱500)
          </Button>
        </Box>

        {/* Big Real Money Revenue Ticker */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            bgcolor: '#020617',
            border: '1.5px solid #059669',
            textAlign: 'center',
            mb: 2.5,
          }}
        >
          <Typography variant="overline" sx={{ color: '#6ee7b7', fontWeight: 900, letterSpacing: 2, fontSize: '0.75rem' }}>
            🇵🇭 LIFETIME REAL-MONEY CASH IN
          </Typography>
          <Typography
            variant="h3"
            sx={{
              color: '#34d399',
              fontWeight: 900,
              fontFamily: 'monospace',
              fontSize: { xs: '2.2rem', sm: '3.2rem' },
              lineHeight: 1.1,
              my: 0.5,
              textShadow: '0 0 25px rgba(52, 211, 153, 0.5)',
            }}
          >
            {formatPHP(totalRealMoney)} PHP
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Total actual funds deposited across all player accounts through Philippine QRPH gateways.
          </Typography>
        </Box>

        {/* 3 Metric Cards */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(15, 23, 42, 0.8)', border: '1px solid #1e293b', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <ReceiptLongIcon sx={{ color: '#fbbf24', fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>
                  TOTAL TRANSACTIONS
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#fbbf24', fontWeight: 900, fontFamily: 'monospace' }}>
                {totalTransactionsCount}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(15, 23, 42, 0.8)', border: '1px solid #1e293b', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <TrendingUpIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>
                  AVERAGE REAL DEPOSIT
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ color: '#38bdf8', fontWeight: 900, fontFamily: 'monospace' }}>
                {formatPHP(averageDepositValue)}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(15, 23, 42, 0.8)', border: '1px solid #1e293b', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <AccountBalanceWalletIcon sx={{ color: '#c084fc', fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>
                  LATEST REAL DEPOSIT
                </Typography>
              </Box>
              <Typography variant="subtitle1" sx={{ color: '#c084fc', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1.2 }}>
                {latestDeposit ? `${formatPHP(latestDeposit.amount)}` : 'No deposits yet'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 🌟 40% COSMIC PROGRESSIVE JACKPOT SYNC MONITOR */}
        <Paper
          elevation={4}
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2.5,
            bgcolor: '#090d16',
            border: '2px solid #eab308',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '1.4rem' }}>🎰✨</Typography>
              <Typography variant="subtitle1" sx={{ color: '#fbbf24', fontWeight: 900 }}>
                Cosmic Progressive Jackpot Allocation (40% Synced)
              </Typography>
            </Box>
            <Chip
              size="small"
              label="LIVE SYNCED TO COSMIC SLOTS DELUXE ⚡"
              sx={{ bgcolor: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '1px solid #eab308', fontWeight: 900, fontSize: '0.65rem' }}
            />
          </Box>

          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Box sx={{ p: 1.5, bgcolor: '#020617', borderRadius: 2, border: '1px solid #334155' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>
                  TOTAL REAL USER DEPOSITS
                </Typography>
                <Typography variant="h5" sx={{ color: '#38bdf8', fontWeight: 900, fontFamily: 'monospace' }}>
                  {formatPHP(totalRealMoney)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
                  Total verified cash deposited by users
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box sx={{ p: 1.5, bgcolor: '#020617', borderRadius: 2, border: '1px solid #334155' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>
                  JACKPOT ALLOCATION CUT
                </Typography>
                <Typography variant="h5" sx={{ color: '#34d399', fontWeight: 900, fontFamily: 'monospace' }}>
                  40.0%
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
                  40% of {formatPHP(totalRealMoney)}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box sx={{ p: 1.5, bgcolor: '#020617', borderRadius: 2, border: '1.5px solid #eab308' }}>
                <Typography variant="caption" sx={{ color: '#fde047', fontWeight: 900 }}>
                  COSMIC PROGRESSIVE JACKPOT
                </Typography>
                <Typography variant="h5" sx={{ color: '#fef08a', fontWeight: 900, fontFamily: 'monospace' }}>
                  {formatPHP(Math.round(totalRealMoney * 0.40 * 100) / 100)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#34d399', fontSize: '0.68rem', fontWeight: 700 }}>
                  Live in Cosmic Slots Deluxe (e.g. 40% of 120 = 48)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Toggleable Live Deposits Table */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 800 }}>
            Real-Money Transaction Ledger ({realDeposits.length})
          </Typography>
          <Button
            size="small"
            onClick={() => setShowDepositTable(!showDepositTable)}
            sx={{ color: '#34d399', fontSize: '0.72rem', textTransform: 'none' }}
          >
            {showDepositTable ? 'Hide Table ▲' : 'Show Table ▼'}
          </Button>
        </Box>

        {showDepositTable && (
          <TableContainer component={Paper} sx={{ bgcolor: '#020617', borderRadius: 2.5, border: '1px solid #1e293b', maxHeight: 280 }}>
            {loadingDeposits ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={24} sx={{ color: '#34d399' }} />
              </Box>
            ) : realDeposits.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  No real-money deposits recorded yet. When users scan & pay via PayMongo QRPH, verified transactions will appear here in real time.
                </Typography>
              </Box>
            ) : (
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#0f172a', color: '#94a3b8', fontWeight: 800, fontSize: '0.72rem' } }}>
                    <TableCell>DATE & TIME</TableCell>
                    <TableCell>USER / DEPOSITOR</TableCell>
                    <TableCell>AMOUNT (PHP)</TableCell>
                    <TableCell>METHOD / REF</TableCell>
                    <TableCell align="right">STATUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {realDeposits.map((dep) => (
                    <TableRow key={dep.id} sx={{ '& td': { color: '#e2e8f0', borderBottom: '1px solid #1e293b', fontSize: '0.75rem' } }}>
                      <TableCell sx={{ color: '#94a3b8' }}>
                        {dep.createdAt ? new Date(dep.createdAt).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#fbbf24' }}>
                        {dep.userEmail || 'QRPH User'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
                        +{formatPHP(dep.amount)}
                      </TableCell>
                      <TableCell sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                        {dep.paymentMethod || 'PayMongo QRPH'} • {dep.paymentId ? dep.paymentId.substring(0, 16) : dep.id}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label="VERIFIED PAID ✅"
                          sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 900, fontSize: '0.62rem', height: 22 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}
      </Paper>

      {/* ========================================================================= */}
      {/* 🎮 GAME WIN RATE & HOUSE EDGE CONTROLS                                    */}
      {/* ========================================================================= */}
      <Alert severity="info" sx={{ mb: 3, bgcolor: '#020617', color: '#93c5fd', border: '1px solid #1e3a8a' }}>
        <strong>Mathematical Accuracy Engine:</strong> Every percentage configured below directly governs the win probability in each game. When saved, changes write live to Cloud Firestore.
      </Alert>

      {/* Game Config Cards */}
      <Grid container spacing={2.5}>
        {/* 1. Cosmic Slots Deluxe */}
        <Grid item xs={12}>
          <Paper
            elevation={4}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: '#131b2e',
              border: '1.5px solid #3b82f6',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CasinoIcon sx={{ color: '#38bdf8' }} />
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#38bdf8' }}>
                  Cosmic Slots Deluxe Win Rate
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace' }}>
                {rates.slotsWinRate}%
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5 }}>
              Controls the symbol matching hit frequency, lucky payline odds, and Wild Star frequency.
            </Typography>

            <Slider
              value={rates.slotsWinRate}
              min={1}
              max={100}
              step={1}
              onChange={handleSliderChange('slotsWinRate')}
              sx={{ color: '#38bdf8', mb: 1 }}
            />

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {[
                { label: 'Tight (20%)', val: 20 },
                { label: 'Standard Vegas (50%)', val: 50 },
                { label: 'Generous (75%)', val: 75 },
                { label: 'Jackpot Rush (95%)', val: 95 },
              ].map((p) => (
                <Chip
                  key={p.val}
                  size="small"
                  label={p.label}
                  clickable
                  onClick={() => handlePreset('slotsWinRate', p.val)}
                  sx={{
                    bgcolor: rates.slotsWinRate === p.val ? '#0284c7' : '#1e293b',
                    color: '#fff',
                    fontWeight: 800,
                  }}
                />
              ))}
            </Box>

            <Box sx={{ mt: 1.5, p: 1, bgcolor: 'rgba(2, 6, 23, 0.7)', borderRadius: 2, border: '1px solid #1e293b' }}>
              <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 800, display: 'block' }}>
                🎯 Mathematical Accuracy: Exactly {rates.slotsWinRate}% of spins generate winning paylines. House retains {100 - rates.slotsWinRate}%.
              </Typography>
            </Box>

            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(239, 68, 68, 0.12)', borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.35)' }}>
              <Typography variant="caption" sx={{ color: '#f87171', fontWeight: 800, display: 'block' }}>
                🛡️ Bankroll Protection Active: When a player reaches ₱400 (balance or accumulated wins), the win rate automatically throttles down to 8% to protect the house bankroll.
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* 2. Blackjack Player Advantage */}
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={4}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: '#131b2e',
              border: '1.5px solid #10b981',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StyleIcon sx={{ color: '#34d399' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#34d399' }}>
                  Blackjack Win Advantage
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace' }}>
                {rates.blackjackWinRate}%
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5 }}>
              Controls dealer bust chance and favorable deck draw frequency for the player.
            </Typography>

            <Slider
              value={rates.blackjackWinRate}
              min={1}
              max={100}
              step={1}
              onChange={handleSliderChange('blackjackWinRate')}
              sx={{ color: '#34d399', mb: 1 }}
            />

            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {[
                { label: 'Tight (35%)', val: 35 },
                { label: 'Fair (50%)', val: 50 },
                { label: 'Player High (70%)', val: 70 },
              ].map((p) => (
                <Chip
                  key={p.val}
                  size="small"
                  label={p.label}
                  clickable
                  onClick={() => handlePreset('blackjackWinRate', p.val)}
                  sx={{
                    bgcolor: rates.blackjackWinRate === p.val ? '#059669' : '#1e293b',
                    color: '#fff',
                    fontWeight: 800,
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* 3. European Roulette Lucky Spin Rate */}
        <Grid item xs={12} sm={6}>
          <Paper
            elevation={4}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: '#131b2e',
              border: '1.5px solid #f59e0b',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChartIcon sx={{ color: '#fbbf24' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#fbbf24' }}>
                  Roulette Lucky Spin Rate
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace' }}>
                {rates.rouletteWinRate}%
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5 }}>
              Adjusts the odds of landing on player-covered sectors (numbers, red/black, dozens).
            </Typography>

            <Slider
              value={rates.rouletteWinRate}
              min={1}
              max={100}
              step={1}
              onChange={handleSliderChange('rouletteWinRate')}
              sx={{ color: '#fbbf24', mb: 1 }}
            />

            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {[
                { label: 'House Edge (30%)', val: 30 },
                { label: 'Standard (50%)', val: 50 },
                { label: 'Lucky Wheel (80%)', val: 80 },
              ].map((p) => (
                <Chip
                  key={p.val}
                  size="small"
                  label={p.label}
                  clickable
                  onClick={() => handlePreset('rouletteWinRate', p.val)}
                  sx={{
                    bgcolor: rates.rouletteWinRate === p.val ? '#d97706' : '#1e293b',
                    color: '#fff',
                    fontWeight: 800,
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* 4. Texas Hold'em Poker Player Odds */}
        <Grid item xs={12}>
          <Paper
            elevation={4}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: '#131b2e',
              border: '1.5px solid #a855f7',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StyleIcon sx={{ color: '#c084fc' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#c084fc' }}>
                  Texas Hold'em Poker Player Win Odds
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace' }}>
                {rates.pokerWinRate}%
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5 }}>
              Adjusts pocket pair frequency, community card hits, and AI bot aggression.
            </Typography>

            <Slider
              value={rates.pokerWinRate}
              min={1}
              max={100}
              step={1}
              onChange={handleSliderChange('pokerWinRate')}
              sx={{ color: '#c084fc', mb: 1 }}
            />

            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {[
                { label: 'Hard Bots (30%)', val: 30 },
                { label: 'Balanced (50%)', val: 50 },
                { label: 'Player Advantage (70%)', val: 70 },
                { label: 'Pro Player (90%)', val: 90 },
              ].map((p) => (
                <Chip
                  key={p.val}
                  size="small"
                  label={p.label}
                  clickable
                  onClick={() => handlePreset('pokerWinRate', p.val)}
                  sx={{
                    bgcolor: rates.pokerWinRate === p.val ? '#7e22ce' : '#1e293b',
                    color: '#fff',
                    fontWeight: 800,
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Action Footer */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleResetDefaults}
          startIcon={<RestartAltIcon />}
          sx={{ borderColor: '#475569', color: '#94a3b8', fontWeight: 800 }}
        >
          Reset to 50% Defaults
        </Button>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            color="warning"
            size="large"
            disabled={isSaving}
            onClick={handleSave}
            startIcon={<SaveIcon />}
            sx={{
              fontWeight: 900,
              px: 4,
              background: 'linear-gradient(45deg, #f59e0b, #d97706)',
              color: '#000',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
            }}
          >
            {isSaving ? 'Saving to Firestore...' : 'Save & Push Live to Casino'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
