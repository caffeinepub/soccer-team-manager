import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Order "mo:core/Order";

actor {
  /********* Types & Comparison Helpers *********/
  type PlayerId = Nat;
  type MatchId = Nat;
  type TemplateId = Nat;

  type Player = {
    id : PlayerId;
    name : Text;
    jerseyNumber : Nat;
    positions : [Text];
    notes : Text;
  };

  module Player {
    public func compare(player1 : Player, player2 : Player) : Order.Order {
      Nat.compare(player1.id, player2.id);
    };
  };

  type Match = {
    id : MatchId;
    opponent : Text;
    date : Text;
    notes : Text;
    result : ?Text;
  };

  module Match {
    public func compare(match1 : Match, match2 : Match) : Order.Order {
      Nat.compare(match1.id, match2.id);
    };
  };

  type FormationTemplate = {
    id : TemplateId;
    name : Text;
    formation : Text;
    lineupDataJson : Text;
    benchPlayers : [PlayerId];
  };

  module FormationTemplate {
    public func compare(template1 : FormationTemplate, template2 : FormationTemplate) : Order.Order {
      Nat.compare(template1.id, template2.id);
    };
  };

  type MatchAvailability = {
    matchId : MatchId;
    availablePlayers : [PlayerId];
  };

  /********* Internal State *********/
  var nextPlayerId : PlayerId = 1;
  var nextMatchId : MatchId = 1;
  var nextTemplateId : TemplateId = 1;

  let players = Map.empty<PlayerId, Player>();
  let matches = Map.empty<MatchId, Match>();
  let formationTemplates = Map.empty<TemplateId, FormationTemplate>();
  let matchAvailability = Map.empty<MatchId, [PlayerId]>();

  /********* Player Management *********/
  public shared ({ caller }) func addPlayer(name : Text, jerseyNumber : Nat, positions : [Text], notes : Text) : async PlayerId {
    let id = nextPlayerId;
    nextPlayerId += 1;

    let player : Player = {
      id;
      name;
      jerseyNumber;
      positions;
      notes;
    };
    players.add(id, player);
    id;
  };

  public shared ({ caller }) func updatePlayer(id : PlayerId, name : Text, jerseyNumber : Nat, positions : [Text], notes : Text) : async () {
    if (not players.containsKey(id)) { Runtime.trap("Player does not exist") };
    let player : Player = {
      id;
      name;
      jerseyNumber;
      positions;
      notes;
    };
    players.add(id, player);
  };

  public shared ({ caller }) func deletePlayer(id : PlayerId) : async () {
    if (not players.containsKey(id)) { Runtime.trap("Player does not exist") };
    players.remove(id);
  };

  public query ({ caller }) func getAllPlayers() : async [Player] {
    players.values().toArray().sort();
  };

  public query ({ caller }) func getPlayer(id : PlayerId) : async Player {
    switch (players.get(id)) {
      case (null) { Runtime.trap("Player does not exist") };
      case (?player) { player };
    };
  };

  /********* Match Management *********/
  public shared ({ caller }) func addMatch(opponent : Text, date : Text, notes : Text) : async MatchId {
    let id = nextMatchId;
    nextMatchId += 1;

    let match : Match = {
      id;
      opponent;
      date;
      notes;
      result = null;
    };
    matches.add(id, match);
    id;
  };

  public shared ({ caller }) func updateMatch(id : MatchId, opponent : Text, date : Text, notes : Text, result : ?Text) : async () {
    if (not matches.containsKey(id)) { Runtime.trap("Match does not exist") };
    let match : Match = {
      id;
      opponent;
      date;
      notes;
      result;
    };
    matches.add(id, match);
  };

  public shared ({ caller }) func deleteMatch(id : MatchId) : async () {
    if (not matches.containsKey(id)) { Runtime.trap("Match does not exist") };
    matches.remove(id);
  };

  public query ({ caller }) func getAllMatches() : async [Match] {
    matches.values().toArray().sort();
  };

  public query ({ caller }) func getMatch(id : MatchId) : async Match {
    switch (matches.get(id)) {
      case (null) { Runtime.trap("Match does not exist") };
      case (?match) { match };
    };
  };

  /********* Formation Template Management *********/
  public shared ({ caller }) func addFormationTemplate(name : Text, formation : Text, lineupDataJson : Text, benchPlayers : [PlayerId]) : async TemplateId {
    let id = nextTemplateId;
    nextTemplateId += 1;

    let template : FormationTemplate = {
      id;
      name;
      formation;
      lineupDataJson;
      benchPlayers;
    };
    formationTemplates.add(id, template);
    id;
  };

  public shared ({ caller }) func updateFormationTemplate(id : TemplateId, name : Text, formation : Text, lineupDataJson : Text, benchPlayers : [PlayerId]) : async () {
    if (not formationTemplates.containsKey(id)) { Runtime.trap("Formation template does not exist") };
    let template : FormationTemplate = {
      id;
      name;
      formation;
      lineupDataJson;
      benchPlayers;
    };
    formationTemplates.add(id, template);
  };

  public shared ({ caller }) func deleteFormationTemplate(id : TemplateId) : async () {
    if (not formationTemplates.containsKey(id)) { Runtime.trap("Formation template does not exist") };
    formationTemplates.remove(id);
  };

  public query ({ caller }) func getAllFormationTemplates() : async [FormationTemplate] {
    formationTemplates.values().toArray().sort();
  };

  public query ({ caller }) func getFormationTemplate(id : TemplateId) : async FormationTemplate {
    switch (formationTemplates.get(id)) {
      case (null) { Runtime.trap("Formation template does not exist") };
      case (?template) { template };
    };
  };

  /********* Match Availability Management *********/
  public shared ({ caller }) func setMatchAvailability(matchId : MatchId, availablePlayers : [PlayerId]) : async () {
    if (not matches.containsKey(matchId)) { Runtime.trap("Match does not exist") };
    if (availablePlayers.any(func(pId) { not players.containsKey(pId) })) {
      Runtime.trap("One or more players do not exist");
    };
    matchAvailability.add(matchId, availablePlayers);
  };

  public query ({ caller }) func getMatchAvailability(matchId : MatchId) : async [PlayerId] {
    switch (matchAvailability.get(matchId)) {
      case (null) { [] };
      case (?players) { players };
    };
  };

  public query ({ caller }) func getAllMatchAvailabilities() : async [MatchAvailability] {
    matchAvailability.toArray().map(func((matchId, availablePlayers)) { { matchId; availablePlayers } });
  };
};
