import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { TabConfig } from "../types";

interface TabsShellProps<T extends string> {
  tabs: TabConfig<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  isLoading: boolean;
  children: ReactNode;
}

export default function TabsShell<T extends string>({ tabs, activeTab, onTabChange, isLoading, children }: TabsShellProps<T>) {
  const currentTab = tabs.find((tab) => tab.key === activeTab);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-dark">Zubehör</p>
          <h2 className="text-xl font-semibold text-gray-900">{currentTab?.label ?? ""}</h2>
          <p className="text-sm text-gray-500">{currentTab?.description ?? ""}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition hover:bg-primary/10 ${
                tab.key === activeTab ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {isLoading && (
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lädt
            </span>
          )}
        </div>
      </div>

      <div>{children}</div>
    </section>
  );
}
