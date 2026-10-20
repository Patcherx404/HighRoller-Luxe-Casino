import React, { useState } from 'react';
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

const TABLES = [
  { id: '1', name: 'Manila High Roller Penthouse', stakes: '₱500 / ₱1,000', sb: 500, bb: 1000, minBuy: 20000, players: 5, avgPot: 32000 },
  { id: '2', name: 'Makati Neon Velocity', stakes: '₱100 / ₱200', sb: 100, bb: 200, minBuy: 4000, players: 5, avgPot: 7500 },
  { id: '3', name: 'BGC Royale', stakes: '₱25 / ₱50', sb: 25, bb: 50, minBuy: 1000, players: 5, avgPot: 1800 },
  { id: '4', name: 'Boracay Lounge', stakes: '₱5 / ₱10', sb: 5, bb: 10, minBuy: 200, players: 4, avgPot: 450 },
];

const BOT_PLAYERS = [
  { name: 'VegasViper', avatar: '🐍', chips: 18200 },
  { name: 'LadyLuck', avatar: '💃', chips: 9400 },
  { name: 'CardShark', avatar: '🦈', chips: 24500 },
  { name: 'BluffKing', avatar: '🎭', chips: 11200 },
  { name: 'AceHunter', avatar: '🦅', chips: 15600 },
];

