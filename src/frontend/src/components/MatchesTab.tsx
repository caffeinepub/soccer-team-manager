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
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Match, MatchId } from "../backend";
import {
  useAddMatch,
  useDeleteMatch,
  useGetMatchAvailability,
  useGetMatches,
  useGetPlayers,
  useSetMatchAvailability,
  useUpdateMatch,
} from "../hooks/useQueries";

const SKEL_KEYS = ["s1", "s2", "s3", "s4"];

type View = { type: "list" } | { type: "detail"; match: Match };

export default function MatchesTab() {
  const [view, setView] = useState<View>({ type: "list" });
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<MatchId | null>(null);

  const { data: matches, isLoading } = useGetMatches();

  const sortedMatches = [...(matches || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div>
      {view.type === "list" ? (
        <>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-foreground">Matches</h1>
              <p
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.68 0.03 240)" }}
              >
                {matches?.length ?? 0} scheduled
              </p>
            </div>
            <Button
              data-ocid="matches.add_button"
              onClick={() => setAddOpen(true)}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.1 75), oklch(0.62 0.1 75))",
                color: "oklch(0.12 0.03 240)",
              }}
              className="h-10 px-4 rounded-lg font-semibold"
            >
              <Plus size={16} className="mr-1.5" />
              Add Match
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3" data-ocid="matches.loading_state">
              {SKEL_KEYS.map((k) => (
                <Skeleton
                  key={k}
                  className="h-20 rounded-xl"
                  style={{ background: "oklch(0.20 0.04 240)" }}
                />
              ))}
            </div>
          ) : sortedMatches.length === 0 ? (
            <div
              data-ocid="matches.empty_state"
              className="text-center py-16"
              style={{ color: "oklch(0.68 0.03 240)" }}
            >
              <Trophy size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-semibold">No matches scheduled</p>
              <p className="text-sm">Add your first match</p>
            </div>
          ) : (
            <div className="space-y-3" data-ocid="matches.list">
              {sortedMatches.map((match, idx) => {
                const isPast = new Date(match.date) < new Date();
                return (
                  <motion.button
                    key={match.id.toString()}
                    type="button"
                    data-ocid={`matches.item.${idx + 1}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setView({ type: "detail", match })}
                    className="w-full text-left flex items-center gap-4 px-4 py-4 rounded-xl border border-border transition-all hover:border-gold"
                    style={{ background: "oklch(0.17 0.04 240)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: "oklch(0.14 0.03 240)" }}
                    >
                      <span
                        className="text-xs font-medium"
                        style={{ color: "oklch(0.68 0.03 240)" }}
                      >
                        {new Date(match.date)
                          .toLocaleDateString("en", { month: "short" })
                          .toUpperCase()}
                      </span>
                      <span className="text-lg font-bold text-foreground leading-tight">
                        {new Date(match.date).getDate()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        vs {match.opponent}
                      </p>
                      {match.result ? (
                        <p
                          className="text-sm font-medium"
                          style={{ color: "oklch(0.73 0.1 75)" }}
                        >
                          {match.result}
                        </p>
                      ) : (
                        <p
                          className="text-sm"
                          style={{ color: "oklch(0.68 0.03 240)" }}
                        >
                          {isPast ? "No result yet" : "Upcoming"}
                        </p>
                      )}
                    </div>

                    <Badge
                      className="text-xs"
                      style={{
                        background: isPast
                          ? "oklch(0.22 0.04 240)"
                          : "oklch(0.73 0.1 75 / 0.15)",
                        color: isPast
                          ? "oklch(0.68 0.03 240)"
                          : "oklch(0.73 0.1 75)",
                        border: `1px solid ${isPast ? "oklch(0.28 0.04 240)" : "oklch(0.73 0.1 75 / 0.3)"}`,
                      }}
                    >
                      {isPast ? "Past" : "Upcoming"}
                    </Badge>
                  </motion.button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <MatchDetail
          match={view.match}
          onBack={() => setView({ type: "list" })}
          onDelete={(id) => {
            setDeleteId(id);
            setView({ type: "list" });
          }}
        />
      )}

      <AddMatchDialog open={addOpen} onOpenChange={setAddOpen} />

      <DeleteMatchDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        matchId={deleteId}
      />
    </div>
  );
}

function AddMatchDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addMatch = useAddMatch();
  const [form, setForm] = useState({ opponent: "", date: "", notes: "" });

  const handleSave = async () => {
    if (!form.opponent.trim() || !form.date) {
      toast.error("Opponent name and date are required");
      return;
    }
    try {
      await addMatch.mutateAsync(form);
      toast.success("Match added");
      onOpenChange(false);
      setForm({ opponent: "", date: "", notes: "" });
    } catch {
      toast.error("Failed to add match");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="matches.dialog"
        className="max-w-md"
        style={{
          background: "oklch(0.17 0.04 240)",
          border: "1px solid oklch(0.25 0.04 240)",
        }}
      >
        <DialogHeader>
          <DialogTitle>New Match</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Opponent</Label>
            <Input
              data-ocid="matches.input"
              value={form.opponent}
              onChange={(e) =>
                setForm((f) => ({ ...f, opponent: e.target.value }))
              }
              placeholder="Opponent team name"
              className="mt-1"
              style={{
                background: "oklch(0.14 0.03 240)",
                border: "1px solid oklch(0.25 0.04 240)",
              }}
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              data-ocid="matches.date.input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="mt-1"
              style={{
                background: "oklch(0.14 0.03 240)",
                border: "1px solid oklch(0.25 0.04 240)",
              }}
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              data-ocid="matches.textarea"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Venue, kickoff time..."
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
            data-ocid="matches.cancel_button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            style={{ color: "oklch(0.68 0.03 240)" }}
          >
            Cancel
          </Button>
          <Button
            data-ocid="matches.submit_button"
            onClick={handleSave}
            disabled={addMatch.isPending}
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.1 75), oklch(0.62 0.1 75))",
              color: "oklch(0.12 0.03 240)",
            }}
          >
            {addMatch.isPending && (
              <Loader2 size={14} className="mr-2 animate-spin" />
            )}
            Add Match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMatchDialog({
  open,
  onOpenChange,
  matchId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matchId: MatchId | null;
}) {
  const deleteMatch = useDeleteMatch();

  const handleDelete = async () => {
    if (matchId === null) return;
    try {
      await deleteMatch.mutateAsync(matchId);
      toast.success("Match deleted");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete match");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-ocid="matches.modal"
        style={{
          background: "oklch(0.17 0.04 240)",
          border: "1px solid oklch(0.25 0.04 240)",
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Match?</AlertDialogTitle>
          <AlertDialogDescription style={{ color: "oklch(0.68 0.03 240)" }}>
            This will permanently delete the match and all availability data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            data-ocid="matches.cancel_button"
            style={{ background: "oklch(0.22 0.04 240)", border: "none" }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            data-ocid="matches.confirm_button"
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MatchDetail({
  match,
  onBack,
  onDelete,
}: {
  match: Match;
  onBack: () => void;
  onDelete: (id: MatchId) => void;
}) {
  const { data: players } = useGetPlayers();
  const updateMatch = useUpdateMatch();
  const { data: availabilityIds } = useGetMatchAvailability(match.id);
  const setAvailability = useSetMatchAvailability();

  const [form, setForm] = useState({
    opponent: match.opponent,
    date: match.date,
    notes: match.notes,
    result: match.result ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const available = new Set(
    (availabilityIds ?? players?.map((p) => p.id) ?? []).map((id) =>
      id.toString(),
    ),
  );

  const handleSaveMatch = async () => {
    setIsSaving(true);
    try {
      await updateMatch.mutateAsync({
        id: match.id,
        opponent: form.opponent,
        date: form.date,
        notes: form.notes,
        result: form.result || null,
      });
      toast.success("Match saved");
    } catch {
      toast.error("Failed to save match");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAvailability = async (playerId: bigint) => {
    const pidStr = playerId.toString();
    const newSet = new Set(available);
    if (newSet.has(pidStr)) {
      newSet.delete(pidStr);
    } else {
      newSet.add(pidStr);
    }
    const newIds = [...newSet].map((s) => BigInt(s));
    try {
      await setAvailability.mutateAsync({
        matchId: match.id,
        availablePlayers: newIds,
      });
    } catch {
      toast.error("Failed to update availability");
    }
  };

  const sortedPlayers = [...(players || [])].sort(
    (a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber),
  );
  const availableCount = sortedPlayers.filter((p) =>
    available.has(p.id.toString()),
  ).length;

  return (
    <div>
      <button
        type="button"
        data-ocid="matches.back.button"
        onClick={onBack}
        className="flex items-center gap-2 mb-5 text-sm transition-colors"
        style={{ color: "oklch(0.68 0.03 240)" }}
      >
        <ArrowLeft size={16} />
        Back to Matches
      </button>

      <div
        className="rounded-xl border border-border p-4 mb-4"
        style={{ background: "oklch(0.17 0.04 240)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Match Details</h2>
          <Button
            data-ocid="matches.delete_button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(match.id)}
            className="h-8 w-8"
            style={{ color: "oklch(0.577 0.245 27.325)" }}
          >
            <Trash2 size={14} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Opponent</Label>
            <Input
              data-ocid="matches.detail.input"
              value={form.opponent}
              onChange={(e) =>
                setForm((f) => ({ ...f, opponent: e.target.value }))
              }
              className="mt-1"
              style={{
                background: "oklch(0.14 0.03 240)",
                border: "1px solid oklch(0.25 0.04 240)",
              }}
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              data-ocid="matches.detail.date.input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="mt-1"
              style={{
                background: "oklch(0.14 0.03 240)",
                border: "1px solid oklch(0.25 0.04 240)",
              }}
            />
          </div>
          <div>
            <Label>Result</Label>
            <Input
              data-ocid="matches.detail.result.input"
              value={form.result}
              onChange={(e) =>
                setForm((f) => ({ ...f, result: e.target.value }))
              }
              placeholder="e.g. 2-1"
              className="mt-1"
              style={{
                background: "oklch(0.14 0.03 240)",
                border: "1px solid oklch(0.25 0.04 240)",
              }}
            />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea
              data-ocid="matches.detail.textarea"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              className="mt-1 resize-none"
              style={{
                background: "oklch(0.14 0.03 240)",
                border: "1px solid oklch(0.25 0.04 240)",
              }}
            />
          </div>
        </div>

        <Button
          data-ocid="matches.detail.save_button"
          onClick={handleSaveMatch}
          disabled={isSaving}
          className="mt-4 w-full font-semibold"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.78 0.1 75), oklch(0.62 0.1 75))",
            color: "oklch(0.12 0.03 240)",
          }}
        >
          {isSaving && <Loader2 size={14} className="mr-2 animate-spin" />}
          Save Match
        </Button>
      </div>

      <div
        className="rounded-xl border border-border p-4"
        style={{ background: "oklch(0.17 0.04 240)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Availability</h3>
          <span className="text-sm" style={{ color: "oklch(0.73 0.1 75)" }}>
            {availableCount} / {sortedPlayers.length} available
          </span>
        </div>

        <div className="space-y-2" data-ocid="matches.availability.list">
          {sortedPlayers.map((player, idx) => {
            const isAvail = available.has(player.id.toString());
            return (
              <button
                key={player.id.toString()}
                type="button"
                data-ocid={`matches.availability.toggle.${idx + 1}`}
                onClick={() => toggleAvailability(player.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                style={{
                  background: isAvail
                    ? "oklch(0.22 0.06 145 / 0.4)"
                    : "oklch(0.20 0.03 240 / 0.5)",
                  border: `1px solid ${isAvail ? "oklch(0.45 0.12 145)" : "oklch(0.26 0.04 240)"}`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    background: isAvail
                      ? "oklch(0.35 0.12 145)"
                      : "oklch(0.22 0.04 240)",
                    color: isAvail
                      ? "oklch(0.90 0.05 145)"
                      : "oklch(0.68 0.03 240)",
                  }}
                >
                  {player.jerseyNumber.toString()}
                </div>
                <span className="flex-1 text-left text-sm font-medium text-foreground">
                  {player.name}
                </span>
                {isAvail ? (
                  <CheckCircle2
                    size={18}
                    style={{ color: "oklch(0.55 0.15 145)" }}
                  />
                ) : (
                  <XCircle
                    size={18}
                    style={{ color: "oklch(0.45 0.04 240)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
