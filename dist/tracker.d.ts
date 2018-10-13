/// <reference types="node" />
import EventEmitter from 'events';
import * as I from './interfaces';
export default class Tracker extends EventEmitter {
    storage: any;
    interfaces: any;
    lht: Map<string, I.entryObject>;
    memDelta: Map<string, (string | number)[]>;
    constructor(storage: any);
    private init;
    loadLht(lht: any): void;
    addEntry(node_id: string, join: I.joinObject): void;
    getEntry(node_id: string): I.entryObject;
    updateEntry(update: I.leaveObject | I.failureObject | I.reJoinObject): void;
    removeEntry(node_id: string): void;
    hasEntry(node_id: string): boolean;
    getLength(): number;
    getNodeIds(): string[];
    getNeighbors(my_node_id: string): string[];
    parseUpdate(update: I.leaveObject | I.failureObject | I.reJoinObject): {
        array: (string | number)[];
        hash: string;
    };
    addDelta(update: I.leaveObject | I.failureObject | I.reJoinObject): void;
    removeDelta(update: I.leaveObject | I.failureObject | I.reJoinObject): void;
    inMemDelta(update: I.leaveObject | I.failureObject | I.reJoinObject): boolean;
    hasDelta(): boolean;
    getDelta(): (string | number)[][];
    clearDelta(): void;
}
