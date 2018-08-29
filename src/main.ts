const crypto = require('subspace-crypto').default
const profile = require('subspace-profile').default

// TODO
  // create a storage adapter
  // track connection uptime
  // implement anti-entropy for periodic comparisons instead of merge

interface Updates {
  joins: any[],
  leaves: any[],
  failures: any[]
}

// example entry, each entry is ~ 96 bytes

// entry = {
//   key: publicAddress,  // 32 byte SHA256 hash of ECDSA public key
//   value: [
//     publicKey,         // 32 byte compressed ECDSA openPGP public key
//     timestamp,         // 4 byte unix timestamp
//     signature          // 24 byte openPGP detached signature
//   ]
// }

const Tracker = {
  lht: <any> null,
  start: async (storage: any) => {
    // decides if to create or load the lht
    let lht: string = await storage.get('lht')
    if (lht) {
      Tracker.create_lht()
    } else {
      Tracker.load_lht(lht)
    }

    setInterval( () => {
      Tracker.save_lht(storage)
    }, 6000000) // save every hour

    return
  },
  create_lht: () => {
    // creates a new lht if one does not exist
    Tracker.lht = new Map()
  },
  load_lht: (lht: any) => {
    // loads the last lht from disk on restart, allowing host to have better knwoledge of gateway nodes
    Tracker.lht = new Map(lht)
  },
  save_lht: async (storage: any) => {
    // persists lht to disk 
    const lht: any = Tracker.get_records()
    await storage.set('lht', lht)
    return
  },
  merge_lhts: (lht: any) => {
    // merges a persisted lht with an lht received from a gateway node
    const myMap: any = Tracker.lht
    const gatewayMap: any = new Map(lht)
    Tracker.lht = new Map([...myMap, ...gatewayMap])
  },
  set_member: (nodeId: string, value: any[]) => {
    // add a new member record to the lht on valid join
    if (nodeId !== profile.hexId) {
      Tracker.lht.set(nodeId, value)
      console.log('Added a new member to the LHT')
    }
  },
  get_member: (nodeId: string) => {
    // retrieve an existing member record from the LHT by node id
    const record: object = Tracker.lht.get(nodeId)
    return record
  },
  delete_member: (nodeId: string) => {
    // remove an existing member record from the LHT by node id on valid leave or failure
    Tracker.lht.delete(nodeId)
  },
  has_member: (nodeId: string) => {
    // checks if a member is in the lht 
    const has: boolean = Tracker.lht.has(nodeId)
    return has
  },
  get_length: () => {
    // returns the number of records in the LHT
    const length: number = Tracker.lht.size()
    return length
  },
  get_ids: () => {
    // returns an array of all node ids in the lht
    const ids: string[] = [...Tracker.lht.keys()]
    return ids
  },
  get_records: () => {
    // returns an array of all member records in the lht
    const records: object[] = [...Tracker.lht.entries()]
  },
  updates: <Updates> {
    joins: [],
    leaves: [],
    failures: []
  },
  addJoin: () => {
    // adds valid join to joins 

  },
  removeJoin: () => {

  },
  hasJoin: () => {

  }

  




}

export default Tracker