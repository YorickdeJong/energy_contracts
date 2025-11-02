import Link from "next/link";
import { Button } from "@/app/components/ui";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

export default function CTASection() {
  return (
    <section id="cta" className="py-24 bg-gradient-to-br from-primary via-primary-dark to-primary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
          Ready to Simplify Property Management?
        </h2>
        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          Join landlords who trust us to manage their properties efficiently. Get started in minutes—no credit card required.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link href="/register">
            <Button
              className="w-full sm:w-auto px-10 py-4 text-lg bg-white text-primary hover:bg-white/90 hover:scale-105 shadow-xl rounded-xl font-medium transition-all duration-200"
            >
              Sign Up Free
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>

        <p className="text-white/70 text-sm">
          No credit card required • Set up in 2 minutes • Free forever
        </p>

        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-white/80 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-white font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
