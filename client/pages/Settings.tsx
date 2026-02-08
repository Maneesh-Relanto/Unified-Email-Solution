import { useState, useEffect } from "react";
import { Settings, Mail, Trash2, Plus, AlertCircle, CheckCircle, Loader, ChevronRight, ArrowLeft, Eye, EyeOff, HelpCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";
import { OAuthSettingsForm } from "@/components/OAuthSettingsForm";
import { ErrorAlert } from "@/components/ErrorAlert";

interface ConfiguredAccount {
  email: string;
  provider: string;
  configured: boolean;
}

interface ProgressStep {
  step: number;
  stepName: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  message?: string;
}

type SettingsTab = "accounts" | "add-account" | "help";

const PROVIDERS = [
  { id: "gmail", name: "Gmail", icon: "📧", color: "bg-red-500" },
  { id: "yahoo", name: "Yahoo", icon: "📨", color: "bg-purple-500" },
  { id: "outlook", name: "Outlook", icon: "📬", color: "bg-blue-500" },
  { id: "rediff", name: "Rediff", icon: "🔴", color: "bg-red-600" },
];

const PROGRESS_STEPS = [
  { step: 1, stepName: "Validating Input", description: "Checking email format and password" },
  { step: 2, stepName: "Retrieving Server Config", description: "Getting IMAP server details" },
  { step: 3, stepName: "Authenticating with Provider", description: "Connecting to email server" },
  { step: 4, stepName: "Ready to Save", description: "Account verified and ready" },
];

function ProgressModal({ isOpen, provider, email, onConfirm, onCancel, progressData }: any) {
  if (!isOpen) return null;

  const getStepStatus = (stepNum: number) => {
    if (progressData?.step === undefined) return "pending";
    if (stepNum < progressData.step) return "completed";
    if (stepNum === progressData.step) return progressData.status || "in-progress";
    return "pending";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "in-progress":
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Adding {provider.toUpperCase()} Account
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{email}</p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4 mb-6">
          {PROGRESS_STEPS.map((step) => {
            const status = getStepStatus(step.step);
            return (
              <div key={step.step} className="flex items-start gap-3">
                <div className="pt-1">{getStatusIcon(status)}</div>
                <div className="flex-1">
                  <div className={`font-medium text-sm ${
                    status === "completed" || status === "in-progress"
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400"
                  }`}>
                    {step.stepName}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        {progressData?.message && (
          <div className={`p-3 rounded-lg mb-6 text-sm ${
            progressData.status === "failed"
              ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
              : progressData.status === "completed"
              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
              : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
          }`}>
            {progressData.message}
          </div>
        )}

        {/* Troubleshooting (on failure) */}
        {progressData?.status === "failed" && progressData?.troubleshooting && (
          <div className="p-3 rounded-lg mb-6 bg-amber-50 dark:bg-amber-900/20 text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200 mb-2">Troubleshooting:</p>
            <div className="text-amber-800 dark:text-amber-300 space-y-1 text-xs">
              {typeof progressData.troubleshooting === "object" ? (
                <div>
                  {progressData.troubleshooting[provider] && (
                    <p className="whitespace-pre-wrap">{progressData.troubleshooting[provider]}</p>
                  )}
                </div>
              ) : (
                <p>{progressData.troubleshooting}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {progressData?.status !== "in-progress" && (
            <>
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              {progressData?.status === "completed" && (
                <Button onClick={onConfirm} className="flex-1 bg-green-600 hover:bg-green-700">
                  Add Account
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("accounts");
  const [accounts, setAccounts] = useState<ConfiguredAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [progressData, setProgressData] = useState<any>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch configured accounts on load (both IMAP and OAuth)
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const allAccounts: ConfiguredAccount[] = [];
      
      // Fetch IMAP accounts
      const imapResponse = await fetch("/api/email/configured");
      const imapData = await imapResponse.json();
      if (imapData.success && imapData.accounts) {
        allAccounts.push(...imapData.accounts);
      }
      
      // Fetch OAuth accounts
      const oauthResponse = await fetch("/api/email/auth/status");
      const oauthData = await oauthResponse.json();
      if (oauthData.success && oauthData.data?.providers) {
        const oauthAccounts = oauthData.data.providers.map((provider: any) => ({
          email: provider.email,
          provider: provider.provider, // 'google' or 'microsoft'
          configured: true,
        }));
        allAccounts.push(...oauthAccounts);
      }
      
      setAccounts(allAccounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setMessage({ type: "error", text: "Failed to load accounts" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
    
    // Check for OAuth callback
    const params = new URLSearchParams(globalThis.location.search);
    
    // Handle authentication errors
    if (params.get('error')) {
      const error = params.get('error');
      const errorDescription = params.get('error_description') || 'OAuth authentication failed';
      
      setMessage({
        type: 'error',
        text: `Authentication Error: ${errorDescription}. Please try again or use a different authentication method.`,
      });
      
      // Clear URL params
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
      return;
    }
    
    // Handle successful authentication
    if (params.get('authenticated') === 'true') {
      const provider = params.get('provider');
      const email = params.get('email');
      const providerName = provider === 'microsoft' ? 'Outlook' : provider?.toUpperCase() || 'Email';
      
      setMessage({
        type: 'success',
        text: `✓ ${providerName} account (${email}) connected successfully!`,
      });
      
      // Clear URL params
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
      
      // Reset form
      setSelectedProvider(null);
      setFormData({ email: '', password: '' });
      
      // Refresh accounts list
      setTimeout(() => fetchAccounts(), 500);
    }
  }, []);

  const handleTestConnection = async (provider: string) => {
    if (!formData.email || !formData.password) {
      setMessage({ type: "error", text: "Email and password are required" });
      return;
    }

    try {
      setShowProgressModal(true);
      setProgressData({ step: 1, status: "in-progress" });

      const response = await fetch("/api/email/test-with-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          provider,
        }),
      });

      const data = await response.json();
      setProgressData({
        step: data.step,
        status: data.status,
        message: data.message,
        troubleshooting: data.troubleshooting,
        successData: data.success ? { email: data.email, provider: data.provider } : null,
      });
    } catch (error) {
      setProgressData({
        step: 3,
        status: "failed",
        message: "Network error occurred",
        troubleshooting: "Check your internet connection and try again",
      });
    }
  };

  const handleConfirmAdd = async () => {
    if (!progressData?.successData) return;

    try {
      const addResponse = await fetch("/api/email/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          provider: selectedProvider,
        }),
      });

      const result = await addResponse.json();

      if (result.success) {
        setMessage({ type: "success", text: `${formData.email} added successfully!` });
        setFormData({ email: "", password: "" });
        setSelectedProvider(null);
        setShowProgressModal(false);
        setProgressData(null);
        fetchAccounts();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to add account" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error occurred while adding account" });
    }
  };

  const handleRemoveAccount = async (email: string) => {
    if (!confirm(`Remove ${email}?`)) return;

    try {
      setRemovingEmail(email);
      
      // Find the account to determine if it's OAuth or IMAP
      const account = accounts.find(acc => acc.email === email);
      const isOAuthProvider = account?.provider === 'google' || account?.provider === 'microsoft';
      
      let response;
      if (isOAuthProvider) {
        // Use OAuth disconnect endpoint
        response = await fetch(`/api/email/auth/disconnect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: account.provider,
            email: email,
          }),
        });
      } else {
        // Use IMAP delete endpoint
        response = await fetch(`/api/email/account/${encodeURIComponent(email)}`, {
          method: "DELETE",
        });
      }

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: `${email} removed successfully` });
        fetchAccounts();
      } else {
        setMessage({ type: "error", text: "Failed to remove account" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error removing account" });
    } finally {
      setRemovingEmail(null);
    }
  };

  const getProvider = (id: string) => PROVIDERS.find((p) => p.id === id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Email Settings
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="default" size="sm">
              <Link to="/">Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/unified-inbox">Unified Inbox</Link>
            </Button>
            <SecurityButton />
            <ThemeDropdown />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full">
        <div className="flex gap-6 p-6">
          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0">
            <div className="bg-card border border-border rounded-lg p-4 sticky top-20">
              <nav className="space-y-2">
                {/* Connected Accounts Tab */}
                <button
                  onClick={() => {
                    setActiveTab("accounts");
                    setSelectedProvider(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                    activeTab === "accounts"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  Connected Accounts
                </button>

                {/* Add New Account Tab */}
                <button
                  onClick={() => {
                    setActiveTab("add-account");
                    setSelectedProvider(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                    activeTab === "add-account"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Add New Account
                </button>

                {/* Divider */}
                <div className="border-t border-border my-2"></div>

                {/* Help Tab */}
                <button
                  onClick={() => {
                    setActiveTab("help");
                    setSelectedProvider(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                    activeTab === "help"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  Help & Support
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Messages */}
            {message && (
              <>
                {message.type === "error" ? (
                  <ErrorAlert
                    message={message.text}
                    details="Please check your credentials and try again, or use OAuth for automatic handling."
                    onDismiss={() => setMessage(null)}
                  />
                ) : (
                  <div className="p-4 rounded-lg mb-6 flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {message.text}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Tab: Connected Accounts */}
            {activeTab === "accounts" && (
              <div>
                {/* Account Summary */}
                {!loading && accounts.length > 0 && (
                  <section className="mb-8">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          Account Summary
                        </h2>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {accounts.length}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {accounts.length === 1 ? 'Account Connected' : 'Accounts Connected'}
                          </p>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Connected Providers:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(accounts.map(acc => {
                              const provider = getProvider(acc.provider);
                              return provider?.name || acc.provider;
                            }))).map(providerName => (
                              <span
                                key={providerName}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700"
                              >
                                {providerName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Connected Email Accounts */}
                <section>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold">Connected Email Accounts</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {accounts.length === 0 
                        ? "No email addresses connected" 
                        : `${accounts.length} email ${accounts.length === 1 ? 'address' : 'addresses'} connected`}
                    </p>
                  </div>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                      <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground font-medium">No email accounts connected yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Add your first account to get started</p>
                      <Button
                        onClick={() => setActiveTab("add-account")}
                        className="mt-4"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Account
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {accounts.map((account) => {
                        const provider = getProvider(account.provider);
                        return (
                          <div 
                            key={account.email} 
                            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-all"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={`${provider?.color} text-white rounded-full w-12 h-12 flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
                                {provider?.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-base font-semibold text-foreground truncate">{account.email}</p>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium flex-shrink-0">
                                    Active
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <p className="text-sm text-muted-foreground">{provider?.name}</p>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      backgroundColor: (account.provider === 'google' || account.provider === 'microsoft') 
                                        ? 'rgb(59, 130, 246, 0.1)' 
                                        : 'rgb(168, 85, 247, 0.1)',
                                      color: (account.provider === 'google' || account.provider === 'microsoft') 
                                        ? 'rgb(59, 130, 246)' 
                                        : 'rgb(168, 85, 247)'
                                    }}
                                  >
                                    {(account.provider === 'google' || account.provider === 'microsoft') ? 'OAuth' : 'IMAP'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 flex-shrink-0 ml-4"
                              onClick={() => handleRemoveAccount(account.email)}
                              disabled={removingEmail === account.email}
                              title="Remove account"
                            >
                              {removingEmail === account.email ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* Tab: Add New Account */}
            {activeTab === "add-account" && (
              <div>
                <h2 className="text-lg font-semibold mb-6">Add New Email Account</h2>

                {!selectedProvider ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`p-6 rounded-lg border-2 transition-all text-left hover:border-primary hover:bg-accent `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`${provider.color} text-white rounded-full w-14 h-14 flex items-center justify-center text-3xl`}>
                              {provider.icon}
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{provider.name}</p>
                              <p className="text-xs text-muted-foreground">Click to add account</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="mb-6">
                      <button
                        onClick={() => {
                          setSelectedProvider(null);
                          setFormData({ email: "", password: "" });
                        }}
                        className="flex items-center gap-2 text-sm text-primary hover:underline mb-4"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to providers
                      </button>

                      <div className="flex items-center gap-4 mb-6">
                        <div className={`${getProvider(selectedProvider)?.color} text-white rounded-full w-14 h-14 flex items-center justify-center text-3xl`}>
                          {getProvider(selectedProvider)?.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            Add {getProvider(selectedProvider)?.name} Account
                          </h3>
                          {selectedProvider === "gmail" || selectedProvider === "outlook" ? (
                            <p className="text-sm text-muted-foreground">
                              Use secure OAuth authentication - no password stored
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {selectedProvider === "gmail"
                                ? "Use your Gmail address and App Password (16 chars with spaces)"
                                : "Use your email address and password"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* OAuth Form for Gmail and Outlook */}
                    {(selectedProvider === "gmail" || selectedProvider === "outlook") && (
                      <OAuthSettingsForm 
                        provider={selectedProvider === "outlook" ? "microsoft" : "gmail"}
                        onCancel={() => {
                          setSelectedProvider(null);
                          setFormData({ email: "", password: "" });
                        }}
                        onSuccess={() => {
                          setSelectedProvider(null);
                          setFormData({ email: "", password: "" });
                          setActiveTab("accounts");
                          fetchAccounts();
                        }}
                      />
                    )}

                    {/* Manual Form for other providers */}
                    {selectedProvider !== "gmail" && selectedProvider !== "outlook" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Email Address</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your.email@provider.com"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Password</label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Enter password"
                              className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              title={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleTestConnection(selectedProvider)}
                          className="w-full"
                          disabled={!formData.email || !formData.password}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Test & Add Account
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Help & Support */}
            {activeTab === "help" && (
              <div>
                <h2 className="text-lg font-semibold mb-6">Help & Support</h2>
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="font-semibold mb-2">📧 Adding Email Accounts</h3>
                    <p className="text-sm text-muted-foreground">
                      You can connect email accounts using OAuth (Gmail, Outlook) for secure authentication, or manual IMAP for other providers like Yahoo and Rediff.
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="font-semibold mb-2">🔐 Security & Privacy</h3>
                    <p className="text-sm text-muted-foreground">
                      OAuth accounts are authenticated securely without storing your password. Manual IMAP credentials are not stored on our servers - only kept in your local browser session.
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="font-semibold mb-2">❓ Troubleshooting</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Having issues? Try the following:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 ml-4">
                      <li>• Check that your email address is correct</li>
                      <li>• Ensure you're using an app password (if required)</li>
                      <li>• Verify IMAP is enabled in your email account settings</li>
                      <li>• Try removing and re-adding the account</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Progress Modal */}
      {selectedProvider && activeTab === "add-account" && (
        <ProgressModal
          isOpen={showProgressModal}
          provider={selectedProvider}
          email={formData.email}
          progressData={progressData}
          onConfirm={handleConfirmAdd}
          onCancel={() => {
            setShowProgressModal(false);
            setProgressData(null);
          }}
        />
      )}
    </div>
  );
}
