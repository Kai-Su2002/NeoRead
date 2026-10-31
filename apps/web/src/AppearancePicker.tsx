import type { ReaderTheme } from "@neoread/core";
import { Tabs, TabsList, TabsTrigger } from "@neoread/ui/components/tabs";
import {
  appearanceChoice,
  appearanceChoices,
  chooseAppearance,
  type AppearanceChoice,
} from "./appearance";

/** Shared shadcn tabs for settings and reader popovers. */
function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
    >
      <TabsList className="w-full" aria-label={label}>
        {options.map(([option, text]) => (
          <TabsTrigger key={option} value={option}>
            {text}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** The five appearances; following the system asks which light and dark palettes to use. */
export function AppearancePicker({
  theme,
  setTheme,
}: {
  theme: ReaderTheme;
  setTheme: (patch: Partial<ReaderTheme>) => void;
}) {
  const choice = appearanceChoice(theme);
  return (
    <div className="space-y-3">
      <Choices<AppearanceChoice>
        label="配色"
        value={choice}
        options={appearanceChoices}
        onChange={(value) => setTheme(chooseAppearance(value))}
      />
      {choice === "system" && (
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
          <span className="text-sm text-muted-foreground">系统浅色时</span>
          <Choices
            label="系统浅色时的配色"
            value={theme.systemLightMode ?? "light"}
            options={[
              ["light", "浅色"],
              ["sepia", "纸张"],
            ]}
            onChange={(systemLightMode) => setTheme({ systemLightMode })}
          />
          <span className="text-sm text-muted-foreground">系统深色时</span>
          <Choices
            label="系统深色时的配色"
            value={theme.systemDarkContrast ?? "soft"}
            options={[
              ["soft", "石墨"],
              ["high", "纯黑"],
            ]}
            onChange={(systemDarkContrast) => setTheme({ systemDarkContrast })}
          />
        </div>
      )}
    </div>
  );
}
