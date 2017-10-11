// Game is a mafia game
import { PlayerStateManager } from "./playerstatemanager";

// lfp - Looking for players. Game has just been started.
// day - We're waiting for people to vote to kill a mobster
// night - We're waiting for mobsters to kill people
export const enum GameState {
    LookingForPlayers,
    DayTime,
    NightTime,
    LawAndOrder
}

export const lookingForPlayersWindow = 10000; // in milliseconds
const minPlayers = 5;

class Event { }

export class ChatEvent extends Event {
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
    votes: Map<string,Array<string>>;

    constructor(initiator: string, chatClient: any, channel: string) {
        this.initiator = initiator;
        this.playerStateManager = new PlayerStateManager();
        this.playerStateManager.join(initiator);
        this.chatClient = chatClient;
        this.channel = channel;
        this.transition(GameState.LookingForPlayers);
    }

    players() : Array<string> {
        return this.playerStateManager.players;
    }

    reportPlayers() {
        this.chatClient.say(this.channel, `Current players: ${this.players().join(', ')}`)
    }
    voteTally() {
        let voteTally = new Map<string, number>();
        for (var username in this.votes) {
            let votedFor = this.votes[username];
            if (!voteTally[votedFor])
                voteTally[votedFor] = 1;
            else
                voteTally[votedFor]++;
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
        this.chatClient.say(this.channel, votePairStrings.join(', '));
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
                if (!this.playerStateManager.hasPlayer(username)) {
                    this.playerStateManager.join(username);
                }
                this.reportPlayers();
                break;
        }
    }

    handleVote(username, votingFor) {
        if (username == votingFor) {
            this.chatClient.say(this.channel, "You can't vote for yourself!")
            return;
        }
        this.votes[username] = votingFor;

        if (Object.keys(this.votes).length == this.players().length) {
            this.transition(GameState.LawAndOrder);
        }
        this.reportVotes();
    }

    lookingForPlayersStarted() {
        this.chatClient.say(this.channel, "The game has started. Type !join to join the game.")
        this.reportPlayers();
    }

    dayTimeStarted() {
        this.votes = new Map<string, Array<string>>();
        if (this.players().length < minPlayers) {
          this.chatClient.say(this.channel, "Not enough players to start a game. Must be at least 5!");
          return;
        }

        this.chatClient.say(this.channel, "It's daytime. The evil Kappa s are among you, figure out who you think they are, and type !vote <username> to vote to knock 'em out.")
    }

    nightTimeStarted() {
        this.chatClient.say(this.channel, "Night time has started.")
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
        // TODO: We didn't remove them from the game
        this.chatClient.say(this.channel, `${mostVotesUsername} is dead, may they sheep in peace.`)
    }

    transition(state: GameState) {
        this.state = state;
        switch (this.state) {
            case GameState.LookingForPlayers:
                this.lookingForPlayersStarted();
                break;
            case GameState.DayTime:
                this.dayTimeStarted();
                break;
            case GameState.NightTime:
                this.nightTimeStarted();
                break;
            case GameState.LawAndOrder:
                this.lawAndOrderStarted();
                break;
        }
    }
}
