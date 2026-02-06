import { useTheme, type Theme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
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

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme();

  const currentTheme = themeConfig.find((t) => t.value === theme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Change theme"
        >
          <Palette className="w-4 h-4" />
          <span className="text-sm">{currentTheme?.icon}</span>
          <span className="hidden sm:inline text-xs">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          {themeConfig.map((config) => (
            <DropdownMenuRadioItem
              key={config.value}
              value={config.value}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-lg">{config.icon}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{config.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {config.description}
                  </span>
                </div>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
