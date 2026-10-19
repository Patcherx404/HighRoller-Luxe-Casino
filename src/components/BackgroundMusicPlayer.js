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
import MusicNoteIcon from '@mui/icons-material/MusicNote';

export default function BackgroundMusicPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Create audio instance with Jazz Casino Background Music looping
    const audio = new Audio('/music/jazz-casino-bgm.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    // Attempt autoplay immediately
    const tryPlay = () => {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          // Autoplay policy prevented immediate playback; wait for first user interaction
          setIsPlaying(false);
        });
    };

    tryPlay();

    // Browser Autoplay Policy Fallback:
    // Starts music immediately on the user's very first click/tap anywhere on the page
    const startAudioOnInteraction = () => {
      if (audio.paused) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {});
      }
      window.removeEventListener('pointerdown', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
    };

    window.addEventListener('pointerdown', startAudioOnInteraction);
    window.addEventListener('keydown', startAudioOnInteraction);
    window.addEventListener('touchstart', startAudioOnInteraction);

    // Visibility change: keep music playing when tab is active
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

  const togglePlay = () => {
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

  const toggleMute = () => {
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
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: { xs: 68, sm: 20 },
        right: { xs: 10, sm: 20 },
        zIndex: 1100,
        bgcolor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        border: '1.5px solid #f59e0b',
        borderRadius: 4,
        px: 1.4,
        py: 0.6,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        boxShadow: isPlaying ? '0 0 18px rgba(245, 158, 11, 0.35)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Equalizer animation / Music icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.3,
          cursor: 'pointer',
        }}
        onClick={togglePlay}
        title="Toggle Jazz Casino BGM"
      >
        <MusicNoteIcon
          sx={{
            color: isPlaying ? '#fbbf24' : '#64748b',
            fontSize: 20,
            transform: isPlaying ? 'rotate(10deg)' : 'none',
            transition: 'transform 0.3s ease',
          }}
        />

        {/* Animated Sound Equalizer Waves */}
        {isPlaying && !isMuted ? (
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 14 }}>
            <Box
              sx={{
                width: 2.5,
                bgcolor: '#fbbf24',
                borderRadius: 1,
                animation: 'soundWave 0.8s infinite ease-in-out alternate',
              }}
            />
            <Box
              sx={{
                width: 2.5,
                bgcolor: '#34d399',
                borderRadius: 1,
                animation: 'soundWave 1.1s infinite ease-in-out alternate 0.2s',
              }}
            />
            <Box
              sx={{
                width: 2.5,
                bgcolor: '#38bdf8',
                borderRadius: 1,
                animation: 'soundWave 0.9s infinite ease-in-out alternate 0.4s',
              }}
            />
          </Box>
        ) : null}
      </Box>

      {/* Track Label */}
      <Box
        sx={{
          cursor: 'pointer',
          maxWidth: { xs: 90, sm: 140 },
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        onClick={() => setShowControls(!showControls)}
      >
        <Typography
          variant="caption"
          sx={{
            color: isPlaying ? '#fbbf24' : '#94a3b8',
            fontWeight: 800,
            fontSize: { xs: '0.65rem', sm: '0.72rem' },
            display: 'block',
            lineHeight: 1.1,
          }}
        >
          {isPlaying ? '🎷 Jazz Casino BGM' : '🔇 Music Paused'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#34d399',
            fontSize: '0.58rem',
            fontWeight: 700,
            display: 'block',
          }}
        >
          {isPlaying ? 'Continuous Loop' : 'Tap to Play'}
        </Typography>
      </Box>

      {/* Play / Pause Toggle Button */}
      <IconButton
        size="small"
        onClick={togglePlay}
        sx={{
          color: isPlaying ? '#fbbf24' : '#94a3b8',
          bgcolor: 'rgba(245, 158, 11, 0.1)',
          p: 0.5,
          '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.25)' },
        }}
      >
        {isPlaying ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
      </IconButton>

      {/* Mute / Unmute Button */}
      <IconButton
        size="small"
        onClick={toggleMute}
        sx={{
          color: isMuted ? '#ef4444' : '#94a3b8',
          p: 0.5,
          '&:hover': { color: '#fbbf24' },
        }}
      >
        {isMuted ? <VolumeOffIcon sx={{ fontSize: 18 }} /> : <VolumeUpIcon sx={{ fontSize: 18 }} />}
      </IconButton>

      {/* Mini Volume Slider on Desktop / Expanded */}
      {showControls && (
        <Box sx={{ width: 65, ml: 0.5, display: { xs: 'none', sm: 'block' } }}>
          <Slider
            size="small"
            value={isMuted ? 0 : volume}
            min={0}
            max={1}
            step={0.05}
            onChange={handleVolumeChange}
            sx={{
              color: '#fbbf24',
              '& .MuiSlider-thumb': { width: 10, height: 10 },
            }}
          />
        </Box>
      )}
    </Paper>
  );
}
