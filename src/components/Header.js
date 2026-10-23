import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  Link,
  MenuItem,
  Avatar,
  Box,
  Divider,
} from "@mui/material";
import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import WalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LogoutIcon from "@mui/icons-material/Logout";
import CasinoIcon from "@mui/icons-material/Casino";
import StyleIcon from "@mui/icons-material/Style";
import PieChartIcon from "@mui/icons-material/PieChart";
import HomeIcon from "@mui/icons-material/Home";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import { useFirebaseCasino } from "../context/FirebaseCasinoContext";
import { formatPHP } from "../utils/formatCurrency";
import AuthModal from "./auth/AuthModal";

const headersData = [
  { label: "Lobby Floor", href: "/games", icon: <HomeIcon /> },
  { label: "Cosmic Slots", href: "/games/slots", icon: <CasinoIcon /> },
  { label: "Vegas Blackjack", href: "/games/blackjack", icon: <StyleIcon /> },
  { label: "Live Poker", href: "/games/poker", icon: <StyleIcon /> },
  { label: "European Roulette", href: "/games/Roulette", icon: <PieChartIcon /> },
  { label: "Deposit / Store", href: "/Wallet/buyTokens", icon: <WalletIcon /> },
];

export default function Header({ balance }) {
  const { firebaseUser, mongoUser, chips, signInWithGoogle, logOut, isAdmin, isFirstDepositEligible } = useFirebaseCasino();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  const LoginButton = () => {
    // 1. Logged in via MongoDB
    if (mongoUser) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Avatar
            sx={{
              width: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
              fontSize: "0.85rem",
              fontWeight: 900,
              border: "1.5px solid #c084fc",
              color: "#fff",
            }}
          >
            {mongoUser.username?.[0]?.toUpperCase() || "U"}
          </Avatar>
          <Box sx={{ display: { xs: "none", md: "block" }, textAlign: "left", ml: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#fff", fontWeight: 800, display: "block", lineHeight: 1.1 }}>
              {mongoUser.username}
            </Typography>
            <Typography variant="caption" sx={{ color: "#34d399", fontSize: "0.65rem", fontWeight: 700 }}>
              {mongoUser.phone || "VIP Member"}
            </Typography>
          </Box>
          <IconButton
            size="small"
            title="Sign Out"
            onClick={logOut}
            sx={{ color: "#ef4444", p: 0.5 }}
          >
            <LogoutIcon sx={{ fontSize: { xs: "1rem", sm: "1.2rem" } }} />
          </IconButton>
        </Box>
      );
    }

    // 2. Logged in via Google
    if (firebaseUser) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Avatar
            alt={firebaseUser.displayName || "User"}
            src={firebaseUser.photoURL || undefined}
            sx={{
              width: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              bgcolor: "#f59e0b",
              fontSize: "0.85rem",
              fontWeight: 900,
              border: "1.5px solid #fbbf24",
            }}
          >
            {firebaseUser.displayName?.[0] || "U"}
          </Avatar>
          <Box sx={{ display: { xs: "none", md: "block" }, textAlign: "left", ml: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#fff", fontWeight: 800, display: "block", lineHeight: 1.1 }}>
              {firebaseUser.displayName || "Player"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#fbbf24", fontSize: "0.65rem" }}>
              {firebaseUser.email}
            </Typography>
          </Box>
          <IconButton
            size="small"
            title="Sign Out"
            onClick={logOut}
            sx={{ color: "#ef4444", p: 0.5 }}
          >
            <LogoutIcon sx={{ fontSize: { xs: "1rem", sm: "1.2rem" } }} />
          </IconButton>
        </Box>
      );
    }

    // 3. Not Logged In: Open MongoDB Login & 09 Registration Modal
    return (
      <Button
        variant="contained"
        onClick={() => setAuthModalOpen(true)}
        sx={{
          background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
          color: "#ffffff",
          fontWeight: 900,
          textTransform: "none",
          borderRadius: 2,
          border: "1.5px solid #c084fc",
          boxShadow: "0 0 14px rgba(168, 85, 247, 0.45)",
          px: { xs: 1.2, sm: 1.8 },
          py: 0.5,
          minWidth: { xs: 74, sm: 88 },
          "&:hover": {
            background: "linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)",
          },
          display: "flex",
          alignItems: "center",
          gap: 0.6,
        }}
      >
        <PersonIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
        <Typography variant="button" sx={{ fontWeight: 900, fontSize: { xs: "0.72rem", sm: "0.82rem" } }}>
          Sign In
        </Typography>
      </Button>
    );
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: "#1e293b",
        borderBottom: "1px solid #334155",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: { xs: 1, sm: 2, md: 3 },
          minHeight: { xs: 56, sm: 64 },
        }}
      >
        {/* Left: Mobile Drawer Trigger & Brand */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleDrawerOpen}
            sx={{ p: 0.8 }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            onClick={() => navigate("/games")}
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "0.95rem", sm: "1.2rem" },
                background: "linear-gradient(45deg, #fbbf24, #f59e0b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: 0.5,
              }}
            >
              LUXE CASINO
            </Typography>
            <Typography
              component="span"
              sx={{
                ml: 0.5,
                fontSize: { xs: "0.75rem", sm: "0.9rem" },
                color: "#e2e8f0",
              }}
            >
              🇵🇭
            </Typography>
          </Box>
        </Box>

        {/* Center / Right: Philippine Peso Chips Badge & Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.8, sm: 1.5 } }}>
          {/* Chip Balance in Philippine Peso (₱) */}
          <Box
            onClick={() => navigate("/Wallet/buyTokens")}
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "rgba(15, 23, 42, 0.8)",
              border: "1.5px solid #f59e0b",
              borderRadius: 3,
              px: { xs: 1, sm: 1.5 },
              py: { xs: 0.4, sm: 0.6 },
              cursor: "pointer",
              transition: "transform 0.15s ease",
              "&:hover": { transform: "scale(1.02)" },
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                color: "#fbbf24",
                fontFamily: "monospace",
                fontSize: { xs: "0.78rem", sm: "0.95rem" },
                whiteSpace: "nowrap",
              }}
            >
              🪙 {formatPHP(typeof chips === 'number' ? chips : 0)}
            </Typography>
          </Box>

          {/* Quick Wallet / Deposit button */}
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<WalletIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
            onClick={() => navigate("/Wallet/buyTokens")}
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              fontWeight: 900,
              fontSize: "0.75rem",
              borderRadius: 2,
              px: 1.2,
              py: 0.5,
              textTransform: "none",
              background: isFirstDepositEligible
                ? "linear-gradient(135deg, #f59e0b 0%, #10b981 100%)"
                : undefined,
              boxShadow: isFirstDepositEligible ? "0 0 12px rgba(245, 158, 11, 0.5)" : undefined,
            }}
          >
            {isFirstDepositEligible ? "Deposit (2X Bonus)" : "Deposit"}
          </Button>

          {/* Admin Console Button (Restricted exclusively to patcherx500@gmail.com) */}
          {isAdmin && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AdminPanelSettingsIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />}
              onClick={() => navigate("/admin")}
              sx={{
                fontWeight: 900,
                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                borderRadius: 2,
                px: { xs: 1, sm: 1.4 },
                py: 0.5,
                textTransform: "none",
                bgcolor: "#dc2626",
                color: "#fff",
                boxShadow: "0 0 12px rgba(220, 38, 38, 0.5)",
                "&:hover": { bgcolor: "#b91c1c" },
              }}
            >
              Admin
            </Button>
          )}

          {/* Google Login / Avatar */}
          <LoginButton />
        </Box>
      </Toolbar>

      {/* Navigation Drawer for Phone & Desktop */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          sx: {
            width: { xs: "78vw", sm: 300 },
            maxWidth: 320,
            bgcolor: "#0f172a",
            color: "#ffffff",
            p: 2,
            borderRight: "1px solid #334155",
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#fbbf24" }}>
              Luxe Casino 🇵🇭
            </Typography>
          </Box>
          <IconButton onClick={handleDrawerClose} sx={{ color: "#94a3b8" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* User Card in Drawer */}
        <Box
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 3,
            bgcolor: "#1e293b",
            border: "1px solid #334155",
          }}
        >
          <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
            {firebaseUser ? "PRIVATE ACCOUNT BALANCE (PHP)" : "PUBLIC DEMO BALANCE (PHP)"}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#fbbf24", fontFamily: "monospace" }}>
            {formatPHP(typeof chips === 'number' ? chips : 0)}
          </Typography>
          <Typography variant="caption" sx={{ color: firebaseUser ? "#34d399" : "#38bdf8", fontWeight: 700 }}>
            {firebaseUser ? `Synced to ${firebaseUser.email}` : "Guest Mode • Sign in to save private balance"}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "#334155", mb: 1.5 }} />

        {/* Menu Items */}
        {headersData.map(({ label, href, icon }) => (
          <Link
            key={label}
            component={RouterLink}
            to={href}
            onClick={handleDrawerClose}
            sx={{ textDecoration: "none", color: "inherit" }}
          >
            <MenuItem
              sx={{
                borderRadius: 2,
                py: 1.2,
                mb: 0.5,
                gap: 1.5,
                fontWeight: 800,
                fontSize: "0.95rem",
                "&:hover": { bgcolor: "#1e293b", color: "#fbbf24" },
              }}
            >
              <Box sx={{ color: "#fbbf24", display: "flex", alignItems: "center" }}>
                {icon}
              </Box>
              {label}
            </MenuItem>
          </Link>
        ))}

        {/* Administrator Access Link (Restricted to patcherx500@gmail.com) */}
        {isAdmin && (
          <Link
            component={RouterLink}
            to="/admin"
            onClick={handleDrawerClose}
            sx={{ textDecoration: "none", color: "inherit" }}
          >
            <MenuItem
              sx={{
                borderRadius: 2,
                py: 1.2,
                mt: 1,
                mb: 0.5,
                gap: 1.5,
                fontWeight: 900,
                fontSize: "0.95rem",
                bgcolor: "rgba(220, 38, 38, 0.15)",
                border: "1.5px solid #ef4444",
                color: "#f87171",
                "&:hover": { bgcolor: "rgba(220, 38, 38, 0.3)", color: "#fff" },
              }}
            >
              <Box sx={{ color: "#ef4444", display: "flex", alignItems: "center" }}>
                <AdminPanelSettingsIcon />
              </Box>
              Admin Winrate Console
            </MenuItem>
          </Link>
        )}

        <Divider sx={{ borderColor: "#334155", my: 2 }} />

        {/* Sign in / Sign out button in drawer */}
        <Box sx={{ mt: "auto", pt: 1 }}>
          {(mongoUser || firebaseUser) ? (
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={() => {
                logOut();
                handleDrawerClose();
              }}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              Sign Out ({mongoUser?.username || firebaseUser?.displayName || 'Player'})
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                setAuthModalOpen(true);
                handleDrawerClose();
              }}
              sx={{
                background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                color: "#fff",
                fontWeight: 900,
                borderRadius: 2,
                "&:hover": { background: "linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)" },
              }}
            >
              Sign In / Register
            </Button>
          )}
        </Box>
      </Drawer>

      {/* MongoDB Login & 09 Phone Registration Modal */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </AppBar>
  );
}
