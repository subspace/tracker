import crypto from '@subspace/crypto'
import EventEmitter from 'events'
import {getClosestIdByXor} from '@subspace/utils';
import {IFailureObject, IEntryObject, IJoinObject, ILeaveObject, IReJoinObject, IHostLeaveMessage} from "./interfaces";


// TODO
  // implement light_host and light_client trackers
  // implement pending_join protocol for atomic joins
  // implement anti-entropy for periodic comparisons instead of merge
  // implement parsec on failure
  // devise countermeasure to parallel farming

export default class Tracker extends EventEmitter {
  lht: Map <string, IEntryObject>
  memDelta: Map <string, (string | number)[]>

  constructor(
    public storage: any,
    public wallet: any
  ) {
    super()
    this.init()
  }

  private async init () {
    // decides if to create or load the lht
    let lht: string = await this.storage.get('lht')
    if (lht) {
      this.loadLht(lht)
    } else {
      this.lht = new Map()
    }

    setInterval( () => {
      const string_lht: string = JSON.stringify([...this.lht])
      this.storage.set('lht', string_lht)
    }, 6000000) // save every hour

    return
  }

  public loadLht(lht: any) {
    this.lht = new Map(JSON.parse(lht))
    return
  }

  public async createPendingJoinMessage() {

  }

  public async createFullJoinmessage() {

  }

  public async createLeaveMessage() {

  }

  public async createFailureMessage() {
    
  }

  private async createHostLeaveMessage(): Promise<IHostLeaveMessage> {
    const profile = this.wallet.getProfile()

    let message: IHostLeaveMessage = {
      version: 0,
      type: 'host-leave',
      sender: profile.id,
      timestamp: Date.now(),
      publicKey: profile.publicKey,
      signature: null
    }
    message.signature = await crypto.sign(message, profile.privateKeyObject)
    return message
  }

  addEntry(node_id: string, join: IJoinObject) {
    // assumes entry is validated in message

    var entry: IEntryObject = {
      hash: null,
      public_key: join.public_key,
      pledge: join.pledge,
      proof_hash: join.proof_hash,
      public_ip: join.public_ip,
      isGateway: join.isGateway,
      timestamp: join.timestamp,
      status: true,
      uptime: 0,
      log: [join]
    }

    entry.hash = crypto.getHash(JSON.stringify(entry))
    this.lht.set(node_id, entry)
    return
  }

  getEntry(node_id: string) {
    const entry: IEntryObject = this.lht.get(node_id)
    return entry
  }

  updateEntry(update: ILeaveObject | IFailureObject | IReJoinObject) {
    let entry = this.getEntry(update.node_id)

    if (update.type === 'leave' || update.type === 'failure') {
      entry.uptime += update.timestamp - entry.timestamp
      entry.status = false
    } else if (update.type === 'rejoin') {
      entry.status = true
    }

    entry.timestamp = update.timestamp
    entry.log.push(update)
    entry.hash = null
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
    const has = this.lht.has(node_id)
    return has
  }

  getLength() {
    const length = this.lht.size
    return length
  }

  getNodeIds() {
    // returns an array of all node ids in the lht
    const node_ids: string[] = [...this.lht.keys()]
    // const node_ids = this.lht.keys() // alternative way
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
    // TODO: Remove HEX encoding/decoding once we move to `Uint8Array`s
    const ownId = Buffer.from(my_node_id, 'hex');
    const allNodes = this.getNodeIds().map(id => {
      return Buffer.from(id, 'hex');
    });

    const candidates: Uint8Array[] = allNodes.slice();
    // We take `log2(numberOfNodes)`, but not less than 4 and not more than total number of nodes available
    const nodesToReturn = Math.min(
      Math.max(
        4,
        Math.round(
            Math.log2(this.getLength())
        )
      ),
      candidates.length
    );
    const halfNodesToReturn = Math.floor(nodesToReturn / 2);

    const closestIds: Uint8Array[] = [];

    let hashedId = ownId;
    /**
     * `halfNodesToReturn` closest Ids to my own ID
     */
    for (let i = 0; i < halfNodesToReturn; ++i) {
      hashedId = Buffer.from(crypto.getHash(hashedId.toString('hex')), 'hex');
      const closest = getClosestIdByXor(hashedId, candidates);
      closestIds.push(closest);
      // Remove closest node from future candidates
      candidates.splice(candidates.indexOf(closest), 1);
    }

    /**
     * `halfNodesToReturn` nodes to which my own ID is closest
     */
    let hashedCandidates = candidates;
    const ownIdString = ownId.join(',');
    // Go at most `halfNodesToReturn` levels deep
    getNodesNeighbors: for (let i = 0; i < halfNodesToReturn; ++i) {
      // Hash all of the candidates IDs again in order to go one level deeper
      hashedCandidates = hashedCandidates.map(candidate => {
        return Buffer.from(crypto.getHash(Buffer.from(candidate).toString('hex')), 'hex');
      });

      // Check current level for each candidate
      const length = candidates.length;
      for (let i = 0; i < length; ++i) {
        const hashedCandidate = hashedCandidates[i];
        const closest = getClosestIdByXor(hashedCandidate, allNodes);

        if (closest.join(',') === ownIdString) {
          closestIds.push(candidates[i]);
          if (closestIds.length === nodesToReturn) {
            // We've got enough neighbors, exit
            break getNodesNeighbors;
          }
          // Remove closest node from future candidates
          hashedCandidates.splice(i, 1);
        }
      }
    }

    return closestIds
      .map(id => {
        return Buffer.from(id).toString('hex');
      });
  }

  parseUpdate(update: ILeaveObject | IFailureObject | IReJoinObject) {
    const array: (string | number)[] = Object.values(update)
    const arrayString: string = array.toString()
    const hash: string = crypto.getHash(arrayString)
    return { array, hash }
  }

  addDelta(update: ILeaveObject | IFailureObject | IReJoinObject) {
    // parse object and add to memdelta for gossip to neighbors
    const parsed = this.parseUpdate(update)
    this.memDelta.set(parsed.hash, parsed.array)
    return
  }

  removeDelta(update: ILeaveObject | IFailureObject | IReJoinObject) {
    // remove an update from the memdelta by hash
    const hash: string = this.parseUpdate(update).hash
    this.memDelta.delete(hash)
    return
  }

  inMemDelta(update: ILeaveObject | IFailureObject | IReJoinObject) {
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
