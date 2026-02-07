import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, HelpCircle, Mail, Lock, Wifi, Server, Key, Shield, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { SecurityButton } from "@/components/SecurityButton";

interface FAQItem {
  id: string;
  icon: React.ReactNode;
  category: string;
  question: string;
  answer: string;
  solutions?: string[];
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "no-emails",
    icon: <Mail className="w-5 h-5" />,
    category: "Email Issues",
    question: "Why am I not seeing any emails in my inbox?",
    answer: "Several factors could prevent emails from loading properly.",
    solutions: [
      "1. Check if your email account is properly connected in Settings → Connected Accounts",
      "2. Verify your internet connection is active and stable",
      "3. Try disconnecting and reconnecting the email account",
      "4. Wait a few moments and refresh the page (F5)",
      "5. Check if the email provider (Gmail/Outlook) is experiencing any outages",
      "6. Ensure OAuth credentials haven't expired (reconnect the account if needed)",
    ],
  },
  {
    id: "auth-failed",
    icon: <Lock className="w-5 h-5" />,
    category: "Authentication",
    question: "I get 'authentication failed' or 'invalid credentials' error",
    answer: "This typically means the app cannot verify your email credentials.",
    solutions: [
      "1. For Gmail/Outlook: Use the OAuth button - it's more secure and handles credentials automatically",
      "2. For manual entry: Ensure email address is spelled correctly",
      "3. Password must be exact - check for caps lock or extra spaces",
      "4. For Gmail: Use an App Password (16 characters), not your regular password",
      "   → Go to Google Account Security → App passwords → Generate for Mail",
      "5. For Outlook: Same process - Generate an app password from Microsoft account",
      "6. Verify your account isn't locked or requires additional verification",
      "7. Try removing and re-adding the account",
    ],
  },
  {
    id: "oauth-redirect",
    icon: <Key className="w-5 h-5" />,
    category: "OAuth & Security",
    question: "OAuth login redirected me back but didn't connect the account",
    answer: "The OAuth flow started but wasn't completed successfully.",
    solutions: [
      "1. Check browser console for error messages (Ctrl+Shift+K)",
      "2. Ensure cookies are enabled in your browser",
      "3. Try in an incognito/private window (rules out browser extensions)",
      "4. Clear browser cache and cookies, then try again",
      "5. Make sure you granted all necessary permissions when prompted",
      "6. Check if your email provider requires additional verification",
      "7. Try a different browser or device",
    ],
  },
  {
    id: "network-error",
    icon: <Wifi className="w-5 h-5" />,
    category: "Connection Issues",
    question: "I see 'Network error' or 'Connection failed' messages",
    answer: "The app cannot reach the email servers to fetch your emails.",
    solutions: [
      "1. Check your internet connection - try loading Google.com",
      "2. Disable VPN/proxy if you're using one (some providers block these)",
      "3. Check firewall settings - ensure the app isn't blocked",
      "4. Restart your router",
      "5. Try on a different network (mobile hotspot) to isolate the issue",
      "6. Check if your email provider's servers are down (check their status page)",
      "7. Wait a few minutes and try again - could be temporary server issue",
    ],
  },
  {
    id: "server-error",
    icon: <Server className="w-5 h-5" />,
    category: "Server Issues",
    question: "I'm getting 'Server error' or 500 error messages",
    answer: "The application server encountered an unexpected problem.",
    solutions: [
      "1. This is usually temporary - wait a moment and refresh the page",
      "2. Check the ERROR_HANDLING_GUIDE.md for specific error codes",
      "3. Clear your browser cache (Ctrl+Shift+Delete)",
      "4. Try disconnecting and reconnecting your account",
      "5. Check browser console (Ctrl+Shift+K) for detailed error messages",
      "6. Report the error with your browser console output to support",
      "7. Try a different browser to rule out browser-specific issues",
    ],
  },
  {
    id: "slow-loading",
    icon: <AlertCircle className="w-5 h-5" />,
    category: "Performance",
    question: "Emails are loading very slowly or timing out",
    answer: "Large email accounts or network issues can cause slow performance.",
    solutions: [
      "1. Check your internet speed - use speedtest.net",
      "2. Reduce browser tabs/extensions - they consume system resources",
      "3. Close other applications using your internet",
      "4. Try filtering by a single email provider instead of 'All Emails'",
      "5. Wait longer - first load of large accounts takes time",
      "6. Disable browser extensions temporarily to test",
      "7. Try a different time - server load might be high",
    ],
  },
  {
    id: "token-expired",
    icon: <Shield className="w-5 h-5" />,
    category: "OAuth & Security",
    question: "I see 'Token expired' or need to re-authenticate",
    answer: "OAuth tokens have a limited lifetime for security. Periodic re-authentication is normal.",
    solutions: [
      "1. This is normal behavior for security - similar to auto-logout",
      "2. Go to Settings → Connected Accounts → Reconnect the account",
      "3. Remove the account and re-add it with OAuth (recommended)",
      "4. You'll be prompted to grant permissions again - this is secure",
      "5. After reconnecting, emails should load immediately",
      "6. Set a reminder to refresh accounts monthly for best security",
    ],
  },
  {
    id: "blank-screen",
    icon: <AlertCircle className="w-5 h-5" />,
    category: "User Interface",
    question: "I get a blank/white screen or page won't load",
    answer: "A JavaScript error or rendering issue is preventing the page from displaying.",
    solutions: [
      "1. Hard refresh page: Ctrl+Shift+R (or Cmd+Shift+R on Mac)",
      "2. Clear browser cache: Ctrl+Shift+Delete",
      "3. Check browser console: Ctrl+Shift+K - look for red error messages",
      "4. Disable browser extensions and try again",
      "5. Try in incognito mode: Ctrl+Shift+N",
      "6. Try a different browser",
      "7. Restart the application server if you're running locally",
    ],
  },
  {
    id: "wrong-emails",
    icon: <Mail className="w-5 h-5" />,
    category: "Email Issues",
    question: "I'm seeing emails from a different account or mixed emails",
    answer: "The app might be showing emails from a different provider than expected.",
    solutions: [
      "1. Check the sidebar - select the correct email provider",
      "2. Use 'All Emails' view to see combined inbox",
      "3. Verify in Settings that all connected accounts are correct",
      "4. If wrong account shows up: Settings → Remove it → Re-add the correct one",
      "5. Hard refresh the page to clear any cached data",
      "6. Check OAuth tokens haven't mixed up - reconnect the account",
      "7. Ensure you're checking the right email provider's filter",
    ],
  },
  {
    id: "add-account-fails",
    icon: <Plus className="w-5 h-5" />,
    category: "Account Management",
    question: "Adding a new email account keeps failing",
    answer: "The credentials aren't being accepted or validated correctly.",
    solutions: [
      "1. For Gmail/Outlook: Use OAuth buttons - they're more reliable than manual entry",
      "2. For manual entry: Ensure email and password are 100% correct",
      "3. Check for typos - especially in email domain",
      "4. Verify caps lock isn't accidentally on while typing password",
      "5. Make sure password hasn't recently changed",
      "6. For Gmail: You MUST use App Password, not your regular password",
      "7. Try removing and re-adding - fresh connection might help",
      "8. Wait 30 seconds between attempts to avoid rate limiting",
    ],
  },
  {
    id: "account-disconnected",
    icon: <Wifi className="w-5 h-5" />,
    category: "Connection Issues",
    question: "My account randomly disconnects or says 'not authenticated'",
    answer: "OAuth tokens expire or your internet connection was interrupted.",
    solutions: [
      "1. This is normal - OAuth tokens expire periodically for security",
      "2. Go to Settings and reconnect the account",
      "3. Check if you've been idle for extended periods - logout happens automatically",
      "4. Verify internet connection - disconnects can cause this",
      "5. Check firewall hasn't blocked the app",
      "6. Clear browser cookies and retry",
      "7. Update your browser to the latest version",
    ],
  },
  {
    id: "theme-issues",
    icon: <AlertCircle className="w-5 h-5" />,
    category: "User Interface",
    question: "Dark/light theme isn't saving or keeps resetting",
    answer: "Theme preference might not be persisting in browser storage.",
    solutions: [
      "1. Ensure browser allows localStorage - check privacy settings",
      "2. Check if you're in private/incognito mode - storage is temporary there",
      "3. Clear browser cache and cookies, then set theme again",
      "4. Check browser console (Ctrl+Shift+K) for storage errors",
      "5. Try different browser to rule out browser-specific issues",
      "6. Disable browser extensions that might affect storage",
    ],
  },
];

