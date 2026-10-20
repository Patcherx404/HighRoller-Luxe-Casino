import React, { useState, useEffect, useRef } from 'react';
import { useFirebaseCasino } from '../../context/FirebaseCasinoContext';
import { formatPHP } from '../../utils/formatCurrency';
import { slotsAudio } from '../../utils/slotsAudio';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CasinoIcon from '@mui/icons-material/Casino';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import BoltIcon from '@mui/icons-material/Bolt';

// Cosmic Symbols & Multipliers
const SYMBOLS = [
  { id: 'wild', name: 'Cosmic Star', icon: '⭐', mult: { 3: 50, 4: 200, 5: 1000 }, color: '#fde047', isWild: true },
  { id: 'crown', name: 'Crown', icon: '👑', mult: { 3: 30, 4: 150, 5: 600 }, color: '#fbbf24' },
  { id: 'diamond', name: 'Diamond', icon: '💎', mult: { 3: 20, 4: 100, 5: 400 }, color: '#38bdf8' },
  { id: 'seven', name: 'Lucky 7', icon: '7️⃣', mult: { 3: 15, 4: 75, 5: 300 }, color: '#ef4444' },
  { id: 'bell', name: 'Cosmic Bell', icon: '🔔', mult: { 3: 10, 4: 50, 5: 200 }, color: '#f59e0b' },
  { id: 'cherry', name: 'Cherry', icon: '🍒', mult: { 3: 5, 4: 20, 5: 100 }, color: '#f43f5e' },
  { id: 'grape', name: 'Galaxy Grape', icon: '🍇', mult: { 3: 4, 4: 15, 5: 80 }, color: '#c084fc' },
];

// Available Line Bets: includes 1 peso!
const LINE_BETS = [1, 5, 10, 25, 50, 100, 250];

// Payline Coordinates (col, row)
const PAYLINE_DEFS = [
  { id: 1, name: 'Center Line', color: '#fbbf24', coords: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] },
  { id: 2, name: 'Top Line', color: '#38bdf8', coords: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: 3, name: 'Bottom Line', color: '#34d399', coords: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]] },
  { id: 4, name: 'V-Shape', color: '#c084fc', coords: [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]] },
  { id: 5, name: 'Inverted-V', color: '#f43f5e', coords: [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]] },
];

