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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Player, PlayerId } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  useAddPlayer,
  useDeletePlayer,
  useGetPlayers,
  useUpdatePlayer,
} from "../hooks/useQueries";
import { ALL_POSITIONS } from "../types";

const SKEL_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"];

type PlayerForm = {
  name: string;
  jerseyNumber: string;
  positions: string[];
  notes: string;
};

const emptyForm = (): PlayerForm => ({
  name: "",
  jerseyNumber: "",
  positions: [],
  notes: "",
});

export default function PlayersTab() {
  const { data: players, isLoading } = useGetPlayers();
  const { actor } = useActor();
  const addPlayer = useAddPlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [form, setForm] = useState<PlayerForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<PlayerId | null>(null);

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const openAdd = () => {
    setEditingPlayer(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (p: Player) => {
    setEditingPlayer(p);
    setForm({
      name: p.name,
      jerseyNumber: p.jerseyNumber.toString(),
      positions: p.positions,
      notes: p.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!actor) {
      toast.error("Still connecting, please try again");
      return;
    }
    if (!form.name.trim() || !form.jerseyNumber) {
      toast.error("Name and jersey number are required");
      return;
    }
    const jerseyNum = Number.parseInt(form.jerseyNumber);
    if (Number.isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
      toast.error("Jersey number must be 1-99");
      return;
    }
    try {
      if (editingPlayer) {
        await updatePlayer.mutateAsync({
          id: editingPlayer.id,
          name: form.name.trim(),
          jerseyNumber: jerseyNum,
          positions: form.positions,
          notes: form.notes.trim(),
        });
        toast.success("Player updated");
      } else {
        await addPlayer.mutateAsync({
          name: form.name.trim(),
          jerseyNumber: jerseyNum,
          positions: form.positions,
          notes: form.notes.trim(),
        });
        toast.success("Player added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save player");
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deletePlayer.mutateAsync(deleteId);
      toast.success("Player removed");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete player");
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const ids = sortedPlayers
        .filter((p) => selectedIds.has(p.id.toString()))
        .map((p) => p.id);
      await Promise.all(ids.map((id) => deletePlayer.mutateAsync(id)));
      toast.success(
        `Removed ${ids.length} player${ids.length !== 1 ? "s" : ""}`,
      );
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch {
      toast.error("Failed to delete some players");
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const togglePosition = (pos: string) => {
    setForm((prev) => ({
      ...prev,
      positions: prev.positions.includes(pos)
        ? prev.positions.filter((p) => p !== pos)
        : [...prev.positions, pos],
    }));
  };

  const toggleSelectPlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const sortedPlayers = [...(players || [])].sort(
    (a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber),
  );

  const allSelected =
    sortedPlayers.length > 0 &&
    sortedPlayers.every((p) => selectedIds.has(p.id.toString()));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedPlayers.map((p) => p.id.toString())));
    }
  };

  const isSaving = addPlayer.isPending || updatePlayer.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Players</h1>
          <p
            className="text-xs mt-0.5"
            style={{ color: "oklch(0.68 0.03 240)" }}
          >
            {players?.length ?? 0} squad members
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              {selectedIds.size > 0 && (
                <Button
                  data-ocid="players.delete_button"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="h-10 px-4 rounded-lg"
                  style={{
                    background: "oklch(0.45 0.2 27)",
                    color: "white",
                  }}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Delete ({selectedIds.size})
                </Button>
              )}
              <Button
                data-ocid="players.cancel_button"
                variant="outline"
                onClick={exitSelectMode}
                className="h-10 px-4 rounded-lg"
                style={{
                  borderColor: "oklch(0.35 0.04 240)",
                  color: "oklch(0.68 0.03 240)",
                  background: "transparent",
                }}
              >
                <X size={14} className="mr-1.5" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                data-ocid="players.select.toggle"
                variant="outline"
                onClick={() => setSelectMode(true)}
                className="h-10 px-4 rounded-lg"
                style={{
                  borderColor: "oklch(0.35 0.04 240)",
                  color: "oklch(0.68 0.03 240)",
                  background: "transparent",
                }}
              >
                Select
              </Button>
              <Button
                data-ocid="players.add_button"
                onClick={openAdd}
                className="h-10 px-4 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.78 0.1 75), oklch(0.62 0.1 75))",
                  color: "oklch(0.12 0.03 240)",
                }}
              >
                <Plus size={16} className="mr-1.5" />
                Add Player
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Select-all row */}
      {selectMode && sortedPlayers.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 mb-2 rounded-lg"
          style={{ background: "oklch(0.20 0.04 240)" }}
        >
          <Checkbox
            id="select-all"
            data-ocid="players.checkbox"
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
          />
          <label
            htmlFor="select-all"
            className="text-sm cursor-pointer"
            style={{ color: "oklch(0.68 0.03 240)" }}
          >
            {allSelected
              ? "Deselect all"
              : `Select all (${sortedPlayers.length})`}
          </label>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2" data-ocid="players.loading_state">
          {SKEL_KEYS.map((k) => (
            <Skeleton
              key={k}
              className="h-16 rounded-xl"
              style={{ background: "oklch(0.20 0.04 240)" }}
            />
          ))}
        </div>
      ) : sortedPlayers.length === 0 ? (
        <div
          data-ocid="players.empty_state"
          className="text-center py-16"
          style={{ color: "oklch(0.68 0.03 240)" }}
        >
          <Squad2Icon className="mx-auto mb-3 opacity-30" size={48} />
          <p className="text-lg font-semibold">No players yet</p>
          <p className="text-sm">Add your first squad member</p>
        </div>
      ) : (
        <div className="space-y-2" data-ocid="players.list">
          {sortedPlayers.map((player, idx) => {
            const idStr = player.id.toString();
            const isChecked = selectedIds.has(idStr);
            return (
              <motion.div
                key={idStr}
                data-ocid={`players.item.${idx + 1}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
                style={{
                  background: isChecked
                    ? "oklch(0.20 0.05 240)"
                    : "oklch(0.17 0.04 240)",
                  borderColor: isChecked
                    ? "oklch(0.45 0.1 75)"
                    : "oklch(0.25 0.04 240)",
                }}
              >
                {selectMode && (
                  <Checkbox
                    data-ocid={`players.checkbox.${idx + 1}`}
                    checked={isChecked}
                    onCheckedChange={() => toggleSelectPlayer(idStr)}
                    className="flex-shrink-0"
                  />
                )}

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{
                    background: "oklch(0.14 0.04 240)",
                    border: "2px solid oklch(0.73 0.1 75)",
                    color: "oklch(0.73 0.1 75)",
                  }}
                >
                  {player.jerseyNumber.toString()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {player.name}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {player.positions.map((pos) => (
                      <Badge
                        key={pos}
                        className="text-xs px-1.5 py-0 h-4"
                        style={{
                          background: "oklch(0.25 0.04 240)",
                          color: "oklch(0.73 0.1 75)",
                          border: "none",
                        }}
                      >
                        {pos}
                      </Badge>
                    ))}
                  </div>
                </div>

                {!selectMode && (
                  <div className="flex items-center gap-1">
                    <Button
                      data-ocid={`players.edit_button.${idx + 1}`}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(player)}
                      style={{ color: "oklch(0.68 0.03 240)" }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      data-ocid={`players.delete_button.${idx + 1}`}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setDeleteId(player.id)}
                      style={{ color: "oklch(0.577 0.245 27.325)" }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="players.dialog"
          className="max-w-md"
          style={{
            background: "oklch(0.17 0.04 240)",
            border: "1px solid oklch(0.25 0.04 240)",
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingPlayer ? "Edit Player" : "Add Player"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="player-name">Name</Label>
              <Input
                id="player-name"
                data-ocid="players.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Player name"
                className="mt-1"
                style={{
                  background: "oklch(0.14 0.03 240)",
                  border: "1px solid oklch(0.25 0.04 240)",
                }}
              />
            </div>

            <div>
              <Label htmlFor="jersey-num">Jersey Number</Label>
              <Input
                id="jersey-num"
                data-ocid="players.jersey.input"
                type="number"
                min={1}
                max={99}
                value={form.jerseyNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, jerseyNumber: e.target.value }))
                }
                placeholder="1-99"
                className="mt-1 w-28"
                style={{
                  background: "oklch(0.14 0.03 240)",
                  border: "1px solid oklch(0.25 0.04 240)",
                }}
              />
            </div>

            <div>
              <Label>Positions</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    data-ocid="players.position.toggle"
                    onClick={() => togglePosition(pos)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: form.positions.includes(pos)
                        ? "oklch(0.73 0.1 75)"
                        : "oklch(0.22 0.04 240)",
                      color: form.positions.includes(pos)
                        ? "oklch(0.12 0.03 240)"
                        : "oklch(0.68 0.03 240)",
                      border: form.positions.includes(pos)
                        ? "1px solid oklch(0.73 0.1 75)"
                        : "1px solid oklch(0.28 0.04 240)",
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="player-notes">Notes (optional)</Label>
              <Textarea
                id="player-notes"
                data-ocid="players.textarea"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any notes..."
                rows={2}
                className="mt-1 resize-none"
                style={{
                  background: "oklch(0.14 0.03 240)",
                  border: "1px solid oklch(0.25 0.04 240)",
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              data-ocid="players.cancel_button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              style={{ color: "oklch(0.68 0.03 240)" }}
            >
              Cancel
            </Button>
            <Button
              data-ocid="players.submit_button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.1 75), oklch(0.62 0.1 75))",
                color: "oklch(0.12 0.03 240)",
              }}
            >
              {isSaving && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editingPlayer ? "Save Changes" : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent
          data-ocid="players.modal"
          style={{
            background: "oklch(0.17 0.04 240)",
            border: "1px solid oklch(0.25 0.04 240)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "oklch(0.68 0.03 240)" }}>
              This will permanently remove the player from your squad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="players.cancel_button"
              style={{ background: "oklch(0.22 0.04 240)", border: "none" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="players.confirm_button"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent
          data-ocid="players.modal"
          style={{
            background: "oklch(0.17 0.04 240)",
            border: "1px solid oklch(0.25 0.04 240)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {selectedIds.size} Player
              {selectedIds.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "oklch(0.68 0.03 240)" }}>
              This will permanently remove {selectedIds.size} player
              {selectedIds.size !== 1 ? "s" : ""} from your squad. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="players.cancel_button"
              style={{ background: "oklch(0.22 0.04 240)", border: "none" }}
              disabled={isBulkDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="players.confirm_button"
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting && (
                <Loader2 size={14} className="mr-2 animate-spin" />
              )}
              Remove All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Squad2Icon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
