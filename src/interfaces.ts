export interface updateObject {
  type: 'join' | 'leave' | 'failure' | 'rejoin'
  node_id: string
  timestamp: number
}

export interface joinObject extends updateObject {
  type: 'join'
  public_key: string
  pledge: number
  proof_hash: string
  public_ip: string
  isGateway: boolean
  signature: string
}

export interface leaveObject extends updateObject {
  type: 'leave'
  previous: string
  signature: string
}

export interface reJoinObject extends updateObject {
  type: 'rejoin'
  previous: string
  signature: string
}

export interface signatureObject {
  node_id: string
  timestamp: number
  signature: string
}

export interface failureObject extends updateObject {
  type: 'failure'
  previous: string
  signatures: signatureObject[]
}

export interface entryObject {
  hash: string
  public_key: string
  pledge: number
  proof_hash: string
  public_ip: string
  isGateway: boolean
  timestamp: number
  status: boolean
  uptime: number
  log: (joinObject | leaveObject | reJoinObject | failureObject)[]
}