export default function SlotsGame() {
  const { chips, addChips, deductChips, casinoConfig } = useFirebaseCasino();

  // Helper to pick a completely random symbol with authentic natural reel weights
  const getRandomSymbol = () => {
    const r = Math.random();
    if (r < 0.08) return SYMBOLS[0]; // Wild Star ⭐
    if (r < 0.20) return SYMBOLS[1]; // Crown 👑
    if (r < 0.35) return SYMBOLS[2]; // Diamond 💎
    if (r < 0.50) return SYMBOLS[3]; // Lucky 7 7️⃣
    if (r < 0.65) return SYMBOLS[4]; // Bell 🔔
    if (r < 0.82) return SYMBOLS[5]; // Cherry 🍒
    return SYMBOLS[6]; // Grape 🍇
  };

  // 5 columns x 3 rows grid
  const [grid, setGrid] = useState(() => [
    [SYMBOLS[1], SYMBOLS[2], SYMBOLS[5]],
    [SYMBOLS[3], SYMBOLS[0], SYMBOLS[6]],
    [SYMBOLS[4], SYMBOLS[1], SYMBOLS[3]],
    [SYMBOLS[6], SYMBOLS[4], SYMBOLS[2]],
    [SYMBOLS[5], SYMBOLS[3], SYMBOLS[1]],
  ]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningReels, setSpinningReels] = useState([false, false, false, false, false]);
  const [reelsBouncing, setReelsBouncing] = useState([false, false, false, false, false]);
  const [winningCells, setWinningCells] = useState(new Set());
  const [winningLines, setWinningLines] = useState([]);

  // Betting Controls (includes ₱1 line bet!)
  const [betPerLine, setBetPerLine] = useState(1);
  const [selectedLinesCount, setSelectedLinesCount] = useState(5); // 1, 3, or 5 lines
  const totalBet = betPerLine * selectedLinesCount;

  // Win stats & Jackpot
  const [lastWin, setLastWin] = useState(0);
  const [winTitle, setWinTitle] = useState('');
  const [jackpot, setJackpot] = useState(148920);

  // Consecutive Win Combo Multiplier
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [isTurbo, setIsTurbo] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [isMuted, setIsMuted] = useState(slotsAudio.isMuted);
  const [showPaytable, setShowPaytable] = useState(false);

  const rollIntervalRef = useRef(null);
  const timeoutsRef = useRef([]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Progressive jackpot ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setJackpot((prev) => prev + Math.floor(Math.random() * 5) + 1);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleToggleMute = () => {
    const next = slotsAudio.toggleMute();
    setIsMuted(next);
    if (!next) slotsAudio.playChipClick();
  };

  // Check if a grid hits on a given line
  const checkLineMatch = (candidateGrid, line) => {
    const symbols = line.coords.map(([c, r]) => candidateGrid[c][r]);
    const target = symbols.find((s) => !s.isWild) || symbols[0];
    let count = 0;
    for (let s of symbols) {
      if (s.id === target.id || s.isWild) count++;
      else break;
    }
    return { target, count, isWin: count >= 3 };
  };

  // Main Spin Action
  const handleSpin = async () => {
    if (isSpinning) return;

    if (chips < totalBet) {
      if (autoSpinCount > 0) setAutoSpinCount(0);
      return;
    }

    const deducted = await deductChips(
      totalBet,
      'Slots',
      `Cosmic Slots Deluxe Bet (${formatPHP(totalBet)})`
    );
    if (!deducted) {
      if (autoSpinCount > 0) setAutoSpinCount(0);
      return;
    }

    slotsAudio.playSpinStart();
    setIsSpinning(true);
    setLastWin(0);
    setWinTitle('');
    setWinningCells(new Set());
    setWinningLines([]);
    setSpinningReels([true, true, true, true, true]);
    setReelsBouncing([false, false, false, false, false]);

    // Clear any previous timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // Realistic Real-Time Reel Rolling Animation:
    // Cycles random symbols through the spinning reels every 65ms
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    rollIntervalRef.current = setInterval(() => {
      setGrid((prev) => {
        return prev.map((col, cIdx) => {
          // If this reel is still spinning, roll new random symbols down
          return [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
        });
      });
    }, isTurbo ? 45 : 65);

    // Precise Mathematical Win Rate Engine:
    // Respects casinoConfig.slotsWinRate (Default: 32% tight house edge)
    const targetWinRate = Math.max(1, Math.min(100, Number(casinoConfig?.slotsWinRate ?? 32)));
    const willWin = (Math.random() * 100) < targetWinRate;

    // Generate natural, organic 5x3 randomized grid
    let finalGrid = [
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    ];

    const activeLines = PAYLINE_DEFS.slice(0, selectedLinesCount);

    if (willWin) {
      // Check if grid already naturally wins
      const hasNaturalWin = activeLines.some((l) => checkLineMatch(finalGrid, l).isWin);
      if (!hasNaturalWin) {
        // Pick an active payline
        const luckyLine = activeLines[Math.floor(Math.random() * activeLines.length)];
        // Lean towards moderate symbols (Cherry 5x, Bell 10x, 7 15x) for realistic payouts
        const rWeight = Math.random();
        const luckySym = rWeight < 0.4 ? SYMBOLS[5] : rWeight < 0.7 ? SYMBOLS[4] : rWeight < 0.88 ? SYMBOLS[3] : rWeight < 0.96 ? SYMBOLS[2] : SYMBOLS[1];
        const matchLen = Math.random() < 0.8 ? 3 : Math.random() < 0.95 ? 4 : 5;

        for (let i = 0; i < matchLen; i++) {
          const [c, r] = luckyLine.coords[i];
          finalGrid[c][r] = luckySym;
        }
        // Break line at matchLen if < 5
        if (matchLen < 5) {
          const [c, r] = luckyLine.coords[matchLen];
          const diffSym = SYMBOLS.find((s) => s.id !== luckySym.id && !s.isWild);
          finalGrid[c][r] = diffSym || SYMBOLS[6];
        }
      }
    } else {
      // Natural Casino House Edge with Exciting "Near-Miss" Psychology:
      // 1. Break any full 3-match wins across active lines
      activeLines.forEach((line) => {
        let match = checkLineMatch(finalGrid, line);
        if (match.isWin) {
          const [c, r] = line.coords[2];
          const nonMatching = SYMBOLS.find((s) => s.id !== match.target.id && !s.isWild);
          finalGrid[c][r] = nonMatching || SYMBOLS[6];
        }
        match = checkLineMatch(finalGrid, line);
        if (match.isWin) {
          const [c, r] = line.coords[1];
          const nonMatching = SYMBOLS.find((s) => s.id !== match.target.id && !s.isWild);
          finalGrid[c][r] = nonMatching || SYMBOLS[5];
        }
      });

      // 2. In ~45% of losing spins, craft a subtle "Near-Miss" teaser on an active line
      // (2 matching high-tier symbols on reels 1 & 2, while reel 3 stops on a neighboring symbol)
      if (Math.random() < 0.45) {
        const teaserLine = activeLines[Math.floor(Math.random() * activeLines.length)];
        const teaserSym = Math.random() < 0.5 ? SYMBOLS[1] : SYMBOLS[2]; // Crown 👑 or Diamond 💎
        const [c0, r0] = teaserLine.coords[0];
        const [c1, r1] = teaserLine.coords[1];
        const [c2, r2] = teaserLine.coords[2];
        finalGrid[c0][r0] = teaserSym;
        finalGrid[c1][r1] = teaserSym;
        finalGrid[c2][r2] = SYMBOLS[4]; // 🔔 Bell barely misses!
      }
    }

    // Staggered reel stop timing
    const baseDelay = isTurbo ? 220 : 550;
    const stepDelay = isTurbo ? 140 : 260;

    for (let reel = 0; reel < 5; reel++) {
      const t = setTimeout(() => {
        setSpinningReels((prev) => {
          const next = [...prev];
          next[reel] = false;
          return next;
        });

        setGrid((prev) => {
          const next = [...prev];
          next[reel] = finalGrid[reel];
          return next;
        });

        setReelsBouncing((prev) => {
          const next = [...prev];
          next[reel] = true;
          return next;
        });

        slotsAudio.playReelStop(reel);

        // Turn off bounce snap
        const tb = setTimeout(() => {
          setReelsBouncing((prev) => {
            const next = [...prev];
            next[reel] = false;
            return next;
          });
        }, 280);
        timeoutsRef.current.push(tb);

        // When the final reel (4) stops:
        if (reel === 4) {
          if (rollIntervalRef.current) {
            clearInterval(rollIntervalRef.current);
            rollIntervalRef.current = null;
          }
          evaluateSpinResults(finalGrid);
        }
      }, baseDelay + reel * stepDelay);

      timeoutsRef.current.push(t);
    }
  };

  // Evaluate Paylines
  const evaluateSpinResults = (finalGrid) => {
    setIsSpinning(false);

    let spinWin = 0;
    const matchedCells = new Set();
    const hitLines = [];

    const activeLines = PAYLINE_DEFS.slice(0, selectedLinesCount);

    activeLines.forEach((line) => {
      const symbolsInLine = line.coords.map(([c, r]) => finalGrid[c][r]);
      const target = symbolsInLine.find((s) => !s.isWild) || symbolsInLine[0];

      let matchCount = 0;
      for (let s of symbolsInLine) {
        if (s.id === target.id || s.isWild) matchCount++;
        else break;
      }

      if (matchCount >= 3) {
        const baseMult = target.mult[matchCount] || 10;
        const lineWinAmount = baseMult * betPerLine * comboMultiplier;

        spinWin += lineWinAmount;
        hitLines.push({
          id: line.id,
          name: line.name,
          symbolName: target.name,
          symbolIcon: target.icon,
          count: matchCount,
          win: lineWinAmount,
          color: line.color,
        });

        for (let i = 0; i < matchCount; i++) {
          const [c, r] = line.coords[i];
          matchedCells.add(`${c}-${r}`);
        }
      }
    });

    if (spinWin > 0) {
      setLastWin(spinWin);
      setWinningCells(matchedCells);
      setWinningLines(hitLines);

      // Win Tier Title
      if (spinWin >= totalBet * 40) {
        setWinTitle('👑🚀 COSMIC MEGA JACKPOT!');
      } else if (spinWin >= totalBet * 15) {
        setWinTitle('💥 SUPER WIN!');
      } else if (spinWin >= totalBet * 5) {
        setWinTitle('🌟 BIG WIN!');
      } else {
        setWinTitle('✨ WINNER!');
      }

      // Combo Multiplier Increment (up to 5x on consecutive hits)
      setComboMultiplier((prev) => Math.min(5, prev + 1));

      addChips(spinWin, 'Slots', `Cosmic Slots Win (+${formatPHP(spinWin)})`);
      slotsAudio.playLineWin(spinWin >= totalBet * 5);
    } else {
      setLastWin(0);
      setWinTitle('');
      setWinningCells(new Set());
      setWinningLines([]);
      setComboMultiplier(1); // Reset combo on non-winning spin
    }

    // Auto-spin trigger
    setAutoSpinCount((prev) => {
      if (prev > 1 && chips >= totalBet) {
        const t = setTimeout(handleSpin, isTurbo ? 450 : 1000);
        timeoutsRef.current.push(t);
        return prev - 1;
      }
      return 0;
    });
  };

  const startAutoSpins = (count) => {
    setAutoSpinCount(count);
    slotsAudio.playChipClick();
    setTimeout(handleSpin, 100);
  };

  const stopAutoSpins = () => {
    setAutoSpinCount(0);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 940, mx: 'auto', px: { xs: 0.5, sm: 2, md: 3 }, py: { xs: 1, md: 2 } }}>
      {/* Progressive Jackpot Header */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 3.5,
          background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 100%)',
          border: '2px solid #f59e0b',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Chip
              size="small"
              label={`${selectedLinesCount} LINES • ₱${betPerLine}/LINE`}
              sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 900, border: '1px solid #f59e0b', fontSize: '0.65rem' }}
            />
            {comboMultiplier > 1 && (
              <Chip
                size="small"
                icon={<BoltIcon sx={{ color: '#fbbf24 !important' }} />}
                label={`COMBO ${comboMultiplier}X`}
                sx={{ bgcolor: 'rgba(234, 179, 8, 0.25)', color: '#fef08a', fontWeight: 900, border: '1px solid #eab308', fontSize: '0.65rem' }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <IconButton
              size="small"
              onClick={() => setShowPaytable(true)}
              title="View Paytable & Multipliers"
              sx={{ color: '#38bdf8', border: '1px solid #0284c7', bgcolor: 'rgba(14, 165, 233, 0.15)', p: 0.6 }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>

            <IconButton
              size="small"
              onClick={handleToggleMute}
              title={isMuted ? "Unmute Slots Sound" : "Mute Slots Sound"}
              sx={{
                color: isMuted ? "#94a3b8" : "#fbbf24",
                border: isMuted ? "1px solid #475569" : "1px solid #fbbf24",
                bgcolor: isMuted ? "rgba(15, 23, 42, 0.6)" : "rgba(245, 158, 11, 0.15)",
                p: 0.6,
              }}
            >
              {isMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        <Typography variant="overline" sx={{ color: '#fbbf24', letterSpacing: 2, fontWeight: 900, fontSize: { xs: '0.65rem', sm: '0.78rem' } }}>
          ✨ COSMIC PROGRESSIVE JACKPOT (PHP) ✨
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            color: '#fef08a',
            fontFamily: 'monospace',
            fontSize: { xs: '1.7rem', sm: '2.4rem' },
            animation: 'jackpotGlow 2.5s infinite ease-in-out',
            lineHeight: 1.1,
          }}
        >
          {formatPHP(jackpot)}
        </Typography>
      </Paper>

      {/* 5-Reel Slot Machine Cabinet */}
      <Paper
        elevation={10}
        sx={{
          p: { xs: 1, sm: 2.5 },
          borderRadius: 3.5,
          background: 'linear-gradient(180deg, #090d16 0%, #030712 100%)',
          border: '2.5px solid #f59e0b',
          animation: 'cosmicCabinetGlow 4s infinite ease-in-out',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Floating Coin & Star Shower on Win */}
        {lastWin > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 10,
              overflow: 'hidden',
            }}
          >
            {[...Array(16)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  top: '-30px',
                  left: `${(i * 6.5 + Math.random() * 4)}%`,
                  fontSize: `${18 + (i % 3) * 8}px`,
                  animation: `coinFloat ${1.3 + (i % 4) * 0.3}s ease-in infinite`,
                  animationDelay: `${(i % 5) * 0.18}s`,
                }}
              >
                {['🪙', '⭐', '💎', '👑', '✨'][i % 5]}
              </Box>
            ))}
          </Box>
        )}

        {/* 5 Slot Machine Reels */}
        <Grid container spacing={{ xs: 0.6, sm: 1.5 }} justifyContent="center">
          {grid.map((column, colIdx) => {
            const isReelSpinning = spinningReels[colIdx];
            const isReelBouncing = reelsBouncing[colIdx];

            return (
              <Grid item xs={2.4} key={colIdx}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: 0.6, sm: 1.2 },
                    p: { xs: 0.3, sm: 0.8 },
                    background: 'linear-gradient(180deg, #131b2e 0%, #0b1120 100%)',
                    borderRadius: 2.5,
                    border: isReelSpinning ? '1.5px solid #f59e0b' : '1px solid #1e293b',
                    boxShadow: isReelSpinning ? 'inset 0 0 15px rgba(245, 158, 11, 0.4)' : 'none',
                    overflow: 'hidden',
                    animation: isReelBouncing ? 'reelSnapBounce 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
                    transition: 'border 0.2s ease',
                  }}
                >
                  {column.map((sym, rowIdx) => {
                    const isWinning = winningCells.has(`${colIdx}-${rowIdx}`);

                    return (
                      <Box
                        key={rowIdx}
                        sx={{
                          height: { xs: 64, sm: 96 },
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isWinning
                            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, #020617 80%)'
                            : '#020617',
                          borderRadius: 2,
                          border: isWinning ? '2px solid #fbbf24' : '1px solid #334155',
                          position: 'relative',
                          animation: isReelSpinning
                            ? 'reelSpinBlur 0.12s linear infinite'
                            : isWinning
                            ? 'winCellPulse 1.2s infinite ease-in-out'
                            : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: '1.7rem', sm: '2.7rem' },
                            lineHeight: 1,
                            transform: isWinning ? 'scale(1.15)' : 'none',
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          {sym.icon}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: sym.color,
                            fontWeight: 900,
                            fontSize: { xs: '0.52rem', sm: '0.72rem' },
                            mt: 0.3,
                            lineHeight: 1,
                            letterSpacing: 0.5,
                          }}
                        >
                          {sym.name}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Win Alert & Payline Announcement */}
        {lastWin > 0 && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2.5,
              background: 'linear-gradient(90deg, rgba(245,158,11,0.25) 0%, rgba(16,185,129,0.35) 100%)',
              border: '2px solid #10b981',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
              textAlign: 'center',
              animation: 'bigWinBannerZoom 0.4s ease-out',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#34d399', letterSpacing: 0.5, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>
              {winTitle} +{formatPHP(lastWin)}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.8, flexWrap: 'wrap', mt: 0.5 }}>
              {winningLines.map((line, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  label={`${line.name}: ${line.count}x ${line.symbolIcon} (+${formatPHP(line.win)})`}
                  sx={{
                    bgcolor: 'rgba(15, 23, 42, 0.85)',
                    color: line.color || '#fbbf24',
                    border: `1.5px solid ${line.color || '#f59e0b'}`,
                    fontWeight: 800,
                    fontSize: '0.72rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Console: Line Selector & Line Bet (Includes ₱1!) */}
        <Box
          sx={{
            mt: 2.5,
            pt: 2,
            borderTop: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {/* Top Row: Select Active Paylines (1, 3, or 5) & Line Bet (1, 5, 10, 25, 50, 100, 250) */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1.5,
            }}
          >
            {/* Paylines Count Selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.7rem', mr: 0.5 }}>
                PAYLINES:
              </Typography>
              {[1, 3, 5].map((cnt) => (
                <Chip
                  key={cnt}
                  label={`${cnt} Line${cnt > 1 ? 's' : ''}`}
                  clickable
                  onClick={() => {
                    setSelectedLinesCount(cnt);
                    slotsAudio.playChipClick();
                  }}
                  sx={{
                    fontWeight: 900,
                    height: 28,
                    fontSize: '0.72rem',
                    bgcolor: selectedLinesCount === cnt ? '#0284c7' : '#1e293b',
                    color: selectedLinesCount === cnt ? '#fff' : '#94a3b8',
                    border: selectedLinesCount === cnt ? '1.5px solid #38bdf8' : '1px solid #334155',
                  }}
                />
              ))}
            </Box>

            {/* Line Bet Chips - Starting at ₱1! */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.7rem', mr: 0.5 }}>
                LINE BET:
              </Typography>
              {LINE_BETS.map((amt) => (
                <Chip
                  key={amt}
                  label={formatPHP(amt)}
                  clickable
                  color={betPerLine === amt ? 'warning' : 'default'}
                  onClick={() => {
                    setBetPerLine(amt);
                    slotsAudio.playChipClick();
                  }}
                  sx={{
                    fontWeight: 900,
                    height: 28,
                    fontSize: '0.75rem',
                    bgcolor: betPerLine === amt ? '#fbbf24' : '#1e293b',
                    color: betPerLine === amt ? '#000' : '#fff',
                    border: betPerLine === amt ? '1.5px solid #f59e0b' : '1px solid #475569',
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Bottom Row: Controls, Total Wager Display, and Spin Button */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              pt: 1,
              borderTop: '1px dashed #334155',
            }}
          >
            {/* Turbo & Auto Spin */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setIsTurbo(!isTurbo)}
                title={isTurbo ? "Turbo Mode Active" : "Normal Spin Speed"}
                sx={{
                  color: isTurbo ? "#fbbf24" : "#64748b",
                  border: isTurbo ? "1.5px solid #fbbf24" : "1px solid #334155",
                  bgcolor: isTurbo ? "rgba(245, 158, 11, 0.15)" : "transparent",
                  p: 0.8,
                }}
              >
                {isTurbo ? <FlashOnIcon fontSize="small" /> : <FlashOffIcon fontSize="small" />}
              </IconButton>

              {autoSpinCount > 0 ? (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={stopAutoSpins}
                  startIcon={<AutoModeIcon />}
                  sx={{ fontWeight: 900, py: 0.6, fontSize: '0.75rem' }}
                >
                  Stop Auto ({autoSpinCount})
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => startAutoSpins(10)}
                  disabled={isSpinning || chips < totalBet}
                  startIcon={<AutoModeIcon />}
                  sx={{ fontWeight: 800, color: '#94a3b8', borderColor: '#475569', py: 0.6, fontSize: '0.75rem' }}
                >
                  Auto (10x)
                </Button>
              )}
            </Box>

            {/* Total Wager and Spin Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
              <Box sx={{ textAlign: 'left', minWidth: 90 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, display: 'block', fontSize: '0.62rem' }}>
                  TOTAL WAGER ({selectedLinesCount}L)
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace', lineHeight: 1 }}>
                  {formatPHP(totalBet)}
                </Typography>
              </Box>

              <Button
                variant="contained"
                disabled={isSpinning || chips < totalBet}
                onClick={handleSpin}
                startIcon={<CasinoIcon />}
                sx={{
                  flexGrow: { xs: 1, sm: 0 },
                  px: { xs: 3.5, sm: 5.5 },
                  py: 1.1,
                  fontSize: { xs: '1rem', sm: '1.15rem' },
                  fontWeight: 900,
                  borderRadius: 2.5,
                  background: 'linear-gradient(45deg, #f59e0b, #fbbf24)',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    filter: 'brightness(1.1)',
                  },
                }}
              >
                {isSpinning ? 'SPINNING...' : 'SPIN'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Paytable & Cosmic Rules Modal */}
      <Dialog
        open={showPaytable}
        onClose={() => setShowPaytable(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            border: '2px solid #f59e0b',
            borderRadius: 3.5,
            color: '#fff',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#fbbf24', borderBottom: '1px solid #334155' }}>
          Cosmic Slots Deluxe • Paytable & Multipliers
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Features Highlights */}
          <Box sx={{ mb: 2.5, p: 1.5, bgcolor: 'rgba(245, 158, 11, 0.12)', borderRadius: 2, border: '1px solid #f59e0b' }}>
            <Typography variant="subtitle2" sx={{ color: '#fbbf24', fontWeight: 900, mb: 0.5 }}>
              ⭐ Cosmic Wild & Combo Multipliers:
            </Typography>
            <Typography variant="caption" sx={{ color: '#e2e8f0', display: 'block', mb: 0.5 }}>
              • <strong>Cosmic Star ⭐:</strong> Acts as <strong>WILD</strong> (substitutes all symbols across active paylines).
            </Typography>
            <Typography variant="caption" sx={{ color: '#e2e8f0', display: 'block' }}>
              • <strong>Combo Multipliers:</strong> Consecutive winning spins charge the multiplier meter up to <strong>5X</strong>!
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1.5 }}>
            Symbol Multipliers (calculated per <strong>Line Bet</strong>):
          </Typography>

          <Grid container spacing={1}>
            {SYMBOLS.map((sym) => (
              <Grid item xs={6} sm={4} key={sym.id}>
                <Paper
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    bgcolor: '#1e293b',
                    border: `1.5px solid ${sym.color}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography sx={{ fontSize: '1.8rem', lineHeight: 1 }}>{sym.icon}</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: sym.color }}>
                    {sym.name} {sym.isWild && '(WILD)'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#e2e8f0', fontSize: '0.7rem' }}>
                    3x: {sym.mult[3]}x • 4x: {sym.mult[4]}x • 5x: {sym.mult[5]}x
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 2.5, p: 1.5, bgcolor: '#020617', borderRadius: 2, border: '1px solid #334155' }}>
            <Typography variant="subtitle2" sx={{ color: '#fbbf24', fontWeight: 800, mb: 0.5 }}>
              Active Payline Configurations:
            </Typography>
            {PAYLINE_DEFS.map((p) => (
              <Typography key={p.id} variant="caption" sx={{ color: p.color, display: 'block', fontWeight: 700 }}>
                • Line {p.id} ({p.name})
              </Typography>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
