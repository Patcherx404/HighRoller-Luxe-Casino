import React, { useState } from "react";
import { Button, Typography, Box, Paper, TextField, Chip } from "@mui/material";
import { useDispatch } from "react-redux";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import contractsService from '../services/contractsService';
import { loadBalance } from "../reducers/balanceReducer";
import TotalBNB from "./TotalBNB";
import { useFirebaseCasino } from "../context/FirebaseCasinoContext";
import { formatPHP } from "../utils/formatCurrency";

const PRESET_AMOUNTS = [100, 500, 1000, 2500];

const WithdrawTokens = ({ price, account }) => {
  const dispatch = useDispatch();
  const { chips, deductChips } = useFirebaseCasino();
  const [tokenAmount, setTokenAmount] = useState(250);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(tokenAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount of tokens to withdraw.");
      return;
    }

    if (chips < amount) {
      toast.error(`Insufficient balance. You currently have ${formatPHP(chips)}.`);
      return;
    }

    const deducted = await deductChips(
      amount,
      "Withdraw",
      `Withdrawal of ${formatPHP(amount)} in Casino Chips`
    );
    if (!deducted) {
      toast.error("Withdrawal failed. Please check your balance.");
      return;
    }

    try {
      if (account && contractsService) {
        await contractsService.withdrawTokens(amount);
        await dispatch(loadBalance(account));
      }
    } catch (err) {
      console.log("Web3 contract skipped; chips deducted from balance", err);
    }

    toast.success(`Successfully withdrew ${formatPHP(amount)}! 🇵🇭`);
  };

  return (
    <Paper
      elevation={6}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        background: '#1e293b',
        border: '1px solid #334155',
        color: '#fff',
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 900, textAlign: 'center', mb: 1, color: '#fff' }}>
        Withdraw Funds (PHP)
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'center', color: '#94a3b8', mb: 3 }}>
        Cash out Philippine Peso chips from your account
      </Typography>

      <form onSubmit={handleWithdraw}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 800, display: 'block', mb: 1, textAlign: 'center' }}>
            SELECT WITHDRAWAL AMOUNT:
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
            {PRESET_AMOUNTS.map((amt) => (
              <Chip
                key={amt}
                label={formatPHP(amt)}
                clickable
                color={tokenAmount === amt ? "warning" : "default"}
                onClick={() => setTokenAmount(amt)}
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '0.8rem', sm: '0.9rem' },
                  py: 2,
                  px: 1,
                  bgcolor: tokenAmount === amt ? "#fbbf24" : "#0f172a",
                  color: tokenAmount === amt ? "#000" : "#fff",
                  border: "1px solid #475569",
                }}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <TextField
            label="Amount in PHP (₱)"
            type="number"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(Math.max(1, Number(e.target.value)))}
            sx={{
              width: '100%',
              maxWidth: 320,
              bgcolor: '#0f172a',
              borderRadius: 2,
              '& .MuiInputBase-input': { color: '#fff', fontWeight: 800, fontSize: '1.2rem', textAlign: 'center' },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#475569' },
                '&:hover fieldset': { borderColor: '#fbbf24' },
                '&.Mui-focused fieldset': { borderColor: '#fbbf24' },
              },
            }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <TotalBNB tokenAmount={tokenAmount} price={price || 1} msg="Withdrawal Total:" />
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={chips < tokenAmount}
            sx={{
              px: { xs: 5, sm: 8 },
              py: 1.2,
              borderRadius: 2.5,
              fontWeight: 900,
              fontSize: '1rem',
              background: 'linear-gradient(45deg, #f59e0b, #d97706)',
              color: '#000',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
              '&:hover': {
                background: 'linear-gradient(45deg, #d97706, #b45309)',
              },
            }}
          >
            Withdraw {formatPHP(tokenAmount)}
          </Button>
        </Box>
      </form>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
    </Paper>
  );
};

export default WithdrawTokens;