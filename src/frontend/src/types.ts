export type FormationSlot = {
  id: string;
  label: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
};

export type PlacedPlayer = {
  playerId: string; // bigint as string
  x: number;
  y: number;
  slotLabel: string;
};

export type LineupEntry = PlacedPlayer;

export const FORMATION_SLOTS: Record<string, FormationSlot[]> = {
  "4-4-2": [
    { id: "gk", label: "GK", x: 50, y: 88 },
    { id: "rb", label: "RB", x: 78, y: 73 },
    { id: "rcb", label: "CB", x: 61, y: 73 },
    { id: "lcb", label: "CB", x: 39, y: 73 },
    { id: "lb", label: "LB", x: 22, y: 73 },
    { id: "rm", label: "RM", x: 82, y: 50 },
    { id: "rcm", label: "CM", x: 61, y: 50 },
    { id: "lcm", label: "CM", x: 39, y: 50 },
    { id: "lm", label: "LM", x: 18, y: 50 },
    { id: "rst", label: "ST", x: 62, y: 24 },
    { id: "lst", label: "ST", x: 38, y: 24 },
  ],
  "4-3-3": [
    { id: "gk", label: "GK", x: 50, y: 88 },
    { id: "rb", label: "RB", x: 78, y: 73 },
    { id: "rcb", label: "CB", x: 61, y: 73 },
    { id: "lcb", label: "CB", x: 39, y: 73 },
    { id: "lb", label: "LB", x: 22, y: 73 },
    { id: "rcm", label: "CM", x: 70, y: 51 },
    { id: "cm", label: "CM", x: 50, y: 53 },
    { id: "lcm", label: "CM", x: 30, y: 51 },
    { id: "rw", label: "RW", x: 80, y: 22 },
    { id: "st", label: "ST", x: 50, y: 18 },
    { id: "lw", label: "LW", x: 20, y: 22 },
  ],
  "3-5-2": [
    { id: "gk", label: "GK", x: 50, y: 88 },
    { id: "rcb", label: "CB", x: 72, y: 70 },
    { id: "cb", label: "CB", x: 50, y: 72 },
    { id: "lcb", label: "CB", x: 28, y: 70 },
    { id: "rm", label: "RM", x: 88, y: 48 },
    { id: "rcm", label: "CM", x: 67, y: 50 },
    { id: "cm", label: "CM", x: 50, y: 52 },
    { id: "lcm", label: "CM", x: 33, y: 50 },
    { id: "lm", label: "LM", x: 12, y: 48 },
    { id: "rst", label: "ST", x: 63, y: 22 },
    { id: "lst", label: "ST", x: 37, y: 22 },
  ],
  "4-5-1": [
    { id: "gk", label: "GK", x: 50, y: 88 },
    { id: "rb", label: "RB", x: 78, y: 73 },
    { id: "rcb", label: "CB", x: 61, y: 73 },
    { id: "lcb", label: "CB", x: 39, y: 73 },
    { id: "lb", label: "LB", x: 22, y: 73 },
    { id: "rm", label: "RM", x: 88, y: 52 },
    { id: "rcm", label: "CM", x: 67, y: 54 },
    { id: "cm", label: "CM", x: 50, y: 56 },
    { id: "lcm", label: "CM", x: 33, y: 54 },
    { id: "lm", label: "LM", x: 12, y: 52 },
    { id: "st", label: "ST", x: 50, y: 16 },
  ],
  Custom: [
    { id: "gk", label: "GK", x: 50, y: 88 },
    { id: "p2", label: "DEF", x: 25, y: 72 },
    { id: "p3", label: "DEF", x: 50, y: 72 },
    { id: "p4", label: "DEF", x: 75, y: 72 },
    { id: "p5", label: "MID", x: 20, y: 52 },
    { id: "p6", label: "MID", x: 40, y: 52 },
    { id: "p7", label: "MID", x: 60, y: 52 },
    { id: "p8", label: "MID", x: 80, y: 52 },
    { id: "p9", label: "FWD", x: 30, y: 26 },
    { id: "p10", label: "FWD", x: 50, y: 22 },
    { id: "p11", label: "FWD", x: 70, y: 26 },
  ],
};

export const FORMATIONS = ["4-4-2", "4-3-3", "3-5-2", "4-5-1", "Custom"];

export const ALL_POSITIONS = [
  "GK",
  "RB",
  "CB",
  "LB",
  "CDM",
  "CM",
  "CAM",
  "RM",
  "LM",
  "RW",
  "LW",
  "ST",
  "CF",
];
