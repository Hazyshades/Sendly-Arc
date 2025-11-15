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
      <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
        <img 
          src="https://cdn.brandfetch.io/x.com/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" 
          alt="X logo" 
          className="w-full h-full object-cover"
        />
      </div>
    ),
  },
  {
    id: "logo-twitch",
    description: "Twitch",
    element: (
      <div className="w-16 h-16 bg-purple-700 rounded-xl flex items-center justify-center overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
        <img 
          src="https://cdn.brandfetch.io/idIwZCwD2f/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" 
          alt="Twitch logo" 
          className="w-full h-full object-cover"
        />
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
      <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
        <img 
          src="https://cdn.brandfetch.io/id-0D6OFrq/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1740370965265" 
          alt="TikTok logo" 
          className="w-full h-full object-cover"
        />
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
    // Вычисляем время завершения всех BlurText анимаций
    // Текст "Dispatch funds...": delay={400}, duration={1200} → 400 + 1200 = 1600ms
    // Последний логотип (index 4): delay={600 + 4 * 100} = 1000, duration={1200} → 1000 + 1200 = 2200ms
    // Ждем завершения последней анимации + небольшой запас
    const maxDelay = 600 + (logos.length - 1) * 100 // последний delay
    const duration = 1200
    const totalTime = maxDelay + duration + 100 // добавляем небольшой запас

    const timer = setTimeout(() => {
      setCanStartCarousel(true)
    }, totalTime)

    return () => clearTimeout(timer)
  }, [logos.length])

  // Создаем плагин только когда можно запускать карусель
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
          {/* Видимая область с градиентами - показывает только 3 иконки */}
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
            {/* Градиентные границы для видимой области */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#DADEFF] to-transparent pointer-events-none z-10"></div>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#DADEFF] to-transparent pointer-events-none z-10"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { SocialLogos }
