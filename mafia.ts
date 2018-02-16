// Game is a mafia game
import PlayerStateManager, { Player, PlayerRole } from "./playerstatemanager";

// lfp - Looking for players. Game has just been started.
// day - We're waiting for people to vote to kill a mobster
// night - We're waiting for mobsters to kill people
export const enum GameState {
  LookingForPlayers,
  DayTime,
  NightTime,
  LawAndOrder
}

export const lookingForPlayersWindow = 40000; // in milliseconds
const minPlayers = 5;

class Event {}

export class ChatEvent extends Event {
  username: string;
  message: string;

  constructor(username: string, message: string) {
    super();
    this.username = username;
    this.message = message;
  }
}

export class WhisperEvent extends Event {
  username: string;
  message: string;

  constructor(username: string, message: string) {
    super();
    this.username = username;
    this.message = message;
  }
}

export class TimeEvent extends Event {
  msElapsed: number;

  constructor(msElapsed: number) {
    super();
    this.msElapsed = msElapsed;
  }
}

export class Game {
  playerStateManager: PlayerStateManager;
  chatClient: any;
  channel: string;
  state: GameState;
  initiator: string;
  votes: Map<string, Array<string>>;
  numDays: number;

  constructor(
    initiator: string,
    chatClient: any,
    channel: string,
    manager?: PlayerStateManager
  ) {
    this.initiator = initiator;
    this.playerStateManager = manager || new PlayerStateManager();
    this.playerStateManager.join(initiator);
    this.chatClient = chatClient;
    this.channel = channel;
    this.transition(GameState.LookingForPlayers);
    this.numDays = 0;
  }

  players(): Array<Player> {
    return this.playerStateManager.getPlayers();
  }

  playerNames(): Array<string> {
    return this.players().map(p => p.user);
  }

  alivePlayers(): Array<Player> {
    return this.players().filter(p => p.alive);
  }

  deadPlayers(): Array<Player> {
    return this.players().filter(p => !p.alive);
  }

  getNames(players: Array<Player>): Array<string> {
    return players.map(p => p.user);
  }

  reportPlayers() {
    this.chatClient.say(
      this.channel,
      `Alive players: ${this.getNames(this.alivePlayers()).join(", ")}`
    );
    this.chatClient.say(
      this.channel,
      `Dead players: ${this.getNames(this.deadPlayers()).join(", ")}`
    );
  }

  voteTally() {
    let voteTally = new Map<string, number>();
    for (var username in this.votes) {
      let votedFor = this.votes[username];
      if (!voteTally[votedFor]) voteTally[votedFor] = 1;
      else voteTally[votedFor]++;
    }

    return voteTally;
  }

  reportVotes() {
    let votePairStrings = [];
    let tally = this.voteTally();
    for (var username in tally) {
      let voteCount = tally[username];
      votePairStrings.push(`${username}: ${voteCount}`);
    }
    this.chatClient.say(this.channel, votePairStrings.join(", "));
  }

  react(event: Event) {
    if (event instanceof TimeEvent) {
      let timeEvent = event as TimeEvent;
      if (timeEvent.msElapsed == lookingForPlayersWindow) {
        this.transition(GameState.DayTime);
      }
    } else if (event instanceof ChatEvent) {
      let chatEvent = event as ChatEvent;
      this.handleChat(chatEvent.username, chatEvent.message);
    } else if (event instanceof WhisperEvent) {
      let chatEvent = event as WhisperEvent;
      this.handleWhisper(chatEvent.username, chatEvent.message);
    }
  }

  handleWhisper(username: string, message: string) {
    let messageParts = message.split(" ");
    let command = messageParts[0];
    switch (command) {
      case "!kill":
        let killee = messageParts[1];
        this.handleKill(username, killee);
        break;
    }
  }

  handleChat(username: string, message: string) {
    let messageParts = message.split(" ");
    let command = messageParts[0];
    switch (command) {
      case "!vote":
        let votingFor = messageParts[1];
        this.handleVote(username, votingFor);
        break;
      case "!join":
        if (this.state != GameState.LookingForPlayers) return;

        if (!this.playerStateManager.hasPlayer(username)) {
          this.playerStateManager.join(username);
        }
        this.reportPlayers();
        break;
    }
  }

