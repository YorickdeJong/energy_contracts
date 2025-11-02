"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import {
  QuestionMarkCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function SupportPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setFormData({ subject: "", message: "" });

    // Reset success message after 5 seconds
    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const faqItems = [
    {
      question: "How do I add a new household?",
      answer:
        "Navigate to the Households page and click 'Add Household'. Fill in the required information including address and tenant details.",
    },
    {
      question: "How do I connect my smart meter?",
      answer:
        "Go to Smart Meters page, click 'Connect Meter', and follow the instructions to link your smart meter to your household.",
    },
    {
      question: "How can I view my energy consumption?",
      answer:
        "Visit the Analytics page to see detailed charts and statistics about your energy usage, costs, and trends.",
    },
    {
      question: "How do I invite tenants to my household?",
      answer:
        "On the Household detail page, use the 'Add Member' button to invite tenants via email. They'll receive an invitation link to join.",
    },
  ];

  const contactMethods = [
    {
      icon: EnvelopeIcon,
      title: "Email Support",
      description: "support@energycontracts.com",
      action: "Send Email",
      href: "mailto:support@energycontracts.com",
    },
    {
      icon: PhoneIcon,
      title: "Phone Support",
      description: "+1 (555) 123-4567",
      action: "Call Now",
      href: "tel:+15551234567",
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: "Live Chat",
      description: "Available Mon-Fri, 9AM-5PM",
      action: "Start Chat",
      href: "#",
    },
  ];

  const resources = [
    {
      icon: BookOpenIcon,
      title: "User Guide",
      description: "Complete guide to using Energy Contracts platform",
    },
    {
      icon: DocumentTextIcon,
      title: "API Documentation",
      description: "Technical documentation for developers",
    },
    {
      icon: QuestionMarkCircleIcon,
      title: "Video Tutorials",
      description: "Step-by-step video guides",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Help & Support
        </h1>
        <p className="text-text-secondary">
          Get help with Energy Contracts platform. Browse FAQs or contact our
          support team.
        </p>
      </div>

      {/* Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contactMethods.map((method, index) => {
          const Icon = method.icon;
          return (
            <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {method.title}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {method.description}
              </p>
              <a
                href={method.href}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-secondary text-white hover:bg-secondary-dark w-full"
              >
                {method.action}
              </a>
            </Card>
          );
        })}
      </div>

      {/* Contact Form */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <EnvelopeIcon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold text-text-primary">
            Send Us a Message
          </h2>
        </div>

        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              Thank you for your message! Our support team will get back to you
              shortly.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Name
              </label>
              <Input
                type="text"
                value={user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : ""}
                disabled
                className="bg-background-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Email
              </label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-background-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Subject
            </label>
            <Input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Brief description of your issue"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Message
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
              placeholder="Describe your issue in detail..."
              required
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </Card>

      {/* FAQ Section */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <QuestionMarkCircleIcon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold text-text-primary">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-6">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="pb-6 border-b border-border last:border-0 last:pb-0"
            >
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {item.question}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Resources */}
      <div>
        <h2 className="text-2xl font-semibold text-text-primary mb-6">
          Helpful Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {resource.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
