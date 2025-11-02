import { Metadata } from "next";
import LandingHeader from "./components/landing/LandingHeader";
import Hero from "./components/landing/Hero";
import Features from "./components/landing/Features";
import HowItWorks from "./components/landing/HowItWorks";
import Benefits from "./components/landing/Benefits";
import TrustBadges from "./components/landing/TrustBadges";
import CTASection from "./components/landing/CTASection";
import LandingFooter from "./components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Energy Contracts - Property Management Made Simple",
  description: "Streamline tenancy agreements, track energy contracts, and manage all your rental properties in one secure place. Trusted by landlords.",
};

export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="min-h-screen bg-background">
        <Hero />
        <Features />
        <HowItWorks />
        <Benefits />
        {/* <TrustBadges /> */}
        <CTASection />
        <LandingFooter />
      </main>
    </>
  );
}
