import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type PlayerId = bigint;
export interface Player {
    id: PlayerId;
    name: string;
    jerseyNumber: bigint;
    notes: string;
    positions: Array<string>;
}
export interface MatchAvailability {
    matchId: MatchId;
    availablePlayers: Array<PlayerId>;
}
export type TemplateId = bigint;
export interface FormationTemplate {
    id: TemplateId;
    formation: string;
    name: string;
    lineupDataJson: string;
    benchPlayers: Array<PlayerId>;
}
export interface Match {
    id: MatchId;
    result?: string;
    date: string;
    notes: string;
    opponent: string;
}
export type MatchId = bigint;
export interface backendInterface {
    /**
     * / ******* Formation Template Management ********
     */
    addFormationTemplate(name: string, formation: string, lineupDataJson: string, benchPlayers: Array<PlayerId>): Promise<TemplateId>;
    /**
     * / ******* Match Management ********
     */
    addMatch(opponent: string, date: string, notes: string): Promise<MatchId>;
    /**
     * / ******* Player Management ********
     */
    addPlayer(name: string, jerseyNumber: bigint, positions: Array<string>, notes: string): Promise<PlayerId>;
    deleteFormationTemplate(id: TemplateId): Promise<void>;
    deleteMatch(id: MatchId): Promise<void>;
    deletePlayer(id: PlayerId): Promise<void>;
    getAllFormationTemplates(): Promise<Array<FormationTemplate>>;
    getAllMatchAvailabilities(): Promise<Array<MatchAvailability>>;
    getAllMatches(): Promise<Array<Match>>;
    getAllPlayers(): Promise<Array<Player>>;
    getFormationTemplate(id: TemplateId): Promise<FormationTemplate>;
    getMatch(id: MatchId): Promise<Match>;
    getMatchAvailability(matchId: MatchId): Promise<Array<PlayerId>>;
    getPlayer(id: PlayerId): Promise<Player>;
    /**
     * / ******* Match Availability Management ********
     */
    setMatchAvailability(matchId: MatchId, availablePlayers: Array<PlayerId>): Promise<void>;
    updateFormationTemplate(id: TemplateId, name: string, formation: string, lineupDataJson: string, benchPlayers: Array<PlayerId>): Promise<void>;
    updateMatch(id: MatchId, opponent: string, date: string, notes: string, result: string | null): Promise<void>;
    updatePlayer(id: PlayerId, name: string, jerseyNumber: bigint, positions: Array<string>, notes: string): Promise<void>;
}
