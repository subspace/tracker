/// <reference types="node" />
import EventEmitter from 'events';
import { IFailureObject, IEntryObject, ILeaveObject, IReJoinObject, IHostMessage, IMessage } from "./interfaces";
import Wallet from '@subspace/wallet';
import { Ledger } from '@subspace/ledger';
import { Record } from '@subspace/database';
import Storage from '@subspace/storage';
export declare class Tracker extends EventEmitter {
    storage: Storage;
    wallet: Wallet;
    ledger: Ledger;
    validJoins: Set<string>;
    inValidJoins: Set<string>;
    lht: Map<string, IEntryObject>;
    memDelta: Map<string, (string | number)[]>;
    constructor(storage: Storage, wallet: Wallet, ledger: Ledger);
    private init;
    loadLht(lht: string): void;
    isValidNeighborRequestMessage(message: IMessage): Promise<true | {
        valid: boolean;
        reason: string;
    }>;
    createInitialJoinMessage(publicIP: string, isGateway: boolean): Promise<IHostMessage>;
    isValidInitialJoinMessage(): Promise<void>;
    createRejoinMessage(): Promise<IHostMessage>;
    isValidRejoinMessage(): Promise<void>;
    createLeaveMessage(): Promise<IHostMessage>;
    isValidLeaveMessage(): Promise<void>;
    createFailureMessage(): Promise<IHostMessage>;
    signFailureMessage(failureMessage: IFailureObject): Promise<IHostMessage>;
    isValidFailureMessage(): Promise<void>;
    addEntry(txRecord: Record): void;
    getEntry(node_id: string): IEntryObject;
    updateEntry(update: ILeaveObject | IFailureObject | IReJoinObject): void;
    removeEntry(nodeId: string): void;
    hasEntry(nodeId: string): boolean;
    getLength(): number;
    getAllHosts(): string[];
    getActiveHosts(): string[];
    getNeighbors(sourceId: string, validHosts: string[]): string[];
    parseUpdate(update: ILeaveObject | IFailureObject | IReJoinObject): {
        array: (string | number)[];
        hash: string;
    };
    addDelta(update: ILeaveObject | IFailureObject | IReJoinObject): void;
    removeDelta(update: ILeaveObject | IFailureObject | IReJoinObject): boolean;
    inMemDelta(update: ILeaveObject | IFailureObject | IReJoinObject): boolean;
    hasDelta(): boolean;
    getDelta(): (string | number)[][];
    clearDelta(): void;
}
