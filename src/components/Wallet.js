import React from 'react';
import { Outlet } from 'react-router';
import { Box, Button, Typography, Paper } from '@mui/material';
import { useNavigate, useLocation } from "react-router";
import WalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import { useFirebaseCasino } from '../context/FirebaseCasinoContext';
import { formatPHP } from '../utils/formatCurrency';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBuy = location.pathname.includes('buyTokens') || location.pathname === '/Wallet';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 3 }}>
      <Button
        variant={isBuy ? "contained" : "outlined"}
        onClick={() => navigate("buyTokens")}
        startIcon={<WalletIcon />}
        sx={{
          borderRadius: 2.5,
          fontWeight: 900,
          px: { xs: 2.5, sm: 4 },
          py: 1,
          fontSize: { xs: '0.85rem', sm: '1rem' },
          bgcolor: isBuy ? "#10b981" : "transparent",
          borderColor: "#10b981",
          color: "#fff",
          "&:hover": { bgcolor: "#059669" },
        }}
      >
        Buy Tokens (PHP)
      </Button>
      <Button
        variant={!isBuy ? "contained" : "outlined"}
        onClick={() => navigate("withdrawTokens")}
        startIcon={<PriceCheckIcon />}
        sx={{
          borderRadius: 2.5,
          fontWeight: 900,
          px: { xs: 2.5, sm: 4 },
          py: 1,
          fontSize: { xs: '0.85rem', sm: '1rem' },
          bgcolor: !isBuy ? "#f59e0b" : "transparent",
          borderColor: "#f59e0b",
          color: !isBuy ? "#000" : "#fff",
          "&:hover": { bgcolor: "#d97706" },
        }}
      >
        Withdraw (PHP)
      </Button>
    </Box>
  );
};

const Wallet = () => {
  const { chips, firebaseUser, mongoUser, isFirstDepositEligible } = useFirebaseCasino();

  const userAccountLabel = mongoUser
    ? `${mongoUser.username} (${mongoUser.phone || 'Member'})`
    : firebaseUser
    ? firebaseUser.email
    : null;

  return (
    <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: { xs: 1, sm: 2 } }}>
      {/* Balance Summary Header */}
      <Paper
        elevation={6}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1.5px solid #f59e0b',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: 1.5 }}>
          {userAccountLabel ? 'PRIVATE ACCOUNT BALANCE • 🇵🇭' : 'PUBLIC DEMO BALANCE • 🇵🇭'}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace', my: 0.5 }}>
          {formatPHP(chips)}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: userAccountLabel ? '#34d399' : '#38bdf8', fontWeight: 700 }}>
            {userAccountLabel
              ? `Logged in as ${userAccountLabel}`
              : 'Guest Demo Mode • Register / Sign in to save balance & claim 2X bonus'}
          </Typography>
          {isFirstDepositEligible && (
            <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 900, bgcolor: 'rgba(251, 191, 36, 0.15)', px: 1.5, py: 0.3, borderRadius: 1.5, border: '1px solid rgba(251, 191, 36, 0.4)' }}>
              🎁 First Deposit 2X Bonus Active: Deposit first to double your chips (x2 on first deposit)!
            </Typography>
          )}
        </Box>
      </Paper>

      <Header />
      <Outlet />
    </Box>
  );
};

export default Wallet;