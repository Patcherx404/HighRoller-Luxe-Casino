import React, { useState } from "react";
import Ruleta, { ROULETTE_NUMBERS, RED_NUMBERS, getNumberColor } from "./Roulette";
import {
  Grid,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CasinoIcon from '@mui/icons-material/Casino';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { ToastContainer, toast } from "react-toastify";
import { useFirebaseCasino } from "../context/FirebaseCasinoContext";
import { formatPHP } from "../utils/formatCurrency";
import { rouletteAudio } from "../utils/rouletteAudio";
import "react-toastify/dist/ReactToastify.css";

const CHIP_DENOMINATIONS = [10, 25, 50, 100, 250, 500, 1000];

export default function RouletteGame() {
  const { chips, addChips, deductChips, casinoConfig } = useFirebaseCasino();

  const [isMuted, setIsMuted] = useState(rouletteAudio.isMuted);
  const [selectedChip, setSelectedChip] = useState(25);
  const [bets, setBets] = useState({}); // { betKey: amount }
  const [mustSpin, setMustSpin] = useState(false);
  const [winningNumber, setWinningNumber] = useState(0);
  const [lastWin, setLastWin] = useState(null);
  const [mobileTab, setMobileTab] = useState("outside"); // "outside" | "numbers" | "fun"
  const [history, setHistory] = useState([
    { num: 32, color: 'red' },
    { num: 15, color: 'black' },
    { num: 19, color: 'red' },
    { num: 0, color: 'green' },
    { num: 26, color: 'black' }
  ]);

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  const handleToggleMute = () => {
    const nextMute = rouletteAudio.toggleMute();
    setIsMuted(nextMute);
    if (!nextMute) {
      rouletteAudio.playChipClink();
    }
    toast.info(nextMute ? "Roulette audio muted 🔇" : "Roulette audio enabled 🔊", { autoClose: 1500 });
  };

  const handlePlaceBet = (betKey) => {
    if (mustSpin) return;
    if (chips < totalBet + selectedChip) {
      toast.warn("Not enough chips for this bet!");
      return;
    }
    rouletteAudio.playChipClink();
    setBets((prev) => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChip,
    }));
  };

  const handleClearBets = () => {
    if (mustSpin) return;
    rouletteAudio.playChipSweep();
    setBets({});
  };

  const handleDoubleBets = () => {
    if (mustSpin || totalBet === 0) return;
    if (chips < totalBet * 2) {
      toast.warn("Not enough chips to double all bets!");
      return;
    }
    rouletteAudio.playChipSweep();
    const doubled = {};
    for (let key in bets) {
      doubled[key] = bets[key] * 2;
    }
    setBets(doubled);
  };

  // Fun Bet 1: Lucky Random Number (35:1 straight up)
  const handleLuckyBet = () => {
    if (mustSpin) return;
    if (chips < totalBet + selectedChip) {
      toast.warn("Not enough chips for Lucky Bet!");
      return;
    }
    const randNum = Math.floor(Math.random() * 37);
    const key = `num_${randNum}`;
    rouletteAudio.playChipClink();
    setBets((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + selectedChip,
    }));
    toast.success(`🎲 Lucky Bet placed on #${randNum} (${getNumberColor(randNum).toUpperCase()})! Potential payout: ${formatPHP(selectedChip * 36)}!`);
  };

  // Fun Bet 2: Hot Numbers (bets on last 3 winning numbers)
  const handleHotNumbersBet = () => {
    if (mustSpin) return;
    const hotNums = history.slice(0, 3).map((h) => h.num);
    const cost = hotNums.length * selectedChip;
    if (chips < totalBet + cost) {
      toast.warn(`Not enough chips for Hot Numbers (${formatPHP(cost)} needed)!`);
      return;
    }
    rouletteAudio.playChipClink();
    setBets((prev) => {
      const next = { ...prev };
      hotNums.forEach((n) => {
        const k = `num_${n}`;
        next[k] = (next[k] || 0) + selectedChip;
      });
      return next;
    });
    toast.info(`🔥 Bets placed on Hot Numbers: ${hotNums.join(", ")}!`);
  };

  const handleSpinClick = async () => {
    if (mustSpin) return;
    if (totalBet === 0) {
      rouletteAudio.playChipClink();
      toast.info("👉 Tap any pocket or color below to place your chips, then tap SPIN in the center!");
      return;
    }

    const deducted = await deductChips(
      totalBet,
      "Roulette",
      `European Roulette Bet (${formatPHP(totalBet)})`
    );
    if (!deducted) {
      toast.error("Failed to deduct chips from balance. Please deposit or adjust bet.");
      return;
    }

    setLastWin(null);

    // Accurate Roulette Win Rate Engine (Casino Config)
    const targetWinRate = Math.max(1, Math.min(100, Number(casinoConfig?.rouletteWinRate ?? 36)));
    const willWin = (Math.random() * 100) < targetWinRate;

    // Helper to evaluate theoretical payout for any given pocket number
    const getNumberPayout = (num) => {
      const color = getNumberColor(num);
      let p = 0;
      for (const [key, amount] of Object.entries(bets)) {
        if (amount <= 0) continue;
        if (key.startsWith("num_")) {
          const target = Number(key.replace("num_", ""));
          if (target === num) p += amount * 36;
        }
        if (key === "red" && color === "red") p += amount * 2;
        if (key === "black" && color === "black") p += amount * 2;
        if (num > 0) {
          if (key === "even" && num % 2 === 0) p += amount * 2;
          if (key === "odd" && num % 2 !== 0) p += amount * 2;
          if (key === "low" && num >= 1 && num <= 18) p += amount * 2;
          if (key === "high" && num >= 19 && num <= 36) p += amount * 2;
          if (key === "doz1" && num >= 1 && num <= 12) p += amount * 3;
          if (key === "doz2" && num >= 13 && num <= 24) p += amount * 3;
          if (key === "doz3" && num >= 25 && num <= 36) p += amount * 3;
        }
      }
      return p;
    };

    const winningPockets = ROULETTE_NUMBERS.filter((n) => getNumberPayout(n) > 0);
    const losingPockets = ROULETTE_NUMBERS.filter((n) => getNumberPayout(n) === 0);

    let finalNumber;
    if (willWin && winningPockets.length > 0) {
      finalNumber = winningPockets[Math.floor(Math.random() * winningPockets.length)];
    } else if (!willWin && losingPockets.length > 0) {
      // Near-miss algorithm: pick adjacent pocket if player bet straight numbers
      const playerNumBets = Object.keys(bets).filter((k) => k.startsWith("num_") && bets[k] > 0);
      let nearMissFound = false;

      if (playerNumBets.length > 0 && Math.random() < 0.45) {
        const targetNum = Number(playerNumBets[Math.floor(Math.random() * playerNumBets.length)].replace("num_", ""));
        const targetIdx = ROULETTE_NUMBERS.indexOf(targetNum);
        if (targetIdx !== -1) {
          const neighborIdx = (targetIdx + (Math.random() < 0.5 ? 1 : -1) + ROULETTE_NUMBERS.length) % ROULETTE_NUMBERS.length;
          const candidateNeighbor = ROULETTE_NUMBERS[neighborIdx];
          if (getNumberPayout(candidateNeighbor) === 0) {
            finalNumber = candidateNeighbor;
            nearMissFound = true;
          }
        }
      }

      if (!nearMissFound) {
        finalNumber = losingPockets[Math.floor(Math.random() * losingPockets.length)];
      }
    } else {
      finalNumber = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
    }

    setWinningNumber(finalNumber);
    rouletteAudio.playWheelSpin();
    setMustSpin(true);
  };

  const onWheelStop = () => {
    setMustSpin(false);
    rouletteAudio.playBallDrop();

    const winNum = winningNumber;
    const winColor = getNumberColor(winNum);

    // Update history
    setHistory((prev) => [{ num: winNum, color: winColor }, ...prev.slice(0, 7)]);

    // Evaluate payouts
    let payout = 0;
    for (const [key, amount] of Object.entries(bets)) {
      if (amount <= 0) continue;

      // Straight up number
      if (key.startsWith("num_")) {
        const target = Number(key.replace("num_", ""));
        if (target === winNum) {
          payout += amount * 36; // 35:1 + stake
        }
      }

      // Color bets
      if (key === "red" && winColor === "red") payout += amount * 2;
      if (key === "black" && winColor === "black") payout += amount * 2;

      // Even / Odd & Ranges (0 does not win outside bets)
      if (winNum > 0) {
        if (key === "even" && winNum % 2 === 0) payout += amount * 2;
        if (key === "odd" && winNum % 2 !== 0) payout += amount * 2;
        if (key === "low" && winNum >= 1 && winNum <= 18) payout += amount * 2;
        if (key === "high" && winNum >= 19 && winNum <= 36) payout += amount * 2;

        // Dozens (2:1)
        if (key === "doz1" && winNum >= 1 && winNum <= 12) payout += amount * 3;
        if (key === "doz2" && winNum >= 13 && winNum <= 24) payout += amount * 3;
        if (key === "doz3" && winNum >= 25 && winNum <= 36) payout += amount * 3;
      }
    }

    if (payout > 0) {
      setLastWin(payout);
      addChips(
        payout,
        "Roulette",
        `Roulette Win on ${winNum} ${winColor.toUpperCase()} (+${formatPHP(payout)})`
      );
      setTimeout(() => {
        rouletteAudio.playWinFanfare(payout >= totalBet * 5);
      }, 200);
      toast.success(`🎉 Winning Pocket ${winNum} ${winColor.toUpperCase()}! You won ${formatPHP(payout)}!`);
    } else {
      setLastWin(0);
      setTimeout(() => {
        rouletteAudio.playLossTone();
      }, 200);
      toast.info(`Wheel landed on ${winNum} (${winColor.toUpperCase()}). Better luck on next spin!`);
    }
  };

  // 12 columns x 3 rows matrix for European numbers
  const numberMatrixRows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1100,
        mx: "auto",
        px: { xs: 0.8, sm: 2, md: 3 },
        py: { xs: 0.5, md: 2 },
        color: "#fff",
        // USER REQUIREMENT: Fit in mobile with NO SCROLLING DOWN
        height: { xs: "calc(100dvh - 60px)", md: "auto" },
        maxHeight: { xs: "calc(100vh - 60px)", md: "none" },
        overflowY: { xs: "hidden", md: "visible" },
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* 1. TOP COMPACT HEADER (Height ~38px on mobile) */}
      <Paper
        elevation={4}
        sx={{
          px: { xs: 1.2, sm: 2 },
          py: { xs: 0.6, sm: 1 },
          borderRadius: 2.5,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          border: "1.5px solid #f59e0b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 900,
              color: "#fbbf24",
              fontSize: { xs: "0.78rem", sm: "1rem" },
              letterSpacing: 0.5,
              lineHeight: 1,
            }}
          >
            ROULETTE 37 🇵🇭
          </Typography>

          <IconButton
            size="small"
            onClick={handleToggleMute}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            sx={{
              color: isMuted ? "#94a3b8" : "#fbbf24",
              p: 0.4,
              border: "1px solid #475569",
              bgcolor: "rgba(15, 23, 42, 0.7)",
            }}
          >
            {isMuted ? <VolumeOffIcon sx={{ fontSize: 15 }} /> : <VolumeUpIcon sx={{ fontSize: 15 }} />}
          </IconButton>
        </Box>

        {/* History Dots Strip */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, fontSize: "0.62rem", display: { xs: "none", sm: "block" } }}>
            RECENT:
          </Typography>
          {history.slice(0, 5).map((h, i) => (
            <Box
              key={i}
              sx={{
                width: { xs: 20, sm: 24 },
                height: { xs: 20, sm: 24 },
                borderRadius: "50%",
                background: h.color === "red" ? "#dc2626" : h.color === "green" ? "#16a34a" : "#111827",
                border: "1px solid #fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: { xs: "0.62rem", sm: "0.72rem" },
                color: "#fff",
              }}
            >
              {h.num}
            </Box>
          ))}
        </Box>

        {/* Balance Display */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.6,
            bgcolor: "rgba(245, 158, 11, 0.15)",
            border: "1px solid #f59e0b",
            px: 1.2,
            py: 0.3,
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, fontSize: "0.6rem" }}>
            BAL
          </Typography>
          <Typography variant="subtitle2" sx={{ color: "#34d399", fontWeight: 900, fontFamily: "monospace", fontSize: { xs: "0.78rem", sm: "0.9rem" }, lineHeight: 1 }}>
            {formatPHP(chips)}
          </Typography>
        </Box>
      </Paper>

      {/* 2. WHEEL ARENA WITH INTEGRATED CENTER SPIN BUTTON (Flex Grow, Centered) */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: { xs: 0.5, md: 1 },
          flexShrink: 0,
        }}
      >
        <Ruleta
          winningNumber={winningNumber}
          mustSpin={mustSpin}
          onSpinComplete={onWheelStop}
          onSpinClick={handleSpinClick}
          totalBet={totalBet}
          lastWin={lastWin}
          chips={chips}
        />

        {/* Micro Result Ticker */}
        <Box sx={{ mt: 0.5, textAlign: "center", minHeight: 22 }}>
          {lastWin !== null ? (
            lastWin > 0 ? (
              <Chip
                size="small"
                label={`🎉 Pocket ${winningNumber} (${getNumberColor(winningNumber).toUpperCase()}) • WON +${formatPHP(lastWin)}!`}
                sx={{
                  bgcolor: "#16a34a",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "0.75rem",
                  border: "1.5px solid #fbbf24",
                  height: 24,
                }}
              />
            ) : (
              <Chip
                size="small"
                label={`Result: Pocket ${winningNumber} (${getNumberColor(winningNumber).toUpperCase()})`}
                sx={{
                  bgcolor: "#334155",
                  color: "#e2e8f0",
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  height: 22,
                }}
              />
            )
          ) : totalBet > 0 ? (
            <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: 900, fontSize: "0.72rem" }}>
              ✨ Total Bet: <strong>{formatPHP(totalBet)}</strong> • Tap Center Gold Hub to <strong>SPIN</strong>
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, fontSize: "0.68rem" }}>
              Place bets below • Tap Center to SPIN
            </Typography>
          )}
        </Box>
      </Box>

      {/* 3. TOUCH BETTING BOARD (Optimized for Mobile No-Scroll + Desktop Expansive) */}
      <Paper
        elevation={6}
        sx={{
          p: { xs: 0.8, sm: 1.5, md: 2 },
          borderRadius: 3,
          background: "linear-gradient(180deg, #064e3b 0%, #022c22 100%)",
          border: "2px solid #10b981",
          flexShrink: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Mobile Tab Switcher: OUTSIDE BETS | ALL NUMBERS | FUN BETS */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            gap: 0.5,
            mb: 0.8,
            p: 0.3,
            bgcolor: "#022c22",
            borderRadius: 2,
            border: "1px solid #047857",
          }}
        >
          <Button
            fullWidth
            size="small"
            onClick={() => setMobileTab("outside")}
            sx={{
              py: 0.4,
              fontSize: "0.72rem",
              fontWeight: 900,
              borderRadius: 1.5,
              textTransform: "none",
              color: mobileTab === "outside" ? "#000" : "#94a3b8",
              bgcolor: mobileTab === "outside" ? "#fbbf24" : "transparent",
              "&:hover": { bgcolor: mobileTab === "outside" ? "#f59e0b" : "rgba(255,255,255,0.05)" },
            }}
          >
            Outside (1:1 & 2:1)
          </Button>

          <Button
            fullWidth
            size="small"
            onClick={() => setMobileTab("numbers")}
            sx={{
              py: 0.4,
              fontSize: "0.72rem",
              fontWeight: 900,
              borderRadius: 1.5,
              textTransform: "none",
              color: mobileTab === "numbers" ? "#000" : "#94a3b8",
              bgcolor: mobileTab === "numbers" ? "#fbbf24" : "transparent",
              "&:hover": { bgcolor: mobileTab === "numbers" ? "#f59e0b" : "rgba(255,255,255,0.05)" },
            }}
          >
            Numbers (0-36)
          </Button>

          <Button
            fullWidth
            size="small"
            onClick={() => setMobileTab("fun")}
            sx={{
              py: 0.4,
              fontSize: "0.72rem",
              fontWeight: 900,
              borderRadius: 1.5,
              textTransform: "none",
              color: mobileTab === "fun" ? "#000" : "#94a3b8",
              bgcolor: mobileTab === "fun" ? "#fbbf24" : "transparent",
              "&:hover": { bgcolor: mobileTab === "fun" ? "#f59e0b" : "rgba(255,255,255,0.05)" },
            }}
          >
            ⭐ Fun Bets
          </Button>
        </Box>

        {/* --- VIEW A: OUTSIDE BETS (Red, Black, Even, Odd, Low, High, Dozens) --- */}
        <Box sx={{ display: { xs: mobileTab === "outside" ? "block" : "none", md: "block" } }}>
          {/* Row 1: Primary Colors (Red / Black) */}
          <Grid container spacing={0.6} sx={{ mb: 0.6 }}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => handlePlaceBet("red")}
                sx={{
                  py: { xs: 0.9, sm: 1.1 },
                  background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                  border: bets["red"] ? "2.5px solid #fbbf24" : "1px solid #f87171",
                  color: "#fff",
                  fontWeight: 950,
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  borderRadius: 2,
                  boxShadow: bets["red"] ? "0 0 12px rgba(239, 68, 68, 0.7)" : undefined,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                🔴 RED (1:1)
                {bets["red"] && (
                  <Box sx={{ bgcolor: "#fbbf24", color: "#000", px: 0.8, py: 0.1, borderRadius: 1.5, fontSize: "0.68rem", fontWeight: 900 }}>
                    {formatPHP(bets["red"])}
                  </Box>
                )}
              </Button>
            </Grid>

            <Grid item xs={6}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => handlePlaceBet("black")}
                sx={{
                  py: { xs: 0.9, sm: 1.1 },
                  background: "linear-gradient(135deg, #334155 0%, #0f172a 100%)",
                  border: bets["black"] ? "2.5px solid #fbbf24" : "1px solid #64748b",
                  color: "#fff",
                  fontWeight: 950,
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  borderRadius: 2,
                  boxShadow: bets["black"] ? "0 0 12px rgba(251, 191, 36, 0.5)" : undefined,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                ⚫ BLACK (1:1)
                {bets["black"] && (
                  <Box sx={{ bgcolor: "#fbbf24", color: "#000", px: 0.8, py: 0.1, borderRadius: 1.5, fontSize: "0.68rem", fontWeight: 900 }}>
                    {formatPHP(bets["black"])}
                  </Box>
                )}
              </Button>
            </Grid>
          </Grid>

          {/* Row 2: Even-Money Bets (Low 1-18, Even, Odd, High 19-36) */}
          <Grid container spacing={0.6} sx={{ mb: 0.6 }}>
            {[
              { key: "low", label: "1-18" },
              { key: "even", label: "EVEN" },
              { key: "odd", label: "ODD" },
              { key: "high", label: "19-36" },
            ].map((b) => (
              <Grid item xs={3} key={b.key}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handlePlaceBet(b.key)}
                  sx={{
                    py: { xs: 0.6, sm: 0.8 },
                    background: "#0f172a",
                    border: bets[b.key] ? "2px solid #fbbf24" : "1px solid #334155",
                    color: "#e2e8f0",
                    fontWeight: 900,
                    fontSize: { xs: "0.72rem", sm: "0.82rem" },
                    borderRadius: 1.5,
                  }}
                >
                  {b.label}
                  {bets[b.key] && (
                    <Box sx={{ ml: 0.5, bgcolor: "#fbbf24", color: "#000", px: 0.5, borderRadius: 1, fontSize: "0.58rem" }}>
                      {formatPHP(bets[b.key])}
                    </Box>
                  )}
                </Button>
              </Grid>
            ))}
          </Grid>

          {/* Row 3: Dozens (1st 12, 2nd 12, 3rd 12 • 2:1) */}
          <Grid container spacing={0.6}>
            {[
              { key: "doz1", label: "1st 12 (1-12) 2:1" },
              { key: "doz2", label: "2nd 12 (13-24) 2:1" },
              { key: "doz3", label: "3rd 12 (25-36) 2:1" },
            ].map((d) => (
              <Grid item xs={4} key={d.key}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handlePlaceBet(d.key)}
                  sx={{
                    py: { xs: 0.5, sm: 0.7 },
                    fontSize: { xs: "0.68rem", sm: "0.78rem" },
                    borderColor: bets[d.key] ? "#fbbf24" : "#10b981",
                    borderWidth: 1.5,
                    bgcolor: bets[d.key] ? "rgba(251, 191, 36, 0.25)" : "rgba(0,0,0,0.35)",
                    color: "#fff",
                    fontWeight: 900,
                    borderRadius: 1.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.label} {bets[d.key] && `(${formatPHP(bets[d.key])})`}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* --- VIEW B: NUMBERS 0-36 (European 37-Pocket Matrix) --- */}
        <Box
          sx={{
            display: { xs: mobileTab === "numbers" ? "block" : "none", md: "block" },
            mt: { xs: 0, md: 1 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 0.4,
              overflowX: "auto",
              pb: 0.5,
              "-webkit-overflow-scrolling": "touch",
            }}
          >
            {/* Zero pocket */}
            <Button
              variant="contained"
              onClick={() => handlePlaceBet("num_0")}
              sx={{
                minWidth: { xs: 34, sm: 40 },
                width: { xs: 34, sm: 40 },
                minHeight: { xs: 80, sm: 94 },
                background: "#16a34a",
                border: bets["num_0"] ? "2px solid #fbbf24" : "1px solid #4ade80",
                fontWeight: 950,
                fontSize: { xs: "0.95rem", sm: "1.1rem" },
                position: "relative",
                borderRadius: 1.5,
                p: 0,
                "&:hover": { bgcolor: "#15803d" },
              }}
            >
              0
              {bets["num_0"] && (
                <Box sx={{ position: "absolute", bottom: 2, bgcolor: "#fbbf24", color: "#000", px: 0.4, borderRadius: 1, fontSize: "0.55rem", fontWeight: 900 }}>
                  {formatPHP(bets["num_0"])}
                </Box>
              )}
            </Button>

            {/* 3 Rows x 12 Cols Grid */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4, flexGrow: 1 }}>
              {numberMatrixRows.map((row, rIdx) => (
                <Box key={rIdx} sx={{ display: "flex", gap: 0.4 }}>
                  {row.map((num) => {
                    const color = getNumberColor(num);
                    const key = `num_${num}`;
                    const hasBet = bets[key];
                    return (
                      <Button
                        key={num}
                        onClick={() => handlePlaceBet(key)}
                        sx={{
                          flex: 1,
                          minWidth: { xs: 23, sm: 28 },
                          height: { xs: 24, sm: 28 },
                          p: 0,
                          background: color === "red" ? "#dc2626" : "#0f172a",
                          color: "#fff",
                          fontWeight: 900,
                          fontSize: { xs: "0.72rem", sm: "0.82rem" },
                          border: hasBet ? "2px solid #fbbf24" : "1px solid #475569",
                          borderRadius: 1,
                          position: "relative",
                          "&:hover": {
                            filter: "brightness(1.2)",
                            background: color === "red" ? "#ef4444" : "#1e293b",
                          },
                        }}
                      >
                        {num}
                        {hasBet && (
                          <Box sx={{ position: "absolute", top: -4, right: -2, bgcolor: "#fbbf24", color: "#000", px: 0.3, borderRadius: 0.8, fontSize: "0.5rem", fontWeight: 900, lineHeight: 1 }}>
                            {formatPHP(hasBet)}
                          </Box>
                        )}
                      </Button>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* --- VIEW C: FUN BETS (Mobile Tab / Quick Actions) --- */}
        <Box sx={{ display: { xs: mobileTab === "fun" ? "block" : "none", md: "none" } }}>
          <Grid container spacing={0.8}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleLuckyBet}
                startIcon={<CasinoIcon />}
                sx={{
                  py: 1,
                  background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
                  border: "1.5px solid #a78bfa",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "0.75rem",
                  borderRadius: 2,
                }}
              >
                🎲 Lucky Number (35:1)
              </Button>
            </Grid>

            <Grid item xs={6}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleHotNumbersBet}
                startIcon={<WhatshotIcon />}
                sx={{
                  py: 1,
                  background: "linear-gradient(135deg, #ea580c 0%, #9a3412 100%)",
                  border: "1.5px solid #fb923c",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "0.75rem",
                  borderRadius: 2,
                }}
              >
                🔥 Bet Hot Numbers
              </Button>
            </Grid>

            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handlePlaceBet("red")}
                sx={{
                  py: 0.8,
                  borderColor: "#ef4444",
                  color: "#fca5a5",
                  fontWeight: 900,
                  fontSize: "0.72rem",
                  bgcolor: "rgba(239, 68, 68, 0.15)",
                }}
              >
                🔴 All Red (+1:1)
              </Button>
            </Grid>

            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handlePlaceBet("black")}
                sx={{
                  py: 0.8,
                  borderColor: "#94a3b8",
                  color: "#e2e8f0",
                  fontWeight: 900,
                  fontSize: "0.72rem",
                  bgcolor: "rgba(51, 65, 85, 0.3)",
                }}
              >
                ⚫ All Black (+1:1)
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* 4. BOTTOM ACTION DOCK (Chips Selector, Clear, 2X, Total Stake) */}
      <Paper
        elevation={4}
        sx={{
          px: { xs: 1, sm: 2 },
          py: { xs: 0.6, sm: 1 },
          borderRadius: 2.5,
          background: "#0f172a",
          border: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        {/* Chip Denominations in Philippine Peso */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.4, sm: 0.6 }, overflowX: "auto" }}>
          {CHIP_DENOMINATIONS.map((amt) => {
            const isSelected = selectedChip === amt;
            return (
              <Box
                key={amt}
                onClick={() => {
                  setSelectedChip(amt);
                  rouletteAudio.playChipClink();
                }}
                sx={{
                  width: { xs: 34, sm: 40 },
                  height: { xs: 34, sm: 40 },
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: { xs: "0.62rem", sm: "0.72rem" },
                  fontFamily: "monospace",
                  background: isSelected
                    ? "radial-gradient(circle at 35% 35%, #fef08a 0%, #f59e0b 50%, #b45309 100%)"
                    : "radial-gradient(circle at 35% 35%, #334155 0%, #1e293b 60%, #0f172a 100%)",
                  color: isSelected ? "#000" : "#fff",
                  border: isSelected ? "2.5px solid #fef08a" : "1.5px dashed #64748b",
                  boxShadow: isSelected ? "0 0 12px rgba(245, 158, 11, 0.8)" : "0 2px 4px rgba(0,0,0,0.5)",
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  transition: "all 0.15s ease",
                  userSelect: "none",
                  flexShrink: 0,
                }}
              >
                ₱{amt}
              </Box>
            );
          })}
        </Box>

        {/* Action Controls & Total Stake */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.6, sm: 1 }, flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearBets}
            disabled={mustSpin || totalBet === 0}
            sx={{
              fontWeight: 800,
              minWidth: { xs: 42, sm: 54 },
              px: { xs: 0.8, sm: 1.5 },
              py: 0.5,
              fontSize: { xs: "0.68rem", sm: "0.75rem" },
              borderColor: "#ef4444",
              color: "#fca5a5",
              borderRadius: 1.5,
            }}
          >
            Clear
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={handleDoubleBets}
            disabled={mustSpin || totalBet === 0}
            sx={{
              fontWeight: 800,
              minWidth: { xs: 36, sm: 48 },
              px: { xs: 0.8, sm: 1.5 },
              py: 0.5,
              fontSize: { xs: "0.68rem", sm: "0.75rem" },
              borderColor: "#f59e0b",
              color: "#fde047",
              borderRadius: 1.5,
            }}
          >
            2x
          </Button>

          {/* Desktop Only Extra SPIN button (Mobile already has Spin inside the wheel) */}
          <Button
            variant="contained"
            disabled={mustSpin || totalBet === 0 || chips < totalBet}
            onClick={handleSpinClick}
            sx={{
              display: { xs: "none", md: "inline-flex" },
              px: 3,
              py: 0.6,
              fontSize: "0.9rem",
              fontWeight: 900,
              background: "linear-gradient(45deg, #f59e0b, #fbbf24)",
              color: "#000",
              borderRadius: 2,
              boxShadow: "0 0 15px rgba(245, 158, 11, 0.4)",
              "&:hover": {
                background: "linear-gradient(45deg, #d97706, #f59e0b)",
              },
            }}
          >
            {mustSpin ? "SPINNING" : "SPIN (₱" + totalBet + ")"}
          </Button>
        </Box>
      </Paper>

      <ToastContainer theme="dark" position="top-right" autoClose={2500} />
    </Box>
  );
}
