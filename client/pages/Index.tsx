import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Mail,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation Bar */}
      <nav className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground">
              Email Analyzer
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher variant="compact" />
            <Button asChild variant="outline">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 leading-tight">
            Email Analyzer
            <span className="text-blue-600"> Unified Email Management</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Monitor and manage emails from Gmail, Yahoo, Outlook, and Rediff in
            one place. Stay organized with our modern, unified email interface.
          </p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          <FeatureCard
            icon={<Mail className="w-8 h-8" />}
            title="Multi-Provider Support"
            description="Access emails from Gmail, Yahoo, Outlook, and Rediff in a single interface"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Lightning Fast"
            description="Load and switch between email providers instantly"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Secure & Private"
            description="Your email data is secure with modern encryption and privacy practices"
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Analytics Ready"
            description="Track email patterns and insights across all your accounts"
          />
        </div>

        {/* Call-to-Action Section */}
        <div className="mt-24 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Unify Your Email?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Start managing all your emails in one beautiful dashboard. No setup
            required - view sample data right away.
          </p>
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
            <Link to="/dashboard">Launch Dashboard</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-slate-50 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-muted-foreground">
          <p>
            Email Analyzer - Unified Email Management Platform | Built with
            React & TypeScript
          </p>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
      <div className="text-blue-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
