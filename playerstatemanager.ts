export const enum PlayerRole {
    Mafia,
    Sheep
}

class Player {
    user: string;
    alive: boolean;
    role: PlayerRole;
    strawLength: number;

    constructor(user: string, role?: PlayerRole) {
        this.user = user;
        this.alive = true;
        if (role) this.role = role;
    }

    kill() {
        this.alive = false;
    }
}

export default class PlayerStateManager {
    players: Array<Player>;

    constructor() {
        this.players = [];
    }

    join(user: string) : boolean {
        if (this.hasPlayer(user)) return false;
        this.players.push(new Player(user));
        return true;
    }

    hasPlayer(user: string, alive?: boolean) : boolean {
        if (!alive) alive = true;
        return this.players
                .find(u => u.user == user && u.alive == alive) != undefined;
    }

    setPlayers(playas: Map<string, PlayerRole>) {
        playas.forEach((role: PlayerRole, name: string) => {
            this.players.push(new Player(name, role));
        });
    }

    getPlayers() {
        return this.players.map(p => p.user);
    }

    getMafiosos() {
        return this.getPlayersByRole(PlayerRole.Mafia);
    }

    getSheeple() {
        return this.getPlayersByRole(PlayerRole.Sheep);
    }

    getPlayersByRole(role: PlayerRole) {
        return this.players.filter(u => u.role == role);
    }

    kill(user: string) : boolean {
        if (!this.hasPlayer(user)) return false;
        const playerToKill = this.players.find(p => p.user == user);
        playerToKill.kill();
        return true;
    }

    assignRoles() {
        if (this.players[0].role == undefined) return;

        this.players.forEach(
            p => p.strawLength = Math.floor(Math.random() * 100) + 1);
        this.players.sort((a, b) => b.strawLength - a.strawLength);
        this.players.forEach(p => p.role = PlayerRole.Sheep);
        this.players[0].role = PlayerRole.Mafia;
        this.players[1].role = PlayerRole.Mafia;
    }
}
    