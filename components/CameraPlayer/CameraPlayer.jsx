"use client"

import { useEffect, useRef } from "react"
import Hls from "hls.js"

export default function CameraPlayer(){

  const videoRef = useRef(null)

  useEffect(()=>{

    if(Hls.isSupported()){

      const hls = new Hls()

      hls.loadSource("http://localhost:8888/camera1/index.m3u8")

      hls.attachMedia(videoRef.current)

    }

  },[])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      controls
      style={{width:"100%"}}
    />
  )

}