interface CategoryGroup {
  [key: string]: FAQItem[];
}

export default function TroubleshootingPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group FAQs by category
  const groupedFAQs = FAQ_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as CategoryGroup);

  const categories = Object.keys(groupedFAQs).sort();

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                Troubleshooting & FAQ
              </h1>
              <p className="text-sm text-muted-foreground">Solutions to common issues</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SecurityButton />
            <ThemeDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full">
        {/* Introduction */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <div className="flex gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Can't find your issue?</h2>
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                Check the ERROR_HANDLING_GUIDE.md in your project root for detailed error handling patterns. If you still need help, check our documentation or contact support.
              </p>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                  <Link to="/settings">Back to Settings</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ by Category */}
        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="text-lg font-semibold mb-4 text-foreground border-b border-border pb-3">
                {category}
              </h2>
              <div className="space-y-3">
                {groupedFAQs[category].map((item) => (
                  <div
                    key={item.id}
                    className="border border-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full flex items-start gap-4 p-4 text-left hover:bg-accent/30 transition-colors"
                    >
                      <div className="text-primary flex-shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{item.question}</h3>
                        {expandedId !== item.id && (
                          <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-muted-foreground">
                        {expandedId === item.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {expandedId === item.id && (
                      <div className="px-4 pb-4 pt-0 border-t border-border/50 bg-accent/20 dark:bg-accent/10">
                        <p className="text-sm text-muted-foreground mb-4">{item.answer}</p>
                        
                        {item.solutions && (
                          <div className="bg-background border border-border rounded-lg p-4">
                            <h4 className="font-semibold text-sm mb-3 text-foreground">Solutions:</h4>
                            <ol className="space-y-2">
                              {item.solutions.map((solution, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-muted-foreground leading-relaxed"
                                >
                                  {solution}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Common Error Codes */}
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold mb-4">Common Error Messages & Codes</h2>
          
          <div className="grid gap-4">
            <div className="border border-border rounded-lg p-4">
              <div className="font-mono text-sm font-semibold mb-2 text-red-600 dark:text-red-400">401 Unauthorized</div>
              <p className="text-sm text-muted-foreground">
                Your credentials are invalid or expired. Try re-authenticating with OAuth or updating your password.
              </p>
            </div>

            <div className="border border-border rounded-lg p-4">
              <div className="font-mono text-sm font-semibold mb-2 text-red-600 dark:text-red-400">403 Forbidden</div>
              <p className="text-sm text-muted-foreground">
                Access denied. You may need to grant additional permissions or your account lacks required access.
              </p>
            </div>

            <div className="border border-border rounded-lg p-4">
              <div className="font-mono text-sm font-semibold mb-2 text-red-600 dark:text-red-400">404 Not Found</div>
              <p className="text-sm text-muted-foreground">
                The email provider's server couldn't find what we requested. The account may have been deleted.
              </p>
            </div>

            <div className="border border-border rounded-lg p-4">
              <div className="font-mono text-sm font-semibold mb-2 text-red-600 dark:text-red-400">500 Internal Server Error</div>
              <p className="text-sm text-muted-foreground">
                Our server encountered an error. Refresh the page and try again. Contact support if it persists.
              </p>
            </div>

            <div className="border border-border rounded-lg p-4">
              <div className="font-mono text-sm font-semibold mb-2 text-orange-600 dark:text-orange-400">Network Error</div>
              <p className="text-sm text-muted-foreground">
                Cannot reach the server. Check your internet connection, firewall, or try disabling VPN.
              </p>
            </div>

            <div className="border border-border rounded-lg p-4">
              <div className="font-mono text-sm font-semibold mb-2 text-orange-600 dark:text-orange-400">timeout</div>
              <p className="text-sm text-muted-foreground">
                Request took too long. The server might be slow or your connection is unstable. Try again later.
              </p>
            </div>
          </div>
        </section>

        {/* Pro Tips */}
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold mb-4">Pro Tips for Best Results</h2>
          
          <div className="grid gap-3">
            <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-amber-600 dark:text-amber-400 flex-shrink-0">✓</div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Use OAuth</strong> - Gmail and Outlook OAuth are more secure than passwords. No need to store passwords!
              </p>
            </div>

            <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-amber-600 dark:text-amber-400 flex-shrink-0">✓</div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Browser Console</strong> - Press Ctrl+Shift+K to see detailed error messages that help debugging.
              </p>
            </div>

            <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-amber-600 dark:text-amber-400 flex-shrink-0">✓</div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>App Passwords</strong> - For Gmail: Enable 2FA and generate App Password. Never share your actual password.
              </p>
            </div>

            <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-amber-600 dark:text-amber-400 flex-shrink-0">✓</div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Incognito Mode</strong> - Try incognito/private mode (Ctrl+Shift+N) to rule out browser issues.
              </p>
            </div>

            <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-amber-600 dark:text-amber-400 flex-shrink-0">✓</div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Clear Cache</strong> - Periodically clear browser cache (Ctrl+Shift+Delete) to prevent stale data issues.
              </p>
            </div>

            <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-amber-600 dark:text-amber-400 flex-shrink-0">✓</div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Keep Updated</strong> - Ensure your browser is always updated for security and compatibility.
              </p>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-muted-foreground mb-4">
            Still having issues? Check the project documentation or contact support.
          </p>
          <Button asChild>
            <Link to="/settings">Back to Settings</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
