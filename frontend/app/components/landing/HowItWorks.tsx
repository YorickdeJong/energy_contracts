import { UserPlusIcon, CloudArrowUpIcon, ChartBarIcon } from "@heroicons/react/24/outline";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: UserPlusIcon,
      title: "Sign Up & Add Properties",
      description: "Create your free account in just 2 minutes. Add your properties and invite tenants to join your households."
    },
    {
      number: "02",
      icon: CloudArrowUpIcon,
      title: "Upload Documents",
      description: "Upload tenancy agreements and let our AI extract key details automatically. Store all property-related documents securely in one place."
    },
    {
      number: "03",
      icon: ChartBarIcon,
      title: "Manage Everything",
      description: "Track tenancies, monitor energy contracts, and manage all your properties from a clean, intuitive dashboard. Get reminders so nothing slips through the cracks."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-background-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            Get Started in 3 Simple Steps
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            From signup to managing multiple properties takes just minutes. No technical expertise required.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connector Lines (hidden on mobile) */}
          <div className="hidden md:block absolute top-1/4 left-0 right-0 h-0.5 bg-border -z-0" />

          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Number Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold z-10 shadow-lg">
                {index + 1}
              </div>

              {/* Step Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-border pt-12 h-full">
                <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-6 mx-auto">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-text-primary mb-4 text-center">
                  {step.title}
                </h3>
                <p className="text-text-secondary leading-relaxed text-center">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
