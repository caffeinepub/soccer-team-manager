import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FormationTemplate,
  Match,
  MatchId,
  Player,
  PlayerId,
  TemplateId,
} from "../backend";
import { useActor } from "./useActor";

export function useGetPlayers() {
  const { actor, isFetching } = useActor();
  return useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPlayers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMatches() {
  const { actor, isFetching } = useActor();
  return useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMatches();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFormationTemplates() {
  const { actor, isFetching } = useActor();
  return useQuery<FormationTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllFormationTemplates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMatchAvailability(matchId: MatchId | null) {
  const { actor, isFetching } = useActor();
  return useQuery<PlayerId[]>({
    queryKey: ["availability", matchId?.toString()],
    queryFn: async () => {
      if (!actor || matchId === null) return [];
      return actor.getMatchAvailability(matchId);
    },
    enabled: !!actor && !isFetching && matchId !== null,
  });
}

export function useAddPlayer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      name: string;
      jerseyNumber: number;
      positions: string[];
      notes: string;
    }) =>
      actor!.addPlayer(p.name, BigInt(p.jerseyNumber), p.positions, p.notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
}

export function useUpdatePlayer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      id: PlayerId;
      name: string;
      jerseyNumber: number;
      positions: string[];
      notes: string;
    }) =>
      actor!.updatePlayer(
        p.id,
        p.name,
        BigInt(p.jerseyNumber),
        p.positions,
        p.notes,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
}

export function useDeletePlayer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: PlayerId) => actor!.deletePlayer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players"] }),
  });
}

export function useAddMatch() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (m: { opponent: string; date: string; notes: string }) =>
      actor!.addMatch(m.opponent, m.date, m.notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useUpdateMatch() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (m: {
      id: MatchId;
      opponent: string;
      date: string;
      notes: string;
      result: string | null;
    }) => actor!.updateMatch(m.id, m.opponent, m.date, m.notes, m.result),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useDeleteMatch() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: MatchId) => actor!.deleteMatch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useSetMatchAvailability() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { matchId: MatchId; availablePlayers: PlayerId[] }) =>
      actor!.setMatchAvailability(p.matchId, p.availablePlayers),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: ["availability", vars.matchId.toString()],
      }),
  });
}

export function useAddFormationTemplate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: {
      name: string;
      formation: string;
      lineupDataJson: string;
      benchPlayers: PlayerId[];
    }) =>
      actor!.addFormationTemplate(
        t.name,
        t.formation,
        t.lineupDataJson,
        t.benchPlayers,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateFormationTemplate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: {
      id: TemplateId;
      name: string;
      formation: string;
      lineupDataJson: string;
      benchPlayers: PlayerId[];
    }) =>
      actor!.updateFormationTemplate(
        t.id,
        t.name,
        t.formation,
        t.lineupDataJson,
        t.benchPlayers,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteFormationTemplate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: TemplateId) => actor!.deleteFormationTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}
