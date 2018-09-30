const crypto = require('@subspace/crypto')
import EventEmitter from 'events'
import * as interfaces from './interfaces'
import {getClosestIdsByXor} from "@subspace/utils";


// TODO
  // implement light_host and light_client trackers
  // implement pending_join protocol for atomic joins
  // implement anti-entropy for periodic comparisons instead of merge
  // implement parsec on failure
  // devise countermeasure to parrallel farming

class Tracker extends EventEmitter {
  lht: Map <string, interfaces.entryObject>
  memDelta: Map <string, (string | number)[]>

  constructor(storage: any) {
    super()
    this.init(storage)
  }

  private async init (storage: any) {
    // decides if to create or load the lht
    let lht: string = await storage.get('lht')
    if (lht) {
      this.lht = new Map(JSON.parse(lht))
    } else {
      this.lht = new Map()
    }

    setInterval( () => {
      const string_lht: string = JSON.stringify([...this.lht])
      storage.set('lht', string_lht)
    }, 6000000) // save every hour

    return
  }

  addEntry(node_id: string, join: interfaces.joinObject) {
    // assumes entry is validated in message

    var entry: interfaces.entryObject = {
      hash: null,
      public_key: join.public_key,
      pledge: join.pledge,
      proof_hash: join.proof_hash,
      public_ip: join.public_ip,
      timestamp: join.timestamp,
      status: true,
      balance: 0,
      log: [join]
    }

    entry.hash = crypto.getHash(JSON.stringify(entry))
    this.lht.set(node_id, entry)
    return
  }

  getEntry(node_id: string) {
    const entry: interfaces.entryObject = this.lht.get(node_id)
    return entry
  }

  updateEntry(update: interfaces.leaveObject | interfaces.failureObject | interfaces.reJoinObject) {
    let entry = this.getEntry(update.node_id)

    if (update.type === 'leave' || update.type === 'failure') {
      entry.balance += update.timestamp - entry.timestamp
      entry.status = false
    } else if (update.type === 'rejoin') {
      entry.status = true
    }

    entry.timestamp = update.timestamp
    entry.log.push(update)
    entry.hash = crypto.getHash(JSON.stringify(entry))
    this.lht.set(update.node_id, entry)
    return

  }

  removeEntry(node_id: string) {
    // if host expires, when?

    this.lht.delete(node_id)
    return
  }

  hasEntry(node_id: string) {
    const has: boolean = this.lht.has(node_id)
    return has
  }

  getLength() {
    const length: number = this.lht.size
    return length
  }

  getNodeIds() {
    // returns an array of all node ids in the lht
    const node_ids: string[] = [...this.lht.keys()]
    return node_ids
  }

  getNeighbors(my_node_id: string): string[] {
    // generate an array of node_ids based on the current membership set
    // default number (N) is log(2)(tracker_length), but no less than four
    // for my direct neighbors that I will connect to (first N/2)
      // hash my id n times where n is neighbor I am selecting in the sequence
      // find the node closest to my hashed id by XOR
      // add node_id to my neighbor array
    // for my indirect neighbors who will connect to me (second N/2)
      // hash each node_id n/2 times and compile into a single array
      // for each element in the array find the closest node_id by XOR
      // if my id is one of those then add to my neighbor array
    // TODO: This takes all neighbors from `this.lht`
    const nodesToReturn = Math.max(
      4,
      Math.round(
        Math.log2(this.getLength())
      )
    )
    // Hack: we mess with `Buffer` because `getClosestIdsByXor()` works with binary `Uint8Array`
    const ownId = Buffer.from(my_node_id, 'hex')
    return (
      getClosestIdsByXor(
        ownId,
        this.getNodeIds().map(id => Buffer.from(id, 'hex')),
        nodesToReturn
      )
      .map(id => Buffer.from(id).toString('hex'))
    )
  }

  parseUpdate(update: interfaces.leaveObject | interfaces.failureObject | interfaces.reJoinObject) {
    const array: (string | number)[] = Object.values(update)
    const arrayString: string = array.toString()
    const hash: string = crypto.getHash(arrayString)
    return { array, hash }
  }

  addDelta(update: interfaces.leaveObject | interfaces.failureObject | interfaces.reJoinObject) {
    // parse object and add to memdelta for gossip to neighbors
    const parsed = this.parseUpdate(update)
    this.memDelta.set(parsed.hash, parsed.array)
    return
  }

  removeDelta(update: interfaces.leaveObject | interfaces.failureObject | interfaces.reJoinObject) {
    // remove an update from the memdelta by hash
    const hash: string = this.parseUpdate(update).hash
    this.memDelta.delete(hash)
    return
  }

  inMemDelta(update: interfaces.leaveObject | interfaces.failureObject | interfaces.reJoinObject) {
    // check if an update is in the delta
    const hash: string = this.parseUpdate(update).hash
    return this.memDelta.has(hash)
  }

  hasDelta() {
    // check if the delta is empty
    if (this.memDelta.size > 0) {
      return true
    } else {
      return false
    }
  }

  getDelta() {
    // returns all the updates in the delta for gossip as an array
    const deltas: ((string | number)[])[] = []
    this.memDelta.forEach((delta: (string | number)[], hash: string ) => {
      deltas.push(delta)
    })
    return deltas
  }

  clearDelta() {
    // emptys the delta
    this.memDelta.clear()
    return
  }

}

module.exports = Tracker
