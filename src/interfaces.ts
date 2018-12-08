export interface IUpdateObject {
  type: 'join' | 'leave' | 'failure'
  nodeId: string
  timestamp: number
}

export interface IJoinObject extends IUpdateObject {
  type: 'join'
  publicKey: string
  pledge: number
  proofHash: string
  publicIp: string
  tcpPort: number
  wsPort: number
  isGateway: boolean
  signature: string
  signatures: INeighborProof[]
}

export interface INeighborProof {
  host: string
  neighbor: string
  timestamp: number
  signature: string
}

export interface ILeaveObject extends IUpdateObject {
  type: 'leave'
  previous: string
  signature: string
}

export interface ISignatureObject {
  nodeId: string
  publicKey: string
  timestamp: number
  signature: string
}

export interface IFailureObject extends IUpdateObject {
  type: 'failure'
  previous: string
  signatures: ISignatureObject[]
}

export interface IEntryObject {
  hash: string        // entry hash (for creating a merkle tree)
  publicKey: string   // public key of host
  pledgeTx: string    // id of pledge tx on the ledger
  pledge: number      // space pledged by host
  proofHash: string   // hash of proof of space
  publicIp: string    // publicIP of host
  tcpPort: number
  wsPort: number
  isGateway: boolean  
  createdAt: number   // when the pledge starts
  updatedAt: number   // when the entry was last updated
  interval: number    // pledge interval
  status: boolean     // on or off the network
  uptime: number      // cumulative uptime in ms
  log: (IJoinObject | ILeaveObject | IFailureObject)[]
  // activity log for host during this interval 
}

export interface IMessage {
  version: number
  type: string
  timestamp: number
  data?: any
  sender: string
  publicKey: string
  signature: string | null
}

export interface IHostMessage extends IMessage {
  type: 'host-leave'| 'host-join' | 'pending-failure-request' |'host-failure'
}

