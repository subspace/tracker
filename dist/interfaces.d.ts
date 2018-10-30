export interface IUpdateObject {
    type: 'join' | 'leave' | 'failure' | 'rejoin';
    nodeId: string;
    timestamp: number;
}
export interface IJoinObject extends IUpdateObject {
    type: 'join';
    publicKey: string;
    pledge: number;
    proofHash: string;
    publicIp: string;
    isGateway: boolean;
    signature: string;
}
export interface ILeaveObject extends IUpdateObject {
    type: 'leave';
    previous: string;
    signature: string;
}
export interface IReJoinObject extends IUpdateObject {
    type: 'rejoin';
    previous: string;
    signature: string;
}
export interface ISignatureObject {
    nodeId: string;
    timestamp: number;
    signature: string;
}
export interface IFailureObject extends IUpdateObject {
    type: 'failure';
    previous: string;
    signatures: ISignatureObject[];
}
export interface IEntryObject {
    hash: string;
    publicKey: string;
    pledge: number;
    proofHash: string;
    publicIp: string;
    isGateway: boolean;
    timestamp: number;
    status: boolean;
    uptime: number;
    log: (IJoinObject | ILeaveObject | IReJoinObject | IFailureObject)[];
}
export interface IMessage {
    version: number;
    type: string;
    timestamp: number;
    data?: any;
    sender: string;
    publicKey: string;
    signature: string | null;
}
export interface IHostMessage extends IMessage {
    type: 'host-leave' | 'host-join' | 'host-full-join' | 'host-failure';
}