export default function PokerDashboard() {
  const { chips, addChips, deductChips, casinoConfig } = useFirebaseCasino();
  const [activeTable, setActiveTable] = useState(null);

  // Table gameplay state
  const [pot, setPot] = useState(0);
  const [stage, setStage] = useState('preflop'); // 'preflop', 'flop', 'turn', 'river', 'showdown'
  const [communityCards, setCommunityCards] = useState([]);
  const [heroHoleCards] = useState([
    { suit: '♠', value: 'A' },
    { suit: '♥', value: 'K' },
  ]);
  const [actionLog, setActionLog] = useState([]);
  const [raiseVal] = useState(200);

  const logMessage = (msg) => {
    setActionLog((prev) => [msg, ...prev.slice(0, 15)]);
  };

  const handleJoinTable = (table) => {
    setActiveTable(table);
    setPot(table.sb + table.bb);
    setStage('preflop');
    setCommunityCards([]);
    logMessage(`--- Joined ${table.name} (${table.stakes}) ---`);
    logMessage(`Posted Big Blind: ${formatPHP(table.bb)}`);
    deductChips(table.bb, 'Poker', `Poker Big Blind at ${table.name}`);
  };

  const handleNextStreet = () => {
    const cardPool = [
      { suit: '♠', value: 'A' },
      { suit: '♥', value: 'K' },
      { suit: '♦', value: 'Q' },
      { suit: '♣', value: 'J' },
      { suit: '♠', value: '10' },
      { suit: '♦', value: '7' },
      { suit: '♥', value: '2' },
    ];

    if (stage === 'preflop') {
      const flop = [cardPool[2], cardPool[3], cardPool[4]];
      setCommunityCards(flop);
      setStage('flop');
      logMessage(`Flop dealt: [${flop.map((c) => c.value + c.suit).join(' ')}]`);
    } else if (stage === 'flop') {
      const turn = cardPool[5];
      setCommunityCards((prev) => [...prev, turn]);
      setStage('turn');
      logMessage(`Turn dealt: [${turn.value + turn.suit}]`);
    } else if (stage === 'turn') {
      const river = cardPool[6];
      setCommunityCards((prev) => [...prev, river]);
      setStage('river');
      logMessage(`River dealt: [${river.value + river.suit}]`);
    } else if (stage === 'river') {
      setStage('showdown');
      // Accurate Poker Win Rate Engine:
      // Respects casinoConfig.pokerWinRate (Default: 35% house edge)
      const targetWinRate = Math.max(1, Math.min(100, Number(casinoConfig?.pokerWinRate ?? 35)));
      const willWin = (Math.random() * 100) < targetWinRate;

      if (willWin) {
        const win = pot + 800;
        const winHands = ['Ace-High Straight', 'Flush Ace-High', 'Three of a Kind Aces', 'Kings Full of Jacks'];
        const hand = winHands[Math.floor(Math.random() * winHands.length)];
        logMessage(`🏆 SHOWDOWN: You won the pot with ${hand}! (+${formatPHP(win)})`);
        addChips(win, 'Poker', `Poker Showdown Pot Win (+${formatPHP(win)})`);
      } else {
        const winnerBot = BOT_PLAYERS[Math.floor(Math.random() * BOT_PLAYERS.length)].name;
        const botHands = ['Full House (Kings over Tens)', 'Nut Flush (Ace-High)', 'Set of Queens on River', 'Two Pair (Aces & Kings)'];
        const botHand = botHands[Math.floor(Math.random() * botHands.length)];
        logMessage(`❌ SHOWDOWN: ${winnerBot} called down and won with ${botHand}!`);
      }
    }
  };

  const handleCheck = () => {
    logMessage('You checked');
    handleNextStreet();
  };

  const handleCall = () => {
    const toCall = activeTable ? activeTable.bb : 50;
    if (chips >= toCall) {
      deductChips(toCall, 'Poker', `Poker Call (${formatPHP(toCall)})`);
      setPot((p) => p + toCall * 2);
    }
    logMessage(`You called ${formatPHP(toCall)}`);
    handleNextStreet();
  };

  const handleRaise = () => {
    const amt = raiseVal;
    if (chips >= amt) {
      deductChips(amt, 'Poker', `Poker Raise (${formatPHP(amt)})`);
      setPot((p) => p + amt * 2);
    }
    logMessage(`You raised to ${formatPHP(amt)}! Bots call.`);
    handleNextStreet();
  };

  const handleFold = () => {
    logMessage('You folded. Dealing next hand...');
    setStage('preflop');
    setCommunityCards([]);
    if (activeTable) {
      setPot(activeTable.sb + activeTable.bb);
    }
  };

  // If no table is joined yet, show the live tables lobby
  if (!activeTable) {
    return (
      <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 0.5, sm: 2, md: 3 }, py: { xs: 1, md: 2 } }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="overline" sx={{ color: '#fbbf24', letterSpacing: 2, fontWeight: 900, fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
            Philippine Peso Cash Tables • 🇵🇭
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#fff', fontSize: { xs: '1.4rem', sm: '2rem' } }}>
            Live Poker Lobby
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            No-Limit Texas Hold’em • High-Stakes Ring Games
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {TABLES.map((t) => (
            <Grid item xs={12} sm={6} key={t.id}>
              <Paper
                elevation={6}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  border: '1.5px solid #38bdf8',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  '&:hover': {
                    borderColor: '#f59e0b',
                    boxShadow: '0 0 20px rgba(56, 189, 248, 0.2)',
                  },
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                      {t.name}
                    </Typography>
                    <Chip label={`${t.players}/6 Plrs`} size="small" sx={{ bgcolor: '#0284c7', color: '#fff', fontWeight: 900 }} />
                  </Box>

                  <Typography variant="body2" sx={{ color: '#fbbf24', fontWeight: 900, mb: 1 }}>
                    Stakes: {t.stakes} (PHP)
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <span>Min Buy-in: <strong style={{ color: '#fff' }}>{formatPHP(t.minBuy)}</strong></span>
                    <span>Avg Pot: <strong style={{ color: '#34d399' }}>{formatPHP(t.avgPot)}</strong></span>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  onClick={() => handleJoinTable(t)}
                  sx={{
                    py: 1,
                    fontWeight: 900,
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #0284c7, #38bdf8)',
                    color: '#fff',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #0369a1, #0284c7)',
                    },
                  }}
                >
                  Take Seat →
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Active Poker Table View
  return (
    <Box sx={{ width: '100%', maxWidth: 950, mx: 'auto', px: { xs: 0.5, sm: 2, md: 3 }, py: { xs: 1, md: 2 } }}>
      {/* Table Top Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setActiveTable(null)}
          sx={{ color: '#94a3b8', borderColor: '#475569', fontWeight: 800, fontSize: '0.75rem' }}
        >
          ← Leave Table
        </Button>
        <Typography variant="subtitle1" sx={{ color: '#fbbf24', fontWeight: 900, fontSize: { xs: '0.85rem', sm: '1rem' } }}>
          {activeTable.name} • {activeTable.stakes} (PHP)
        </Typography>
      </Box>

      {/* Oval Felt Table (Phone-Friendly) */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 1.5, sm: 3 },
          borderRadius: { xs: 4, sm: 8 },
          background: 'radial-gradient(ellipse at center, #1e3a8a 0%, #0f172a 80%)',
          border: '3px solid #38bdf8',
          boxShadow: '0 0 30px rgba(56, 189, 248, 0.25)',
          color: '#ffffff',
          minHeight: { xs: 430, sm: 500 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top Opponents */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 0.5 }}>
          {BOT_PLAYERS.slice(0, 3).map((bot, i) => (
            <Box
              key={i}
              sx={{
                p: { xs: 0.6, sm: 1.2 },
                borderRadius: 2.5,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid #3b82f6',
                textAlign: 'center',
                minWidth: { xs: 68, sm: 95 },
              }}
            >
              <Typography sx={{ fontSize: { xs: '1rem', sm: '1.3rem' } }}>{bot.avatar}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#fff', fontSize: { xs: '0.62rem', sm: '0.75rem' }, display: 'block', lineHeight: 1 }}>
                {bot.name}
              </Typography>
              <Typography variant="caption" display="block" sx={{ color: '#34d399', fontWeight: 900, fontSize: { xs: '0.65rem', sm: '0.8rem' }, mt: 0.2 }}>
                {formatPHP(bot.chips)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Center Board: Community Cards & Pot */}
        <Box sx={{ textAlign: 'center', my: { xs: 1.5, sm: 3 } }}>
          <Chip
            label={`POT: ${formatPHP(pot)}`}
            sx={{
              px: { xs: 1.5, sm: 2.5 },
              py: { xs: 1.5, sm: 2 },
              fontWeight: 900,
              fontSize: { xs: '0.9rem', sm: '1.15rem' },
              background: '#020617',
              border: '1.5px solid #fbbf24',
              color: '#fbbf24',
              mb: 1.5,
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.5, sm: 1.2 }, minHeight: { xs: 65, sm: 90 }, flexWrap: 'nowrap', overflowX: 'auto' }}>
            {communityCards.length === 0 ? (
              <Typography variant="caption" sx={{ color: '#94a3b8', my: 'auto', fontStyle: 'italic', fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                Pre-flop betting... Tap Check or Call to deal!
              </Typography>
            ) : (
              communityCards.map((c, i) => (
                <Box
                  key={i}
                  sx={{
                    width: { xs: 42, sm: 60 },
                    height: { xs: 62, sm: 90 },
                    borderRadius: 1.5,
                    background: '#ffffff',
                    color: c.suit === '♥' || c.suit === '♦' ? '#dc2626' : '#0f172a',
                    border: '1.5px solid #38bdf8',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: { xs: 0.4, sm: 0.8 },
                    fontWeight: 900,
                    fontSize: { xs: '0.75rem', sm: '1.1rem' },
                  }}
                >
                  <Box sx={{ textAlign: 'left', lineHeight: 1 }}>{c.value}</Box>
                  <Box sx={{ textAlign: 'center', fontSize: { xs: '1rem', sm: '1.3rem' } }}>{c.suit}</Box>
                  <Box sx={{ textAlign: 'right', lineHeight: 1 }}>{c.value}</Box>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* Hero Hole Cards */}
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.8, sm: 1.5 }, mb: 0.5 }}>
            {heroHoleCards.map((c, i) => (
              <Box
                key={i}
                sx={{
                  width: { xs: 46, sm: 62 },
                  height: { xs: 68, sm: 90 },
                  borderRadius: 1.5,
                  background: '#ffffff',
                  color: c.suit === '♥' || c.suit === '♦' ? '#dc2626' : '#0f172a',
                  border: '1.5px solid #f59e0b',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  p: { xs: 0.4, sm: 0.8 },
                  fontWeight: 900,
                  fontSize: { xs: '0.75rem', sm: '1.1rem' },
                }}
              >
                <Box sx={{ textAlign: 'left', lineHeight: 1 }}>{c.value}</Box>
                <Box sx={{ textAlign: 'center', fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>{c.suit}</Box>
                <Box sx={{ textAlign: 'right', lineHeight: 1 }}>{c.value}</Box>
              </Box>
            ))}
          </Box>
          <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 900, letterSpacing: 1, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Hole Cards (Ace-King Suited) • Stack: {formatPHP(chips)}
          </Typography>
        </Box>

        {/* Action Panel for Phone & Desktop */}
        <Box
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: '1px solid #1e3a8a',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
          }}
        >
          <Button variant="contained" color="error" onClick={handleFold} sx={{ py: 0.9, fontWeight: 900, borderRadius: 2, fontSize: { xs: '0.72rem', sm: '0.85rem' } }}>
            FOLD
          </Button>
          <Button variant="contained" color="success" onClick={handleCheck} sx={{ py: 0.9, fontWeight: 900, borderRadius: 2, fontSize: { xs: '0.72rem', sm: '0.85rem' } }}>
            CHECK
          </Button>
          <Button variant="contained" color="info" onClick={handleCall} sx={{ py: 0.9, fontWeight: 900, borderRadius: 2, fontSize: { xs: '0.72rem', sm: '0.85rem' } }}>
            CALL
          </Button>
          <Button variant="contained" color="warning" onClick={handleRaise} sx={{ py: 0.9, fontWeight: 900, borderRadius: 2, fontSize: { xs: '0.68rem', sm: '0.85rem' } }}>
            RAISE {formatPHP(raiseVal)}
          </Button>
        </Box>
      </Paper>

      {/* Action Feed */}
      <Paper elevation={4} sx={{ mt: 1.5, p: 1.5, background: '#090d16', border: '1px solid #1f2937', color: '#9ca3af', maxHeight: 100, overflowY: 'auto' }}>
        <Typography variant="caption" sx={{ color: '#60a5fa', fontWeight: 700, display: 'block', mb: 0.5, fontSize: '0.65rem' }}>
          TABLE ACTION FEED:
        </Typography>
        {actionLog.map((log, idx) => (
          <Typography key={idx} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}>
            {log}
          </Typography>
        ))}
      </Paper>
    </Box>
  );
}
