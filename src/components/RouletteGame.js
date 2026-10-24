import React, { useState } from "react";
import Ruleta, { ROULETTE_NUMBERS, RED_NUMBERS, getNumberColor } from "./Roulette";
import {
  Grid,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import CachedIcon from '@mui/icons-material/Cached';
import CasinoIcon from '@mui/icons-material/Casino';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { ToastContainer, toast } from "react-toastify";
import { useFirebaseCasino } from "../context/FirebaseCasinoContext";
import { formatPHP } from "../utils/formatCurrency";
import { rouletteAudio } from "../utils/rouletteAudio";
import "react-toastify/dist/ReactToastify.css";

// Authentic Playtech Casino Chip Denominations (in Philippine Peso)
const CHIP_DENOMINATIONS = [
  { value: 10, label: "10", color: "#ec4899", border: "#f472b6", text: "#fff" },    // Pink/Magenta
  { value: 25, label: "25", color: "#06b6d4", border: "#22d3ee", text: "#000" },    // Cyan
  { value: 50, label: "50", color: "#2563eb", border: "#60a5fa", text: "#fff" },    // Blue
  { value: 100, label: "100", color: "#7c3aed", border: "#a78bfa", text: "#fff" },  // Purple
  { value: 500, label: "500", color: "#dc2626", border: "#f87171", text: "#fff" },  // Red
  { value: 1000, label: "1K", color: "#d97706", border: "#fbbf24", text: "#000" },  // Gold
];

export default function RouletteGame() {
  const { chips, addChips, deductChips, casinoConfig } = useFirebaseCasino();

  const [isMuted, setIsMuted] = useState(rouletteAudio.isMuted);
  const [selectedChip, setSelectedChip] = useState(25);
  const [bets, setBets] = useState({}); // { betKey: amount }
  const [betHistory, setBetHistory] = useState([]); // [ { key, amount } ] for Undo
  const [mustSpin, setMustSpin] = useState(false);
  const [winningNumber, setWinningNumber] = useState(0);
  const [lastWin, setLastWin] = useState(null);
  const [history, setHistory] = useState([
    { num: 32, color: 'red' },
    { num: 15, color: 'black' },
    { num: 19, color: 'red' },
    { num: 0, color: 'green' },
    { num: 26, color: 'black' },
    { num: 21, color: 'red' },
  ]);

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  const handleToggleMute = () => {
    const nextMute = rouletteAudio.toggleMute();
    setIsMuted(nextMute);
    if (!nextMute) {
      rouletteAudio.playChipClink();
    }
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
    setBetHistory((prev) => [...prev, { key: betKey, amount: selectedChip }]);
  };

  const handleUndo = () => {
    if (mustSpin || betHistory.length === 0) return;
    rouletteAudio.playChipClink();
    const lastAction = betHistory[betHistory.length - 1];
    setBets((prev) => {
      const next = { ...prev };
      if (next[lastAction.key]) {
        next[lastAction.key] -= lastAction.amount;
        if (next[lastAction.key] <= 0) {
          delete next[lastAction.key];
        }
      }
      return next;
    });
    setBetHistory((prev) => prev.slice(0, prev.length - 1));
  };

  const handleClearBets = () => {
    if (mustSpin || totalBet === 0) return;
    rouletteAudio.playChipSweep();
    setBets({});
    setBetHistory([]);
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
        if (key === "col1" && (num - 1) % 3 === 0) p += amount * 3;
        if (key === "col2" && (num - 2) % 3 === 0) p += amount * 3;
        if (key === "col3" && num % 3 === 0) p += amount * 3;
      }
    }
    return p;
  };

  // Coverage percentage indicator (as shown in Playtech design: "COVERAGE: 49%")
  const calculateCoverage = () => {
    if (totalBet === 0) return 0;
    let winCount = 0;
    for (const num of ROULETTE_NUMBERS) {
      if (getNumberPayout(num) > 0) {
        winCount++;
      }
    }
    return Math.round((winCount / 37) * 100);
  };

  const handleSpinClick = async () => {
    if (mustSpin) return;
    if (totalBet === 0) {
      rouletteAudio.playChipClink();
      toast.info("👉 Place chips on the betting table, then click SPIN!");
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
    setHistory((prev) => [{ num: winNum, color: winColor }, ...prev.slice(0, 9)]);

    const payout = getNumberPayout(winNum);

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

  // Playtech Matrix: 3 rows x 12 cols
  // Row 1: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36 (2to1 col3)
  // Row 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 (2to1 col2)
  // Row 3: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34 (2to1 col1)
  const rows = [
    { nums: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], colKey: "col3" },
    { nums: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], colKey: "col2" },
    { nums: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], colKey: "col1" },
  ];

  const coverage = calculateCoverage();

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1200,
        mx: "auto",
        position: "relative",
        background: "radial-gradient(ellipse at 50% 35%, #065f46 0%, #044432 50%, #022c22 85%, #011b15 100%)",
        border: "3px solid #10b981",
        borderRadius: 3,
        boxShadow: "0 10px 40px rgba(0,0,0,0.9), inset 0 0 60px rgba(0,0,0,0.7)",
        color: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        userSelect: "none",
        // Desktop PC Chrome Viewport: zero vertical scrolling
        height: { xs: "calc(100dvh - 65px)", md: "calc(100vh - 105px)" },
        maxHeight: { xs: "none", md: "780px" },
        p: { xs: 0.5, sm: 1, md: 1.2 },
        boxSizing: "border-box",
      }}
    >
      {/* 1. TOP STATUS BAR (Playtech Header Banner) */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: { xs: 1, sm: 2 },
          py: 0.4,
          borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: "0.72rem", sm: "0.85rem" },
              letterSpacing: 1.5,
              color: "#e2e8f0",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            PREMIUM EUROPEAN ROULETTE™
          </Typography>
          <Box
            sx={{
              bgcolor: "rgba(245, 158, 11, 0.2)",
              border: "1px solid #f59e0b",
              px: 0.8,
              py: 0.1,
              borderRadius: 1,
              fontSize: "0.6rem",
              fontWeight: 900,
              color: "#fbbf24",
              display: { xs: "none", sm: "block" },
            }}
          >
            PLAYING FOR REAL
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "0.75rem",
              letterSpacing: 1,
              color: "#94a3b8",
              display: { xs: "none", md: "block" },
            }}
          >
            PLAYTECH ORIGINS
          </Typography>

          <IconButton
            size="small"
            onClick={handleToggleMute}
            sx={{
              color: isMuted ? "#94a3b8" : "#fbbf24",
              p: 0.4,
              border: "1px solid #475569",
              bgcolor: "rgba(15, 23, 42, 0.6)",
            }}
          >
            {isMuted ? <VolumeOffIcon sx={{ fontSize: 16 }} /> : <VolumeUpIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Box>
      </Box>

      {/* 2. UPPER DECK: TABLE LIMITS + MAHOGANY WHEEL + HISTORY GRID */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: { xs: 0.5, md: 2 },
          py: { xs: 0.2, md: 0.6 },
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Left: Table Limits Plaque */}
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)",
            color: "#0f172a",
            px: 1.2,
            py: 0.6,
            borderRadius: 1,
            border: "1.5px solid #64748b",
            boxShadow: "0 4px 10px rgba(0,0,0,0.6)",
            minWidth: 90,
            lineHeight: 1.1,
          }}
        >
          <Typography sx={{ fontSize: "0.58rem", fontWeight: 800 }}>MIN: ₱10.00</Typography>
          <Typography sx={{ fontSize: "0.58rem", fontWeight: 800 }}>MAX: ₱1,000.00</Typography>
          <Box sx={{ borderTop: "1px solid #64748b", width: "100%", my: 0.3 }} />
          <Typography sx={{ fontSize: "0.54rem", fontWeight: 900, textTransform: "uppercase" }}>TABLE MAX</Typography>
          <Typography sx={{ fontSize: "0.62rem", fontWeight: 900, fontFamily: "monospace" }}>₱50,000.00</Typography>
        </Box>

        {/* Center: Full Circle Roulette Wheel in Polished Mahogany Frame */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexGrow: 1,
            position: "relative",
            zIndex: 10,
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
        </Box>

        {/* Right: History Board (Playtech Grid Style) */}
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            flexDirection: "column",
            alignItems: "center",
            bgcolor: "rgba(15, 23, 42, 0.75)",
            border: "1.5px solid #475569",
            borderRadius: 1.5,
            p: 0.6,
            minWidth: 84,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          <Typography sx={{ fontSize: "0.58rem", fontWeight: 900, color: "#94a3b8", mb: 0.4, letterSpacing: 1 }}>
            HISTORY
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0.4 }}>
            {history.slice(0, 6).map((h, i) => (
              <Box
                key={i}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: 0.5,
                  background: h.color === "red" ? "#dc2626" : h.color === "green" ? "#16a34a" : "#0f172a",
                  border: "1px solid rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "0.65rem",
                  color: "#fff",
                }}
              >
                {h.num}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 3. CENTER ARENA: PLAYTECH CHIPS (LEFT) + FELT TABLE (CENTER) + ACTIONS (RIGHT) */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: { xs: 0.5, md: 1.5 },
          px: { xs: 0.5, md: 1 },
          flexGrow: 1,
          overflow: "visible",
        }}
      >
        {/* LEFT: VERTICAL CHIP RACK (Playtech Oval Rail Style) */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: { xs: 0.5, md: 0.8 },
            bgcolor: "rgba(15, 23, 42, 0.65)",
            border: "2px solid #334155",
            borderRadius: 4,
            px: { xs: 0.4, md: 0.6 },
            py: { xs: 0.6, md: 1 },
            boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
            flexShrink: 0,
          }}
        >
          {CHIP_DENOMINATIONS.map((c) => {
            const isSelected = selectedChip === c.value;
            return (
              <Box
                key={c.value}
                onClick={() => {
                  setSelectedChip(c.value);
                  rouletteAudio.playChipClink();
                }}
                sx={{
                  width: { xs: 28, sm: 34, md: 38 },
                  height: { xs: 28, sm: 34, md: 38 },
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontWeight: 950,
                  fontSize: { xs: "0.6rem", sm: "0.68rem", md: "0.75rem" },
                  fontFamily: "monospace",
                  background: `radial-gradient(circle at 35% 35%, #fff 0%, ${c.color} 40%, #000 100%)`,
                  color: c.text,
                  border: isSelected ? "3px solid #fbbf24" : `2px dashed ${c.border}`,
                  boxShadow: isSelected
                    ? "0 0 14px #fbbf24, 0 4px 8px rgba(0,0,0,0.8)"
                    : "0 2px 5px rgba(0,0,0,0.7)",
                  transform: isSelected ? "scale(1.15)" : "scale(1)",
                  transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {c.label}
              </Box>
            );
          })}
        </Box>

        {/* CENTER: AUTHENTIC PLAYTECH EUROPEAN FELT TABLE */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            minWidth: 0,
          }}
        >
          {/* Coverage Bar Indicator (Directly above 0 pocket as in screenshot) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              mb: 0.3,
              alignSelf: "flex-start",
              ml: { xs: 0, sm: 1 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "0.58rem", sm: "0.65rem" },
                fontWeight: 900,
                color: "#94a3b8",
                letterSpacing: 0.5,
              }}
            >
              COVERAGE: <strong style={{ color: coverage > 0 ? "#34d399" : "#e2e8f0" }}>{coverage}%</strong>
            </Typography>
            <Box
              sx={{
                width: 60,
                height: 4,
                bgcolor: "#064e3b",
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid #047857",
              }}
            >
              <Box
                sx={{
                  width: `${coverage}%`,
                  height: "100%",
                  bgcolor: "#10b981",
                  transition: "width 0.2s ease",
                }}
              />
            </Box>
          </Box>

          {/* Table Surface */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: 720,
              border: "2px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
              bgcolor: "rgba(0,0,0,0.25)",
              overflowX: "auto",
            }}
          >
            {/* Top Grid Area: Green 0 on left + 3 Rows x 12 Cols of Numbers + 2to1 at right */}
            <Box sx={{ display: "flex", width: "100%" }}>
              {/* Green 0 Pocket (Rounded left bullet shape) */}
              <Button
                onClick={() => handlePlaceBet("num_0")}
                sx={{
                  minWidth: { xs: 34, sm: 46, md: 54 },
                  width: { xs: 34, sm: 46, md: 54 },
                  borderRight: "2px solid #e2e8f0",
                  borderTopLeftRadius: "24px",
                  borderBottomLeftRadius: "24px",
                  background: bets["num_0"]
                    ? "radial-gradient(circle, #15803d 0%, #14532d 100%)"
                    : "#15803d",
                  color: "#fff",
                  fontWeight: 950,
                  fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
                  p: 0,
                  position: "relative",
                  "&:hover": { bgcolor: "#16a34a" },
                }}
              >
                0
                {bets["num_0"] && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 4,
                      bgcolor: "#fbbf24",
                      color: "#000",
                      px: 0.5,
                      borderRadius: 1,
                      fontSize: "0.55rem",
                      fontWeight: 950,
                    }}
                  >
                    ₱{bets["num_0"]}
                  </Box>
                )}
              </Button>

              {/* 3 Rows x 12 Cols Numbers Grid */}
              <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                {rows.map((rowItem, rIdx) => (
                  <Box key={rIdx} sx={{ display: "flex", width: "100%", borderBottom: rIdx < 2 ? "1.5px solid #e2e8f0" : "none" }}>
                    {rowItem.nums.map((num, cIdx) => {
                      const color = getNumberColor(num);
                      const key = `num_${num}`;
                      const hasBet = bets[key];
                      return (
                        <Button
                          key={num}
                          onClick={() => handlePlaceBet(key)}
                          sx={{
                            flex: 1,
                            minWidth: { xs: 20, sm: 28, md: 36 },
                            height: { xs: 26, sm: 32, md: 36 },
                            p: 0,
                            background: color === "red" ? "#dc2626" : "#0f172a",
                            borderRight: cIdx < 11 ? "1.5px solid #e2e8f0" : "none",
                            color: "#fff",
                            fontWeight: 900,
                            fontSize: { xs: "0.75rem", sm: "0.9rem", md: "1.05rem" },
                            position: "relative",
                            borderRadius: 0,
                            "&:hover": {
                              filter: "brightness(1.2)",
                              background: color === "red" ? "#ef4444" : "#1e293b",
                            },
                          }}
                        >
                          {num}
                          {hasBet && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: -3,
                                right: -2,
                                bgcolor: "#fbbf24",
                                color: "#000",
                                px: 0.4,
                                borderRadius: 0.8,
                                fontSize: "0.52rem",
                                fontWeight: 950,
                                zIndex: 5,
                                boxShadow: "0 2px 4px rgba(0,0,0,0.8)",
                              }}
                            >
                              ₱{hasBet}
                            </Box>
                          )}
                        </Button>
                      );
                    })}

                    {/* 2to1 Column Bet on the far right */}
                    <Button
                      onClick={() => handlePlaceBet(rowItem.colKey)}
                      sx={{
                        minWidth: { xs: 30, sm: 40, md: 48 },
                        width: { xs: 30, sm: 40, md: 48 },
                        borderLeft: "2px solid #e2e8f0",
                        background: bets[rowItem.colKey] ? "rgba(251, 191, 36, 0.3)" : "transparent",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: { xs: "0.65rem", sm: "0.75rem" },
                        p: 0,
                        borderRadius: 0,
                        position: "relative",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                      }}
                    >
                      2to1
                      {bets[rowItem.colKey] && (
                        <Box sx={{ position: "absolute", bottom: 2, bgcolor: "#fbbf24", color: "#000", px: 0.3, borderRadius: 0.6, fontSize: "0.5rem", fontWeight: 950 }}>
                          ₱{bets[rowItem.colKey]}
                        </Box>
                      )}
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Row 4: Dozens (1st 12, 2nd 12, 3rd 12) */}
            <Box sx={{ display: "flex", borderTop: "2px solid #e2e8f0" }}>
              <Box sx={{ width: { xs: 34, sm: 46, md: 54 }, borderRight: "2px solid #e2e8f0", bgcolor: "rgba(0,0,0,0.2)" }} />
              <Box sx={{ display: "flex", flexGrow: 1 }}>
                {[
                  { key: "doz1", label: "1st 12" },
                  { key: "doz2", label: "2nd 12" },
                  { key: "doz3", label: "3rd 12" },
                ].map((d, idx) => (
                  <Button
                    key={d.key}
                    onClick={() => handlePlaceBet(d.key)}
                    sx={{
                      flex: 1,
                      height: { xs: 24, sm: 28, md: 32 },
                      borderRight: idx < 2 ? "2px solid #e2e8f0" : "none",
                      background: bets[d.key] ? "rgba(251, 191, 36, 0.3)" : "transparent",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: { xs: "0.72rem", sm: "0.85rem" },
                      p: 0,
                      borderRadius: 0,
                      position: "relative",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                    }}
                  >
                    {d.label}
                    {bets[d.key] && (
                      <Box sx={{ ml: 0.8, bgcolor: "#fbbf24", color: "#000", px: 0.4, borderRadius: 0.8, fontSize: "0.55rem", fontWeight: 950 }}>
                        ₱{bets[d.key]}
                      </Box>
                    )}
                  </Button>
                ))}
              </Box>
              <Box sx={{ width: { xs: 30, sm: 40, md: 48 }, borderLeft: "2px solid #e2e8f0", bgcolor: "rgba(0,0,0,0.2)" }} />
            </Box>

            {/* Row 5: Outside Bets (1-18, Even, Red Diamond, Black Diamond, Odd, 19-36) */}
            <Box sx={{ display: "flex", borderTop: "2px solid #e2e8f0" }}>
              <Box sx={{ width: { xs: 34, sm: 46, md: 54 }, borderRight: "2px solid #e2e8f0", bgcolor: "rgba(0,0,0,0.2)" }} />
              <Box sx={{ display: "flex", flexGrow: 1 }}>
                {/* 1 - 18 */}
                <Button
                  onClick={() => handlePlaceBet("low")}
                  sx={{
                    flex: 1,
                    height: { xs: 26, sm: 30, md: 34 },
                    borderRight: "2px solid #e2e8f0",
                    background: bets["low"] ? "rgba(251, 191, 36, 0.3)" : "transparent",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: { xs: "0.7rem", sm: "0.82rem" },
                    p: 0,
                    borderRadius: 0,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  1 - 18
                  {bets["low"] && <Box sx={{ ml: 0.5, bgcolor: "#fbbf24", color: "#000", px: 0.3, borderRadius: 0.6, fontSize: "0.5rem", fontWeight: 950 }}>₱{bets["low"]}</Box>}
                </Button>

                {/* Even */}
                <Button
                  onClick={() => handlePlaceBet("even")}
                  sx={{
                    flex: 1,
                    height: { xs: 26, sm: 30, md: 34 },
                    borderRight: "2px solid #e2e8f0",
                    background: bets["even"] ? "rgba(251, 191, 36, 0.3)" : "transparent",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: { xs: "0.7rem", sm: "0.82rem" },
                    p: 0,
                    borderRadius: 0,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  Even
                  {bets["even"] && <Box sx={{ ml: 0.5, bgcolor: "#fbbf24", color: "#000", px: 0.3, borderRadius: 0.6, fontSize: "0.5rem", fontWeight: 950 }}>₱{bets["even"]}</Box>}
                </Button>

                {/* RED DIAMOND (Playtech Authentic Symbol) */}
                <Button
                  onClick={() => handlePlaceBet("red")}
                  sx={{
                    flex: 1,
                    height: { xs: 26, sm: 30, md: 34 },
                    borderRight: "2px solid #e2e8f0",
                    background: bets["red"] ? "rgba(239, 68, 68, 0.4)" : "transparent",
                    p: 0,
                    borderRadius: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    "&:hover": { bgcolor: "rgba(239, 68, 68, 0.25)" },
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 18, sm: 22 },
                      height: { xs: 18, sm: 22 },
                      background: "#ef4444",
                      transform: "rotate(45deg)",
                      border: "2px solid #fff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {bets["red"] && (
                      <Box sx={{ transform: "rotate(-45deg)", fontSize: "0.5rem", fontWeight: 950, color: "#fff" }}>
                        ₱{bets["red"]}
                      </Box>
                    )}
                  </Box>
                </Button>

                {/* BLACK DIAMOND (Playtech Authentic Symbol) */}
                <Button
                  onClick={() => handlePlaceBet("black")}
                  sx={{
                    flex: 1,
                    height: { xs: 26, sm: 30, md: 34 },
                    borderRight: "2px solid #e2e8f0",
                    background: bets["black"] ? "rgba(15, 23, 42, 0.6)" : "transparent",
                    p: 0,
                    borderRadius: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 18, sm: 22 },
                      height: { xs: 18, sm: 22 },
                      background: "#09090b",
                      transform: "rotate(45deg)",
                      border: "2px solid #fff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {bets["black"] && (
                      <Box sx={{ transform: "rotate(-45deg)", fontSize: "0.5rem", fontWeight: 950, color: "#fbbf24" }}>
                        ₱{bets["black"]}
                      </Box>
                    )}
                  </Box>
                </Button>

                {/* Odd */}
                <Button
                  onClick={() => handlePlaceBet("odd")}
                  sx={{
                    flex: 1,
                    height: { xs: 26, sm: 30, md: 34 },
                    borderRight: "2px solid #e2e8f0",
                    background: bets["odd"] ? "rgba(251, 191, 36, 0.3)" : "transparent",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: { xs: "0.7rem", sm: "0.82rem" },
                    p: 0,
                    borderRadius: 0,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  Odd
                  {bets["odd"] && <Box sx={{ ml: 0.5, bgcolor: "#fbbf24", color: "#000", px: 0.3, borderRadius: 0.6, fontSize: "0.5rem", fontWeight: 950 }}>₱{bets["odd"]}</Box>}
                </Button>

                {/* 19 - 36 */}
                <Button
                  onClick={() => handlePlaceBet("high")}
                  sx={{
                    flex: 1,
                    height: { xs: 26, sm: 30, md: 34 },
                    background: bets["high"] ? "rgba(251, 191, 36, 0.3)" : "transparent",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: { xs: "0.7rem", sm: "0.82rem" },
                    p: 0,
                    borderRadius: 0,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                  }}
                >
                  19 - 36
                  {bets["high"] && <Box sx={{ ml: 0.5, bgcolor: "#fbbf24", color: "#000", px: 0.3, borderRadius: 0.6, fontSize: "0.5rem", fontWeight: 950 }}>₱{bets["high"]}</Box>}
                </Button>
              </Box>
              <Box sx={{ width: { xs: 30, sm: 40, md: 48 }, borderLeft: "2px solid #e2e8f0", bgcolor: "rgba(0,0,0,0.2)" }} />
            </Box>
          </Box>
        </Box>

        {/* RIGHT: 4 ROUND VERTICAL ACTION BUTTONS (UNDO, CLEAR, DOUBLE, SPIN) */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: { xs: 0.6, md: 1 },
            flexShrink: 0,
          }}
        >
          {/* 1. UNDO (Circular red button with curved arrow) */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Tooltip title="Undo Last Bet" placement="left">
              <span>
                <IconButton
                  disabled={mustSpin || betHistory.length === 0}
                  onClick={handleUndo}
                  sx={{
                    width: { xs: 30, sm: 36, md: 42 },
                    height: { xs: 30, sm: 36, md: 42 },
                    bgcolor: betHistory.length > 0 ? "#dc2626" : "#475569",
                    color: "#fff",
                    border: "2px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.5)",
                    "&:hover": { bgcolor: "#b91c1c" },
                  }}
                >
                  <UndoIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </span>
            </Tooltip>
            <Typography sx={{ fontSize: "0.52rem", fontWeight: 900, color: "#cbd5e1", mt: 0.2 }}>
              UNDO
            </Typography>
          </Box>

          {/* 2. CLEAR BETS (Circular red button with X) */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Tooltip title="Clear All Bets" placement="left">
              <span>
                <IconButton
                  disabled={mustSpin || totalBet === 0}
                  onClick={handleClearBets}
                  sx={{
                    width: { xs: 30, sm: 36, md: 42 },
                    height: { xs: 30, sm: 36, md: 42 },
                    bgcolor: totalBet > 0 ? "#dc2626" : "#475569",
                    color: "#fff",
                    border: "2px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.5)",
                    "&:hover": { bgcolor: "#b91c1c" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </span>
            </Tooltip>
            <Typography sx={{ fontSize: "0.52rem", fontWeight: 900, color: "#cbd5e1", mt: 0.2 }}>
              CLEAR BETS
            </Typography>
          </Box>

          {/* 3. DOUBLE (Circular golden button with x2) */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Tooltip title="Double All Bets" placement="left">
              <span>
                <IconButton
                  disabled={mustSpin || totalBet === 0}
                  onClick={handleDoubleBets}
                  sx={{
                    width: { xs: 30, sm: 36, md: 42 },
                    height: { xs: 30, sm: 36, md: 42 },
                    bgcolor: totalBet > 0 ? "#d97706" : "#475569",
                    color: "#000",
                    border: "2px solid #fbbf24",
                    boxShadow: "0 4px 10px rgba(245, 158, 11, 0.4)",
                    fontWeight: 950,
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    "&:hover": { bgcolor: "#b45309" },
                  }}
                >
                  x2
                </IconButton>
              </span>
            </Tooltip>
            <Typography sx={{ fontSize: "0.52rem", fontWeight: 900, color: "#fde047", mt: 0.2 }}>
              DOUBLE
            </Typography>
          </Box>

          {/* 4. SPIN (Circular bright green button with spin arrows) */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Tooltip title="Spin The Wheel" placement="left">
              <span>
                <IconButton
                  disabled={mustSpin || totalBet === 0 || chips < totalBet}
                  onClick={handleSpinClick}
                  sx={{
                    width: { xs: 36, sm: 44, md: 50 },
                    height: { xs: 36, sm: 44, md: 50 },
                    background: mustSpin
                      ? "#334155"
                      : totalBet > 0
                      ? "radial-gradient(circle at 35% 35%, #4ade80 0%, #16a34a 60%, #14532d 100%)"
                      : "#475569",
                    color: "#fff",
                    border: totalBet > 0 ? "3px solid #86efac" : "2px solid #64748b",
                    boxShadow: totalBet > 0 ? "0 0 18px rgba(34, 197, 94, 0.8), 0 4px 12px rgba(0,0,0,0.8)" : "none",
                    transform: totalBet > 0 ? "scale(1.08)" : "scale(1)",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      background: "radial-gradient(circle at 35% 35%, #22c55e 0%, #15803d 70%, #052e16 100%)",
                    },
                  }}
                >
                  <CachedIcon sx={{ fontSize: { xs: 22, sm: 26, md: 28 }, animation: mustSpin ? "spin 0.8s linear infinite" : "none" }} />
                </IconButton>
              </span>
            </Tooltip>
            <Typography sx={{ fontSize: "0.55rem", fontWeight: 950, color: "#86efac", mt: 0.2 }}>
              SPIN
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 4. BOTTOM STATUS BAR (YOUR BALANCE + PLACE YOUR BETS + TOTAL BET) */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: { xs: 1, sm: 2 },
          py: 0.5,
          borderTop: "1px solid rgba(255, 255, 255, 0.15)",
          bgcolor: "rgba(0, 0, 0, 0.5)",
          flexShrink: 0,
        }}
      >
        {/* Your Balance */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>
            YOUR BALANCE
          </Typography>
          <Typography sx={{ fontSize: { xs: "0.85rem", sm: "1.05rem" }, fontWeight: 950, color: "#34d399", fontFamily: "monospace", lineHeight: 1 }}>
            {formatPHP(chips)}
          </Typography>
        </Box>

        {/* Center Prompt / Win Announcer */}
        <Box sx={{ textAlign: "center", px: 1 }}>
          {lastWin !== null && lastWin > 0 ? (
            <Typography sx={{ fontSize: { xs: "0.75rem", sm: "0.95rem" }, fontWeight: 950, color: "#fde047" }}>
              🎉 POCKET {winningNumber} • YOU WON +{formatPHP(lastWin)}!
            </Typography>
          ) : mustSpin ? (
            <Typography sx={{ fontSize: { xs: "0.75rem", sm: "0.9rem" }, fontWeight: 900, color: "#fbbf24" }}>
              WHEEL SPINNING... GOOD LUCK!
            </Typography>
          ) : (
            <Box>
              <Typography sx={{ fontSize: { xs: "0.7rem", sm: "0.85rem" }, fontWeight: 900, color: "#e2e8f0", letterSpacing: 0.5 }}>
                PLACE YOUR BETS
              </Typography>
              <Typography sx={{ fontSize: "0.52rem", color: "#94a3b8" }}>
                Premium European Roulette™
              </Typography>
            </Box>
          )}
        </Box>

        {/* Total Bet */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <Typography sx={{ fontSize: "0.58rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>
            TOTAL BET
          </Typography>
          <Typography sx={{ fontSize: { xs: "0.85rem", sm: "1.05rem" }, fontWeight: 950, color: totalBet > 0 ? "#f87171" : "#e2e8f0", fontFamily: "monospace", lineHeight: 1 }}>
            {formatPHP(totalBet)}
          </Typography>
        </Box>
      </Box>

      <ToastContainer theme="dark" position="top-right" autoClose={2500} />
    </Box>
  );
}