  handleKill(killerUsername, killeeUsername) {
    // TODO: Shouldn't be killing yourself, but we don't
    // have a test yet
    // if (username == killee) {
    //    this.chatClient.say(this.channel, "You can't vote for yourself!")
    //    return;
    // }

    let killee = this.players().find(u => u.user == killeeUsername);
    let killer = this.players().find(u => u.user == killerUsername);
    if (!killee) {
      this.chatClient.whisper(killerUsername, "That person is not playing!");
      return;
    }

    if (!killer.alive) {
      this.chatClient.whisper(killerUsername, "You ded.");
      return;
    }

    if (!killee.alive) {
      this.chatClient.whisper(killerUsername, "You cannot kill dead people.");
      return;
    }

    this.playerStateManager.kill(killeeUsername);
    this.chatClient.say(
      this.channel,
      `${killeeUsername} has been killed by the Mafiosos dead.`
    );

    if (this.didMafiososWin()) {
      this.chatClient.say(this.channel, "Mafiosos win!");
      return;
    }

    this.transition(GameState.DayTime);
  }

  handleVote(username, votingFor) {
    if (this.state != GameState.DayTime) return;

    if (username == votingFor) {
      this.chatClient.say(this.channel, "You can't vote for yourself!");
      return;
    }

    // if you dead, you can't be votin'
    let user = this.players().find(u => u.user == username);
    if (!user) {
      return;
    }

    if (!user.alive) {
      // nah, you can't vote.
      // don't tell 'em anything because then we'll
      // spam chat too hard
      return;
    }

    this.votes[username] = votingFor;

    let numVotes = Object.keys(this.votes).length;
    if (numVotes == this.alivePlayers().length) {
      this.transition(GameState.LawAndOrder);
    }
    this.reportVotes();
  }

  lookingForPlayersStarted() {
    this.chatClient.say(
      this.channel,
      "The game has started. Type !join to join the game."
    );
    this.reportPlayers();
  }

  dayTimeStarted() {
    this.votes = new Map<string, Array<string>>();
    if (this.players().length < minPlayers) {
      this.chatClient.say(
        this.channel,
        "Not enough players to start a game. Must be at least 5!"
      );
      return;
    }

    this.numDays++;
    this.playerStateManager.assignRoles();
    // for every player
    //   send a whisper through the chat client what their role is

    if (this.numDays == 1) {
      for (let player of this.players()) {
        let playerRoleName;
        if (player.role == PlayerRole.Mafia) {
          playerRoleName = "Mafia";
        } else {
          playerRoleName = "Sheeple";
        }
        this.chatClient.whisper(
          player.user,
          `Hey! Your role is ${playerRoleName}.`
        );
      }
    }

    this.chatClient.say(
      this.channel,
      "It's daytime. The evil Kappa s are among you, figure out who you think they are, and type !vote <username> to vote to knock 'em out."
    );
  }

  nightTimeStarted() {
    this.chatClient.say(this.channel, "Night time has started.");
    for (let player of this.players()) {
      if (player.role == PlayerRole.Mafia && player.alive) {
        this.chatClient.whisper(
          player.user,
          "Time to kill. Use !kill <username> to kill someone, you evil mafia person you."
        );
      }
    }
  }

  lawAndOrderStarted() {
    let tally = this.voteTally();
    let mostVotes = 0;
    let mostVotesUsername = "";
    for (var username in tally) {
      if (tally[username] > mostVotes) {
        mostVotes = tally[username];
        mostVotesUsername = username;
      }
    }

    this.playerStateManager.kill(mostVotesUsername);
    this.votes = null;
    this.chatClient.say(
      this.channel,
      `${mostVotesUsername} is dead, may they sheep in peace.`
    );

    if (this.didSheepleWin()) {
      this.chatClient.say(this.channel, "Sheeple win!");
      return;
    }

    if (this.didMafiososWin()) {
      this.chatClient.say(this.channel, "Mafiosos win!");
      return;
    }

    this.transition(GameState.NightTime);
  }

  didSheepleWin() {
    const mafiosos = this.playerStateManager.getMafiosos();
    return mafiosos.filter(m => m.alive).length == 0;
  }

  didMafiososWin() {
    const sheeple = this.playerStateManager.getSheeple();
    return sheeple.filter(m => m.alive).length == 0;
  }

  transition(state: GameState) {
    this.state = state;
    switch (this.state) {
      case GameState.LookingForPlayers:
        this.lookingForPlayersStarted();
        break;
      case GameState.DayTime:
        this.reportPlayers();
        this.dayTimeStarted();
        break;
      case GameState.NightTime:
        this.reportPlayers();
        this.nightTimeStarted();
        break;
      case GameState.LawAndOrder:
        this.lawAndOrderStarted();
        break;
    }
  }
}
