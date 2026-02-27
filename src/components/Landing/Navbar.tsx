import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Navbar() {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const nav = navRef.current;
      if (!nav) return;

      // Morphing logic based on scroll
      ScrollTrigger.create({
        start: 'top -80',
        onUpdate: (self) => {
          const scrolled = self.scroll() > 10;
          
          gsap.to(nav, {
            backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'blur(0)',
            borderColor: scrolled ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            boxShadow: scrolled ? '0 8px 32px rgba(30, 27, 75, 0.1)' : 'none',
            duration: 0.4,
            ease: 'power2.out',
          });

          // Change text color
          const textElements = nav.querySelectorAll('.nav-text');
          textElements.forEach((el) => {
            gsap.to(el, {
              color: scrolled ? '#0a0a0f' : '#1e1b4b',
              duration: 0.3,
            });
          });
        },
      });
    }, navRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 pointer-events-none">
      <nav
        ref={navRef}
        className="pointer-events-auto flex items-center gap-8 px-8 py-4 rounded-full border border-transparent transition-all duration-500"
        style={{
          backgroundColor: 'transparent',
          backdropFilter: 'blur(0)',
        }}
      >
        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="#features" label="Features" />
          <NavLink href="#protocol" label="Protocol" />
          <NavLink href="#membership" label="Membership" />
        </div>

        {/* Live Network Status */}
        <div className="flex items-center gap-3 pl-4 border-l border-sendly-indigo/20">
          <div className="live-indicator">
            <span className="nav-text font-mono text-xs text-sendly-indigo/70 ml-4">
              Network Online
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-sendly-indigo/50">
            <span>24ms</span>
          </div>
        </div>

        {/* CTA Button */}
        <button className="btn-magnetic px-6 py-2.5 rounded-full bg-sendly-indigo text-white font-medium text-sm hover:shadow-lg transition-all duration-300">
          Launch App
        </button>
      </nav>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="nav-text px-4 py-2 rounded-full text-sm font-medium text-sendly-indigo hover:bg-sendly-indigo/5 transition-all duration-300"
    >
      {label}
    </a>
  );
}
