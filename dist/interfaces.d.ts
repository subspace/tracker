export interface IUpdateObject {
    type: 'join' | 'leave' | 'failure';
    nodeId: string;
    timestamp: number;
}
export interface IJoinObject extends IUpdateObject {
    type: 'join';
    publicKey: string;
    pledge: number;
    proofHash: string;
    publicIp: string;
    tcpPort: number;
    wsPort: number;
    isGateway: boolean;
    signature: string;
    signatures: INeighborProof[];
}
export interface INeighborProof {
    host: string;
    neighbor: string;
    timestamp: number;
    signature: string;
}
export interface ILeaveObject extends IUpdateObject {
    type: 'leave';
    previous: string;
    signature: string;
}
export interface ISignatureObject {
    nodeId: string;
    publicKey: string;
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
    pledgeTx: string;
    pledge: number;
    proofHash: string;
    publicIp: string;
    tcpPort: number;
    wsPort: number;
    isGateway: boolean;
    createdAt: number;
    updatedAt: number;
    interval: number;
    status: boolean;
    uptime: number;
    log: (IJoinObject | ILeaveObject | IFailureObject)[];
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
    type: 'host-leave' | 'host-join' | 'host-failure';
}
