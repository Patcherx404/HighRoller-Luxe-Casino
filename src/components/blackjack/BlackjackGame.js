import React, { useState } from 'react';
import { useFirebaseCasino } from '../../context/FirebaseCasinoContext';
import { formatPHP } from '../../utils/formatCurrency';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip
} from '@mui/material';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];
  for (let s of SUITS) {
    for (let v of VALUES) {
      deck.push({ suit: s, value: v, faceUp: true });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHand(cards) {
  let total = 0;
  let aces = 0;
  for (let c of cards) {
    if (!c.faceUp) continue;
    if (c.value === 'A') {
      aces += 1;
      total += 11;
    } else if (['K', 'Q', 'J', '10'].includes(c.value)) {
      total += 10;
    } else {
      total += Number(c.value);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  const isBlackjack = cards.length === 2 && total === 21;
  return { total, isBlackjack };
}

export default function BlackjackGame() {
  const { chips, addChips, deductChips } = useFirebaseCasino();

  const [deck, setDeck] = useState(createDeck);
  const [currentBet, setCurrentBet] = useState(100);
  const [stage, setStage] = useState('betting'); // 'betting' | 'playerTurn' | 'dealerTurn' | 'roundOver'
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [message, setMessage] = useState('Place bet in PHP and deal hand');
  const [streak, setStreak] = useState(0);

  const handleDeal = async () => {
    if (chips < currentBet || currentBet <= 0) return;
    const deducted = await deductChips(
      currentBet,
      'Blackjack',
      `Blackjack Bet (${formatPHP(currentBet)})`
    );
    if (!deducted) return;

    let shoe = deck.length < 15 ? createDeck() : [...deck];
    const p1 = shoe.pop();
    const d1 = shoe.pop();
    const p2 = shoe.pop();
    const d2 = { ...shoe.pop(), faceUp: false }; // Dealer hole card

    setDeck(shoe);
    setPlayerCards([p1, p2]);
    setDealerCards([d1, d2]);

    const pEval = calculateHand([p1, p2]);
    if (pEval.isBlackjack) {
      const revealedDealer = [d1, { ...d2, faceUp: true }];
      setDealerCards(revealedDealer);
      const dEval = calculateHand(revealedDealer);
      if (dEval.isBlackjack) {
        setMessage('Push! Both have Blackjack');
        addChips(currentBet, 'Blackjack', `Blackjack Push Return (+${formatPHP(currentBet)})`);
      } else {
        const win = Math.floor(currentBet * 2.5);
        setMessage('🔥 BLACKJACK! Pays 3:2!');
        addChips(win, 'Blackjack', `Blackjack Natural 3:2 Win (+${formatPHP(win)})`);
        setStreak((s) => s + 1);
      }
      setStage('roundOver');
    } else {
      setStage('playerTurn');
      setMessage('Hit or Stand');
    }
  };

  const handleHit = () => {
    if (stage !== 'playerTurn') return;
    let shoe = [...deck];
    if (shoe.length === 0) shoe = createDeck();
    const card = shoe.pop();
    setDeck(shoe);

    const updated = [...playerCards, card];
    setPlayerCards(updated);
    const { total } = calculateHand(updated);

    if (total > 21) {
      setMessage(`Busted with ${total}! Dealer wins`);
      setStage('roundOver');
      setStreak(0);
    } else if (total === 21) {
      handleStand(updated);
    }
  };

  const handleStand = (cardsToStand = playerCards) => {
    if (stage !== 'playerTurn') return;
    setStage('dealerTurn');

    let currentDealer = dealerCards.map((c) => ({ ...c, faceUp: true }));
    let shoe = [...deck];

    let dVal = calculateHand(currentDealer).total;
    while (dVal < 17) {
      if (shoe.length === 0) shoe = createDeck();
      currentDealer.push(shoe.pop());
      dVal = calculateHand(currentDealer).total;
    }

    setDealerCards(currentDealer);
    setDeck(shoe);

    const pTotal = calculateHand(cardsToStand).total;
    const finalDTotal = dVal;

    if (finalDTotal > 21) {
      setMessage(`Dealer Busted with ${finalDTotal}! You win!`);
      const win = currentBet * 2;
      addChips(win, 'Blackjack', `Blackjack Win vs Dealer Bust (+${formatPHP(win)})`);
      setStreak((s) => s + 1);
    } else if (pTotal > finalDTotal) {
      setMessage(`You win! ${pTotal} beats ${finalDTotal}`);
      const win = currentBet * 2;
      addChips(win, 'Blackjack', `Blackjack Win (+${formatPHP(win)})`);
      setStreak((s) => s + 1);
    } else if (pTotal === finalDTotal) {
      setMessage(`Push! Tied at ${pTotal}`);
      addChips(currentBet, 'Blackjack', `Blackjack Push Return (+${formatPHP(currentBet)})`);
    } else {
      setMessage(`Dealer wins with ${finalDTotal} over ${pTotal}`);
      setStreak(0);
    }

    setStage('roundOver');
  };

  const pScore = calculateHand(playerCards);
  const dScore = calculateHand(dealerCards);

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 0.5, sm: 2, md: 3 }, py: { xs: 1, md: 2 } }}>
      {/* Table Felt */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 1.5, sm: 3 },
          borderRadius: 3,
          background: 'radial-gradient(ellipse at center, #064e3b 0%, #022c22 70%, #02120e 100%)',
          border: '2px solid #10b981',
          boxShadow: '0 0 25px rgba(16, 185, 129, 0.25)',
          color: '#ffffff',
          minHeight: { xs: 430, sm: 480 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Dealer Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: '#6ee7b7', fontWeight: 900, letterSpacing: 1.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Dealer Hand {dealerCards.length > 0 && `(${dScore.total})`}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.8, sm: 1.5 }, mt: 0.5, minHeight: { xs: 72, sm: 95 } }}>
            {dealerCards.map((c, i) => (
              <Box
                key={i}
                sx={{
                  width: { xs: 46, sm: 65 },
                  height: { xs: 70, sm: 95 },
                  borderRadius: 1.5,
                  background: c.faceUp ? '#ffffff' : 'linear-gradient(135deg, #7f1d1d, #450a0a)',
                  color: c.suit === '♥' || c.suit === '♦' ? '#dc2626' : '#0f172a',
                  border: '1.5px solid #34d399',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  p: { xs: 0.5, sm: 0.8 },
                  fontWeight: 900,
                  fontSize: { xs: '0.75rem', sm: '1.1rem' },
                }}
              >
                {c.faceUp ? (
                  <>
                    <Box sx={{ textAlign: 'left', lineHeight: 1 }}>{c.value}</Box>
                    <Box sx={{ textAlign: 'center', fontSize: { xs: '1.1rem', sm: '1.4rem' } }}>{c.suit}</Box>
                    <Box sx={{ textAlign: 'right', lineHeight: 1 }}>{c.value}</Box>
                  </>
                ) : (
                  <Box sx={{ m: 'auto', color: '#fbbf24', fontSize: '1rem' }}>♠</Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Message Ticker */}
        <Box sx={{ my: 1.5, textAlign: 'center' }}>
          <Chip
            label={message}
            sx={{
              px: { xs: 1, sm: 2 },
              py: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.8rem', sm: '1rem' },
              fontWeight: 900,
              background: '#042f2e',
              border: '1.5px solid #fbbf24',
              color: '#fef08a',
            }}
          />
        </Box>

        {/* Player Hand */}
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.8, sm: 1.5 }, mb: 0.5, minHeight: { xs: 72, sm: 95 } }}>
            {playerCards.map((c, i) => (
              <Box
                key={i}
                sx={{
                  width: { xs: 46, sm: 65 },
                  height: { xs: 70, sm: 95 },
                  borderRadius: 1.5,
                  background: '#ffffff',
                  color: c.suit === '♥' || c.suit === '♦' ? '#dc2626' : '#0f172a',
                  border: '1.5px solid #fbbf24',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  p: { xs: 0.5, sm: 0.8 },
                  fontWeight: 900,
                  fontSize: { xs: '0.75rem', sm: '1.1rem' },
                }}
              >
                <Box sx={{ textAlign: 'left', lineHeight: 1 }}>{c.value}</Box>
                <Box sx={{ textAlign: 'center', fontSize: { xs: '1.1rem', sm: '1.4rem' } }}>{c.suit}</Box>
                <Box sx={{ textAlign: 'right', lineHeight: 1 }}>{c.value}</Box>
              </Box>
            ))}
          </Box>
          <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 900, letterSpacing: 1.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            Your Hand {playerCards.length > 0 && `(${pScore.total})`} • Bet: {formatPHP(currentBet)}
          </Typography>
        </Box>

        {/* Actions Bar (Phone Responsive) */}
        <Box
          sx={{
            mt: 2,
            pt: 1.5,
            borderTop: '1px solid #065f46',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {stage === 'betting' || stage === 'roundOver' ? (
            <>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.7rem' }}>
                  BET:
                </Typography>
                {[25, 50, 100, 250, 500].map((amt) => (
                  <Chip
                    key={amt}
                    label={formatPHP(amt)}
                    clickable
                    color={currentBet === amt ? 'warning' : 'default'}
                    onClick={() => setCurrentBet(amt)}
                    sx={{
                      fontWeight: 900,
                      height: 28,
                      fontSize: '0.72rem',
                      bgcolor: currentBet === amt ? '#fbbf24' : '#1e293b',
                      color: currentBet === amt ? '#000' : '#fff',
                    }}
                  />
                ))}
              </Box>

              <Button
                variant="contained"
                onClick={handleDeal}
                disabled={chips < currentBet}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  px: { xs: 4, sm: 6 },
                  py: 1,
                  fontWeight: 900,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  background: 'linear-gradient(45deg, #f59e0b, #fbbf24)',
                  color: '#000',
                  borderRadius: 2.5,
                }}
              >
                DEAL
              </Button>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5, width: '100%', justifyContent: 'center' }}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleHit}
                sx={{ py: 1.2, fontWeight: 900, fontSize: '1rem', borderRadius: 2.5 }}
              >
                HIT
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="error"
                onClick={() => handleStand()}
                sx={{ py: 1.2, fontWeight: 900, fontSize: '1rem', borderRadius: 2.5 }}
              >
                STAND
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
