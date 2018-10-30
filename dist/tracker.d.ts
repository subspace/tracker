/// <reference types="node" />
import EventEmitter from 'events';
import { IFailureObject, IEntryObject, IJoinObject, ILeaveObject, IReJoinObject, IHostMessage } from "./interfaces";
import Wallet from '@subspace/wallet';
import { Ledger } from '@subspace/ledger';
import Storage from '@subspace/storage';
export declare class Tracker extends EventEmitter {
    storage: Storage;
    wallet: Wallet;
    ledger: Ledger;
    lht: Map<string, IEntryObject>;
    memDelta: Map<string, (string | number)[]>;
    constructor(storage: Storage, wallet: Wallet, ledger: Ledger);
    private init;
    loadLht(lht: string): void;
    createPendingJoinMessage(): Promise<IHostMessage>;
    isValidPendingJoinMessage(message: IHostMessage): Promise<true | {
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
    isValidHostMessage(message: IHostMessage): Promise<boolean>;
    addEntry(node_id: string, join: IJoinObject): void;
    getEntry(node_id: string): IEntryObject;
    updateEntry(update: ILeaveObject | IFailureObject | IReJoinObject): void;
    removeEntry(nodeId: string): void;
    hasEntry(nodeId: string): boolean;
    getLength(): number;
    getNodeIds(): string[];
    getNeighbors(myNodeIds: string): string[];
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
