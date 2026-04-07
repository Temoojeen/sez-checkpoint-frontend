"use client"

import { useEffect, useRef } from "react"

interface Props {
  cameraId?: string
  server?: string
}

export default function WebRTCPlayer({
  cameraId = "camera1",
  server = "http://10.24.32.31:8889"
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const pc = new RTCPeerConnection({
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    })

    pc.ontrack = (event) => {
      video.srcObject = event.streams[0]
    }

    const start = async () => {
      const offer = await pc.createOffer({ offerToReceiveVideo: true })
      await pc.setLocalDescription(offer)

      const res = await fetch(`${server}/${cameraId}/whep`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp
      })

      const answer = await res.text()
      await pc.setRemoteDescription({ type: "answer", sdp: answer })
    }

    start()

    return () => pc.close()
  }, [cameraId, server])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      controls
      style={{ width: "100%", borderRadius: 8, background: "#000" }}
    />
  )
}