import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { MatchId, Player, TemplateId } from "../backend";
import {
  useAddFormationTemplate,
  useDeleteFormationTemplate,
  useGetFormationTemplates,
  useGetMatchAvailability,
  useGetMatches,
  useGetPlayers,
  useUpdateFormationTemplate,
} from "../hooks/useQueries";
import { FORMATIONS, FORMATION_SLOTS, type PlacedPlayer } from "../types";

// ─── Name helper ────────────────────────────────────────────────────────────
function splitName(fullName: string) {
  const parts = fullName.trim().split(" ");
  const first = parts[0] ?? "";
  const lastInitial =
    parts.length > 1 ? `${parts[parts.length - 1][0] ?? ""}.` : "";
  return { first, lastInitial };
}

// ─── Types ───────────────────────────────────────────────────────────────────
type PitchDragState = {
  playerId: string;
  startClientX: number;
  startClientY: number;
  origX: number;
  origY: number;
} | null;

type ListDragState = {
  playerId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
} | null;

const PITCH_BANDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

// ─── Main component ──────────────────────────────────────────────────────────
export default function LineupTab() {
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const { data: matches } = useGetMatches();
  const { data: templates } = useGetFormationTemplates();
  const addTemplate = useAddFormationTemplate();
  const updateTemplate = useUpdateFormationTemplate();
  const deleteTemplate = useDeleteFormationTemplate();

  const [formation, setFormation] = useState("4-4-2");
  const [matchContextId, setMatchContextId] = useState<string>("none");
  const [placedPlayers, setPlacedPlayers] = useState<PlacedPlayer[]>([]);
  const [benchPlayerIds, setBenchPlayerIds] = useState<string[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<TemplateId | null>(
    null,
  );

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<TemplateId | null>(
    null,
  );
  const [templateName, setTemplateName] = useState("");

  // Drag ghost state for list→pitch drag
  const [ghostState, setGhostState] = useState<{
    x: number;
    y: number;
    player: Player;
  } | null>(null);

  const pitchRef = useRef<HTMLDivElement>(null);
  const pitchDragState = useRef<PitchDragState>(null);
  const wasPitchDragging = useRef(false);
  const listDragState = useRef<ListDragState>(null);

  // ── Match/availability filters ────────────────────────────────────────────
  const matchId: MatchId | null =
    matchContextId !== "none" ? BigInt(matchContextId) : null;
  const { data: availabilityIds } = useGetMatchAvailability(matchId);

  const availablePlayerIds = new Set(
    matchId !== null && availabilityIds !== undefined
      ? availabilityIds.map((id) => id.toString())
      : (players || []).map((p) => p.id.toString()),
  );

  const availablePlayers = (players || []).filter((p) =>
    availablePlayerIds.has(p.id.toString()),
  );

  const placedIds = new Set(placedPlayers.map((p) => p.playerId));
  const benchIds = new Set(benchPlayerIds);

  const unassignedPlayers = availablePlayers.filter(
    (p) => !placedIds.has(p.id.toString()) && !benchIds.has(p.id.toString()),
  );

  // ── Formation init ────────────────────────────────────────────────────────
  const applyFormation = useCallback((newFormation: string) => {
    const slots = FORMATION_SLOTS[newFormation] ?? FORMATION_SLOTS["4-4-2"];
    setPlacedPlayers((prev) =>
      slots.map((slot, i) => ({
        playerId: prev[i]?.playerId ?? "",
        x: slot.x,
        y: slot.y,
        slotLabel: slot.label,
      })),
    );
  }, []);

  useEffect(() => {
    if (placedPlayers.length === 0) {
      const slots = FORMATION_SLOTS[formation];
      setPlacedPlayers(
        slots.map((slot) => ({
          playerId: "",
          x: slot.x,
          y: slot.y,
          slotLabel: slot.label,
        })),
      );
    }
  }, [formation, placedPlayers.length]);

  const handleFormationChange = (f: string) => {
    setFormation(f);
    applyFormation(f);
  };

  // ── Pitch click (tap-to-place fallback) ───────────────────────────────────
  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (wasPitchDragging.current) {
      wasPitchDragging.current = false;
      return;
    }
    if (pitchDragState.current) return;
    if (!selectedPlayerId) return;
    const target = e.target as HTMLElement;
    if (target.closest(".player-marker")) return;

    const rect = pitchRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    placePlayerAtPitchCoords(selectedPlayerId, x, y);
    setSelectedPlayerId(null);
  };

  // ── Shared place-at-coords logic ─────────────────────────────────────────
  const placePlayerAtPitchCoords = (pid: string, x: number, y: number) => {
    let closestEmptySlot: number | null = null;
    let closestDist = 15; // 15% snap radius
    placedPlayers.forEach((slot, i) => {
      if (slot.playerId === "") {
        const dx = slot.x - x;
        const dy = slot.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closestEmptySlot = i;
        }
      }
    });

    if (closestEmptySlot !== null) {
      setPlacedPlayers((prev) => {
        const updated = [...prev];
        updated[closestEmptySlot!] = {
          ...updated[closestEmptySlot!],
          playerId: pid,
        };
        return updated;
      });
    } else {
      const player = availablePlayers.find((p) => p.id.toString() === pid);
      if (!player) return;
      setPlacedPlayers((prev) => [
        ...prev,
        {
          playerId: pid,
          x: Math.max(5, Math.min(95, x)),
          y: Math.max(5, Math.min(95, y)),
          slotLabel: player.positions[0] ?? "MID",
        },
      ]);
    }
  };

  // ── Pitch marker drag (reposition existing player) ────────────────────────
  const handleMarkerPointerDown = (e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    const slot = placedPlayers[idx];
    if (!slot || slot.playerId === "") return;
    pitchRef.current?.setPointerCapture(e.pointerId);
    pitchDragState.current = {
      playerId: slot.playerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: slot.x,
      origY: slot.y,
    };
  };

  const handlePitchPointerMove = (e: React.PointerEvent) => {
    if (!pitchDragState.current) return;
    const pitch = pitchRef.current;
    if (!pitch) return;
    const rect = pitch.getBoundingClientRect();
    const idx = placedPlayers.findIndex(
      (p) => p.playerId === pitchDragState.current!.playerId,
    );
    if (idx === -1) return;
    const dx =
      ((e.clientX - pitchDragState.current.startClientX) / rect.width) * 100;
    const dy =
      ((e.clientY - pitchDragState.current.startClientY) / rect.height) * 100;
    const newX = Math.max(4, Math.min(96, pitchDragState.current.origX + dx));
    const newY = Math.max(4, Math.min(96, pitchDragState.current.origY + dy));
    setPlacedPlayers((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], x: newX, y: newY };
      return updated;
    });
  };

  const handlePitchPointerUp = () => {
    if (pitchDragState.current) {
      wasPitchDragging.current = true;
      pitchDragState.current = null;
    }
  };

  // ── List drag: drag from squad list onto pitch ────────────────────────────
  const handleListPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    player: Player,
  ) => {
    // Only primary pointer (not right-click)
    if (e.button !== 0 && e.button !== undefined) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    listDragState.current = {
      playerId: player.id.toString(),
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: false,
    };
  };

  const handleListPointerMove = (
    e: React.PointerEvent<HTMLElement>,
    player: Player,
  ) => {
    if (
      !listDragState.current ||
      listDragState.current.playerId !== player.id.toString()
    )
      return;
    const dx = e.clientX - listDragState.current.startX;
    const dy = e.clientY - listDragState.current.startY;
    if (!listDragState.current.isDragging && Math.sqrt(dx * dx + dy * dy) > 5) {
      listDragState.current.isDragging = true;
    }
    if (listDragState.current.isDragging) {
      listDragState.current.currentX = e.clientX;
      listDragState.current.currentY = e.clientY;
      setGhostState({
        x: e.clientX,
        y: e.clientY,
        player,
      });
    }
  };

  const handleListPointerUp = (
    e: React.PointerEvent<HTMLElement>,
    player: Player,
  ) => {
    const state = listDragState.current;
    if (!state || state.playerId !== player.id.toString()) return;

    const wasDragging = state.isDragging;
    listDragState.current = null;
    setGhostState(null);

    if (wasDragging) {
      // Check if pointer is over the pitch
      const pitch = pitchRef.current;
      if (pitch) {
        const rect = pitch.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          placePlayerAtPitchCoords(player.id.toString(), x, y);
          return;
        }
      }
    } else {
      // Tap: toggle select
      setSelectedPlayerId((prev) =>
        prev === player.id.toString() ? null : player.id.toString(),
      );
    }
  };

  // ── Pitch actions ─────────────────────────────────────────────────────────
  const removePlayerFromPitch = (idx: number) => {
    setPlacedPlayers((prev) => {
      const updated = [...prev];
      const slot = FORMATION_SLOTS[formation]?.[idx];
      if (slot) {
        updated[idx] = { ...updated[idx], playerId: "" };
      } else {
        updated.splice(idx, 1);
      }
      return updated;
    });
  };

  const movePlayerToBench = (playerId: string) => {
    setPlacedPlayers((prev) =>
      prev.map((p) => (p.playerId === playerId ? { ...p, playerId: "" } : p)),
    );
    setBenchPlayerIds((prev) => [...prev, playerId]);
  };

  const movePlayerToUnassigned = (playerId: string) => {
    setBenchPlayerIds((prev) => prev.filter((id) => id !== playerId));
  };

  const addPlayerToBench = (playerId: string) => {
    setSelectedPlayerId(null);
    setBenchPlayerIds((prev) => [...prev, playerId]);
  };

  // ── Template save/load/delete ─────────────────────────────────────────────
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    const lineupDataJson = JSON.stringify(
      placedPlayers.filter((p) => p.playerId !== ""),
    );
    const benchBigInts = benchPlayerIds.map((id) => BigInt(id));
    try {
      if (currentTemplateId) {
        await updateTemplate.mutateAsync({
          id: currentTemplateId,
          name: templateName,
          formation,
          lineupDataJson,
          benchPlayers: benchBigInts,
        });
        toast.success("Template updated");
      } else {
        const newId = await addTemplate.mutateAsync({
          name: templateName,
          formation,
          lineupDataJson,
          benchPlayers: benchBigInts,
        });
        setCurrentTemplateId(newId);
        toast.success("Template saved");
      }
      setSaveDialogOpen(false);
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleLoadTemplate = (t: {
    id: TemplateId;
    formation: string;
    lineupDataJson: string;
    benchPlayers: bigint[];
    name: string;
  }) => {
    setFormation(t.formation);
    try {
      const entries: PlacedPlayer[] = JSON.parse(t.lineupDataJson);
      const slots = FORMATION_SLOTS[t.formation] ?? FORMATION_SLOTS["4-4-2"];
      const slotsCopy = slots.map((s) => ({
        playerId: "",
        x: s.x,
        y: s.y,
        slotLabel: s.label,
      }));
      for (const entry of entries) {
        let placed = false;
        for (let i = 0; i < slotsCopy.length; i++) {
          if (slotsCopy[i].playerId === "") {
            const dx = slotsCopy[i].x - entry.x;
            const dy = slotsCopy[i].y - entry.y;
            if (Math.sqrt(dx * dx + dy * dy) < 5) {
              slotsCopy[i] = {
                ...slotsCopy[i],
                playerId: entry.playerId,
                x: entry.x,
                y: entry.y,
              };
              placed = true;
              break;
            }
          }
        }
        if (!placed) {
          slotsCopy.push({
            playerId: entry.playerId,
            x: entry.x,
            y: entry.y,
            slotLabel: entry.slotLabel,
          });
        }
      }
      setPlacedPlayers(slotsCopy);
      setBenchPlayerIds(t.benchPlayers.map((id) => id.toString()));
      setCurrentTemplateId(t.id);
      setTemplateName(t.name);
      setLoadDialogOpen(false);
      toast.success(`Loaded "${t.name}"`);
    } catch {
      toast.error("Failed to load template");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    try {
      await deleteTemplate.mutateAsync(deleteTemplateId);
      if (currentTemplateId === deleteTemplateId) setCurrentTemplateId(null);
      toast.success("Template deleted");
      setDeleteTemplateId(null);
    } catch {
      toast.error("Failed to delete template");
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (playersLoading) {
    return (
      <div className="space-y-3" data-ocid="lineup.loading_state">
        <Skeleton
          className="h-10 rounded-xl"
          style={{ background: "oklch(0.20 0.04 240)" }}
        />
        <Skeleton
          className="w-full rounded-xl"
          style={{ background: "oklch(0.20 0.04 240)", aspectRatio: "2/3" }}
        />
      </div>
    );
  }

  const benchPlayers = availablePlayers.filter((p) =>
    benchIds.has(p.id.toString()),
  );

  return (
    <div>
      {/* Drag ghost portal */}
      {ghostState &&
        createPortal(
          <DragGhost
            x={ghostState.x}
            y={ghostState.y}
            player={ghostState.player}
          />,
          document.body,
        )}

      {/* Top controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">Lineup Builder</h1>
        </div>

        <Select value={matchContextId} onValueChange={setMatchContextId}>
          <SelectTrigger
            data-ocid="lineup.match.select"
            className="w-[160px] text-sm"
            style={{
              background: "oklch(0.17 0.04 240)",
              border: "1px solid oklch(0.25 0.04 240)",
            }}
          >
            <SelectValue placeholder="All players" />
          </SelectTrigger>
          <SelectContent
            style={{
              background: "oklch(0.17 0.04 240)",
              border: "1px solid oklch(0.25 0.04 240)",
            }}
          >
            <SelectItem value="none">All players</SelectItem>
            {(matches || []).map((m) => (
              <SelectItem key={m.id.toString()} value={m.id.toString()}>
                vs {m.opponent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          data-ocid="lineup.open_modal_button"
          size="sm"
          variant="ghost"
          onClick={() => setLoadDialogOpen(true)}
          style={{ color: "oklch(0.68 0.03 240)" }}
        >
          <FolderOpen size={15} className="mr-1.5" />
          Load
        </Button>
        <Button
          data-ocid="lineup.save_button"
          size="sm"
          onClick={() => {
            if (!templateName) {
              setTemplateName(
                currentTemplateId
                  ? (templates?.find((t) => t.id === currentTemplateId)?.name ??
                      "")
                  : "",
              );
            }
            setSaveDialogOpen(true);
          }}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.78 0.1 75), oklch(0.62 0.1 75))",
            color: "oklch(0.12 0.03 240)",
          }}
          className="font-semibold"
        >
          <Save size={15} className="mr-1.5" />
          Save
        </Button>
      </div>

      {/* Formation selector */}
      <div
        className="flex items-center gap-1 mb-4 overflow-x-auto pb-1"
        data-ocid="lineup.formation.tab"
      >
        {FORMATIONS.map((f) => (
          <button
            key={f}
            type="button"
            data-ocid="lineup.formation.tab"
            onClick={() => handleFormationChange(f)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background:
                formation === f ? "oklch(0.73 0.1 75)" : "oklch(0.20 0.04 240)",
              color:
                formation === f
                  ? "oklch(0.12 0.03 240)"
                  : "oklch(0.68 0.03 240)",
              border:
                formation === f ? "none" : "1px solid oklch(0.27 0.04 240)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Main layout: pitch + squad list */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Pitch */}
        <div className="flex-shrink-0 w-full lg:w-[320px]">
          <div
            ref={pitchRef}
            data-ocid="lineup.canvas_target"
            className="relative pitch-container rounded-xl overflow-hidden cursor-crosshair"
            style={{ aspectRatio: "2/3" }}
            onClick={handlePitchClick}
            onPointerMove={handlePitchPointerMove}
            onPointerUp={handlePitchPointerUp}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                handlePitchClick(
                  e as unknown as React.MouseEvent<HTMLDivElement>,
                );
            }}
          >
            {/* SVG Pitch markings */}
            <svg
              viewBox="0 0 100 150"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {PITCH_BANDS.map((i) => (
                <rect
                  key={`band-${i}`}
                  x="0"
                  y={i * 18.75}
                  width="100"
                  height="18.75"
                  className={
                    i % 2 === 0 ? "grass-band-light" : "grass-band-dark"
                  }
                />
              ))}
              <rect
                x="3"
                y="3"
                width="94"
                height="144"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="0.7"
                rx="0.5"
              />
              <line
                x1="3"
                y1="75"
                x2="97"
                y2="75"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="0.5"
              />
              <circle
                cx="50"
                cy="75"
                r="13"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="0.5"
              />
              <circle cx="50" cy="75" r="1" fill="rgba(255,255,255,0.8)" />
              <rect
                x="24"
                y="3"
                width="52"
                height="24"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <rect
                x="36"
                y="3"
                width="28"
                height="10"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <rect
                x="41"
                y="1"
                width="18"
                height="3"
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="0.5"
              />
              <circle cx="50" cy="19" r="0.8" fill="rgba(255,255,255,0.7)" />
              <path
                d="M 38 27 A 13 13 0 0 1 62 27"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <rect
                x="24"
                y="123"
                width="52"
                height="24"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <rect
                x="36"
                y="137"
                width="28"
                height="10"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <rect
                x="41"
                y="146"
                width="18"
                height="3"
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="0.5"
              />
              <circle cx="50" cy="131" r="0.8" fill="rgba(255,255,255,0.7)" />
              <path
                d="M 38 123 A 13 13 0 0 0 62 123"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <path
                d="M 3 8 A 5 5 0 0 1 8 3"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <path
                d="M 92 3 A 5 5 0 0 1 97 8"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <path
                d="M 3 142 A 5 5 0 0 0 8 147"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
              <path
                d="M 97 142 A 5 5 0 0 1 92 147"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.5"
              />
            </svg>

            {/* Player markers */}
            {placedPlayers.map((slot, idx) => {
              const player = slot.playerId
                ? players?.find((p) => p.id.toString() === slot.playerId)
                : null;
              return (
                <div
                  key={`slot-${idx}-${slot.playerId}`}
                  className="player-marker absolute"
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex:
                      pitchDragState.current?.playerId === slot.playerId
                        ? 20
                        : 10,
                  }}
                  onPointerDown={(e) => handleMarkerPointerDown(e, idx)}
                >
                  {player ? (
                    <FilledMarker
                      player={player}
                      onRemove={(e) => {
                        e.stopPropagation();
                        removePlayerFromPitch(idx);
                      }}
                      onBench={(e) => {
                        e.stopPropagation();
                        movePlayerToBench(player.id.toString());
                      }}
                    />
                  ) : (
                    <EmptySlot
                      label={slot.slotLabel}
                      isTarget={
                        selectedPlayerId !== null || ghostState !== null
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bench */}
          {benchPlayers.length > 0 && (
            <div
              className="mt-3 p-3 rounded-xl border border-border"
              style={{ background: "oklch(0.15 0.035 240)" }}
              data-ocid="lineup.bench.panel"
            >
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: "oklch(0.68 0.03 240)" }}
              >
                BENCH ({benchPlayers.length})
              </p>
              <div className="flex gap-2 flex-wrap">
                {benchPlayers.map((player, idx) => {
                  const { first, lastInitial } = splitName(player.name);
                  return (
                    <button
                      key={player.id.toString()}
                      type="button"
                      data-ocid={`lineup.bench.item.${idx + 1}`}
                      onClick={() =>
                        movePlayerToUnassigned(player.id.toString())
                      }
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{
                        background: "oklch(0.20 0.04 240)",
                        border: "1px solid oklch(0.27 0.04 240)",
                      }}
                      title="Remove from bench"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: "oklch(0.73 0.1 75)",
                          color: "oklch(0.12 0.03 240)",
                        }}
                      >
                        {player.jerseyNumber.toString()}
                      </div>
                      <span className="text-xs text-foreground font-medium">
                        {first}
                        {lastInitial ? ` ${lastInitial}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Squad list sidebar */}
        <div className="flex-1 min-w-0">
          {/* Selected player hint */}
          {selectedPlayerId && (
            <div
              className="mb-3 px-3 py-2 rounded-lg flex items-center gap-2"
              style={{
                background: "oklch(0.73 0.1 75 / 0.1)",
                border: "1px solid oklch(0.73 0.1 75 / 0.4)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "oklch(0.73 0.1 75)" }}
              />
              <span
                className="text-sm font-medium flex-1"
                style={{ color: "oklch(0.73 0.1 75)" }}
              >
                {
                  splitName(
                    players?.find((p) => p.id.toString() === selectedPlayerId)
                      ?.name ?? "",
                  ).first
                }{" "}
                &mdash; tap pitch to place
              </span>
              <button
                type="button"
                onClick={() => setSelectedPlayerId(null)}
                style={{ color: "oklch(0.68 0.03 240)" }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div
            className="rounded-xl border border-border p-3"
            style={{ background: "oklch(0.17 0.04 240)" }}
          >
            <p
              className="text-xs font-semibold mb-3"
              style={{ color: "oklch(0.68 0.03 240)" }}
            >
              SQUAD ({unassignedPlayers.length} unassigned)
            </p>

            {unassignedPlayers.length === 0 ? (
              <p
                className="text-xs py-4 text-center"
                style={{ color: "oklch(0.55 0.03 240)" }}
                data-ocid="lineup.empty_state"
              >
                All available players are placed
              </p>
            ) : (
              <div className="space-y-2" data-ocid="lineup.players.list">
                {unassignedPlayers.map((player, idx) => {
                  const { first, lastInitial } = splitName(player.name);
                  const isSelected = selectedPlayerId === player.id.toString();
                  return (
                    <div
                      key={player.id.toString()}
                      className="flex items-center gap-2"
                      data-ocid={`lineup.player.item.${idx + 1}`}
                    >
                      {/* Draggable player card */}
                      <button
                        type="button"
                        onPointerDown={(e) => handleListPointerDown(e, player)}
                        onPointerMove={(e) => handleListPointerMove(e, player)}
                        onPointerUp={(e) => handleListPointerUp(e, player)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedPlayerId((prev) =>
                              prev === player.id.toString()
                                ? null
                                : player.id.toString(),
                            );
                          }
                        }}
                        className="flex-1 flex items-center gap-3 px-3 rounded-xl transition-all select-none"
                        style={{
                          minHeight: 56,
                          background: isSelected
                            ? "oklch(0.73 0.1 75 / 0.12)"
                            : "oklch(0.20 0.04 240)",
                          border: isSelected
                            ? "2px solid oklch(0.73 0.1 75)"
                            : "1.5px solid oklch(0.27 0.04 240)",
                          cursor: "grab",
                          touchAction: "none",
                        }}
                      >
                        {/* Grip handle */}
                        <GripVertical
                          size={16}
                          style={{
                            color: "oklch(0.45 0.03 240)",
                            flexShrink: 0,
                          }}
                        />

                        {/* Jersey number */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black"
                          style={{
                            background: isSelected
                              ? "oklch(0.73 0.1 75)"
                              : "oklch(0.12 0.03 240)",
                            color: isSelected
                              ? "oklch(0.12 0.03 240)"
                              : "oklch(0.73 0.1 75)",
                            border: isSelected
                              ? "none"
                              : "1.5px solid oklch(0.73 0.1 75 / 0.4)",
                          }}
                        >
                          {player.jerseyNumber.toString()}
                        </div>

                        {/* Name + position */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className="font-bold truncate"
                              style={{
                                fontSize: 16,
                                color: "oklch(0.94 0.01 240)",
                                lineHeight: 1.2,
                              }}
                            >
                              {first}
                            </span>
                            {lastInitial && (
                              <span
                                style={{
                                  fontSize: 13,
                                  color: "oklch(0.65 0.03 240)",
                                  fontWeight: 500,
                                }}
                              >
                                {lastInitial}
                              </span>
                            )}
                          </div>
                          <span
                            className="text-xs"
                            style={{ color: "oklch(0.55 0.03 240)" }}
                          >
                            {player.positions.join(", ")}
                          </span>
                        </div>

                        {isSelected && (
                          <span
                            className="text-xs font-semibold flex-shrink-0"
                            style={{ color: "oklch(0.73 0.1 75)" }}
                          >
                            Selected
                          </span>
                        )}
                      </button>

                      {/* Add to bench button */}
                      <button
                        type="button"
                        data-ocid={`lineup.bench.add.${idx + 1}`}
                        onClick={() => addPlayerToBench(player.id.toString())}
                        className="p-2.5 rounded-xl transition-all flex-shrink-0"
                        style={{
                          background: "oklch(0.20 0.04 240)",
                          border: "1.5px solid oklch(0.27 0.04 240)",
                          color: "oklch(0.55 0.04 240)",
                          minWidth: 40,
                          minHeight: 56,
                        }}
                        title="Add to bench"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {currentTemplateId && (
            <p
              className="text-xs mt-3"
              style={{ color: "oklch(0.55 0.04 240)" }}
            >
              Editing:{" "}
              <span style={{ color: "oklch(0.73 0.1 75)" }}>
                {templateName}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent
          data-ocid="lineup.dialog"
          className="max-w-sm"
          style={{
            background: "oklch(0.17 0.04 240)",
            border: "1px solid oklch(0.25 0.04 240)",
          }}
        >
          <DialogHeader>
            <DialogTitle>Save Formation Template</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Template Name</Label>
            <Input
              data-ocid="lineup.save.input"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={`${formation} Formation`}
              className="mt-1"
              style={{
                background: "oklch(0.14 0.03 240)",
                border: "1px solid oklch(0.25 0.04 240)",
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="lineup.save.cancel_button"
              variant="ghost"
              onClick={() => setSaveDialogOpen(false)}
              style={{ color: "oklch(0.68 0.03 240)" }}
            >
              Cancel
            </Button>
            <Button
              data-ocid="lineup.save.submit_button"
              onClick={handleSaveTemplate}
              disabled={addTemplate.isPending || updateTemplate.isPending}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.1 75), oklch(0.62 0.1 75))",
                color: "oklch(0.12 0.03 240)",
              }}
            >
              {(addTemplate.isPending || updateTemplate.isPending) && (
                <Loader2 size={14} className="mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent
          data-ocid="lineup.load.dialog"
          className="max-w-sm"
          style={{
            background: "oklch(0.17 0.04 240)",
            border: "1px solid oklch(0.25 0.04 240)",
          }}
        >
          <DialogHeader>
            <DialogTitle>Load Formation Template</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            {!templates || templates.length === 0 ? (
              <p
                className="text-sm text-center py-6"
                style={{ color: "oklch(0.55 0.04 240)" }}
              >
                No saved templates yet
              </p>
            ) : (
              templates.map((t, idx) => (
                <div
                  key={t.id.toString()}
                  data-ocid={`lineup.template.item.${idx + 1}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{
                    background: "oklch(0.20 0.04 240)",
                    border: "1px solid oklch(0.27 0.04 240)",
                  }}
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => handleLoadTemplate(t)}
                  >
                    <p className="font-semibold text-sm text-foreground">
                      {t.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.68 0.03 240)" }}
                    >
                      {t.formation}
                    </p>
                  </button>
                  <button
                    type="button"
                    data-ocid={`lineup.template.delete.${idx + 1}`}
                    onClick={() => setDeleteTemplateId(t.id)}
                    style={{ color: "oklch(0.577 0.245 27.325)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              data-ocid="lineup.load.close_button"
              variant="ghost"
              onClick={() => setLoadDialogOpen(false)}
              style={{ color: "oklch(0.68 0.03 240)" }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete template confirm */}
      <AlertDialog
        open={deleteTemplateId !== null}
        onOpenChange={(o) => !o && setDeleteTemplateId(null)}
      >
        <AlertDialogContent
          data-ocid="lineup.delete.modal"
          style={{
            background: "oklch(0.17 0.04 240)",
            border: "1px solid oklch(0.25 0.04 240)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "oklch(0.68 0.03 240)" }}>
              This will permanently delete this formation template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="lineup.delete.cancel_button"
              style={{ background: "oklch(0.22 0.04 240)", border: "none" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="lineup.delete.confirm_button"
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Drag Ghost ──────────────────────────────────────────────────────────────
function DragGhost({ x, y, player }: { x: number; y: number; player: Player }) {
  const { first, lastInitial } = splitName(player.name);
  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 9999,
        opacity: 0.92,
      }}
    >
      <div
        style={{
          background: "oklch(0.73 0.1 75)",
          color: "oklch(0.12 0.03 240)",
          borderRadius: 12,
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          minWidth: 80,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "oklch(0.12 0.03 240)",
            color: "oklch(0.73 0.1 75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          {player.jerseyNumber.toString()}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1 }}>
            {first}
          </div>
          {lastInitial && (
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>
              {lastInitial}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FilledMarker ────────────────────────────────────────────────────────────
function FilledMarker({
  player,
  onRemove,
  onBench,
}: {
  player: Player;
  onRemove: (e: React.MouseEvent) => void;
  onBench: (e: React.MouseEvent) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const { first, lastInitial } = splitName(player.name);

  return (
    <div
      className="relative select-none"
      style={{ width: 52, textAlign: "center" }}
    >
      {/* Always-visible × remove button */}
      <button
        type="button"
        data-ocid="lineup.player.delete_button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(e);
        }}
        title="Remove from pitch"
        style={{
          position: "absolute",
          top: -5,
          right: -5,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "oklch(0.577 0.245 27.325)",
          color: "white",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 900,
          lineHeight: 1,
          zIndex: 30,
          cursor: "pointer",
          padding: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}
      >
        ×
      </button>

      {showActions && (
        <div
          className="absolute bottom-full left-1/2 mb-1 flex gap-1 rounded-lg px-1.5 py-1 z-30"
          style={{
            transform: "translateX(-50%)",
            background: "oklch(0.14 0.03 240)",
            border: "1px solid oklch(0.27 0.04 240)",
            whiteSpace: "nowrap",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(false);
              onBench(e);
            }}
            className="text-xs px-2 py-0.5 rounded"
            style={{
              color: "oklch(0.73 0.1 75)",
              background: "oklch(0.20 0.04 240)",
            }}
          >
            Bench
          </button>
        </div>
      )}

      <button
        type="button"
        className="relative flex flex-col items-center justify-center mx-auto transition-all rounded-full"
        style={{
          width: 52,
          height: 52,
          background:
            "linear-gradient(160deg, oklch(0.22 0.07 240), oklch(0.15 0.05 240))",
          border: "2.5px solid oklch(0.73 0.1 75)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.55)",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setShowActions((v) => !v);
        }}
      >
        {/* Jersey number — small, top */}
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "oklch(0.73 0.1 75)",
            lineHeight: 1,
            marginBottom: 1,
          }}
        >
          #{player.jerseyNumber.toString()}
        </span>
        {/* First name — large, center */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "oklch(0.97 0.01 240)",
            lineHeight: 1,
            maxWidth: 44,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {first}
        </span>
        {/* Last initial — tiny, bottom */}
        {lastInitial && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 500,
              color: "oklch(0.68 0.03 240)",
              lineHeight: 1,
              marginTop: 1,
            }}
          >
            {lastInitial}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── EmptySlot ───────────────────────────────────────────────────────────────
function EmptySlot({ label, isTarget }: { label: string; isTarget: boolean }) {
  return (
    <div
      className="relative select-none"
      style={{ width: 52, textAlign: "center" }}
    >
      <div
        className="rounded-full flex items-center justify-center mx-auto transition-all"
        style={{
          width: 52,
          height: 52,
          background: isTarget
            ? "oklch(0.73 0.1 75 / 0.15)"
            : "rgba(0,0,0,0.25)",
          border: `2px dashed ${
            isTarget ? "oklch(0.73 0.1 75)" : "rgba(255,255,255,0.25)"
          }`,
        }}
      >
        <span
          className="text-xs font-semibold"
          style={{
            color: isTarget ? "oklch(0.73 0.1 75)" : "rgba(255,255,255,0.4)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
