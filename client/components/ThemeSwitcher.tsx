import { useTheme, type Theme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themeConfig: {
  value: Theme;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "light",
    label: "Light",
    icon: "☀️",
    description: "Clean and bright",
  },
  {
    value: "dark",
    label: "Dark",
    icon: "🌙",
    description: "Easy on the eyes",
  },
  {
    value: "warm",
    label: "Warm",
    icon: "🔥",
    description: "Orange and gold",
  },
  {
    value: "cold",
    label: "Cold",
    icon: "❄️",
    description: "Blue and cyan",
  },
  {
    value: "tender-pink",
    label: "Tender Pink",
    icon: "🌸",
    description: "Soft and sweet",
  },
];

interface ThemeSwitcherProps {
  variant?: "compact" | "full";
  className?: string;
}

export function ThemeSwitcher({
  variant = "compact",
  className = "",
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  if (variant === "compact") {
    return (
      <div className={cn("flex gap-2", className)}>
        {themeConfig.map((config) => (
          <button
            key={config.value}
            onClick={() => setTheme(config.value)}
            className={cn(
              "w-10 h-10 rounded-lg font-semibold transition-all flex items-center justify-center text-lg hover:scale-110",
              theme === config.value
                ? "ring-2 ring-offset-2 ring-offset-background"
                : "opacity-60 hover:opacity-100"
            )}
            title={config.description}
          >
            {config.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-semibold text-foreground">Themes</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
        {themeConfig.map((config) => (
          <button
            key={config.value}
            onClick={() => setTheme(config.value)}
            className={cn(
              "p-3 rounded-lg border-2 transition-all text-center",
              theme === config.value
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="text-2xl mb-2">{config.icon}</div>
            <div className="text-sm font-medium text-foreground">
              {config.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {config.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
