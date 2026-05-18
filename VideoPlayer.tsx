// src/components/VideoPlayer.tsx
'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, ChevronLeft, ChevronRight } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  title: string
  duration: number
  onWatchTime?: (seconds: number) => void
  thumbnailUrl?: string
  subtitles?: Array<{
    language: string
    url: string
  }>
  autoplay?: boolean
  controls?: boolean
  playlist?: Array<{
    id: string
    title: string
    duration: number
  }>
  onPlaylistChange?: (videoId: string) => void
  currentIndex?: number
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  duration,
  onWatchTime,
  thumbnailUrl,
  subtitles = [],
  autoplay = false,
  controls = true,
  playlist = [],
  onPlaylistChange,
  currentIndex = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(autoplay)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null)
  const [isBuffering, setIsBuffering] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // Watch time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const newTime = videoRef.current.currentTime
        setCurrentTime(newTime)
        onWatchTime?.(Math.floor(newTime))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, onWatchTime])

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && !showControls) {
      return
    }

    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 5000)

    controlsTimeoutRef.current = timeout
    return () => clearTimeout(timeout)
  }, [isPlaying, showControls])

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
      } else {
        videoRef.current.volume = 0
      }
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration

    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handlePreviousVideo = () => {
    if (currentIndex > 0 && onPlaylistChange && playlist[currentIndex - 1]) {
      onPlaylistChange(playlist[currentIndex - 1].id)
    }
  }

  const handleNextVideo = () => {
    if (currentIndex < playlist.length - 1 && onPlaylistChange && playlist[currentIndex + 1]) {
      onPlaylistChange(playlist[currentIndex + 1].id)
    }
  }

  const progressPercent = (currentTime / duration) * 100

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-auto block"
        poster={thumbnailUrl}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false)
          if (currentIndex < playlist.length - 1 && onPlaylistChange) {
            onPlaylistChange(playlist[currentIndex + 1].id)
          }
        }}
      >
        <source src={src} type="video/mp4" />
        {selectedSubtitle && subtitles.find(s => s.language === selectedSubtitle) && (
          <track
            kind="subtitles"
            src={subtitles.find(s => s.language === selectedSubtitle)?.url || ''}
            srcLang={selectedSubtitle}
            label={selectedSubtitle}
            default
          />
        )}
      </video>

      {/* Buffering Indicator */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-12 h-12 border-4 border-[#FF006E] border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {controls && showControls && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Progress Bar */}
            <div
              className="w-full h-1 bg-gray-600 rounded cursor-pointer mb-4 hover:h-2 transition-all"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-gradient-to-r from-[#FF006E] to-[#00D9FF] rounded"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="text-white hover:text-[#00D9FF] transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>

                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-[#00D9FF] transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded accent-[#FF006E] cursor-pointer"
                    aria-label="Volume"
                  />
                </div>

                {/* Time Display */}
                <div className="text-white text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Subtitles */}
                {subtitles.length > 0 && (
                  <select
                    value={selectedSubtitle || ''}
                    onChange={(e) => setSelectedSubtitle(e.target.value || null)}
                    className="bg-black/50 text-white text-sm px-2 py-1 rounded border border-gray-600 hover:border-[#00D9FF]"
                    aria-label="Subtitles"
                  >
                    <option value="">No Subtitles</option>
                    {subtitles.map((sub) => (
                      <option key={sub.language} value={sub.language}>
                        {sub.language}
                      </option>
                    ))}
                  </select>
                )}

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-[#00D9FF] transition-colors"
                  aria-label="Fullscreen"
                >
                  <Maximize size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Overlay (when not playing) */}
      <AnimatePresence>
        {!isPlaying && !showControls && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold mb-4">{title}</h2>
              <Play size={64} className="text-[#FF006E] mx-auto" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist Navigation */}
      {playlist.length > 1 && (
        <div className="absolute bottom-20 right-4 flex gap-2">
          {currentIndex > 0 && (
            <button
              onClick={handlePreviousVideo}
              className="bg-[#FF006E] hover:bg-[#FF006E]/80 text-white p-2 rounded transition-colors"
              aria-label="Previous video"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {currentIndex < playlist.length - 1 && (
            <button
              onClick={handleNextVideo}
              className="bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black p-2 rounded transition-colors"
              aria-label="Next video"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
