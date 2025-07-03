import { Table } from "./table.mts"
import { Game as PbdGame } from "./pbd/game.mts";

export interface GameState
{
    reloadAsync() : Promise<GameState>;
    setupTable(table:Table): void;
}

export function loadPbdGameStateAsync(name:string) : Promise<GameState>
{
    return new PbdGame(name).reloadAsync();
}