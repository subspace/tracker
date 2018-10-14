export interface updateObject {
  type: 'join' | 'leave' | 'failure' | 'rejoin'
  node_id: string
  timestamp: number
}

export interface IJoinObject extends updateObject {
  type: 'join'
  public_key: string
  pledge: number
  proof_hash: string
  public_ip: string
  isGateway: boolean
  signature: string
}

export interface ILeaveObject extends updateObject {
  type: 'leave'
  previous: string
  signature: string
}

export interface IReJoinObject extends updateObject {
  type: 'rejoin'
  previous: string
  signature: string
}

export interface signatureObject {
  node_id: string
  timestamp: number
  signature: string
}

export interface IFailureObject extends updateObject {
  type: 'failure'
  previous: string
  signatures: signatureObject[]
}

export interface IEntryObject {
  hash: string
  public_key: string
  pledge: number
  proof_hash: string
  public_ip: string
  isGateway: boolean
  timestamp: number
  status: boolean
  uptime: number
  log: (IJoinObject | ILeaveObject | IReJoinObject | IFailureObject)[]
}

