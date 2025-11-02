"use client";

import Link from "next/link";
import { Button } from "@/app/components/ui";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

export default function Hero() {

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/wind-turbine_2.jpg"
          alt="Wind Energy Background"
          fill
          style={{ objectFit: 'cover', opacity: 0.5 }}
          priority
          quality={100}
          className="w-full h-full object-cover animate-slowZoom"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary-dark/35 to-primary/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-fadeInUp">
            Manage Your Rental Properties with{" "}
            <span className="text-white/90">Confidence</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed animate-fadeInUp stagger-1">
            Streamline tenancy agreements, track energy contracts, and keep all your property documents in one secure place
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fadeInUp stagger-2">
            <Link href="/register">
              <Button
                className="w-full sm:w-auto px-8 py-4 text-lg bg-white !text-black hover:bg-white/90 hover:scale-105 shadow-xl rounded-xl font-medium transition-all duration-200"
              >
                Sign Up Free
                <ArrowRightIcon className="h-5 w-5 ml-2 text-black" />
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/80 text-sm animate-fadeInUp stagger-3">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No credit card required
            </div>
            <div className="flex items-center">
              <svg className="h-5 w-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Set up in 2 minutes
            </div>
            <div className="flex items-center">
              <svg className="h-5 w-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Free forever
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
