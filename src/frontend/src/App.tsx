import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Layout, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import LineupTab from "./components/LineupTab";
import MatchesTab from "./components/MatchesTab";
import PlayersTab from "./components/PlayersTab";
import { useActor } from "./hooks/useActor";
import { useGetPlayers } from "./hooks/useQueries";

type Tab = "players" | "matches" | "lineup";

const SEED_PLAYERS = [
  {
    name: "Alex Morgan",
    jerseyNumber: 1,
    positions: ["GK"],
    notes: "First choice keeper",
  },
  { name: "Sam Wilson", jerseyNumber: 2, positions: ["RB"], notes: "" },
  { name: "Chris Davis", jerseyNumber: 5, positions: ["CB"], notes: "Captain" },
  { name: "Jordan Lee", jerseyNumber: 6, positions: ["CB"], notes: "" },
  { name: "Marcus Johnson", jerseyNumber: 3, positions: ["LB"], notes: "" },
  {
    name: "Tyler Brown",
    jerseyNumber: 8,
    positions: ["CM"],
    notes: "Engine of the team",
  },
  { name: "Ryan Garcia", jerseyNumber: 4, positions: ["CDM"], notes: "" },
  {
    name: "Jamie Smith",
    jerseyNumber: 10,
    positions: ["CAM"],
    notes: "Playmaker",
  },
  { name: "Lucas White", jerseyNumber: 7, positions: ["RM", "RW"], notes: "" },
  {
    name: "Ethan Taylor",
    jerseyNumber: 11,
    positions: ["LM", "LW"],
    notes: "",
  },
  {
    name: "Oliver Martinez",
    jerseyNumber: 9,
    positions: ["ST"],
    notes: "Top scorer",
  },
  { name: "Liam Anderson", jerseyNumber: 17, positions: ["RW"], notes: "" },
  { name: "Noah Thompson", jerseyNumber: 16, positions: ["LW"], notes: "" },
  {
    name: "Mason Harris",
    jerseyNumber: 19,
    positions: ["CF", "ST"],
    notes: "",
  },
  {
    name: "Aiden Clark",
    jerseyNumber: 12,
    positions: ["GK"],
    notes: "Backup keeper",
  },
  {
    name: "James Robinson",
    jerseyNumber: 14,
    positions: ["CB", "CDM"],
    notes: "",
  },
];

function useSeedData() {
  const { actor } = useActor();
  const { data: players } = useGetPlayers();
  const qc = useQueryClient();

  useEffect(() => {
    if (!actor || players === undefined || players.length > 0) return;
    const seed = async () => {
      await Promise.all(
        SEED_PLAYERS.map((p) =>
          actor.addPlayer(p.name, BigInt(p.jerseyNumber), p.positions, p.notes),
        ),
      );
      qc.invalidateQueries({ queryKey: ["players"] });
    };
    seed();
  }, [actor, players, qc]);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("lineup");
  useSeedData();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "players", label: "Players", icon: <Users size={18} /> },
    { id: "matches", label: "Matches", icon: <Calendar size={18} /> },
    { id: "lineup", label: "Lineup", icon: <Layout size={18} /> },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, oklch(0.15 0.05 240) 0%, oklch(0.10 0.03 240) 100%)",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-border"
        style={{
          background: "oklch(0.14 0.04 240 / 0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.1 75), oklch(0.62 0.1 75))",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="oklch(0.12 0.03 240)"
                  strokeWidth="1.5"
                />
                <path
                  d="M12 2 L14 8 L20 8 L15.5 12 L17.5 18 L12 14 L6.5 18 L8.5 12 L4 8 L10 8 Z"
                  fill="oklch(0.12 0.03 240)"
                />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-wide text-foreground hidden sm:block">
              SQUAD<span style={{ color: "oklch(0.73 0.1 75)" }}>FC</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                data-ocid={`nav.${tab.id}.link`}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  color:
                    activeTab === tab.id
                      ? "oklch(0.73 0.1 75)"
                      : "oklch(0.68 0.03 240)",
                }}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: "oklch(0.73 0.1 75)" }}
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="w-20 hidden sm:block" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "players" && <PlayersTab />}
            {activeTab === "matches" && <MatchesTab />}
            {activeTab === "lineup" && <LineupTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer
        className="text-center py-3 text-xs"
        style={{ color: "oklch(0.45 0.03 240)" }}
      >
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gold transition-colors"
        >
          caffeine.ai
        </a>
      </footer>

      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.17 0.04 240)",
            border: "1px solid oklch(0.25 0.04 240)",
            color: "oklch(0.94 0.01 240)",
          },
        }}
      />
    </div>
  );
}
