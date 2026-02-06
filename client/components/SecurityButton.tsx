import { useSecurityMode } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

export function SecurityButton() {
  const { isSecurityModeActive, toggleSecurityMode } = useSecurityMode();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleSecurityMode}
      title="Toggle security mode - hides content from view"
      className={`gap-2 ${isSecurityModeActive ? "ring-2 ring-green-500" : ""}`}
    >
      <Lightbulb
        className={`w-4 h-4 transition-all ${
          isSecurityModeActive
            ? "fill-green-500 text-green-500 animate-pulse"
            : "text-yellow-500"
        }`}
      />
      <span className="hidden sm:inline text-xs">Secure</span>
    </Button>
  );
}
