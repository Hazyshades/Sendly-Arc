"use client"

import { useState, useEffect, useMemo } from "react"
import AutoScroll from "embla-carousel-auto-scroll"
import { BlurText } from "./BlurText"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel"

interface Logo {
  id: string
  description: string
  image?: string
  className?: string
  element?: React.ReactNode
}

interface SocialLogosProps {
  heading?: string
  logos?: Logo[]
  className?: string
}

const defaultLogos: Logo[] = [
  {
    id: "logo-twitter",
    description: "Twitter / X",
    element: (
      <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
    ),
  },
  {
    id: "logo-twitch",
    description: "Twitch",
    element: (
      <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
      </div>
    ),
  },
  {
    id: "logo-telegram",
    description: "Telegram",
    element: (
      <div className="w-16 h-16 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-7 h-7 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9.50039 15.0005L9.30305 18.7916C9.63343 18.7916 9.77653 18.6502 9.94861 18.4803L11.4982 16.9898L15.251 19.7367C15.9373 20.1197 16.4205 19.9285 16.6027 19.0304L18.9395 7.42573L18.9402 7.42504C19.1555 6.32428 18.5201 5.86444 17.851 6.13415L4.90234 11.1053C3.84037 11.5206 3.85629 12.1181 4.7964 12.3878L8.10118 13.3485L15.8533 8.52547C16.2199 8.28796 16.5538 8.42039 16.2799 8.6579L9.50039 15.0005Z" />
        </svg>
      </div>
    ),
  },
  {
    id: "logo-instagram",
    description: "Instagram",
    element: (
      <div className="w-16 h-16 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-xl flex items-center justify-center overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
        <svg 
          className="w-full h-full p-2"
          viewBox="0 0 512 512"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z"/>
          <path d="M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z"/>
        </svg>
      </div>
    ),
  },
  {
    id: "logo-tiktok",
    description: "TikTok",
    element: (
      <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      </div>
    ),
  },
]

const SocialLogos = ({
  heading,
  logos = defaultLogos,
  className,
}: SocialLogosProps) => {
  const [canStartCarousel, setCanStartCarousel] = useState(false)

  useEffect(() => {
    // Compute the time to finish all BlurText animations
    // Text "Dispatch funds...": delay={400}, duration={1200} → 400 + 1200 = 1600ms
    // The last logo (index 4): delay={600 + 4 * 100} = 1000, duration={1200} → 1000 + 1200 = 2200ms
    // Wait for the last animation to finish + a small buffer
    const maxDelay = 600 + (logos.length - 1) * 100 // last delay
    const duration = 1200
    const totalTime = maxDelay + duration + 100 // add a small buffer

    const timer = setTimeout(() => {
      setCanStartCarousel(true)
    }, totalTime)

    return () => clearTimeout(timer)
  }, [logos.length])

  // Create the plugin only when the carousel can start
  const autoScrollPlugin = useMemo(() => {
    if (!canStartCarousel) return undefined
    return AutoScroll({ 
      playOnInit: true, 
      speed: 1,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
      direction: "forward",
    })
  }, [canStartCarousel])

  return (
    <div className={`py-8 ${className || ''}`}>
      {heading && (
        <div className="container flex flex-col items-center text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            {heading}
          </h2>
        </div>
      )}
      <div className="pt-4 md:pt-6 w-full overflow-hidden flex justify-center">
        <div className="relative w-full max-w-3xl px-1">
          {/* Visible area with gradients - shows only 3 icons */}
          <div className="relative overflow-hidden">
            <Carousel
              opts={{ 
                loop: true,
                align: "center",
                slidesToScroll: 1,
                duration: 20,
              }}
              plugins={autoScrollPlugin ? [autoScrollPlugin] : []}
              className="w-full"
            >
              <CarouselContent className="ml-0 -mr-2">
                {logos.map((logo, index) => (
                  <CarouselItem
                    key={logo.id}
                    className="basis-1/3 pl-0 pr-0 flex items-center justify-center"
                  >
                    <div className="flex items-center justify-center h-20 w-full px-1">
                      <BlurText delay={600 + index * 100} duration={1200}>
                        <div className="transform hover:scale-110 transition-transform duration-300 cursor-pointer flex items-center justify-center">
                          {logo.element || (
                            <img
                              src={logo.image}
                              alt={logo.description}
                              className={logo.className || "h-16 w-16"}
                            />
                          )}
                        </div>
                      </BlurText>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            {/* Gradient borders for the visible area */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#DADEFF] to-transparent pointer-events-none z-10"></div>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#DADEFF] to-transparent pointer-events-none z-10"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { SocialLogos }
