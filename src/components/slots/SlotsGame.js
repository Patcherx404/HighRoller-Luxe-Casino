import React, { useState, useEffect } from 'react';
import { useFirebaseCasino } from '../../context/FirebaseCasinoContext';
import { formatPHP } from '../../utils/formatCurrency';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
} from '@mui/material';

const SYMBOLS = [
  { id: 'crown', name: 'Crown', icon: '👑', mult: { 3: 30, 4: 150, 5: 600 }, color: '#fbbf24' },
  { id: 'diamond', name: 'Diamond', icon: '💎', mult: { 3: 20, 4: 100, 5: 400 }, color: '#38bdf8' },
  { id: 'seven', name: 'Lucky 7', icon: '7️⃣', mult: { 3: 15, 4: 75, 5: 300 }, color: '#ef4444' },
  { id: 'bell', name: 'Bell', icon: '🔔', mult: { 3: 10, 4: 50, 5: 200 }, color: '#f59e0b' },
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
  const [betPerLine, setBetPerLine] = useState(25);
  const [lines, setLines] = useState(5);
  const [lastWin, setLastWin] = useState(0);
  const [jackpot, setJackpot] = useState(148920);

  const totalBet = betPerLine * lines;

  // Progressive jackpot ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setJackpot((prev) => prev + Math.floor(Math.random() * 5) + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getRandomSymbol = () => {
    const rand = Math.random();
    if (rand < 0.08) return SYMBOLS[4]; // Wild
    if (rand < 0.20) return SYMBOLS[0]; // Crown
    if (rand < 0.35) return SYMBOLS[1]; // Diamond
    if (rand < 0.50) return SYMBOLS[2]; // 7
    if (rand < 0.65) return SYMBOLS[3]; // Bell
    if (rand < 0.82) return SYMBOLS[5]; // Cherry
    return SYMBOLS[6]; // Grape
  };

  const handleSpin = async () => {
    if (isSpinning || chips < totalBet) return;

    const deducted = await deductChips(
      totalBet,
      'Slots',
      `Slots Spin Bet (${formatPHP(totalBet)})`
    );
    if (!deducted) return;

    setIsSpinning(true);
    setLastWin(0);

    const newGrid = [
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    ];

    setTimeout(() => {
      setGrid(newGrid);
      setIsSpinning(false);

      // Check center line
      const centerSymbols = newGrid.map((col) => col[1]);
      const target = centerSymbols.find((s) => !s.isWild) || centerSymbols[0];
      let matches = 0;
      for (let s of centerSymbols) {
        if (s.id === target.id || s.isWild) matches++;
        else break;
      }

      let winAmount = 0;
      if (matches >= 3) {
        const mult = target.mult[matches] || 10;
        winAmount = mult * betPerLine;
      }

      // Check top line
      const topSymbols = newGrid.map((col) => col[0]);
      const targetTop = topSymbols.find((s) => !s.isWild) || topSymbols[0];
      let topMatches = 0;
      for (let s of topSymbols) {
        if (s.id === targetTop.id || s.isWild) topMatches++;
        else break;
      }
      if (topMatches >= 3) {
        const mult = targetTop.mult[topMatches] || 10;
        winAmount += mult * betPerLine;
      }

      if (winAmount > 0) {
        setLastWin(winAmount);
        addChips(winAmount, 'Slots', `Slots Spin Win (+${formatPHP(winAmount)})`);
      }
    }, 900);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 0.5, sm: 2, md: 3 }, py: { xs: 1, md: 2 } }}>
      {/* Progressive Jackpot Header */}
      <Paper
        elevation={6}
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          mb: 2,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          border: '2px solid #f59e0b',
          textAlign: 'center',
          color: '#ffffff',
        }}
      >
        <Typography variant="overline" sx={{ color: '#fbbf24', letterSpacing: 2, fontWeight: 900, fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
          HighRoller Progressive Jackpot (PHP)
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#fef08a', fontFamily: 'monospace', fontSize: { xs: '1.6rem', sm: '2.4rem' } }}>
          {formatPHP(jackpot)}
        </Typography>
      </Paper>

      {/* 5-Reel Slot Machine Felt (Phone Responsive) */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 1, sm: 3 },
          borderRadius: 3,
          background: '#090d16',
          border: '2px solid #f59e0b',
          boxShadow: '0 0 25px rgba(245, 158, 11, 0.2)',
        }}
      >
        <Grid container spacing={{ xs: 0.5, sm: 1.5 }} justifyContent="center">
          {grid.map((column, colIdx) => (
            <Grid item xs={2.4} key={colIdx}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 0.5, sm: 1.2 },
                  p: { xs: 0.3, sm: 1 },
                  background: '#131b2e',
                  borderRadius: 2,
                  border: '1px solid #1e293b',
                }}
              >
                {column.map((sym, rowIdx) => (
                  <Box
                    key={rowIdx}
                    sx={{
                      height: { xs: 58, sm: 90 },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#020617',
                      borderRadius: 1.5,
                      border: '1px solid #334155',
                      filter: isSpinning ? 'blur(1px)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Typography sx={{ fontSize: { xs: '1.5rem', sm: '2.5rem' }, lineHeight: 1 }}>
                      {sym.icon}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: sym.color,
                        fontWeight: 800,
                        fontSize: { xs: '0.52rem', sm: '0.72rem' },
                        mt: 0.3,
                        lineHeight: 1,
                      }}
                    >
                      {sym.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Win Alert Banner */}
        {lastWin > 0 && (
          <Box
            sx={{
              mt: 2,
              p: 1.2,
              borderRadius: 2,
              background: 'linear-gradient(90deg, rgba(245,158,11,0.2) 0%, rgba(16,185,129,0.3) 100%)',
              border: '2px solid #10b981',
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#34d399', letterSpacing: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              🎉 WINNER! +{formatPHP(lastWin)}
            </Typography>
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
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, mr: 0.5, fontSize: '0.7rem' }}>
              LINE BET:
            </Typography>
            {[10, 25, 50, 100, 250].map((amt) => (
              <Chip
                key={amt}
                label={formatPHP(amt)}
                clickable
                color={betPerLine === amt ? 'warning' : 'default'}
                onClick={() => setBetPerLine(amt)}
                sx={{
                  fontWeight: 900,
                  height: 28,
                  fontSize: '0.75rem',
                  bgcolor: betPerLine === amt ? '#fbbf24' : '#1e293b',
                  color: betPerLine === amt ? '#000' : '#fff',
                }}
              />
            ))}
          </Box>

          {/* Total Wager and Spin Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', fontSize: '0.65rem' }}>
                TOTAL WAGER (5 LINES)
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace', lineHeight: 1 }}>
                {formatPHP(totalBet)}
              </Typography>
            </Box>

            <Button
              variant="contained"
              disabled={isSpinning || chips < totalBet}
              onClick={handleSpin}
              sx={{
                flexGrow: { xs: 1, sm: 0 },
                px: { xs: 4, sm: 6 },
                py: 1,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 900,
                borderRadius: 2.5,
                background: 'linear-gradient(45deg, #f59e0b, #fbbf24)',
                color: '#000',
                boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #d97706, #f59e0b)',
                },
              }}
            >
              {isSpinning ? 'SPINNING' : 'SPIN'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
