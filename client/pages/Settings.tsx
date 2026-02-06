import { useState } from "react";
import { Settings, Mail, Trash2, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";

interface ConfiguredAccount {
  email: string;
  provider: string;
  configured: boolean;
}

const PROVIDERS = [
  { id: "gmail", name: "Gmail", icon: "📧", color: "bg-red-500" },
  { id: "yahoo", name: "Yahoo", icon: "📨", color: "bg-purple-500" },
  { id: "outlook", name: "Outlook", icon: "📬", color: "bg-blue-500" },
  { id: "rediff", name: "Rediff", icon: "🔴", color: "bg-red-600" },
];

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<ConfiguredAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [addingProvider, setAddingProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [testingConnection, setTestingConnection] = useState(false);

  // Fetch configured accounts on load
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email/configured");
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setMessage({ type: "error", text: "Failed to load accounts" });
    } finally {
      setLoading(false);
    }
  };

  // Call fetchAccounts on component mount
  useState(() => {
    fetchAccounts();
  });

  const handleAddEmail = async (provider: string) => {
    if (!formData.email || !formData.password) {
      setMessage({ type: "error", text: "Email and password are required" });
      return;
    }

    try {
      setTestingConnection(true);
      
      // Test connection first
      const testResponse = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          provider,
        }),
      });

      if (!testResponse.ok) {
        const error = await testResponse.json();
        setMessage({ type: "error", text: error.message || "Connection failed" });
        return;
      }

      // If connection test passes, add the account
      const addResponse = await fetch("/api/email/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          provider,
        }),
      });

      const result = await addResponse.json();

      if (result.success) {
        setMessage({ type: "success", text: `${formData.email} added successfully` });
        setFormData({ email: "", password: "" });
        setAddingProvider(null);
        fetchAccounts();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to add account" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error occurred while adding account" });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}?`)) return;

    try {
      const response = await fetch(`/api/email/account/${email}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ type: "success", text: `${email} removed successfully` });
        fetchAccounts();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to remove account" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error occurred while removing account" });
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <nav className="bg-card border-b border-border flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeDropdown />
            <SecurityButton />
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Message Alert */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <p>{message.text}</p>
            </div>
          )}

          {/* Email Accounts Section */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">Email Accounts</h2>

            {/* Current Accounts */}
            {accounts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4">Configured Accounts</h3>
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.email}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{account.email}</p>
                          <p className="text-sm text-muted-foreground capitalize">{account.provider}</p>
                        </div>
                        {account.configured && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Connected
                          </span>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveEmail(account.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Account */}
            <div className="border-t border-border pt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Add New Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setAddingProvider(provider.id)}
                    className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors text-left"
                  >
                    <div className="text-3xl mb-2">{provider.icon}</div>
                    <p className="font-semibold text-foreground">{provider.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Add account</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Add Email Form Modal */}
            {addingProvider && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    Add {PROVIDERS.find((p) => p.id === addingProvider)?.name} Account
                  </h3>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your-email@gmail.com"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Password or App Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {addingProvider === "gmail" && (
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 For Gmail, use an{" "}
                          <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            App Password
                          </a>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAddEmail(addingProvider)}
                      disabled={testingConnection || !formData.email || !formData.password}
                      className="flex-1"
                    >
                      {testingConnection ? "Testing..." : "Add Account"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddingProvider(null);
                        setFormData({ email: "", password: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
