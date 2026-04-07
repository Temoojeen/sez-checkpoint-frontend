"use client"

import { useEffect, useRef } from "react"
import Hls from "hls.js"

interface CameraPlayerProps {
  cameraId?: string
  url?: string
  onError?: (error: Error) => void
}

export default function CameraPlayer({ cameraId = "camera1", url, onError }: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Очистка предыдущего HLS инстанса
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const streamUrl = url || `http://localhost:8888/${cameraId}/index.m3u8`
    console.log("Attempting to load stream:", streamUrl)

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        debug: true, // Включаем детальное логирование
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
      })
      
      hlsRef.current = hls
      
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("✅ HLS manifest loaded successfully")
        video.play().catch(e => console.error("Autoplay failed:", e))
      })
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        // Детальная информация об ошибке
        console.error("HLS Error Details:", {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          reason: data.reason,
          response: data.response,
          url: data.url,
          error: data.error,
          err: data.err
        })
        
        if (onError) {
          onError(new Error(`HLS error: ${data.type} - ${data.details} - ${data.reason || 'no reason'}`))
        }
      })
    } 
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Для Safari
      console.log("Using native HLS support")
      video.src = streamUrl
      video.addEventListener('error', (e) => {
        console.error("Video element error:", e)
      })
    }
    else {
      console.error("HLS not supported in this browser")
      if (onError) {
        onError(new Error("HLS not supported in this browser"))
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (video) {
        video.pause()
        video.src = ""
        video.load()
      }
    }
  }, [cameraId, url, onError])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      controls
      playsInline
      style={{ 
        width: "100%", 
        height: "auto",
        backgroundColor: "#000",
        borderRadius: "8px"
      }}
    />
  )
}