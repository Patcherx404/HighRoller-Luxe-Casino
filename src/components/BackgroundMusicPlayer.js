import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Tooltip,
  Paper,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

export default function BackgroundMusicPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // Create audio instance with Jazz Casino Background Music looping continuously
    const audio = new Audio('/music/jazz-casino-bgm.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    // Attempt autoplay immediately
    const tryPlay = () => {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    };

    tryPlay();

    // Browser Autoplay Policy: start music on user gesture
    const startAudioOnInteraction = () => {
      if (audio.paused) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
      window.removeEventListener('pointerdown', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
    };

    window.addEventListener('pointerdown', startAudioOnInteraction);
    window.addEventListener('keydown', startAudioOnInteraction);
    window.addEventListener('touchstart', startAudioOnInteraction);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !audio.paused) {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pointerdown', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = (e) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Audio play error:', err));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  const handleVolumeChange = (_, newValue) => {
    const audio = audioRef.current;
    if (!audio) return;

    const val = Number(newValue);
    audio.volume = val;
    setVolume(val);
    if (val === 0) {
      audio.muted = true;
      setIsMuted(true);
    } else if (audio.muted) {
      audio.muted = false;
      setIsMuted(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 68, sm: 20 },
        right: { xs: 12, sm: 20 },
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 0.8,
      }}
    >
      {/* Mini Volume Popup (opened via corner settings badge or right click) */}
      {showMenu && (
        <Paper
          elevation={12}
          sx={{
            p: 1.2,
            borderRadius: 3,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid #f59e0b',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            mb: 0.5,
            width: 140,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 900, fontSize: '0.68rem', lineHeight: 1.1 }}>
            🎷 Jazz Casino BGM
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.58rem' }}>
            Continuous Loop • {Math.round((isMuted ? 0 : volume) * 100)}%
          </Typography>

          <Slider
            size="small"
            value={isMuted ? 0 : volume}
            min={0}
            max={1}
            step={0.05}
            onChange={handleVolumeChange}
            sx={{
              width: 110,
              color: '#fbbf24',
              py: 0.5,
              '& .MuiSlider-thumb': { width: 12, height: 12 },
            }}
          />

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={togglePlay} sx={{ color: '#fbbf24', p: 0.4 }}>
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={toggleMute} sx={{ color: isMuted ? '#ef4444' : '#34d399', p: 0.4 }}>
              {isMuted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Main Small Circular Floating BGM Button */}
      <Tooltip
        title={`🎷 Jazz Casino BGM (Continuous Loop) • ${isPlaying ? 'Playing - Tap to Pause' : 'Paused - Tap to Play'}`}
        arrow
        placement="left"
      >
        <Box
          component="button"
          onClick={togglePlay}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu((prev) => !prev);
          }}
          sx={{
            width: { xs: 42, sm: 46 },
            height: { xs: 42, sm: 46 },
            borderRadius: '50%',
            bgcolor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(10px)',
            border: '2px solid #f59e0b',
            boxShadow: isPlaying
              ? '0 0 16px rgba(245, 158, 11, 0.55), inset 0 0 10px rgba(251, 191, 36, 0.3)'
              : '0 2px 10px rgba(0, 0, 0, 0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            p: 0,
            outline: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: '0 0 22px rgba(245, 158, 11, 0.8), inset 0 0 12px rgba(251, 191, 36, 0.5)',
              border: '2px solid #fbbf24',
            },
            '&:active': {
              transform: 'scale(0.94)',
            },
          }}
        >
          {/* Animated sound equalizer waves when playing, or icon */}
          {isPlaying && !isMuted ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                height: 16,
              }}
            >
              <Box
                sx={{
                  width: 2.5,
                  bgcolor: '#fbbf24',
                  borderRadius: 1,
                  animation: 'soundWave 0.7s infinite ease-in-out alternate',
                }}
              />
              <Box
                sx={{
                  width: 2.5,
                  bgcolor: '#34d399',
                  borderRadius: 1,
                  animation: 'soundWave 1.0s infinite ease-in-out alternate 0.2s',
                }}
              />
              <Box
                sx={{
                  width: 2.5,
                  bgcolor: '#38bdf8',
                  borderRadius: 1,
                  animation: 'soundWave 0.8s infinite ease-in-out alternate 0.4s',
                }}
              />
            </Box>
          ) : (
            <Box sx={{ fontSize: '1.25rem', lineHeight: 1 }}>
              {isPlaying ? '🎷' : '🔇'}
            </Box>
          )}

          {/* Small corner badge indicating continuous loop (∞) */}
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            title="Volume & Controls"
            sx={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              bgcolor: isPlaying ? '#10b981' : '#64748b',
              border: '1.5px solid #0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              color: '#fff',
              fontWeight: 900,
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            {isPlaying ? '∞' : '×'}
          </Box>
        </Box>
      </Tooltip>
    </Box>
  );
}
