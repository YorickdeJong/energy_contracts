"use client";

import { HomeIcon, DocumentTextIcon, BellIcon } from "@heroicons/react/24/outline";
import { useScrollAnimation } from "@/app/hooks/useScrollAnimation";

export default function Features() {
  const { ref, isVisible } = useScrollAnimation();
  const features = [
    {
      icon: HomeIcon,
      title: "Multi-Household Management",
      description: "Manage all your properties from a single dashboard. Add unlimited properties and tenants without the hassle of juggling multiple spreadsheets."
    },
    {
      icon: DocumentTextIcon,
      title: "Smart Document Storage",
      description: "Store tenancy agreements, energy contracts, inventory reports, and checkout readings all in one secure place. AI-powered document extraction saves you time."
    },
    {
      icon: BellIcon,
      title: "Automated Reminders",
      description: "Never miss an important date again. Get automatic notifications for contract renewals, inspection deadlines, and important property milestones."
    }
  ];

  return (
    <section ref={ref} id="features" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`text-center mb-16 ${isVisible ? 'animate-fadeInUp' : ''}`}>
          <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            Everything You Need in One Place
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Say goodbye to scattered documents and missed deadlines. Our platform gives you complete control over your rental properties.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl p-8 shadow-sm border border-border hover:shadow-lg hover:scale-105 transition-all duration-300 ${isVisible ? `animate-fadeInUp stagger-${index + 1}` : ''}`}
            >
              <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-6">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-4">
                {feature.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA hint */}
        <div className="text-center mt-16">
          <p className="text-text-secondary">
            Ready to get started?{" "}
            <a href="#cta" className="text-primary font-medium hover:underline">
              Sign up free →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
