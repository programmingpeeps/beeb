import { Game, GameState, ChatEvent, WhisperEvent, TimeEvent, lookingForPlayersWindow } from '../mafia';
import PlayerStateManager, { PlayerRole } from "../playerstatemanager";

// TODO: rate limiting queue

class FakeChatClient {
    buffer: Map<string, Array<string>>;

    constructor() {
        this.buffer = new Map<string, Array<string>>();
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
        this.game.react(new TimeEvent(lookingForPlayersWindow));
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

    kill(killer: string, killee: string) : GameTestHelper {
        this.game.react(new WhisperEvent(killer, `!kill ${killee}`));
        return this;
    }

    expectWhisper(user: string, expected: string) : GameTestHelper {
        expect(this.chatClient.buffer[user]).toContain(expected);
        return this;
    }

    expectNotWhisper(user: string, expected: string) : GameTestHelper {
        expect(this.chatClient.buffer[user]).not.toContain(expected);
        return this;
    }

    expectChat(expected: string) : GameTestHelper {
        expect(this.chatClient.buffer[this.game.channel]).toContain(expected);
        return this;
    }

    expectNotChat(notExpected: string) : GameTestHelper {
        expect(this.chatClient.buffer[this.game.channel]).not.toContain(notExpected);
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
    gameSetup.expectChat("Current players: jon, alex, ogtega");
});

it('does not allow a user to join twice', () => { 
    const gameSetup = new GameTestHelper();
    gameSetup.joinPlayers(['alex', 'alex']);
    gameSetup.expectChat("Current players: jon, alex");
});

it('fails to start without enough people', () => { 
    const gameSetup = new GameTestHelper();
    gameSetup.joinPlayers(['alex']);
    gameSetup.startGame();
    gameSetup.expectChat("Not enough players to start a game. Must be at least 5!");
});

it('starts with enough people', () => {
    const gameSetup = new GameTestHelper();
    gameSetup.startWithPlayers();
    gameSetup.expectChat("It's daytime. The evil Kappa s are among you, figure out who you think they are, and type !vote <username> to vote to knock 'em out.");
});

it('tallies votes', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .vote('alex', 'ian025')
        .vote('galacticRaven', 'ian025')
        .expectChat("ian025: 2");
});

it('voting twice means the last vote is the one that counts', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .vote('alex', 'ian025')
        .expectChat("ian025: 1")
        .vote('alex', 'jon')
        .expectChat("jon: 1");
});

it('cant vote for yourself', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .vote('alex', 'alex')
        .expectChat("You can't vote for yourself!");
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
        .expectChat("alex is dead, may they sheep in peace.");
});

it('whispers everyone with your role after game start', () => {
    const gameSetup = new GameTestHelper();
    gameSetup
        .startWithPlayers()
        .expectWhisper('alex', 'Hey! Your role is Mafia.')
        .expectWhisper('jon', 'Hey! Your role is Mafia.')
        .expectWhisper('galacticRaven', 'Hey! Your role is Sheeple.')
        .expectWhisper('ian025', 'Hey! Your role is Sheeple.')
        .expectWhisper('ogtega', 'Hey! Your role is Sheeple.');
});

it('dead people cannot vote', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex');

    gameSetup
        // alex should die here
        .vote('alex', 'jon');

        // assert that alex's vote didn't count
        let voteTally = gameSetup.game.voteTally();
        expect(voteTally['jon']).toBeUndefined();
});

it('people not in the game cannot vote', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex');

    gameSetup
        // alex should die here
        .vote('ensYde', 'jon');

        // assert that ensYde's vote didn't count
        let voteTally = gameSetup.game.voteTally();
        expect(voteTally['jon']).toBeUndefined();
});

it('mafia cannot kill dead people', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex');

    // alex is dead because he was voted off above

    // alex is dead, jon (mafia) shouldn't be able to kill him
    gameSetup
        .kill('jon', 'alex')
        .expectWhisper('jon', 'You cannot kill dead people.');
});

it('first mafia kill wins', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex');

    // alex is dead because he was voted off above

    // alex is dead, jon (mafia) shouldn't be able to kill him
    gameSetup
        .kill('jon', 'ian025')
        .expectChat('ian025 has been killed by the Mafiosos dead.');
});


it('mafia cannot kill people people who arent even playing', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex');

    // alex is dead because he was voted off above

    // alex is dead, jon (mafia) shouldn't be able to kill him
    gameSetup
        .kill('jon', 'subconix')
        .expectWhisper('jon', 'That person is not playing!');
});

it('dead mafia dont get whispered', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex');

    // alex is dead because he was voted off above

    // alex is dead, jon (mafia) shouldn't be able to kill him
    gameSetup
        .expectNotWhisper('alex', 'Time to kill. Use !kill <username> to kill someone, you evil mafia person you.');
});

it('becomes nighttime when voting ends', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex');

    // alex is dead because he was voted off above

    gameSetup
        .expectChat('Night time has started.');
});

it('mafia get whispered', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex');

    // alex is dead because he was voted off above

    gameSetup
        .expectWhisper('jon', 'Time to kill. Use !kill <username> to kill someone, you evil mafia person you.');
});

it('when all mafia are dead, sheeple win', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'jon')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'alex')
        .vote('ogtega', 'alex')
        .vote('jon', 'alex')
        // alex is dead because he was voted off above
        .kill('jon', 'galacticRaven')
        .vote('ian025', 'jon')
        .vote('ogtega', 'jon')
        .vote('jon', 'ogtega');
        // jon dies, last remaining mafioso

    gameSetup
        .expectChat('Sheeple win!');
});

it('if all sheeple are dead, mafia win', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'galacticRaven')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'galacticRaven')
        .vote('ogtega', 'galacticRaven')
        .vote('jon', 'galacticRaven')
        // galacticRaven is dead because he was voted off above
        .kill('jon', 'ian025')
        // ian025 is dead
        .vote('alex', 'ogtega')
        .vote('ogtega', 'jon')
        .vote('jon', 'ogtega');
        // ogtega dies, no more sheeple

    gameSetup
        .expectChat('Mafiosos win!');
});

// TODO: Can't vote while in night time
it('can\'t while in night time', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .vote('alex', 'galacticRaven')
        .vote('galacticRaven', 'alex')
        .vote('ian025', 'galacticRaven')
        .vote('ogtega', 'galacticRaven')
        .vote('jon', 'galacticRaven')
        .vote('alex', 'ian025');
        // galacticRaven is dead because he was voted off above
        // We are now in nighttime so user votes aren't counted 
        // or responded to

    // assert that alex's last vote didn't count
    let voteTally = gameSetup.game.voteTally();
    expect(voteTally).toMatchObject({});
});

it('can\'t join after the game is started', () => {
    let gameSetup = new GameTestHelper();
    gameSetup = gameSetup
        .startWithPlayers()
        .joinPlayers(['herrow12']);

    expect(gameSetup.playerStateManager.getPlayers().length).toBe(5);
});