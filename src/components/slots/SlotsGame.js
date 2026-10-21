import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tooltip,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CasinoIcon from '@mui/icons-material/Casino';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import BoltIcon from '@mui/icons-material/Bolt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import StopIcon from '@mui/icons-material/Stop';

// Cosmic Symbols & Multipliers - Features Vibrant Purple Crystal Cluster
const SYMBOLS = [
  {
    id: 'wild',
    name: 'Cosmic Star',
    icon: '⭐',
    mult: { 3: 50, 4: 200, 5: 1000 },
    color: '#fde047',
    bg: 'linear-gradient(135deg, rgba(253, 224, 71, 0.35) 0%, rgba(202, 138, 4, 0.25) 100%)',
    border: '#fde047',
    isWild: true,
  },
  {
    id: 'alien',
    name: 'Cosmic Alien',
    icon: '👽',
    mult: { 3: 35, 4: 160, 5: 750 },
    color: '#4ade80',
    bg: 'linear-gradient(135deg, rgba(74, 222, 128, 0.3) 0%, rgba(21, 128, 61, 0.2) 100%)',
    border: '#22c55e',
  },
  {
    id: 'ufo',
    name: 'Saucer UFO',
    icon: '🛸',
    mult: { 3: 25, 4: 120, 5: 500 },
    color: '#38bdf8',
    bg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(3, 105, 161, 0.2) 100%)',
    border: '#0284c7',
  },
  {
    id: 'satellite',
    name: 'Orbital Probe',
    icon: '🛰️',
    mult: { 3: 20, 4: 90, 5: 350 },
    color: '#fb923c',
    bg: 'linear-gradient(135deg, rgba(251, 146, 60, 0.3) 0%, rgba(194, 65, 12, 0.2) 100%)',
    border: '#ea580c',
  },
  {
    id: 'ruby',
    name: 'Ruby Diamond',
    icon: '💎',
    mult: { 3: 15, 4: 70, 5: 250 },
    color: '#ef4444',
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(185, 28, 28, 0.2) 100%)',
    border: '#dc2626',
  },
  {
    id: 'sapphire',
    name: 'Blue Sapphire',
    icon: '🔷',
    mult: { 3: 10, 4: 50, 5: 180 },
    color: '#60a5fa',
    bg: 'linear-gradient(135deg, rgba(96, 165, 250, 0.3) 0%, rgba(29, 78, 216, 0.2) 100%)',
    border: '#2563eb',
  },
  {
    id: 'emerald',
    name: 'Green Emerald',
    icon: '🟢',
    mult: { 3: 6, 4: 25, 5: 120 },
    color: '#10b981',
    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(4, 120, 87, 0.2) 100%)',
    border: '#059669',
  },
  {
    id: 'amethyst',
    name: 'Purple Gem',
    icon: '🔮',
    image: '/assets/aistudio/Vibrant_Purple_Crystal_Cluster_d06bd317.png',
    mult: { 3: 4, 4: 15, 5: 80 },
    color: '#c084fc',
    bg: 'linear-gradient(135deg, rgba(192, 132, 252, 0.35) 0%, rgba(126, 34, 206, 0.25) 100%)',
    border: '#9333ea',
  },
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
  const navigate = useNavigate();
  const {
    chips,
    addChips,
    deductChips,
    casinoConfig,
    cosmicJackpot,
    totalRealDeposits,
  } = useFirebaseCasino();

  // Helper to pick a completely random symbol with authentic natural reel weights
  const getRandomSymbol = () => {
    const r = Math.random();
    if (r < 0.08) return SYMBOLS[0]; // Wild Star ⭐
    if (r < 0.18) return SYMBOLS[1]; // Alien 👽
    if (r < 0.30) return SYMBOLS[2]; // UFO 🛸
    if (r < 0.44) return SYMBOLS[3]; // Satellite 🛰️
    if (r < 0.58) return SYMBOLS[4]; // Ruby Diamond 💎
    if (r < 0.72) return SYMBOLS[5]; // Blue Sapphire 🔷
    if (r < 0.86) return SYMBOLS[6]; // Green Emerald 🟢
    return SYMBOLS[7]; // Purple Amethyst Crystal 🔮
  };

  // 5 columns x 3 rows grid
  const [grid, setGrid] = useState(() => [
    [SYMBOLS[1], SYMBOLS[4], SYMBOLS[6]],
    [SYMBOLS[2], SYMBOLS[0], SYMBOLS[7]],
    [SYMBOLS[4], SYMBOLS[1], SYMBOLS[2]],
    [SYMBOLS[7], SYMBOLS[3], SYMBOLS[5]],
    [SYMBOLS[6], SYMBOLS[2], SYMBOLS[1]],
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

  // Win stats & Synced Progressive Jackpot (exact 40% of user real deposits)
  const [lastWin, setLastWin] = useState(0);
  const [winTitle, setWinTitle] = useState('');

  // Live Cosmic Progressive Jackpot: exactly 40% of all real money deposits from users (e.g. 40% of 120 = 48)
  const displayJackpot = cosmicJackpot ?? (Math.round((totalRealDeposits || 0) * 0.40 * 100) / 100);

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

  // Change line bet step (using - and + buttons)
  const handleDecreaseBet = () => {
    const idx = LINE_BETS.indexOf(betPerLine);
    if (idx > 0) {
      setBetPerLine(LINE_BETS[idx - 1]);
      slotsAudio.playChipClick();
    }
  };

  const handleIncreaseBet = () => {
    const idx = LINE_BETS.indexOf(betPerLine);
    if (idx < LINE_BETS.length - 1) {
      setBetPerLine(LINE_BETS[idx + 1]);
      slotsAudio.playChipClick();
    }
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

    // Realistic Real-Time Reel Rolling Animation
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    rollIntervalRef.current = setInterval(() => {
      setGrid((prev) => {
        return prev.map(() => [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
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
        const rWeight = Math.random();
        const luckySym = rWeight < 0.4 ? SYMBOLS[6] : rWeight < 0.7 ? SYMBOLS[5] : rWeight < 0.88 ? SYMBOLS[4] : rWeight < 0.96 ? SYMBOLS[3] : SYMBOLS[2];
        const matchLen = Math.random() < 0.8 ? 3 : Math.random() < 0.95 ? 4 : 5;

        for (let i = 0; i < matchLen; i++) {
          const [c, r] = luckyLine.coords[i];
          finalGrid[c][r] = luckySym;
        }
        if (matchLen < 5) {
          const [c, r] = luckyLine.coords[matchLen];
          const diffSym = SYMBOLS.find((s) => s.id !== luckySym.id && !s.isWild);
          finalGrid[c][r] = diffSym || SYMBOLS[7];
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
          finalGrid[c][r] = nonMatching || SYMBOLS[7];
        }
        match = checkLineMatch(finalGrid, line);
        if (match.isWin) {
          const [c, r] = line.coords[1];
          const nonMatching = SYMBOLS.find((s) => s.id !== match.target.id && !s.isWild);
          finalGrid[c][r] = nonMatching || SYMBOLS[5];
        }
      });

      // 2. In ~45% of losing spins, craft a subtle "Near-Miss" teaser on an active line
      if (Math.random() < 0.45) {
        const teaserLine = activeLines[Math.floor(Math.random() * activeLines.length)];
        const teaserSym = Math.random() < 0.5 ? SYMBOLS[1] : SYMBOLS[2]; // Alien 👽 or UFO 🛸
        const [c0, r0] = teaserLine.coords[0];
        const [c1, r1] = teaserLine.coords[1];
        const [c2, r2] = teaserLine.coords[2];
        finalGrid[c0][r0] = teaserSym;
        finalGrid[c1][r1] = teaserSym;
        finalGrid[c2][r2] = SYMBOLS[4]; // Ruby barely misses!
      }
    }

    // Staggered reel stop timing
    const baseDelay = isTurbo ? 200 : 500;
    const stepDelay = isTurbo ? 130 : 250;

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

        const tb = setTimeout(() => {
          setReelsBouncing((prev) => {
            const next = [...prev];
            next[reel] = false;
            return next;
          });
        }, 280);
        timeoutsRef.current.push(tb);

        // Final reel stops:
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
        let lineWinAmount;
        const isJackpotWin = matchCount === 5 && target.isWild;
        if (isJackpotWin) {
          lineWinAmount = displayJackpot;
        } else {
          const baseMult = target.mult[matchCount] || 10;
          lineWinAmount = baseMult * betPerLine * comboMultiplier;
        }

        spinWin += lineWinAmount;
        hitLines.push({
          id: line.id,
          name: line.name,
          symbolName: isJackpotWin ? 'COSMIC JACKPOT' : target.name,
          symbolIcon: target.icon,
          symbolImage: target.image,
          count: matchCount,
          win: lineWinAmount,
          color: line.color,
          isJackpot: isJackpotWin,
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
      if (hitLines.some((l) => l.isJackpot) || spinWin >= displayJackpot) {
        setWinTitle('👑🚀 COSMIC PROGRESSIVE JACKPOT HIT!');
      } else if (spinWin >= totalBet * 40) {
        setWinTitle('👑🚀 COSMIC MEGA WIN!');
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
      setComboMultiplier(1);
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
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 1040, md: 1240 }, mx: 'auto', px: { xs: 0.5, sm: 1.5, md: 2 }, py: { xs: 0.8, sm: 1.5, md: 2 } }}>
      {/* ========================================================================= */}
      {/* 🌟 1. COSMIC PROGRESSIVE JACKPOT (STILL ON TOP AS REQUESTED)              */}
      {/* ========================================================================= */}
      <Paper
        elevation={10}
        sx={{
          p: { xs: 1, sm: 1.6 },
          mb: { xs: 1.2, md: 1.8 },
          borderRadius: 3.5,
          background: 'linear-gradient(135deg, #1e0b36 0%, #0d061f 50%, #15092a 100%)',
          border: '2px solid #eab308',
          boxShadow: '0 0 25px rgba(234, 179, 8, 0.35), inset 0 0 20px rgba(168, 85, 247, 0.25)',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Action Row: Navigation & Audio Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 0.6 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/games')}
            sx={{
              color: '#cbd5e1',
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid #475569',
              fontWeight: 800,
              fontSize: '0.7rem',
              borderRadius: 2,
              px: 1,
              py: 0.3,
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' },
            }}
          >
            Lobby
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Chip
              size="small"
              icon={<BoltIcon sx={{ color: '#fbbf24 !important', fontSize: 16 }} />}
              label={`COMBO ${comboMultiplier}X`}
              sx={{
                bgcolor: 'rgba(245, 158, 11, 0.15)',
                color: '#fde047',
                fontWeight: 900,
                border: '1px solid #eab308',
                fontSize: '0.65rem',
                height: 24,
              }}
            />

            <IconButton
              size="small"
              onClick={() => setShowPaytable(true)}
              title="Paytable & Rules"
              sx={{
                color: '#38bdf8',
                border: '1px solid #0284c7',
                bgcolor: 'rgba(14, 165, 233, 0.15)',
                p: 0.5,
              }}
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>

            <IconButton
              size="small"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              sx={{
                color: isMuted ? '#94a3b8' : '#fbbf24',
                border: isMuted ? '1px solid #475569' : '1px solid #fbbf24',
                bgcolor: isMuted ? 'rgba(15, 23, 42, 0.6)' : 'rgba(245, 158, 11, 0.15)',
                p: 0.5,
              }}
            >
              {isMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        {/* Center Jackpot Marquee */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.3 }}>
          <Typography
            variant="overline"
            sx={{
              color: '#fbbf24',
              letterSpacing: { xs: 2, sm: 3 },
              fontWeight: 900,
              fontSize: { xs: '0.72rem', sm: '0.86rem' },
            }}
          >
            ✨ COSMIC PROGRESSIVE JACKPOT (PHP) ✨
          </Typography>
        </Box>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            color: '#fef08a',
            fontFamily: 'monospace',
            fontSize: { xs: '2.1rem', sm: '2.9rem', md: '3.4rem' },
            animation: 'jackpotGlow 2.5s infinite ease-in-out',
            lineHeight: 1.1,
            my: 0.3,
            textShadow: '0 0 25px rgba(250, 204, 21, 0.65), 0 0 45px rgba(234, 179, 8, 0.4)',
          }}
        >
          {formatPHP(displayJackpot)}
        </Typography>
      </Paper>

      {/* ========================================================================= */}
      {/* 🚀 3. THE BIG 5-REEL CABINET (FULL WIDTH & MOBILE OPTIMIZED)              */}
      {/* ========================================================================= */}
      <Paper
        elevation={14}
        sx={{
          p: { xs: 0.5, sm: 1.2, md: 1.8 },
          borderRadius: { xs: 3, sm: 4 },
          background: `radial-gradient(ellipse at 50% 30%, rgba(30, 11, 54, 0.8) 0%, rgba(13, 6, 26, 0.98) 100%), url("/src/assets/images/cosmic_space_bg_1792584955045.jpg") center/cover no-repeat`,
          border: '2.5px solid #a855f7',
          boxShadow: '0 0 35px rgba(168, 85, 247, 0.45)',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* Floating Coin & Gem Shower on Win */}
        {lastWin > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 15,
              overflow: 'hidden',
            }}
          >
            {[...Array(20)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  top: '-30px',
                  left: `${(i * 5 + Math.random() * 4)}%`,
                  fontSize: `${1.2 + (i % 3) * 0.4}rem`,
                  animation: `coinFloat ${1.3 + (i % 4) * 0.3}s ease-in-out infinite`,
                  animationDelay: `${(i % 5) * 0.2}s`,
                }}
              >
                {i % 3 === 0 ? '🪙' : i % 3 === 1 ? '⭐' : '💎'}
              </Box>
            ))}
          </Box>
        )}

        {/* 5-Reel Slot Frame - Spans Full Width */}
        <Box
          sx={{
            p: { xs: 0.25, sm: 0.8, md: 1.2 },
            borderRadius: { xs: 2.5, sm: 3.5 },
            background: 'linear-gradient(180deg, #180931 0%, #0d041c 100%)',
            border: '2px solid #a855f7',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.5), inset 0 0 25px rgba(0, 0, 0, 0.85)',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <Grid container spacing={{ xs: 0.25, sm: 0.6, md: 1 }} justifyContent="center" sx={{ m: 0, width: '100%' }}>
            {grid.map((column, colIdx) => {
              const isReelSpinning = spinningReels[colIdx];
              const isReelBouncing = reelsBouncing[colIdx];

              return (
                <Grid item xs={2.4} key={colIdx} sx={{ minWidth: 0, p: { xs: '1.5px !important', sm: '3px !important', md: '5px !important' } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: { xs: 0.35, sm: 0.7, md: 1 },
                      p: { xs: 0.15, sm: 0.4, md: 0.6 },
                      background: 'rgba(20, 8, 38, 0.88)',
                      borderRadius: { xs: 1.8, sm: 2.5 },
                      borderRight: colIdx < 4 ? '1px solid rgba(192, 132, 252, 0.2)' : 'none',
                      border: isReelSpinning ? '1.5px solid #eab308' : 'none',
                      boxShadow: isReelSpinning ? 'inset 0 0 18px rgba(234, 179, 8, 0.4)' : 'none',
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
                            height: { xs: 90, sm: 118, md: 140, lg: 155 },
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isWinning
                              ? 'radial-gradient(circle, rgba(250, 204, 21, 0.45) 0%, #17092e 80%)'
                              : sym.bg || 'rgba(15, 6, 30, 0.85)',
                            borderRadius: { xs: 1.8, sm: 2.5 },
                            border: isWinning
                              ? '2.5px solid #facc15'
                              : `1px solid ${sym.border || '#334155'}40`,
                            position: 'relative',
                            animation: isReelSpinning
                              ? 'reelSpinBlur 0.12s linear infinite'
                              : isWinning
                              ? 'symbolWinFlash 1s infinite ease-in-out'
                              : 'none',
                            transition: 'all 0.2s ease',
                            p: { xs: 0.2, sm: 0.4 },
                          }}
                        >
                          {sym.image ? (
                            <Box
                              component="img"
                              src={sym.image}
                              alt={sym.name}
                              referrerPolicy="no-referrer"
                              sx={{
                                width: { xs: 46, sm: 68, md: 84, lg: 96 },
                                height: { xs: 46, sm: 68, md: 84, lg: 96 },
                                objectFit: 'contain',
                                transform: isWinning ? 'scale(1.15)' : 'none',
                                filter: isWinning
                                  ? 'drop-shadow(0 0 12px #facc15) drop-shadow(0 0 18px #c084fc)'
                                  : 'drop-shadow(0 3px 8px rgba(0,0,0,0.7))',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                          ) : (
                            <Typography
                              sx={{
                                fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4.1rem', lg: '4.6rem' },
                                lineHeight: 1,
                                transform: isWinning ? 'scale(1.15)' : 'none',
                                filter: isWinning ? 'drop-shadow(0 0 10px #facc15)' : 'none',
                                transition: 'transform 0.2s ease',
                              }}
                            >
                              {sym.icon}
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              color: isWinning ? '#fef08a' : sym.color,
                              fontWeight: 900,
                              fontSize: { xs: '0.52rem', sm: '0.68rem', md: '0.76rem' },
                              mt: { xs: 0.2, sm: 0.4 },
                              lineHeight: 1,
                              letterSpacing: 0.3,
                              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '96%',
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
        </Box>

        {/* Win Banner Announcement */}
        {lastWin > 0 && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.2,
              borderRadius: 3,
              background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.3) 0%, rgba(16, 185, 129, 0.35) 100%)',
              border: '2px solid #fbbf24',
              boxShadow: '0 0 25px rgba(251, 191, 36, 0.5)',
              textAlign: 'center',
              animation: 'bigWinBannerZoom 0.35s ease-out',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: '#fde047',
                letterSpacing: 0.5,
                fontSize: { xs: '1.2rem', sm: '1.6rem' },
                textShadow: '0 0 10px rgba(253, 224, 71, 0.8)',
              }}
            >
              {winTitle} +{formatPHP(lastWin)}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.5 }}>
              {winningLines.map((line, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  avatar={
                    line.symbolImage ? (
                      <Box
                        component="img"
                        src={line.symbolImage}
                        alt=""
                        referrerPolicy="no-referrer"
                        sx={{ width: 18, height: 18, objectFit: 'contain' }}
                      />
                    ) : undefined
                  }
                  label={`${line.name}: ${line.count}x ${line.symbolImage ? '' : line.symbolIcon} (+${formatPHP(line.win)})`}
                  sx={{
                    bgcolor: 'rgba(15, 6, 30, 0.9)',
                    color: line.color || '#fbbf24',
                    border: `1.5px solid ${line.color || '#f59e0b'}`,
                    fontWeight: 800,
                    fontSize: '0.68rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* ========================================================================= */}
        {/* 🎮 4. PRAGMATIC PLAY AUTHENTIC BOTTOM HUD BAR                            */}
        {/* ========================================================================= */}
        <Box
          sx={{
            mt: 1.5,
            pt: 1.2,
            borderTop: '1.5px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.2,
          }}
        >
          {/* Credit, Bet, Win Indicators */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.5, sm: 2 },
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-start' },
            }}
          >
            {/* Turbo Toggle */}
            <Tooltip title={isTurbo ? 'Turbo Spin Active' : 'Normal Spin Speed'}>
              <IconButton
                size="small"
                onClick={() => setIsTurbo(!isTurbo)}
                sx={{
                  color: isTurbo ? '#fbbf24' : '#94a3b8',
                  bgcolor: isTurbo ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: isTurbo ? '1.5px solid #fbbf24' : '1px solid #475569',
                  p: 0.7,
                }}
              >
                {isTurbo ? <FlashOnIcon fontSize="small" /> : <FlashOffIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Credit (Balance) */}
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.62rem', display: 'block' }}>
                CREDIT
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#fbbf24', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                {formatPHP(chips)}
              </Typography>
            </Box>

            {/* Bet */}
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.62rem', display: 'block' }}>
                BET ({selectedLinesCount}L)
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#fef08a', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                {formatPHP(totalBet)}
              </Typography>
            </Box>

            {/* Win Display */}
            {lastWin > 0 && (
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 800, fontSize: '0.62rem', display: 'block' }}>
                  WIN
                </Typography>
                <Typography variant="subtitle1" sx={{ color: '#34d399', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                  +{formatPHP(lastWin)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Spin Controls: Minus, Big Center Spin, Plus & Autoplay */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Decrease Bet Button (-) */}
              <IconButton
                size="small"
                onClick={handleDecreaseBet}
                disabled={isSpinning || LINE_BETS.indexOf(betPerLine) === 0}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  border: '1.5px solid #64748b',
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' },
                }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>

              {/* Large Pragmatic Style Spin Button */}
              <Box
                component="button"
                disabled={isSpinning || chips < totalBet}
                onClick={handleSpin}
                sx={{
                  width: { xs: 66, sm: 76 },
                  height: { xs: 66, sm: 76 },
                  borderRadius: '50%',
                  border: '3px solid #facc15',
                  background: isSpinning
                    ? 'radial-gradient(circle, #3b0764 0%, #1e1b4b 100%)'
                    : 'radial-gradient(circle, #9333ea 0%, #4c1d95 60%, #1e1b4b 100%)',
                  boxShadow: '0 0 25px rgba(245, 158, 11, 0.6), inset 0 0 15px rgba(250, 204, 21, 0.4)',
                  cursor: isSpinning || chips < totalBet ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  '&:hover:not(:disabled)': {
                    transform: 'scale(1.06)',
                    boxShadow: '0 0 35px rgba(245, 158, 11, 0.85), inset 0 0 20px rgba(250, 204, 21, 0.6)',
                  },
                  '&:active:not(:disabled)': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {isSpinning ? (
                  <StopIcon sx={{ fontSize: { xs: 32, sm: 38 }, color: '#facc15', animation: 'pragmaticSpin 1s linear infinite' }} />
                ) : (
                  <CasinoIcon sx={{ fontSize: { xs: 34, sm: 40 }, color: '#fef08a' }} />
                )}
              </Box>

              {/* Increase Bet Button (+) */}
              <IconButton
                size="small"
                onClick={handleIncreaseBet}
                disabled={isSpinning || LINE_BETS.indexOf(betPerLine) === LINE_BETS.length - 1}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  border: '1.5px solid #64748b',
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' },
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Autoplay Pill underneath spin button */}
            {autoSpinCount > 0 ? (
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={stopAutoSpins}
                startIcon={<AutoModeIcon sx={{ fontSize: 14 }} />}
                sx={{
                  fontWeight: 900,
                  py: 0.2,
                  px: 1.5,
                  fontSize: '0.65rem',
                  borderRadius: 2,
                  height: 24,
                }}
              >
                STOP AUTOPLAY ({autoSpinCount})
              </Button>
            ) : (
              <Button
                size="small"
                onClick={() => startAutoSpins(10)}
                disabled={isSpinning || chips < totalBet}
                startIcon={<AutoModeIcon sx={{ fontSize: 14 }} />}
                sx={{
                  fontWeight: 900,
                  py: 0.2,
                  px: 1.5,
                  fontSize: '0.65rem',
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  border: '1px solid #475569',
                  height: 24,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)' },
                }}
              >
                AUTOPLAY
              </Button>
            )}
          </Box>
        </Box>

        {/* ========================================================================= */}
        {/* 🎰 5. PAYLINES & LINE BET (BELOW AUTOPLAY BUTTON)                        */}
        {/* ========================================================================= */}
        <Box
          sx={{
            mt: 1.2,
            pt: 1.2,
            borderTop: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 0.8, sm: 2 },
            width: '100%',
          }}
        >
          {/* Paylines Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#c084fc', fontWeight: 900, fontSize: '0.68rem', mr: 0.3 }}>
              PAYLINES:
            </Typography>
            {[1, 3, 5].map((cnt) => (
              <Button
                key={cnt}
                size="small"
                variant={selectedLinesCount === cnt ? 'contained' : 'outlined'}
                onClick={() => {
                  setSelectedLinesCount(cnt);
                  slotsAudio.playChipClick();
                }}
                sx={{
                  fontWeight: 900,
                  minWidth: 0,
                  px: { xs: 1.2, sm: 1.6 },
                  py: 0.3,
                  fontSize: { xs: '0.68rem', sm: '0.74rem' },
                  borderRadius: 2,
                  bgcolor: selectedLinesCount === cnt ? '#a855f7' : 'transparent',
                  color: selectedLinesCount === cnt ? '#fff' : '#c084fc',
                  borderColor: '#a855f7',
                  '&:hover': { bgcolor: '#9333ea', borderColor: '#c084fc' },
                }}
              >
                {cnt} Line{cnt > 1 ? 's' : ''} {cnt === 1 ? '(₱1 MIN)' : ''}
              </Button>
            ))}
          </Box>

          {/* Line Bet Chips Selector (Starting at ₱1) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 900, fontSize: '0.68rem', mr: 0.3 }}>
              LINE BET:
            </Typography>
            {LINE_BETS.map((amt) => (
              <Chip
                key={amt}
                size="small"
                label={formatPHP(amt)}
                clickable
                onClick={() => {
                  setBetPerLine(amt);
                  slotsAudio.playChipClick();
                }}
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '0.68rem', sm: '0.75rem' },
                  height: 24,
                  bgcolor: betPerLine === amt ? '#fbbf24' : 'rgba(255, 255, 255, 0.08)',
                  color: betPerLine === amt ? '#000' : '#e2e8f0',
                  border: betPerLine === amt ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.15)',
                  '&:hover': { bgcolor: betPerLine === amt ? '#f59e0b' : 'rgba(255, 255, 255, 0.18)' },
                }}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* ========================================================================= */}
      {/* 📖 5. PAYTABLE & MULTIPLIERS MODAL                                        */}
      {/* ========================================================================= */}
      <Dialog
        open={showPaytable}
        onClose={() => setShowPaytable(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f0622',
            border: '2px solid #a855f7',
            borderRadius: 3.5,
            color: '#fff',
            boxShadow: '0 0 35px rgba(168, 85, 247, 0.5)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#fde047', borderBottom: '1px solid rgba(168, 85, 247, 0.3)' }}>
          Cosmic Slots Deluxe • Paytable & Multipliers
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Features Highlights */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(234, 179, 8, 0.12)', borderRadius: 2, border: '1px solid #eab308' }}>
            <Typography variant="subtitle2" sx={{ color: '#fde047', fontWeight: 900, mb: 0.5 }}>
              ⭐ Cosmic Wild Star & Combo Multipliers:
            </Typography>
            <Typography variant="caption" sx={{ color: '#e2e8f0', display: 'block', mb: 0.5 }}>
              • <strong>Cosmic Star ⭐:</strong> Acts as <strong>WILD</strong> (substitutes all symbols across active paylines).
            </Typography>
            <Typography variant="caption" sx={{ color: '#e2e8f0', display: 'block' }}>
              • <strong>Combo Multipliers:</strong> Consecutive winning spins charge the multiplier meter up to <strong>5X</strong>!
            </Typography>
          </Box>

          {/* Cosmic Progressive Jackpot Feature */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(52, 211, 153, 0.12)', borderRadius: 2, border: '1px solid #10b981' }}>
            <Typography variant="subtitle2" sx={{ color: '#34d399', fontWeight: 900, mb: 0.5 }}>
              💰 40% Real-Money Deposit Synced Progressive Jackpot:
            </Typography>
            <Typography variant="caption" sx={{ color: '#e2e8f0', display: 'block', mb: 0.5 }}>
              • <strong>40% Deposit Inflow:</strong> 40% of every Philippine Peso deposited by real users through PayMongo QRPH directly increases the Cosmic Progressive Jackpot in real time!
            </Typography>
            <Typography variant="caption" sx={{ color: '#e2e8f0', display: 'block' }}>
              • <strong>Mega Jackpot Trigger:</strong> Hit <strong>5 Cosmic Stars (⭐)</strong> on any active payline to trigger and win the entire live progressive jackpot pool!
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
                    bgcolor: 'rgba(20, 8, 38, 0.9)',
                    border: `1.5px solid ${sym.border}`,
                    borderRadius: 2,
                  }}
                >
                  {sym.image ? (
                    <Box
                      component="img"
                      src={sym.image}
                      alt={sym.name}
                      referrerPolicy="no-referrer"
                      sx={{ width: 44, height: 44, objectFit: 'contain', mx: 'auto', display: 'block', mb: 0.5 }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: '1.8rem', lineHeight: 1 }}>{sym.icon}</Typography>
                  )}
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

          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#090314', borderRadius: 2, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
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
