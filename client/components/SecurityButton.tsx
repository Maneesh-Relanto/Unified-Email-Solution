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
      className={`${isSecurityModeActive ? "ring-2 ring-yellow-500" : ""}`}
    >
      <Lightbulb
        className={`w-4 h-4 transition-all ${
          isSecurityModeActive
            ? "fill-yellow-400 text-yellow-400 animate-pulse"
            : "text-yellow-500"
        }`}
      />
    </Button>
  );
}
