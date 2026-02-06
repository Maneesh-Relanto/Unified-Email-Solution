import { useSecurityMode } from "@/hooks/use-security";
import { Lock } from "lucide-react";

export function SecurityOverlay() {
  const { isSecurityModeActive, toggleSecurityMode } = useSecurityMode();

  if (!isSecurityModeActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center cursor-pointer" onClick={toggleSecurityMode}>
      {/* Click to disable prompt */}
      <div className="text-center space-y-6">
        <Lock className="w-16 h-16 text-green-400 mx-auto animate-pulse" />
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Security Mode Active</h2>
          <p className="text-gray-400 text-sm mb-4">Content is hidden from view</p>
          <p className="text-gray-500 text-xs">Click anywhere to disable</p>
        </div>
      </div>
    </div>
  );
}
