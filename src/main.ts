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

const Tracker = {
  lht: <any> null,
  open: (storage: object) => {
    // decides if to create or load the lht

  },
  create_lht: () => {
    // creates a new lht
    Tracker.lht = new Map()
  },
  load_lht: (lht_object: any) => {
    // loads the last lht from disk on restart
    // this allows for better control of known gateway nodes
    Tracker.lht = new Map(lht_object)
  },
  save_lht: async () => {
    // persists lht to disk based on a storage adapater
  },
  merge_lhts: () => {
    // merges a persisted lht with an lht received from a gateway node
  },
  set_member: () => {
    // add a new member record to the lht
    // on valid join
  },
  get_member: (nodeId: string) => {
    // retrieve an existing member record from the LHT by node id
  },
  delete_member: (nodeId: string) => {
    // remove an existing member record from the LHT by node id
    // on valid leave or failure
  },
  has_member: (nodeId: string) => {
    // checks if a member is in the lht 
  },
  get_length: () => {
    // returns the number of records in the LHT
  },
  get_ids: () => {
    // returns an array of all node ids in the lht
  },
  get_records: () => {
    // returns an array of all member records in the lht
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