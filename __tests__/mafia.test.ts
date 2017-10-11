import { Game, GameState, ChatEvent, TimeEvent } from '../mafia';
import PlayerStateManager, { PlayerRole } from "../playerstatemanager";

// TODO: move to nighttime 
// and let the killers know they should vote to kill
// TODO: rate limiting queue

class FakeChatClient {
    buffer: Map<string, Array<string>>;

    constructor() {
        this.buffer = {};
    }

    say(channel: string, message: string) {
        if (!this.buffer[channel]) this.buffer[channel] = [];
        this.buffer[channel].push(message);
    }

    whisper(user: string, message: string) {
        this.say(user, message);
    }
};

class GameTestHelper {
    chatClient: FakeChatClient;
    game: Game;
    playerStateManager: PlayerStateManager;
    defaultPlayers: Map<string, PlayerRole> = new Map([
        ['alex', PlayerRole.Mafia], 
        ['jon', PlayerRole.Mafia],
        ['ogtega', PlayerRole.Sheep],
        ['galacticRaven', PlayerRole.Sheep],
        ['ian025', PlayerRole.Sheep]
    ]);

    constructor() {
        this.chatClient = new FakeChatClient();
        this.playerStateManager = new PlayerStateManager();
        this.game = new Game("jon", this.chatClient, "#programmingpeople", this.playerStateManager);
    }

    joinPlayers(players?: Array<string>) : GameTestHelper {
        if (!players) {
            this.playerStateManager.setPlayers(this.defaultPlayers);
            return this;
        }

        players.forEach(player => {
            this.game.react(new ChatEvent(player, '!join'));
        });

        return this;
    }

    startGame() : GameTestHelper {
        this.game.react(new TimeEvent(10000));
        return this;
    }

    startWithPlayers() : GameTestHelper {
        this.joinPlayers().startGame();
        return this;
    }

    vote(voter: string, votee: string) : GameTestHelper {
        this.game.react(new ChatEvent(voter, `!vote ${votee}`));
        return this;
    }

    expectWhisper(user: string, expected: string) : GameTestHelper {
        expect(this.chatClient.buffer[user]).toContain(expected);
        return this;
    }

    testChat(expected: string) : GameTestHelper {
        expect(this.chatClient.buffer[this.game.channel]).toContain(expected);
        return this;
    }
}

it('starts with the initiator as a player', () => { 
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    expect(fakeChatClient.buffer['#programmingpeople'])
        .toContain("Current players: jon");
});

it('joining adds a player to the game', () => { 
    const gameSetup = new GameTestHelper();
    gameSetup.joinPlayers(['alex', 'ogtega']);
    gameSetup.testChat("Current players: jon, alex, ogtega");
});

it('does not allow a user to join twice', () => { 
    const gameSetup = new GameTestHelper();
    gameSetup.joinPlayers(['alex', 'alex']);
    gameSetup.testChat("Current players: jon, alex");
});

it('fails to start without enough people', () => { 
    const gameSetup = new GameTestHelper();
    gameSetup.joinPlayers(['alex']);
    gameSetup.startGame();
    gameSetup.testChat("Not enough players to start a game. Must be at least 5!");
});

it('starts with enough people', () => {
    const gameSetup = new GameTestHelper();
    gameSetup.startWithPlayers();
    gameSetup.testChat("It's daytime. The evil Kappa s are among you, figure out who you think they are, and type !vote <username> to vote to knock 'em out.");
});

it('tallies votes', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .vote('alex', 'ian025')
        .vote('galacticRaven', 'ian025')
        .testChat("ian025: 2");
});

it('voting twice means the last vote is the one that counts', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .vote('alex', 'ian025')
        .testChat("ian025: 1")
        .vote('alex', 'jon')
        .testChat("jon: 1");
});

it('cant vote for yourself', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .vote('alex', 'alex')
        .testChat("You can't vote for yourself!");
});

it('somebody dies after everyone has voted', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex')
        .testChat("alex is dead, may they sheep in peace.");
});

it('get whispered with your role after game start', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .expectWhisper('alex', 'You are in the mafia.')
        .expectWhisper('jon', 'You are in the mafia.')
        .expectWhisper('galacticRaven', 'You are a sheeple.')
        .expectWhisper('ian025', 'You are a sheeple.')
        .expectWhisper('ogtega', 'You are a sheeple.');
});

// TODO: Assign roles after game start
// TODO: Everyone gets whispered with their role after game start
// TODO: Dead people can't vote or get whispered if they're mafia
// TODO: Can't vote while in night time
// TODO: Can't join after game is started
// TODO: If all mafia are dead, sheeple win
// TODO: If all sheeple are dead, mafia win

it('somebody dies after time expires');