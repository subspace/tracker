/// <reference types="node" />
import EventEmitter from 'events';
import { IFailureObject, IEntryObject, IJoinObject, ILeaveObject, IHostMessage, ISignatureObject, IMessage, INeighborProof } from "./interfaces";
export { IHostMessage, IJoinObject, ILeaveObject, IFailureObject, ISignatureObject, IEntryObject };
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
    clearLht(): void;
    isValidNeighborRequest(message: IMessage): Promise<{
        valid: boolean;
        reason: string;
    }>;
    createJoinMessage(publicIp: string, tcpPort: number, wsPort: number, isGateway: boolean, signatures: INeighborProof[]): Promise<IHostMessage>;
    isValidJoinMessage(): Promise<void>;
    createLeaveMessage(): Promise<IHostMessage>;
    isValidLeaveMessage(): Promise<void>;
    createFailureMessage(nodeId: string): Promise<IHostMessage>;
    signFailureMessage(failureMessage: IFailureObject): Promise<ISignatureObject>;
    compileFailureMessage(nodeId: string, timestamp: number, signatures: ISignatureObject[]): Promise<IHostMessage>;
    isValidFailureMessage(): Promise<void>;
    addEntry(txRecord: Record): void;
    getEntry(node_id: string): IEntryObject;
    updateEntry(update: ILeaveObject | IFailureObject | IJoinObject): void;
    removeEntry(nodeId: string): void;
    hasEntry(nodeId: string): boolean;
    getLength(): number;
    getAllHosts(): string[];
    getActiveHosts(): string[];
    getNeighbors(sourceId: string, validHosts: string[], count?: number): string[];
    parseUpdate(update: ILeaveObject | IFailureObject | IJoinObject): {
        array: (string | number)[];
        hash: string;
    };
    addDelta(update: ILeaveObject | IFailureObject | IJoinObject): void;
    removeDelta(update: ILeaveObject | IFailureObject | IJoinObject): boolean;
    inMemDelta(update: ILeaveObject | IFailureObject | IJoinObject): boolean;
    hasDelta(): boolean;
    getDelta(): (string | number)[][];
    clearDelta(): void;
}
