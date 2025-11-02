"use client";

import { ShieldCheckIcon, LockClosedIcon, CheckBadgeIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useScrollAnimation } from "@/app/hooks/useScrollAnimation";

export default function TrustBadges() {
  const { ref, isVisible } = useScrollAnimation();
  const badges = [
    {
      icon: ShieldCheckIcon,
      title: "Secure & Private",
      description: "Bank-level 256-bit encryption"
    },
    {
      icon: LockClosedIcon,
      title: "GDPR Compliant",
      description: "Full data protection compliance"
    },
    {
      icon: CheckBadgeIcon,
      title: "Trusted Platform",
      description: "Reliable service you can count on"
    },
    {
      icon: GlobeAltIcon,
      title: "Always Available",
      description: "99.9% uptime guarantee"
    }
  ];

  return (
    <section ref={ref} className="py-16 bg-background-secondary border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {badges.map((badge, index) => (
            <div
              key={index}
              className={`text-center ${isVisible ? `animate-scaleIn stagger-${index + 1}` : ''}`}
            >
              <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 mx-auto shadow-sm group-hover:scale-110 transition-transform duration-300">
                <badge.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                {badge.title}
              </h3>
              <p className="text-xs text-text-secondary">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
