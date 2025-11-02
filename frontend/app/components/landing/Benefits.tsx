import { ClockIcon, FolderIcon, LockClosedIcon, DevicePhoneMobileIcon, UsersIcon, BoltIcon } from "@heroicons/react/24/outline";

export default function Benefits() {
  const benefits = [
    {
      icon: ClockIcon,
      title: "Save Time",
      description: "Automate reminders and document organization to save hours every week."
    },
    {
      icon: FolderIcon,
      title: "Stay Organized",
      description: "All your property documents and contracts in one searchable place."
    },
    {
      icon: LockClosedIcon,
      title: "Secure Storage",
      description: "Bank-level encryption keeps your sensitive documents safe and private."
    },
    {
      icon: DevicePhoneMobileIcon,
      title: "Access Anywhere",
      description: "Manage your properties on the go from any device, anytime."
    },
    {
      icon: UsersIcon,
      title: "Easy Collaboration",
      description: "Share access with tenants and co-owners with role-based permissions."
    },
    {
      icon: BoltIcon,
      title: "Smart Automation",
      description: "AI-powered document extraction and automated notifications save you clicks."
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            Why Landlords Choose Us
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Built specifically for property owners who want to work smarter, not harder.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-4 p-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {benefit.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
