export interface joinObject {
  type: string,
  node_id: string,
  public_key: string,
  pledge: number,
  proof_hash: string,
  public_ip: string,
  timestamp: number,
  signature: string
}

export interface leaveObject {
  type: string,
  node_id: string,
  timestamp: number,
  previous: string,
  signature: string
}

export interface reJoinObject {
  type: string,
  node_id: string,
  timestamp: number,
  previous: string,
  signature: string
}

export interface signatureObject {
  node_id: string,
  timestamp: number,
  signature: string
}

export interface failureObject {
  type: string,
  node_id: string,
  timestamp: number,
  previous: string,
  signatures: signatureObject[]
}

export interface entryObject {
  hash: string,
  public_key: string,
  pledge: number, 
  proof_hash: string,
  public_ip: string,
  timestamp: number,
  status: boolean,
  balance: number
  log: (joinObject | leaveObject | reJoinObject | failureObject)[],
}

