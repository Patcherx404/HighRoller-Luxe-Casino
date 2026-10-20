import React from 'react';
import { Avatar, Grid, Typography, Box, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import starImage from '../images/Gold-Star-PNG-Photos.png';

const GAMES_LIST = [
  {
    id: 'slots',
    title: 'Cosmic Slots Deluxe',
    tag: '5-REEL JACKPOT',
    icon: '🎰',
    desc: 'High-contrast 5-reel slot machine with progressive mega jackpots in Philippine Peso (₱), combo multipliers & wild stars.',
    path: '/games/slots',
    color: '#f59e0b',
  },
  {
    id: 'blackjack',
    title: 'Vegas Blackjack',
    tag: '3:2 PAYOUT',
    icon: '🃏',
    desc: 'Authentic felt table with double down, natural 3:2 blackjack payouts, and live chip balance in Philippine Peso (₱).',
    path: '/games/blackjack',
    color: '#10b981',
  },
  {
    id: 'poker',
    title: 'Live Poker Dashboard',
    tag: 'MULTIPLAYER',
    icon: '♠️',
    desc: 'Texas Hold’em cash tables with Manila & Makati stakes, dynamic pot tracking in ₱, and real-time opponents.',
    path: '/games/poker',
    color: '#38bdf8',
  },
  {
    id: 'roulette',
    title: 'European Roulette',
    tag: 'CLASSIC FELT',
    icon: '🎡',
    desc: 'Authentic 37-pocket European roulette wheel with red/black, even/odd, and 35:1 straight-up bets in ₱.',
    path: '/games/Roulette',
    color: '#ef4444',
  },
];

const Games = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ width: '100%', maxWidth: 1050, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: { xs: 1.5, sm: 3 } }}>
      {/* Header title */}
      <Box sx={{ textAlign: 'center', mb: { xs: 2.5, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
          <Avatar alt="" src={starImage} sx={{ width: { xs: 32, sm: 42 }, height: { xs: 32, sm: 42 } }} />
          <Typography
            variant="h4"
            sx={{
              color: '#FFFFFF',
              fontWeight: 900,
              letterSpacing: 0.5,
              fontSize: { xs: '1.5rem', sm: '2.2rem' },
            }}
          >
            Casino Floor 🇵🇭
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: { xs: '0.8rem', sm: '0.95rem' } }}>
          Philippine Peso Currency (₱) • Real-Time Firestore Sync • Mobile-Optimized
        </Typography>
      </Box>

      {/* 4 Games Grid */}
      <Grid container spacing={{ xs: 1.5, sm: 2.5 }} justifyContent="center">
        {GAMES_LIST.map((game) => (
          <Grid item xs={12} sm={6} md={6} key={game.id}>
            <Paper
              elevation={6}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                background: 'linear-gradient(135deg, #18222d 0%, #0d151c 100%)',
                border: '1.5px solid #2d3f4e',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: { xs: 180, sm: 220 },
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: game.color,
                  transform: 'translateY(-3px)',
                  boxShadow: `0 8px 25px ${game.color}25`,
                },
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: { xs: '2rem', sm: '2.4rem' } }}>{game.icon}</Typography>
                  <Box
                    sx={{
                      px: 1.2,
                      py: 0.4,
                      borderRadius: 1.5,
                      background: `${game.color}20`,
                      border: `1px solid ${game.color}50`,
                      color: game.color,
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      letterSpacing: 0.5,
                    }}
                  >
                    {game.tag}
                  </Box>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff', mb: 0.5, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                  {game.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.4, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
                  {game.desc}
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={() => navigate(game.path)}
                sx={{
                  mt: 2,
                  py: 1,
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  borderRadius: 2,
                  background: game.color,
                  color: game.id === 'slots' || game.id === 'poker' ? '#000' : '#fff',
                  boxShadow: `0 4px 12px ${game.color}40`,
                  '&:hover': {
                    background: game.color,
                    filter: 'brightness(1.15)',
                  },
                }}
              >
                Play Now →
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Games;