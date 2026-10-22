import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { useFirebaseCasino } from '../../context/FirebaseCasinoContext';

export default function AuthModal({ open, onClose }) {
  const { loginWithMongo, registerWithMongo, signInWithGoogle } = useFirebaseCasino();
  const [tabIndex, setTabIndex] = useState(0); // 0 = Login, 1 = Register

  // Form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('09');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 11-digit 09 Phone Validator
  const isValidPhone = /^09\d{9}$/.test(regPhone.trim().replace(/[-\s]/g, ''));

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/[^\d]/g, '');
    if (!val.startsWith('09')) {
      if (val === '' || val === '0') val = '09';
      else val = '09' + val.replace(/^0+/, '');
    }
    if (val.length > 11) val = val.slice(0, 11);
    setRegPhone(val);
    setErrorMsg('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginIdentifier.trim()) {
      setErrorMsg('Please enter your username or mobile number.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithMongo(loginIdentifier.trim(), loginPassword);
      if (res.success) {
        setSuccessMsg(`Welcome back, ${res.user.username}!`);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg(res.error || 'Login failed. Please verify your credentials.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUser = regUsername.trim();
    if (cleanUser.length < 3 || cleanUser.length > 30) {
      setErrorMsg('Username must be between 3 and 30 characters long.');
      return;
    }

    const cleanPhone = regPhone.trim().replace(/[-\s]/g, '');
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Mobile number must start with 09 and be exactly 11 digits (e.g. 09171234567).');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithMongo(cleanUser, cleanPhone, regPassword);
      if (res.success) {
        setSuccessMsg('Registration successful! ₱1,000 Welcome Bonus credited.');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error during registration.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoginIdentifier('');
    setLoginPassword('');
    setRegUsername('');
    setRegPhone('09');
    setRegPassword('');
    setRegConfirmPassword('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0f0622',
          border: '2px solid #a855f7',
          borderRadius: 3.5,
          color: '#fff',
          boxShadow: '0 0 45px rgba(168, 85, 247, 0.45)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          pb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(168, 85, 247, 0.25)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 900,
              background: 'linear-gradient(135deg, #facc15 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: 0.5,
            }}
          >
            HIGHROLLER CASINO
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: 2 }}>
        {/* Navigation Tabs */}
        <Tabs
          value={tabIndex}
          onChange={(_, val) => {
            setTabIndex(val);
            setErrorMsg('');
            setSuccessMsg('');
          }}
          variant="fullWidth"
          sx={{
            mb: 2,
            minHeight: 40,
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 2,
            p: 0.4,
            '& .MuiTabs-indicator': {
              bgcolor: '#a855f7',
              height: '100%',
              borderRadius: 1.8,
              zIndex: 0,
            },
          }}
        >
          <Tab
            label="Sign In"
            sx={{
              fontWeight: 900,
              fontSize: '0.85rem',
              color: tabIndex === 0 ? '#fff' : '#94a3b8',
              zIndex: 1,
              minHeight: 36,
              textTransform: 'none',
              transition: 'color 0.2s',
            }}
          />
          <Tab
            label="Register"
            sx={{
              fontWeight: 900,
              fontSize: '0.85rem',
              color: tabIndex === 1 ? '#fff' : '#94a3b8',
              zIndex: 1,
              minHeight: 36,
              textTransform: 'none',
              transition: 'color 0.2s',
            }}
          />
        </Tabs>

        {/* Alerts */}
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
            {errorMsg}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
            {successMsg}
          </Alert>
        )}

        {/* ================= TAB 0: LOGIN ================= */}
        {tabIndex === 0 && (
          <Box component="form" onSubmit={handleLoginSubmit}>
            <Typography variant="caption" sx={{ color: '#c084fc', fontWeight: 800, mb: 1.5, display: 'block' }}>
              Sign in with your Username or 11-Digit Mobile Number (09...)
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="Username or 09XXXXXXXXX"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: '#a855f7' }} fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#475569' },
                  '&:hover fieldset': { borderColor: '#a855f7' },
                  '&.Mui-focused fieldset': { borderColor: '#c084fc' },
                },
              }}
            />

            <TextField
              fullWidth
              size="small"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#a855f7' }} fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ color: '#94a3b8' }}
                    >
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#475569' },
                  '&:hover fieldset': { borderColor: '#a855f7' },
                  '&.Mui-focused fieldset': { borderColor: '#c084fc' },
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                fontWeight: 900,
                py: 1,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                color: '#fff',
                border: '1.5px solid #c084fc',
                boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)',
                },
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Log In to Casino'}
            </Button>
          </Box>
        )}

        {/* ================= TAB 1: REGISTER ================= */}
        {tabIndex === 1 && (
          <Box component="form" onSubmit={handleRegisterSubmit}>
            {/* Welcome Bonus Callout */}
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: 1.2,
                borderRadius: 2,
                bgcolor: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid #eab308',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CardGiftcardIcon sx={{ color: '#fbbf24', fontSize: 24 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#fde047', fontWeight: 900, lineHeight: 1.1 }}>
                  🎁 ₱1,000 Welcome Bonus Chips
                </Typography>
                <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.68rem' }}>
                  Register your account to receive free initial casino credits!
                </Typography>
              </Box>
            </Paper>

            {/* Username Input */}
            <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 800, mb: 0.5, display: 'block' }}>
              Username:
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. lucky_winner"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: '#a855f7' }} fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#475569' },
                  '&:hover fieldset': { borderColor: '#a855f7' },
                  '&.Mui-focused fieldset': { borderColor: '#c084fc' },
                },
              }}
            />

            {/* Mobile Number Input (09 Start, 11 Digits) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 800 }}>
                Mobile Number (Philippines):
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isValidPhone ? '#34d399' : '#f87171',
                  fontWeight: 900,
                  fontSize: '0.68rem',
                }}
              >
                {regPhone.length}/11 Digits {isValidPhone && '✓'}
              </Typography>
            </Box>
            <TextField
              fullWidth
              size="small"
              placeholder="09XXXXXXXXX"
              value={regPhone}
              onChange={handlePhoneChange}
              disabled={loading}
              helperText={
                isValidPhone ? (
                  <span style={{ color: '#34d399', fontWeight: 700 }}>✓ Valid 11-digit mobile number</span>
                ) : (
                  <span style={{ color: '#f87171', fontWeight: 700 }}>Must start with 09 and contain 11 digits</span>
                )
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIphoneIcon sx={{ color: isValidPhone ? '#10b981' : '#a855f7' }} fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: isValidPhone ? (
                  <InputAdornment position="end">
                    <CheckCircleIcon sx={{ color: '#10b981' }} fontSize="small" />
                  </InputAdornment>
                ) : undefined,
              }}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  borderRadius: 2,
                  '& fieldset': { borderColor: isValidPhone ? '#10b981' : '#475569' },
                  '&:hover fieldset': { borderColor: isValidPhone ? '#10b981' : '#a855f7' },
                  '&.Mui-focused fieldset': { borderColor: isValidPhone ? '#34d399' : '#c084fc' },
                },
              }}
            />

            {/* Password Input */}
            <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 800, mb: 0.5, display: 'block' }}>
              Password (min 6 characters):
            </Typography>
            <TextField
              fullWidth
              size="small"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter strong password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#a855f7' }} fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ color: '#94a3b8' }}
                    >
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#475569' },
                  '&:hover fieldset': { borderColor: '#a855f7' },
                  '&.Mui-focused fieldset': { borderColor: '#c084fc' },
                },
              }}
            />

            {/* Confirm Password Input */}
            <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 800, mb: 0.5, display: 'block' }}>
              Confirm Password:
            </Typography>
            <TextField
              fullWidth
              size="small"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#a855f7' }} fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      sx={{ color: '#94a3b8' }}
                    >
                      {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  borderRadius: 2,
                  '& fieldset': { borderColor: '#475569' },
                  '&:hover fieldset': { borderColor: '#a855f7' },
                  '&.Mui-focused fieldset': { borderColor: '#c084fc' },
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !isValidPhone}
              sx={{
                fontWeight: 900,
                py: 1,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: '1.5px solid #34d399',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                },
                '&:disabled': {
                  opacity: 0.5,
                  cursor: 'not-allowed',
                },
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Register & Claim ₱1,000'}
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="caption" sx={{ color: '#64748b', px: 1 }}>
            OR
          </Typography>
        </Divider>

        {/* Quick Google Sign In */}
        <Button
          fullWidth
          variant="outlined"
          onClick={() => {
            signInWithGoogle();
            onClose();
          }}
          sx={{
            color: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.25)',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2,
            py: 0.8,
            '&:hover': {
              borderColor: '#a855f7',
              bgcolor: 'rgba(168, 85, 247, 0.15)',
            },
          }}
        >
          <Box
            component="img"
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            sx={{ width: 16, height: 16, mr: 1 }}
          />
          Continue with Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}
