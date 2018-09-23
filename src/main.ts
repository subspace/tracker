const crypto = require('subspace-crypto').default
const profile = require('subspace-profile').default
const EventEmitter = require('events')

// TODO
  // track connection uptime
  // implement anti-entropy for periodic comparisons instead of merge

// Purpose
  // Farmers must know uptime of hosts for payments
  // Clients must know the membership set to assigns shards and keys to hosts
  // Hosts must have to locate neighbors and track with parsec

// Concept
  // updates are dissemenated via signed gossip
    // add record -> join 
    // remove record -> expiration (of pledge)
    // update record -> leave (simple) or failure (complex)
  // periodically nodes will compare merkle roots and sync via anti-entropy 
  // different nodes will require different amounts of data in their tracker 

// example entry, each entry is ~ 96 bytes

// entry = {
//   key: publicAddress,  // 32 byte SHA256 hash of ECDSA public key
//   value: [
//     publicKey,         // 32 byte compressed ECDSA openPGP public key
//     timestamp,         // 4 byte unix timestamp
//     signature          // 24 byte openPGP detached signature
//   ]
// }



interface joinObject {
  node_id: string,
  publicKey: string,
  pledge: number,
  proof: string,
  timeStamp: number,
  signature: string
}

interface leaveObject {
  node_id: string,
  timeStamp: number,
  signature: string
}

interface signatureObject {
  node_id: string,
  signature: string
}

interface failureObject {
  node_id: string,
  timeStamp: number,
  signatures: signatureObject[]
}

interface updateObject {
  joins: joinObject[],
  leaves: leaveObject[],
  failures: failureObject[]
}

interface entryObject {
  publicKey: string,
  pledge: number,
  proof: string,
  public_ip: string,
  udp_port: number,
  timeStamp: number,
  signature: string
}

class Tracker extends EventEmitter {
  lht: Map <string, entryObject>

  constructor() {
    super()
  }

  async start (storage: any) {
    // decides if to create or load the lht
    let lht: string = await storage.get('lht')
    if (lht) {
      this.create_lht()
    } else {
      this.load_lht(storage, lht)
    }

    setInterval( () => {
      this.save_lht(storage)
    }, 6000000) // save every hour

    return
  }

  create_lht() {
    // creates a new lht if one does not exist
    this.lht = new Map()
  }

  async load_lht(storage: any, lht: any) {
    // loads the last lht from disk on restart, allowing host to have better knwoledge of gateway nodes
    this.lht = new Map(lht)
  }

  async save_lht (storage: any) {
    // persists lht to disk 
    const lht: any = Tracker.get_records()
    await storage.set('lht', lht)
    return
  }

  merge_lhts(lht: any) {
    // merges a persisted lht with an lht received from a gateway node
    const myMap: any = Tracker.lht
    const gatewayMap: any = new Map(lht)
    Tracker.lht = new Map([...myMap, ...gatewayMap])
  }

  set_member(nodeId: string, value: any[]) {
    // add a new member record to the lht on valid join
    if (nodeId !== profile.hexId) {
      this.lht.set(nodeId, value)
      console.log('Added a new member to the LHT')
    }
  }

  get_member(nodeId: string) {
    // retrieve an existing member record from the LHT by node id
    const record: object = this.lht.get(nodeId)
    return record
  }

  delete_member(nodeId: string) {
    // remove an existing member record from the LHT by node id on valid leave or failure
    this.lht.delete(nodeId)
  }

  has_member(nodeId: string) {
    // checks if a member is in the lht 
    const has: boolean = this.lht.has(nodeId)
    return has
  }

  get_length() {
    // returns the number of records in the LHT
    const length: number = this.lht.size
    return length
  }

  get_ids() {
    // returns an array of all node ids in the lht
    const ids: string[] = [...Tracker.lht.keys()]
    return ids
  }

  get_records() {
    // returns an array of all member records in the lht
    const records: object[] = [...Tracker.lht.entries()]
  }

  compute_neighbors() {
    // generate an array of node_ids based on the current membership set
  }

}

module.exports = Tracker