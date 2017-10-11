export class PlayerStateManager {
    players: Array<string>;
    deadPlayers: Array<string>;

    constructor() {
        this.players = [];
        this.deadPlayers = [];
    }

    join(user: string) : boolean {
        if (this.hasPlayer(user)) return false;
        this.players.push(user);
        return true;
    }

    hasPlayer(user: string) : boolean {
        return this.players.includes(user);
    }

    kill(user: string) : boolean {
        if (!this.hasPlayer(user)) return false;
        this.players = this.players.filter(p => p !== user);
        this.deadPlayers.push(user);
        return true;
    }

    playersAlive(playerType) {
        //this.players[playerType].length;
    }

}
    