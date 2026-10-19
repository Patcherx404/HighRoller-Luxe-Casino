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
import { ToastContainer, toast } from "react-toastify";
import { useFirebaseCasino } from "../context/FirebaseCasinoContext";
import { formatPHP } from "../utils/formatCurrency";
import { rouletteAudio } from "../utils/rouletteAudio";
import "react-toastify/dist/ReactToastify.css";

const CHIP_DENOMINATIONS = [10, 25, 50, 100, 250, 500, 1000];

export default function RouletteGame() {
  const { chips, addChips, deductChips } = useFirebaseCasino();

  const [isMuted, setIsMuted] = useState(rouletteAudio.isMuted);
  const [selectedChip, setSelectedChip] = useState(25);
  const [bets, setBets] = useState({}); // { betKey: amount }
  const [mustSpin, setMustSpin] = useState(false);
  const [winningNumber, setWinningNumber] = useState(0);
  const [lastWin, setLastWin] = useState(null);
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

  const handleSpinClick = async () => {
    if (mustSpin) return;
    if (totalBet === 0) {
      toast.info("Please place at least one bet on the roulette board.");
      return;
    }

    const deducted = await deductChips(
      totalBet,
      "Roulette",
      `European Roulette Bet (${formatPHP(totalBet)})`
    );
    if (!deducted) {
      toast.error("Failed to deduct chips from balance.");
      return;
    }

    setLastWin(null);
    // Random European Roulette number 0-36
    const randomPick = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
    setWinningNumber(randomPick);
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
      toast.success(`🎉 Winning Number ${winNum} ${winColor.toUpperCase()}! You won ${formatPHP(payout)}!`);
    } else {
      setLastWin(0);
      setTimeout(() => {
        rouletteAudio.playLossTone();
      }, 200);
      toast.info(`Wheel landed on ${winNum} (${winColor.toUpperCase()}). Better luck on next spin!`);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1050, mx: "auto", px: { xs: 0.5, sm: 2, md: 3 }, py: { xs: 1, md: 2 }, color: "#fff" }}>
      {/* Header Banner */}
      <Paper
        elevation={6}
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          mb: 2,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          border: "2px solid #f59e0b",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ color: "#fbbf24", fontWeight: 900, letterSpacing: 1.5, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
            Philippine Peso Tables • 🇵🇭
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#fff", fontSize: { xs: "1.2rem", sm: "1.6rem" } }}>
            European Roulette 37
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {/* History Strip */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, mr: 0.5 }}>
              RECENT:
            </Typography>
            {history.slice(0, 6).map((h, i) => (
              <Box
                key={i}
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: h.color === "red" ? "#dc2626" : h.color === "green" ? "#16a34a" : "#111827",
                  border: "1.5px solid #fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "0.7rem",
                }}
              >
                {h.num}
              </Box>
            ))}
          </Box>

          {/* Sound Mute / Unmute Button */}
          <IconButton
            size="small"
            onClick={handleToggleMute}
            title={isMuted ? "Unmute Roulette Audio" : "Mute Roulette Audio"}
            sx={{
              color: isMuted ? "#94a3b8" : "#fbbf24",
              border: isMuted ? "1.5px solid #475569" : "1.5px solid #fbbf24",
              bgcolor: isMuted ? "rgba(15, 23, 42, 0.6)" : "rgba(245, 158, 11, 0.15)",
              p: 0.8,
              transition: "all 0.15s ease",
              "&:hover": { bgcolor: "rgba(245, 158, 11, 0.3)", transform: "scale(1.05)" },
            }}
          >
            {isMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Paper>

      {/* Scaled Wheel Section for Phone */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 1.5, sm: 3 },
          mb: 2,
          borderRadius: 3,
          background: "radial-gradient(ellipse at center, #064e3b 0%, #022c22 80%)",
          border: "2px solid #10b981",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <Ruleta
          winningNumber={winningNumber}
          mustSpin={mustSpin}
          onSpinComplete={onWheelStop}
        />

        {lastWin !== null && (
          <Box sx={{ mt: 1.5 }}>
            {lastWin > 0 ? (
              <Chip
                label={`WINNER: +${formatPHP(lastWin)}`}
                sx={{
                  px: 2,
                  py: 2,
                  fontSize: { xs: "0.95rem", sm: "1.1rem" },
                  fontWeight: 900,
                  bgcolor: "#16a34a",
                  color: "#fff",
                  border: "2px solid #fbbf24",
                }}
              />
            ) : (
              <Chip
                label={`Result: ${winningNumber} (${getNumberColor(winningNumber).toUpperCase()})`}
                sx={{
                  px: 1.5,
                  py: 1.5,
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  fontWeight: 800,
                  bgcolor: "#334155",
                  color: "#e2e8f0",
                }}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Betting Felt Board (Mobile Touch-Scrollable) */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: 3,
          background: "#064e3b",
          border: "2px solid #f59e0b",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: 900, fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
            TAP POCKETS TO BET (Active: {formatPHP(selectedChip)})
          </Typography>
          <Typography variant="caption" sx={{ color: "#86efac", display: { xs: "block", sm: "none" }, fontSize: "0.65rem" }}>
            👉 Swipe table
          </Typography>
        </Box>

        {/* Horizontal scroll container for the 37-number felt */}
        <Box
          sx={{
            overflowX: "auto",
            pb: 1,
            "-webkit-overflow-scrolling": "touch",
            scrollbarWidth: "thin",
          }}
        >
          <Box sx={{ minWidth: 540, display: "flex", gap: 0.5, mb: 1 }}>
            {/* Zero pocket */}
            <Button
              variant="contained"
              onClick={() => handlePlaceBet("num_0")}
              sx={{
                minWidth: 46,
                minHeight: 110,
                background: "#16a34a",
                border: bets["num_0"] ? "2px solid #fbbf24" : "1px solid #ffffff40",
                fontWeight: 900,
                fontSize: "1.1rem",
                position: "relative",
                "&:hover": { bgcolor: "#15803d" },
              }}
            >
              0
              {bets["num_0"] && (
                <Box sx={{ position: "absolute", bottom: 4, bgcolor: "#fbbf24", color: "#000", px: 0.5, borderRadius: 1.5, fontSize: "0.6rem", fontWeight: 900 }}>
                  {formatPHP(bets["num_0"])}
                </Box>
              )}
            </Button>

            {/* Numbers 1 to 36 Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 0.5, flexGrow: 1 }}>
              {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                const color = getNumberColor(num);
                const key = `num_${num}`;
                const hasBet = bets[key];
                return (
                  <Button
                    key={num}
                    onClick={() => handlePlaceBet(key)}
                    sx={{
                      minWidth: 36,
                      height: 34,
                      p: 0,
                      background: color === "red" ? "#dc2626" : "#111827",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: "0.85rem",
                      border: hasBet ? "2px solid #fbbf24" : "1px solid #4b5563",
                      position: "relative",
                      "&:hover": {
                        filter: "brightness(1.2)",
                        background: color === "red" ? "#ef4444" : "#1f2937",
                      },
                    }}
                  >
                    {num}
                    {hasBet && (
                      <Box sx={{ position: "absolute", top: -5, right: -3, bgcolor: "#fbbf24", color: "#000", px: 0.4, borderRadius: 1, fontSize: "0.55rem", fontWeight: 900 }}>
                        {formatPHP(hasBet)}
                      </Box>
                    )}
                  </Button>
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* Dozens */}
        <Grid container spacing={0.8} sx={{ mb: 1 }}>
          {[
            { key: "doz1", label: "1st 12 (1-12) • 2:1" },
            { key: "doz2", label: "2nd 12 (13-24) • 2:1" },
            { key: "doz3", label: "3rd 12 (25-36) • 2:1" },
          ].map((d) => (
            <Grid item xs={4} key={d.key}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handlePlaceBet(d.key)}
                sx={{
                  py: 0.8,
                  fontSize: { xs: "0.68rem", sm: "0.8rem" },
                  borderColor: bets[d.key] ? "#fbbf24" : "#10b981",
                  borderWidth: 1.5,
                  bgcolor: bets[d.key] ? "rgba(251, 191, 36, 0.2)" : "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                {d.label} {bets[d.key] && `(${formatPHP(bets[d.key])})`}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Outside Bets (Even-Money: Low, Even, Red, Black, Odd, High) */}
        <Grid container spacing={0.8} sx={{ mb: 2 }}>
          {[
            { key: "low", label: "1-18", color: "#334155" },
            { key: "even", label: "EVEN", color: "#334155" },
            { key: "red", label: "RED", color: "#dc2626" },
            { key: "black", label: "BLACK", color: "#111827" },
            { key: "odd", label: "ODD", color: "#334155" },
            { key: "high", label: "19-36", color: "#334155" },
          ].map((b) => (
            <Grid item xs={4} sm={2} key={b.key}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => handlePlaceBet(b.key)}
                sx={{
                  py: 0.9,
                  background: b.color,
                  border: bets[b.key] ? "2px solid #fbbf24" : "1px solid #64748b",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: { xs: "0.75rem", sm: "0.85rem" },
                  "&:hover": { filter: "brightness(1.2)" },
                }}
              >
                {b.label}
                {bets[b.key] && (
                  <Box sx={{ ml: 0.5, bgcolor: "#fbbf24", color: "#000", px: 0.5, borderRadius: 1, fontSize: "0.6rem" }}>
                    {formatPHP(bets[b.key])}
                  </Box>
                )}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Console & Chip Selector */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 1.5,
            pt: 1.5,
            borderTop: "1px solid #10b981",
          }}
        >
          {/* Chip Denominations in Philippine Peso */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap", justifyContent: { xs: "center", sm: "flex-start" } }}>
            <Typography variant="caption" sx={{ color: "#a7f3d0", fontWeight: 800, mr: 0.5, fontSize: "0.7rem" }}>
              CHIP:
            </Typography>
            {CHIP_DENOMINATIONS.map((amt) => (
              <Chip
                key={amt}
                label={formatPHP(amt)}
                clickable
                color={selectedChip === amt ? "warning" : "default"}
                onClick={() => {
                  setSelectedChip(amt);
                  rouletteAudio.playChipClink();
                }}
                sx={{
                  fontWeight: 900,
                  height: 28,
                  fontSize: "0.72rem",
                  bgcolor: selectedChip === amt ? "#fbbf24" : "#1e293b",
                  color: selectedChip === amt ? "#000" : "#fff",
                  border: "1px solid #475569",
                }}
              />
            ))}
          </Box>

          {/* Action buttons & Total Stake */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ textAlign: "left" }}>
              <Typography variant="caption" sx={{ color: "#a7f3d0", fontWeight: 800, display: "block", fontSize: "0.65rem" }}>
                TOTAL STAKE
              </Typography>
              <Typography variant="subtitle1" sx={{ color: "#fbbf24", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
                {formatPHP(totalBet)}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleClearBets}
                disabled={mustSpin || totalBet === 0}
                sx={{ fontWeight: 800, minWidth: 50, py: 0.6, fontSize: "0.75rem" }}
              >
                Clear
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={handleDoubleBets}
                disabled={mustSpin || totalBet === 0}
                sx={{ fontWeight: 800, minWidth: 50, py: 0.6, fontSize: "0.75rem" }}
              >
                2x
              </Button>

              <Button
                variant="contained"
                disabled={mustSpin || totalBet === 0 || chips < totalBet}
                onClick={handleSpinClick}
                sx={{
                  px: { xs: 3, sm: 4 },
                  py: 0.8,
                  fontSize: { xs: "0.95rem", sm: "1rem" },
                  fontWeight: 900,
                  background: "linear-gradient(45deg, #f59e0b, #fbbf24)",
                  color: "#000",
                  borderRadius: 2.5,
                  boxShadow: "0 0 15px rgba(245, 158, 11, 0.4)",
                  "&:hover": {
                    background: "linear-gradient(45deg, #d97706, #f59e0b)",
                  },
                }}
              >
                {mustSpin ? "SPINNING" : "SPIN"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
    </Box>
  );
}
