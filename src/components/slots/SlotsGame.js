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

const SYMBOLS = [
  { id: 'crown', name: 'Crown', icon: '👑', mult: { 3: 30, 4: 150, 5: 600 }, color: '#fbbf24' },
  { id: 'diamond', name: 'Diamond', icon: '💎', mult: { 3: 20, 4: 100, 5: 400 }, color: '#38bdf8' },
  { id: 'seven', name: 'Lucky 7', icon: '7️⃣', mult: { 3: 15, 4: 75, 5: 300 }, color: '#ef4444' },
  { id: 'bell', name: 'Bell', icon: '🔔', mult: { 3: 10, 4: 50, 200: 200 }, color: '#f59e0b' },
  { id: 'wild', name: 'WILD', icon: '⭐', mult: { 3: 50, 4: 200, 5: 1000 }, color: '#fde047', isWild: true },
  { id: 'cherry', name: 'Cherry', icon: '🍒', mult: { 3: 5, 4: 20, 5: 100 }, color: '#f43f5e' },
  { id: 'grape', name: 'Grape', icon: '🍇', mult: { 3: 4, 4: 15, 5: 80 }, color: '#c084fc' },
];

export default function SlotsGame() {
  const { chips, addChips, deductChips } = useFirebaseCasino();

  const [grid, setGrid] = useState([
    [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    [SYMBOLS[3], SYMBOLS[4], SYMBOLS[5]],
    [SYMBOLS[6], SYMBOLS[0], SYMBOLS[1]],
    [SYMBOLS[2], SYMBOLS[3], SYMBOLS[4]],
    [SYMBOLS[5], SYMBOLS[6], SYMBOLS[0]],
  ]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningReels, setSpinningReels] = useState([false, false, false, false, false]);
  const [reelsBouncing, setReelsBouncing] = useState([false, false, false, false, false]);
  const [winningCells, setWinningCells] = useState(new Set());
  const [winningInfo, setWinningInfo] = useState([]);

  const [betPerLine, setBetPerLine] = useState(25);
  const [lastWin, setLastWin] = useState(0);
  const [jackpot, setJackpot] = useState(148920);

  const [isMuted, setIsMuted] = useState(slotsAudio.isMuted);
  const [isTurbo, setIsTurbo] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [showPaytable, setShowPaytable] = useState(false);

  const totalBet = betPerLine * 5; // 5 paylines

  // Progressive jackpot ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setJackpot((prev) => prev + Math.floor(Math.random() * 5) + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getRandomSymbol = () => {
    const rand = Math.random();
    if (rand < 0.08) return SYMBOLS[4]; // Wild ⭐
    if (rand < 0.20) return SYMBOLS[0]; // Crown 👑
    if (rand < 0.35) return SYMBOLS[1]; // Diamond 💎
    if (rand < 0.50) return SYMBOLS[2]; // 7️⃣
    if (rand < 0.65) return SYMBOLS[3]; // Bell 🔔
    if (rand < 0.82) return SYMBOLS[5]; // Cherry 🍒
    return SYMBOLS[6]; // Grape 🍇
  };

  const handleToggleMute = () => {
    const next = slotsAudio.toggleMute();
    setIsMuted(next);
    if (!next) slotsAudio.playChipClick();
  };

  const handleSpin = async () => {
    if (isSpinning || chips < totalBet) {
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
    setWinningCells(new Set());
    setWinningInfo([]);
    setSpinningReels([true, true, true, true, true]);
    setReelsBouncing([false, false, false, false, false]);

    // Generate final 5x3 slot grid
    const finalGrid = [
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    ];

    // Staggered stop delays per reel
    const baseDelay = isTurbo ? 300 : 700;
    const stepDelay = isTurbo ? 180 : 320;

    for (let reel = 0; reel < 5; reel++) {
      setTimeout(() => {
        setGrid((prev) => {
          const updated = [...prev];
          updated[reel] = finalGrid[reel];
          return updated;
        });

        setSpinningReels((prev) => {
          const updated = [...prev];
          updated[reel] = false;
          return updated;
        });

        setReelsBouncing((prev) => {
          const updated = [...prev];
          updated[reel] = true;
          return updated;
        });

        slotsAudio.playReelStop(reel);

        // Turn off bounce animation after 350ms
        setTimeout(() => {
          setReelsBouncing((prev) => {
            const updated = [...prev];
            updated[reel] = false;
            return updated;
          });
        }, 350);

        // Final reel stopped: Evaluate wins
        if (reel === 4) {
          evaluateWinningLines(finalGrid);
        }
      }, baseDelay + reel * stepDelay);
    }
  };

  const evaluateWinningLines = (finalGrid) => {
    setIsSpinning(false);

    let totalWinAmount = 0;
    const matchedCells = new Set();
    const winningLinesFound = [];

    // Paylines configurations
    // Line 0: Top row (0,0 - 1,0 - 2,0 - 3,0 - 4,0)
    // Line 1: Center row (0,1 - 1,1 - 2,1 - 3,1 - 4,1)
    // Line 2: Bottom row (0,2 - 1,2 - 2,2 - 3,2 - 4,2)
    // Line 3: V-Shape (0,0 - 1,1 - 2,2 - 3,1 - 4,0)
    // Line 4: Inverted V (0,2 - 1,1 - 2,0 - 3,1 - 4,2)
    const paylines = [
      { name: 'Top Payline', coords: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
      { name: 'Center Payline', coords: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] },
      { name: 'Bottom Payline', coords: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]] },
      { name: 'V-Shape Payline', coords: [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]] },
      { name: 'Inverted-V Payline', coords: [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]] },
    ];

    paylines.forEach(({ name, coords }) => {
      const lineSymbols = coords.map(([c, r]) => finalGrid[c][r]);
      const target = lineSymbols.find((s) => !s.isWild) || lineSymbols[0];

      let matchCount = 0;
      for (let s of lineSymbols) {
        if (s.id === target.id || s.isWild) matchCount++;
        else break;
      }

      if (matchCount >= 3) {
        const mult = target.mult[matchCount] || 10;
        const lineWin = mult * betPerLine;
        totalWinAmount += lineWin;

        winningLinesFound.push({
          name,
          symbolName: target.name,
          symbolIcon: target.icon,
          count: matchCount,
          win: lineWin,
        });

        for (let i = 0; i < matchCount; i++) {
          const [c, r] = coords[i];
          matchedCells.add(`${c}-${r}`);
        }
      }
    });

    if (totalWinAmount > 0) {
      setLastWin(totalWinAmount);
      setWinningCells(matchedCells);
      setWinningInfo(winningLinesFound);
      addChips(totalWinAmount, 'Slots', `Cosmic Slots Deluxe Win (+${formatPHP(totalWinAmount)})`);
      slotsAudio.playLineWin(totalWinAmount >= totalBet * 5);
    } else {
      setLastWin(0);
      setWinningCells(new Set());
      setWinningInfo([]);
    }

    // Auto spin handler
    setAutoSpinCount((prev) => {
      if (prev > 1 && chips >= totalBet) {
        setTimeout(handleSpin, isTurbo ? 400 : 1000);
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
        elevation={6}
        sx={{
          p: { xs: 1.5, sm: 2.2 },
          mb: 2,
          borderRadius: 3,
          background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 100%)',
          border: '2px solid #f59e0b',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Chip
            size="small"
            label="5 REELS • 5 PAYLINES"
            sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 900, border: '1px solid #f59e0b', fontSize: '0.65rem' }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <IconButton
              size="small"
              onClick={() => setShowPaytable(true)}
              title="View Paytable & Rules"
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

        <Typography variant="overline" sx={{ color: '#fbbf24', letterSpacing: 2, fontWeight: 900, fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
          ✨ COSMIC PROGRESSIVE JACKPOT (PHP) ✨
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            color: '#fef08a',
            fontFamily: 'monospace',
            fontSize: { xs: '1.7rem', sm: '2.5rem' },
            animation: 'jackpotGlow 2.5s infinite ease-in-out',
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
        {/* Floating Coin / Particle Shower on Win */}
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
            {[...Array(14)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  top: '-30px',
                  left: `${(i * 7.5 + Math.random() * 5)}%`,
                  fontSize: `${18 + (i % 3) * 8}px`,
                  animation: `coinFloat ${1.4 + (i % 4) * 0.3}s ease-in infinite`,
                  animationDelay: `${(i % 5) * 0.2}s`,
                }}
              >
                {['🪙', '✨', '💎', '⭐'][i % 4]}
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
                    border: isReelSpinning ? '1px solid #f59e0b' : '1px solid #1e293b',
                    boxShadow: isReelSpinning ? 'inset 0 0 15px rgba(245, 158, 11, 0.3)' : 'none',
                    overflow: 'hidden',
                    transform: isReelBouncing ? 'translateY(0)' : 'none',
                    animation: isReelBouncing ? 'reelSnapBounce 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
                  }}
                >
                  {column.map((sym, rowIdx) => {
                    const isWinning = winningCells.has(`${colIdx}-${rowIdx}`);

                    return (
                      <Box
                        key={rowIdx}
                        sx={{
                          height: { xs: 62, sm: 94 },
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isWinning
                            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, #020617 80%)'
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
                            fontSize: { xs: '1.6rem', sm: '2.6rem' },
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
              🎉 COSMIC WINNER! +{formatPHP(lastWin)}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {winningInfo.map((info, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  label={`${info.name}: ${info.count}x ${info.symbolIcon} (+${formatPHP(info.win)})`}
                  sx={{
                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                    color: '#fbbf24',
                    border: '1px solid #f59e0b',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Mobile-Friendly Controls Console */}
        <Box
          sx={{
            mt: 2.5,
            pt: 2,
            borderTop: '1px solid #1e293b',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          {/* Bet Chips in Philippine Peso */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, mr: 0.5, fontSize: '0.7rem' }}>
              LINE BET:
            </Typography>
            {[10, 25, 50, 100, 250].map((amt) => (
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
                  border: '1px solid #475569',
                }}
              />
            ))}
          </Box>

          {/* Controls: Turbo, Auto-Spin, Wager, and Spin Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
            {/* Turbo Toggle */}
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

            {/* Auto Spin Button */}
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

            <Box sx={{ textAlign: 'left', minWidth: 80 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, display: 'block', fontSize: '0.62rem' }}>
                TOTAL (5 LINES)
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace', lineHeight: 1 }}>
                {formatPHP(totalBet)}
              </Typography>
            </Box>

            {/* Spin Button */}
            <Button
              variant="contained"
              disabled={isSpinning || chips < totalBet}
              onClick={handleSpin}
              startIcon={<CasinoIcon />}
              sx={{
                flexGrow: { xs: 1, sm: 0 },
                px: { xs: 3, sm: 5 },
                py: 1.1,
                fontSize: { xs: '1rem', sm: '1.15rem' },
                fontWeight: 900,
                borderRadius: 2.5,
                background: 'linear-gradient(45deg, #f59e0b, #fbbf24)',
                color: '#000',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
                transition: 'all 0.15s ease',
                '&:hover': {
                  background: 'linear-gradient(45deg, #d97706, #f59e0b)',
                  transform: 'scale(1.02)',
                },
              }}
            >
              {isSpinning ? 'SPINNING...' : 'SPIN'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Paytable Modal Dialog */}
      <Dialog
        open={showPaytable}
        onClose={() => setShowPaytable(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            border: '2px solid #f59e0b',
            borderRadius: 3,
            color: '#fff',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#fbbf24', borderBottom: '1px solid #334155' }}>
          Cosmic Slots Deluxe • Paytable & Paylines
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            Prizes are multiplied by your <strong>Line Bet</strong>. Wild ⭐ substitutes for any symbol to form winning combinations across 5 paylines.
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
              Active 5 Paylines:
            </Typography>
            <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
              • Line 1: Straight Top Row | Line 2: Straight Center Row | Line 3: Straight Bottom Row
            </Typography>
            <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
              • Line 4: V-Shape (Top-Center-Bottom-Center-Top)
            </Typography>
            <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
              • Line 5: Inverted-V (Bottom-Center-Top-Center-Bottom)
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
