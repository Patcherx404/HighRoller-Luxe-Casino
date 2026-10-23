import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Typography,
  Box,
  Paper,
  TextField,
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SensorsIcon from '@mui/icons-material/Sensors';
import { useFirebaseCasino } from "../context/FirebaseCasinoContext";
import { formatPHP } from "../utils/formatCurrency";
import { generatePayMongoQR, checkPayMongoPaymentStatus } from "../services/paymongoService";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

const PRESET_AMOUNTS = [1, 50, 100, 500, 1000, 2500];

const BuyTokens = () => {
  const { addChips, firebaseUser, isFirstDepositEligible } = useFirebaseCasino();
  const [tokenAmount, setTokenAmount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(1800);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const pollingRef = useRef(null);
  const addChipsRef = useRef(addChips);
  addChipsRef.current = addChips;
  const creditedQrsRef = useRef(new Set());

  // Auto-polling effect: Listens for user scan & payment automatically
  useEffect(() => {
    if (!qrData || paymentSuccess) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    if (creditedQrsRef.current.has(qrData.id)) {
      return;
    }

    setIsListening(true);

    const performVerification = async () => {
      if (!qrData || creditedQrsRef.current.has(qrData.id)) return;

      try {
        const checkResult = await checkPayMongoPaymentStatus({
          qrId: qrData.id,
          paymentIntentId: qrData.paymentIntentId,
          createdAt: qrData.createdAt,
          expectedAmount: qrData.amount,
        });

        if (checkResult.paid && !creditedQrsRef.current.has(qrData.id)) {
          // Immediately mark as credited to prevent ANY duplicate call
          creditedQrsRef.current.add(qrData.id);
          if (checkResult.paymentId) creditedQrsRef.current.add(checkResult.paymentId);

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          const credited = Number(checkResult.amount || qrData.amount || tokenAmount);
          const payId = checkResult.paymentId || qrData.id || `pay_${Date.now()}`;

          // 1. Credit chips to user account (automatically doubles if first deposit)
          const creditRes = await addChipsRef.current(
            credited,
            "Deposit (PayMongo)",
            `PayMongo QRPH Deposit (${formatPHP(credited)}) - ID: ${payId}`,
            payId
          );

          // 2. Record in immutable real-money deposits ledger for Admin Console
          try {
            await setDoc(doc(db, "real_deposits", payId), {
              id: payId,
              amount: credited,
              creditedChips: creditRes?.is2xBonus ? credited * 2 : credited,
              firstDepositBonus: Boolean(creditRes?.is2xBonus),
              userId: firebaseUser?.uid || "guest_depositor",
              userEmail: firebaseUser?.email || "Guest QRPH Depositor",
              paymentId: payId,
              paymentMethod: "PayMongo QRPH",
              status: "paid",
              currency: "PHP",
              createdAt: new Date().toISOString(),
            }, { merge: true });
          } catch (ledgerErr) {
            console.warn("Real deposit ledger write error:", ledgerErr);
          }

          setPaymentSuccess(true);
          setIsListening(false);
          if (creditRes?.is2xBonus) {
            toast.success(`🎉 2X First Deposit Bonus Activated! Exactly ${formatPHP(credited * 2)} chips added to your balance!`);
          } else {
            toast.success(`🎉 Payment verified! Exactly ${formatPHP(credited)} added to your balance!`);
          }
        }
      } catch (err) {
        console.warn("Background polling check error:", err);
      }
    };

    // Check payment status every 1.5 seconds
    pollingRef.current = setInterval(performVerification, 1500);

    // Instant verification when user returns from GCash / Maya app
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performVerification();
      }
    };
    const onWindowFocus = () => {
      performVerification();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    // Run initial check once
    performVerification();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [qrData?.id, paymentSuccess]);

  // Timer countdown for active QR code
  useEffect(() => {
    if (!qrData || timerSeconds <= 0 || paymentSuccess) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [qrData, timerSeconds, paymentSuccess]);

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleGenerateQR = async () => {
    const amt = Number(tokenAmount);
    if (!amt || amt < 1) {
      toast.error("Please enter a valid deposit amount of at least ₱1 PHP.");
      return;
    }

    setIsGenerating(true);
    setPaymentSuccess(false);

    try {
      const result = await generatePayMongoQR(amt);
      if (result.success && result.qrImage) {
        setQrData(result);
        setTimerSeconds(1800);
        toast.success(`PayMongo QRPH code generated for ${formatPHP(amt)}! 🇵🇭`);
      } else {
        toast.error("Could not obtain QR image from PayMongo. Please try again.");
      }
    } catch (err) {
      toast.error(`PayMongo error: ${err.message || 'Failed to generate QR code'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setQrData(null);
    setPaymentSuccess(false);
    setIsListening(false);
    setTimerSeconds(1800);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 680, mx: 'auto' }}>
      <Paper
        elevation={6}
        sx={{
          p: { xs: 2, sm: 3.5 },
          borderRadius: 3.5,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1.5px solid #10b981',
          color: '#fff',
          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)',
        }}
      >
        {/* Header Badge */}
        <Box sx={{ textAlign: 'center', mb: 2.5 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, bgcolor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', px: 1.5, py: 0.4, borderRadius: 2, mb: 1 }}>
            <QrCode2Icon sx={{ color: '#34d399', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 900, letterSpacing: 0.5 }}>
              PAYMONGO QRPH AUTO-CREDIT CHECKOUT 🇵🇭
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff', fontSize: { xs: '1.25rem', sm: '1.6rem' } }}>
            Deposit Philippine Peso (PHP)
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: { xs: '0.8rem', sm: '0.9rem' }, mt: 0.5 }}>
            Minimum deposit is only <strong>₱1 PHP</strong>. Scan to pay with GCash, Maya, or any bank app. Your balance updates automatically upon payment!
          </Typography>
        </Box>

        {/* E-Wallets & Banks Supported Banner */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            mb: 3,
            p: 1.2,
            bgcolor: 'rgba(2, 6, 23, 0.6)',
            borderRadius: 2,
            border: '1px solid #334155',
          }}
        >
          {['GCash', 'Maya', 'ShopeePay', 'BDO', 'BPI', 'UnionBank', 'QRPH'].map((method) => (
            <Chip
              key={method}
              label={method}
              size="small"
              sx={{
                bgcolor: '#1e293b',
                color: '#e2e8f0',
                fontWeight: 800,
                fontSize: '0.72rem',
                border: '1px solid #475569',
              }}
            />
          ))}
        </Box>

        {/* Active QR Code View with Automatic Detection */}
        {qrData && !paymentSuccess ? (
          <Box sx={{ textAlign: 'center' }}>
            {/* Merchant Details */}
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#020617', borderRadius: 2.5, border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                  MERCHANT
                </Typography>
                <Typography variant="subtitle2" sx={{ color: '#fbbf24', fontWeight: 900 }}>
                  LUXE CASINO
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                  AMOUNT DUE
                </Typography>
                <Typography variant="h6" sx={{ color: '#34d399', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                  {formatPHP(qrData.amount)} PHP
                </Typography>
                {isFirstDepositEligible && (
                  <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 900, display: 'block', mt: 0.3 }}>
                    🎁 2X BONUS: GET {formatPHP(qrData.amount * 2)} CHIPS!
                  </Typography>
                )}
              </Box>
            </Box>

            {/* QR Code Container with Pulsing Scanner Glow */}
            <Box
              sx={{
                p: { xs: 2, sm: 2.5 },
                display: 'inline-block',
                bgcolor: '#ffffff',
                borderRadius: 3,
                boxShadow: isListening ? '0 0 35px rgba(16, 185, 129, 0.5)' : '0 0 20px rgba(0,0,0,0.5)',
                border: '3px solid #10b981',
                mb: 2,
                position: 'relative',
              }}
            >
              <Box
                component="img"
                src={qrData.qrImage}
                alt="PayMongo QRPH Code"
                sx={{
                  width: { xs: 220, sm: 260 },
                  height: { xs: 220, sm: 260 },
                  display: 'block',
                  mx: 'auto',
                  objectFit: 'contain',
                }}
              />
              <Typography variant="caption" sx={{ color: '#0f172a', fontWeight: 900, display: 'block', mt: 1, letterSpacing: 1 }}>
                SCAN WITH GCASH / MAYA / BANK
              </Typography>
            </Box>

            {/* Real-Time Auto-Detection Status Indicator */}
            <Paper
              elevation={3}
              sx={{
                mb: 2.5,
                p: 1.5,
                bgcolor: 'rgba(6, 78, 59, 0.3)',
                border: '1.5px solid #10b981',
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
              }}
            >
              <CircularProgress size={20} sx={{ color: '#34d399' }} />
              <Box sx={{ textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SensorsIcon sx={{ color: '#34d399', fontSize: 18 }} />
                  <Typography variant="subtitle2" sx={{ color: '#34d399', fontWeight: 900, fontSize: '0.85rem' }}>
                    Auto-Detecting Payment in Real Time...
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#a7f3d0', display: 'block', fontSize: '0.72rem' }}>
                  No button press needed. Once your app completes the transfer, your chips will be added automatically.
                </Typography>
              </Box>
            </Paper>

            {/* Timer countdown */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: timerSeconds > 300 ? '#38bdf8' : '#ef4444', fontWeight: 800 }}>
                ⏱️ QR Code expires in: <span style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{formatTimer(timerSeconds)}</span>
              </Typography>
            </Box>

            {/* Change Deposit Amount button */}
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleReset}
                startIcon={<ArrowBackIcon />}
                sx={{
                  color: '#94a3b8',
                  borderColor: '#475569',
                  fontWeight: 800,
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Cancel & Change Deposit Amount
              </Button>
            </Box>
          </Box>
        ) : paymentSuccess ? (
          /* Payment Success Confirmation */
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <CheckCircleOutlineIcon sx={{ color: '#34d399', fontSize: 36 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#34d399', mb: 1 }}>
              Deposit Verified & Added Automatically! 🇵🇭
            </Typography>
            <Typography variant="body1" sx={{ color: '#e2e8f0', mb: 2 }}>
              Payment of <strong>{formatPHP(qrData ? qrData.amount : tokenAmount)}</strong> received!
              Chips have been credited to your casino balance!
            </Typography>
            <Button
              variant="contained"
              onClick={handleReset}
              startIcon={<RefreshIcon />}
              sx={{
                borderRadius: 2.5,
                fontWeight: 900,
                px: 4,
                py: 1,
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Deposit Again
            </Button>
          </Box>
        ) : (
          /* Amount Selection & Generate QR Form */
          <Box>
            {/* First Deposit 2X Match Promotion Banner */}
            {isFirstDepositEligible ? (
              <Paper
                elevation={4}
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                  border: '2px solid #fbbf24',
                  textAlign: 'center',
                  boxShadow: '0 0 25px rgba(251, 191, 36, 0.25)',
                }}
              >
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: '#f59e0b', color: '#000', px: 1.5, py: 0.3, borderRadius: 2, fontWeight: 900, fontSize: '0.78rem', mb: 1 }}>
                  🎁 100% MATCH WELCOME PROMOTION
                </Box>
                <Typography variant="h6" sx={{ color: '#fbbf24', fontWeight: 900, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  FIRST DEPOSIT 2X BONUS ACTIVE!
                </Typography>
                <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 700, mt: 0.5 }}>
                  Registered players must deposit first to receive bonus: <strong>every amount you deposit is DOUBLED (x2) on your very first deposit only!</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: '#fde047', fontWeight: 800, display: 'block', mt: 0.5 }}>
                  ✨ Examples: Deposit ₱50 → Get ₱100 | Deposit ₱100 → Get ₱200 | Deposit ₱500 → Get ₱1,000 | Deposit ₱1,000 → Get ₱2,000!
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ mb: 2.5, textAlign: 'center' }}>
                <Chip
                  label="First Deposit 2X Bonus Claimed ✓ • Standard 1:1 Deposit Rate Active"
                  size="small"
                  sx={{ bgcolor: 'rgba(51, 65, 85, 0.7)', color: '#94a3b8', border: '1px solid #475569', fontWeight: 700 }}
                />
              </Box>
            )}

            {/* Preset Amount Chips */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 800, display: 'block', mb: 1.2, textAlign: 'center', fontSize: '0.75rem' }}>
                SELECT DEPOSIT BUNDLE (PHP):
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                {PRESET_AMOUNTS.map((amt) => (
                  <Chip
                    key={amt}
                    label={isFirstDepositEligible ? `${formatPHP(amt)} (Get ${formatPHP(amt * 2)})` : formatPHP(amt)}
                    clickable
                    color={tokenAmount === amt ? "warning" : "default"}
                    onClick={() => setTokenAmount(amt)}
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: '0.8rem', sm: '0.9rem' },
                      py: 2.2,
                      px: { xs: 1, sm: 1.5 },
                      bgcolor: tokenAmount === amt ? "#fbbf24" : "#0f172a",
                      color: tokenAmount === amt ? "#000" : "#fff",
                      border: tokenAmount === amt ? "2px solid #f59e0b" : "1px solid #475569",
                      transition: "all 0.15s ease",
                      "&:hover": { borderColor: "#fbbf24" },
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Custom Amount Input */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <TextField
                label="Custom Deposit in PHP (₱)"
                type="number"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(Math.max(1, Number(e.target.value)))}
                InputProps={{
                  inputProps: { min: 1, max: 500000 },
                }}
                sx={{
                  width: '100%',
                  maxWidth: 320,
                  bgcolor: '#0f172a',
                  borderRadius: 2.5,
                  '& .MuiInputBase-input': {
                    color: '#fbbf24',
                    fontWeight: 900,
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#475569' },
                    '&:hover fieldset': { borderColor: '#fbbf24' },
                    '&.Mui-focused fieldset': { borderColor: '#fbbf24' },
                  },
                }}
              />
            </Box>

            {/* Explicit 1:1 or 2X conversion rate notice */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              {isFirstDepositEligible ? (
                <Typography variant="subtitle2" sx={{ color: '#fde047', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 0.8, bgcolor: 'rgba(234, 179, 8, 0.2)', px: 2, py: 0.8, borderRadius: 2, border: '1.5px solid #eab308' }}>
                  🎁 2X FIRST DEPOSIT BONUS: <strong>Deposit {formatPHP(tokenAmount)}</strong> = <strong>RECEIVE {formatPHP(tokenAmount * 2)} CHIPS (2X MATCH)!</strong>
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(16, 185, 129, 0.12)', px: 1.5, py: 0.5, borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  ✨ Standard 1:1 Rate: <strong>Deposit {formatPHP(tokenAmount)}</strong> = <strong>Receive {formatPHP(tokenAmount)} Chips</strong> (Standard deposit, no bonus)
                </Typography>
              )}
            </Box>

            {/* Generate PayMongo QR Button */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Button
                variant="contained"
                size="large"
                disabled={isGenerating || tokenAmount < 1}
                onClick={handleGenerateQR}
                startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <QrCode2Icon />}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  px: { xs: 4, sm: 6 },
                  py: 1.3,
                  borderRadius: 2.5,
                  fontWeight: 900,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  background: 'linear-gradient(45deg, #10b981, #059669)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #059669, #047857)',
                  },
                }}
              >
                {isGenerating
                  ? "GENERATING PAYMONGO QR..."
                  : isFirstDepositEligible
                  ? `Generate PayMongo QRPH (${formatPHP(tokenAmount)} → Get ${formatPHP(tokenAmount * 2)} 2X)`
                  : `Generate PayMongo QRPH (${formatPHP(tokenAmount)})`}
              </Button>
            </Box>

            <Divider sx={{ borderColor: '#334155', my: 2.5 }} />

            {/* Instant Demo Chips option */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                Instant testing without scanning?
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={async () => {
                  const res = await addChips(tokenAmount, "Instant Credit", `Instant Credit (${formatPHP(tokenAmount)})`);
                  if (res?.is2xBonus) {
                    toast.success(`🎉 2X First Deposit Bonus Activated! Exactly ${formatPHP(tokenAmount * 2)} chips credited!`);
                  } else {
                    toast.success(`Instant deposit of ${formatPHP(tokenAmount)} chips added (1:1 standard rate, no bonus)!`);
                  }
                }}
                sx={{ color: '#fbbf24', fontWeight: 800, textTransform: 'none', fontSize: '0.85rem' }}
              >
                {isFirstDepositEligible
                  ? `⚡ Instant First Deposit: Add ${formatPHP(tokenAmount)} (Get ${formatPHP(tokenAmount * 2)} with 2X Bonus)`
                  : `⚡ Instant Deposit: Add ${formatPHP(tokenAmount)} Chips Directly (1:1 Rate, No Bonus)`}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
    </Box>
  );
};

export default BuyTokens;
