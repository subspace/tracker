/// <reference types="node" />
import EventEmitter from 'events';
import { IFailureObject, IEntryObject, IJoinObject, ILeaveObject, IReJoinObject, IHostMessage } from "./interfaces";
export default class Tracker extends EventEmitter {
    storage: any;
    wallet: any;
    lht: Map<string, IEntryObject>;
    memDelta: Map<string, (string | number)[]>;
    constructor(storage: any, wallet: any);
    private init;
    loadLht(lht: any): void;
    createPendingJoinMessage(): Promise<IHostMessage>;
    createFullJoinmessage(): Promise<IHostMessage>;
    createLeaveMessage(): Promise<IHostMessage>;
    createFailureMessage(host: string): Promise<IHostMessage>;
    isValidHostMessage(message: IHostMessage): Promise<boolean>;
    addEntry(node_id: string, join: IJoinObject): void;
    getEntry(node_id: string): IEntryObject;
    updateEntry(update: ILeaveObject | IFailureObject | IReJoinObject): void;
    removeEntry(node_id: string): void;
    hasEntry(node_id: string): boolean;
    getLength(): number;
    getNodeIds(): string[];
    getNeighbors(my_node_id: string): string[];
    parseUpdate(update: ILeaveObject | IFailureObject | IReJoinObject): {
        array: (string | number)[];
        hash: string;
    };
    addDelta(update: ILeaveObject | IFailureObject | IReJoinObject): void;
    removeDelta(update: ILeaveObject | IFailureObject | IReJoinObject): void;
    inMemDelta(update: ILeaveObject | IFailureObject | IReJoinObject): boolean;
    hasDelta(): boolean;
    getDelta(): (string | number)[][];
    clearDelta(): void;
}
