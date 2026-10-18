import './App.css';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import StyleIcon from '@mui/icons-material/Style';
import PieChartIcon from '@mui/icons-material/PieChart';
import HomeIcon from '@mui/icons-material/Home';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import contractsService from './services/contractsService';
import { useDispatch, useSelector } from "react-redux";
import { loadAccounts } from './reducers/accountReducer';
import { loadBalance } from './reducers/balanceReducer';
import { loadPrice } from './reducers/priceReducer';
import { loadHistorial } from './reducers/historialReducer';
import BuyTokens from './components/BuyTokens';
import WithdrawTokens from './components/Withdraw';
import Header from './components/Header';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import RouletteGame from './components/RouletteGame';
import Wallet from './components/Wallet';
import Games from './components/Games';
import SlotsGame from './components/slots/SlotsGame';
import BlackjackGame from './components/blackjack/BlackjackGame';
import PokerDashboard from './components/poker/PokerDashboard';
import { FirebaseCasinoProvider } from './context/FirebaseCasinoContext';

const AppContent = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const balance = useSelector(({ balance }) => balance);
  const account = useSelector(({ account }) => account);
  const price = useSelector(({ price }) => price);

  const [bottomNavValue, setBottomNavValue] = useState('/games');

  useEffect(() => {
    setBottomNavValue(location.pathname);
  }, [location.pathname]);

  const web3Handler = async () => {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      dispatch(loadAccounts(accounts[0]));
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      window.ethereum.on('accountsChanged', async function (accs) {
        dispatch(loadAccounts(accs[0]));
        await web3Handler();
      });
      await contractsService.loadContracts(signer);
    } catch (err) {
      console.warn("Web3 connection dismissed", err);
    }
  };

  const loadInfo = async () => {
    if (account && account !== "") {
      await dispatch(loadBalance(account));
      await dispatch(loadPrice(account));
      await dispatch(loadHistorial(account));
    }
  };

  useEffect(() => {
    loadInfo();
  }, [account]);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100vw',
        minHeight: '100vh',
        bgcolor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Top Header */}
      <Header login={web3Handler} balance={balance} account={account} />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          maxWidth: '100vw',
          pt: { xs: 8, sm: 9 }, // Offset sticky AppBar
          pb: { xs: 9, md: 4 }, // Offset mobile bottom navigation
          px: { xs: 1, sm: 2, md: 3 },
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/games" replace />} />
          <Route path="/Wallet" element={<Wallet />}>
            <Route path="buyTokens" element={<BuyTokens account={account} price={price} />} />
            <Route path="withdrawTokens" element={<WithdrawTokens balance={balance} account={account} price={price} />} />
          </Route>
          <Route path="/games" element={<Games />} />
          <Route path="/games/slots" element={<SlotsGame />} />
          <Route path="/games/blackjack" element={<BlackjackGame />} />
          <Route path="/games/poker" element={<PokerDashboard />} />
          <Route path="/games/Roulette" element={<RouletteGame balance={balance} account={account} />} />
          <Route path="*" element={<Navigate to="/games" replace />} />
        </Routes>
      </Box>

      {/* Mobile-Friendly Sticky Bottom Navigation Bar */}
      <Paper
        elevation={10}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          display: { xs: 'block', md: 'none' },
          bgcolor: '#1e293b',
          borderTop: '1px solid #334155',
        }}
      >
        <BottomNavigation
          showLabels
          value={bottomNavValue}
          onChange={(event, newValue) => {
            setBottomNavValue(newValue);
            navigate(newValue);
          }}
          sx={{
            bgcolor: '#1e293b',
            height: 60,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              padding: '6px 0',
              color: '#94a3b8',
              '&.Mui-selected': {
                color: '#f59e0b',
                fontWeight: 900,
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.68rem',
              fontWeight: 800,
              '&.Mui-selected': {
                fontSize: '0.72rem',
              },
            },
          }}
        >
          <BottomNavigationAction
            label="Lobby"
            value="/games"
            icon={<HomeIcon fontSize="small" />}
          />
          <BottomNavigationAction
            label="Slots"
            value="/games/slots"
            icon={<CasinoIcon fontSize="small" />}
          />
          <BottomNavigationAction
            label="Blackjack"
            value="/games/blackjack"
            icon={<StyleIcon fontSize="small" />}
          />
          <BottomNavigationAction
            label="Poker"
            value="/games/poker"
            icon={<StyleIcon fontSize="small" />}
          />
          <BottomNavigationAction
            label="Roulette"
            value="/games/Roulette"
            icon={<PieChartIcon fontSize="small" />}
          />
          <BottomNavigationAction
            label="Wallet"
            value="/Wallet/buyTokens"
            icon={<AccountBalanceWalletIcon fontSize="small" />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default function App() {
  return (
    <FirebaseCasinoProvider>
      <AppContent />
    </FirebaseCasinoProvider>
  );
}
