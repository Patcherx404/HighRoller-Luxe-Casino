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
import { useFirebaseCasino } from "../context/FirebaseCasinoContext";
import { formatPHP } from "../utils/formatCurrency";

const headersData = [
  { label: "Lobby Floor", href: "/games", icon: <HomeIcon /> },
  { label: "Cosmic Slots", href: "/games/slots", icon: <CasinoIcon /> },
  { label: "Vegas Blackjack", href: "/games/blackjack", icon: <StyleIcon /> },
  { label: "Live Poker", href: "/games/poker", icon: <StyleIcon /> },
  { label: "European Roulette", href: "/games/Roulette", icon: <PieChartIcon /> },
  { label: "Deposit / Store", href: "/Wallet/buyTokens", icon: <WalletIcon /> },
];

export default function Header({ balance }) {
  const { firebaseUser, chips, signInWithGoogle, logOut, isAdmin } = useFirebaseCasino();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  const LoginButton = () => {
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

    return (
      <Button
        variant="contained"
        onClick={signInWithGoogle}
        sx={{
          background: "#ffffff",
          color: "#1f2937",
          fontWeight: 800,
          textTransform: "none",
          borderRadius: 2,
          px: { xs: 1, sm: 1.5 },
          py: 0.5,
          minWidth: { xs: 68, sm: 84 },
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          "&:hover": { background: "#f3f4f6" },
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <Typography variant="button" sx={{ fontWeight: 800, fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
          Login
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
              fontWeight: 800,
              fontSize: "0.75rem",
              borderRadius: 2,
              px: 1.2,
              py: 0.5,
              textTransform: "none",
            }}
          >
            Deposit
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
          {firebaseUser ? (
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
              Sign Out
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                signInWithGoogle();
                handleDrawerClose();
              }}
              sx={{
                bgcolor: "#fff",
                color: "#1e293b",
                fontWeight: 800,
                borderRadius: 2,
                "&:hover": { bgcolor: "#f1f5f9" },
              }}
            >
              Sign In with Google
            </Button>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
}
