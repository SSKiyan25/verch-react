"use client";
import {
  ShoppingBag,
  Store,
  Users,
  CreditCard,
  Heart,
  Zap,
} from "lucide-react";
import Image from "next/image";

const features = [
  {
    icon: Users,
    title: "Student Organizations",
    description:
      "Support your favorite VSU student orgs by purchasing their exclusive merchandise.",
  },
  {
    icon: ShoppingBag,
    title: "Quality Products",
    description:
      "Discover unique, high-quality merchandise designed by and for VSU students.",
  },
  {
    icon: Store,
    title: "Multiple Stores",
    description:
      "Browse through various organization stores all in one convenient platform.",
  },
  {
    icon: CreditCard,
    title: "GCash Payment",
    description:
      "Convenient and secure payments using GCash for all your merchandise purchases.",
  },
  {
    icon: Heart,
    title: "Community Support",
    description:
      "Every purchase directly supports student organization activities and initiatives.",
  },
  {
    icon: Zap,
    title: "Easy Experience",
    description:
      "Simple, fast, and intuitive shopping experience designed for students.",
  },
];

export function Features() {
  return (
    <div className="w-full max-w-2xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="text-center mb-8 lg:mb-12">
        {/* Logo - Desktop Only */}
        <div className="hidden lg:flex justify-center mb-6">
          <Image
            src="/logo-verch-2.png"
            alt="Verch Logo"
            width={120}
            height={120}
            className="object-contain"
          />
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
          Welcome to <span className="text-accent">Verch</span>
        </h1>
        <p className="text-lg lg:text-xl text-primary-foreground/80 max-w-md mx-auto">
          Your official e-commerce platform for VSU student organization
          merchandise
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 p-4 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/20"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-primary-foreground/70">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
