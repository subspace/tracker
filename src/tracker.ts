import * as crypto from '@subspace/crypto'
import * as EventEmitter from 'events'
import {getClosestIdByXor} from '@subspace/utils';
import {IFailureObject, IEntryObject, IJoinObject, ILeaveObject, IHostMessage, ISignatureObject, IMessage, INeighborProof} from "./interfaces"

export {IHostMessage, IJoinObject, ILeaveObject, IFailureObject, ISignatureObject, IEntryObject }

// dev deps for types only!
import Wallet from '@subspace/wallet'
import {Ledger, Block, Tx, ITxValue} from '@subspace/ledger'
import {DataBase, ImmutableRecord, MutableRecord } from '@subspace/database'
import Storage from '@subspace/storage'

// TODO
  // implement light_host and light_client trackers
  // implement pending_join protocol for atomic joins
  // implement anti-entropy for periodic comparisons instead of merge
  // implement parsec on failure
  // devise countermeasure to parallel farming

export class Tracker extends EventEmitter {
  validJoins: Set<string>
  inValidJoins: Set<string>
  lht: Map <string, IEntryObject>
  memDelta: Map <string, (string | number)[]>

  constructor(
    public storage: Storage,
    public wallet: Wallet,
    public ledger: Ledger
  ) {
    super()
    this.init()
  }

  private async init () {
    // decides if to create or load the lht
    // let lht = await this.storage.get('lht')
    // if (lht) {
    //   this.loadLht(lht)
    // } else {
    //   this.lht = new Map()
    // }

    // setInterval( () => {
    //   this.storage.put('lht', JSON.stringify([...this.lht]))
    // }, 6000000) // save every hour

    this.lht = new Map()

    return
  }

  public loadLht(lht: string) {
    this.lht = new Map(JSON.parse(lht))
  }

  public clearLht() {
    this.lht = new Map()
  }

  // host messages and validation


  public async isValidNeighborRequest(message: IMessage) {
    // validate a pending join message received via gossip
    const pledgeId: string = message.data
    const test = {
      valid: false,
      reason: <string> null
    }

    // validate the timestamp
    if (! crypto.isDateWithinRange(message.timestamp, 600000)) {
      test.reason = 'Invalid neighbor request, timestamp out of range'
      return test
    }

    // ensure the pledge tx has been published
    let tx = await this.ledger.txPool.getTxRecord(pledgeId)

    // ensure the pledge tx is a pledge tx
    if (!(tx.value.content.type === 'pledge')) {
      test.reason = 'Invalid neighbor request, host is not referencing a pledge tx'
    }

    // validate the host matches the pledge tx
    if (!(tx.value.content.publicKey === message.publicKey)) {
      test.reason = 'Invalid neighbor request, host does not match pledge'
      return test
    }

    // validate the signature
    if (! await crypto.isValidMessageSignature(message)) {
      test.reason = 'Invalid neighbor request, timestamp out of range'
      return test
    }

    test.valid = true
    return test
  }

  public async createJoinMessage(publicIp: string, tcpPort: number, wsPort: number, isGateway: boolean, signatures: INeighborProof[]) {
    const profile = this.wallet.getProfile()
    const pledge = this.wallet.profile.pledge

    const join: IJoinObject = {
      type: 'join',
      nodeId: profile.id,
      publicKey: profile.publicKey,
      pledge: pledge.size,
      proofHash: pledge.proof,
      publicIp,
      tcpPort,
      wsPort,
      isGateway,
      timestamp: Date.now(),
      signature: null,
      signatures
    }

    join.signature = await crypto.sign(join, profile.privateKeyObject)

    let message: IHostMessage = {
      version: 0,
      type: 'host-join',
      sender: profile.id,
      timestamp: Date.now(),
      publicKey: profile.publicKey,
      data: <IJoinObject> join,
      signature: null
    }

    message.signature = await crypto.sign(message, profile.privateKeyObject)
    return message
  }

  public async isValidJoinMessage() {
}

  public async createLeaveMessage() {
    const profile = this.wallet.getProfile()

    const leave: ILeaveObject = {
      type: 'leave',
      nodeId: profile.id,
      previous: null,
      timestamp: Date.now(),
      signature: null
    }

    leave.signature = await crypto.sign(leave, profile.privateKeyObject)

    let message: IHostMessage = {
      version: 0,
      type: 'host-leave',
      sender: profile.id,
      timestamp: Date.now(),
      publicKey: profile.publicKey,
      data: <ILeaveObject> leave,
      signature: null
    }
    message.signature = await crypto.sign(message, profile.privateKeyObject)
    return message
  }

  public async isValidLeaveMessage() {}

  public async createFailureMessage(nodeId: string) {
    const profile = this.wallet.getProfile()

    const timestamp = Date.now()
    const nonce = crypto.getHash(nodeId + profile.id + timestamp.toString())

    const failure: IFailureObject = {
      type: 'failure',
      nodeId: nodeId,
      nonce,
      previous: null,
      timestamp,
      signatures: []
    }

    const signatureObject: ISignatureObject = {
      nodeId,
      nonce,
      publicKey: profile.publicKey,
      timestamp,
      signature: null
    }

    signatureObject.signature = await crypto.sign(signatureObject, profile.privateKeyObject)

    failure.signatures.push(signatureObject)

    let message: IHostMessage = {
      version: 0,
      type: 'pending-failure-request',
      sender: profile.id,
      data: <IFailureObject> failure,
      timestamp: Date.now(),
      publicKey: profile.publicKey,
      signature: null
    }
    message.signature = await crypto.sign(message, profile.privateKeyObject)
    return message
  }

  public async signFailureMessage(failureMessage: IFailureObject) {
    const profile = this.wallet.getProfile()

    const signatureObject: ISignatureObject = {
      nodeId: failureMessage.nodeId,
      nonce: failureMessage.nonce,
      publicKey: profile.publicKey,
      timestamp: Date.now(),
      signature: null
    }

    signatureObject.signature = await crypto.sign(signatureObject, profile.privateKeyObject)

    // failureMessage.signatures.push(signatureObject)

    // let message: IHostMessage = {
    //   version: 0,
    //   type: 'host-failure',
    //   sender: profile.id,
    //   data: <IFailureObject> failureMessage,
    //   timestamp: Date.now(),
    //   publicKey: profile.publicKey,
    //   signature: null
    // }
    // message.signature = await crypto.sign(message, profile.privateKeyObject)
    return signatureObject
  }

  public async compileFailureMessage(nodeId: string, timestamp: number, nonce: string, signatures: ISignatureObject[]) {
    const profile = this.wallet.getProfile()

    const failure: IFailureObject = {
      type: 'failure',
      nodeId,
      nonce,
      previous: null,
      timestamp,
      signatures
    }

    let message: IHostMessage = {
      version: 0,
      type: 'host-failure',
      sender: profile.id,
      data: <IFailureObject> failure,
      timestamp: Date.now(),
      publicKey: profile.publicKey,
      signature: null
    }
    message.signature = await crypto.sign(message, profile.privateKeyObject)
    return message
  }

  public async isValidFailureMessage() {}

  // LHT (tracker proper) methods

  addEntry(tx: Tx) {
    // add a new host to the LHT on valid pledge tx

    var entry: IEntryObject = {
      hash: null,
      publicKey: tx.value.content.sender,
      pledgeTx: tx.key,
      pledge: tx.value.content.spacePledged,
      proofHash: tx.value.content.pledgeProof,
      publicIp: null,
      isGateway: null,
      wsPort: null,
      tcpPort: null,
      createdAt: tx.value.createdAt,
      updatedAt: tx.value.createdAt,
      interval: tx.value.content.pledgeInterval,
      status: false,
      uptime: 0,
      log: []
    }

    entry.hash = crypto.getHash(JSON.stringify(entry))
    const nodeId = crypto.getHash(tx.value.content.seed)
    this.lht.set(nodeId, entry)
  }

  getEntry(node_id: string) {
    return this.lht.get(node_id)
  }

  updateEntry(update: ILeaveObject | IFailureObject | IJoinObject) {
    let entry = this.getEntry(update.nodeId)

    if (update.type === 'leave' || update.type === 'failure') {
      entry.uptime += update.timestamp - entry.updatedAt
      entry.status = false
    } else if (update.type === 'join') {
      entry.status = true
    }

    if (update.type === 'join') {
      entry.isGateway = update.isGateway
      entry.publicIp = update.publicIp
      entry.tcpPort = update.tcpPort
      entry.wsPort = update.wsPort
    }

    entry.updatedAt = update.timestamp
    entry.log.push(update)
    entry.hash = null
    entry.hash = crypto.getHash(JSON.stringify(entry))
    this.lht.set(update.nodeId, entry)
  }

  removeEntry(nodeId: string) {
    // if host expires, when?

    this.lht.delete(nodeId)
  }

  hasEntry(nodeId: string) {
    return this.lht.has(nodeId)
  }

  getLength() {
    return this.lht.size
  }

  getAllHosts() {
    // returns an array of all host on the lht
    return [...this.lht.values()]
  }

  getActiveHosts() {
    // return an array of all active hosts on the lht
    const activeHosts: string[] = []
    for (const [key, value] of this.lht) {
      if (value.status) {
        activeHosts.push(key)
      }
    }
    return activeHosts
  }

  getHostNeighbors(hostId: string, activeHosts: string[], minHosts = 3): string[] {
    // select M direct neighbors (my side) out of N active host entries in the tracker

    // if less than min hosts, return all active hosts
    if (activeHosts.length <= minHosts) {
      return activeHosts.filter(host => host !== hostId)
    }

    // else set M as log(2) number of active hosts on the network
    const M = Math.max(
      minHosts,
      Math.floor(Math.log2(activeHosts.length))
    )

    // iteratively has myId N times
    let iterativeHash = crypto.getHash(hostId)
    const hashes: string[] = [iterativeHash]
    for( let i = M; i > 1; --i) {
      iterativeHash = crypto.getHash(iterativeHash)
      hashes.push(iterativeHash)
    }

    // find the closest host to each hash, filter out current neighbors
    const candidates = activeHosts.map(host => Buffer.from(host, 'hex'))
    const closestHosts: string[] = []
    for (let hash of hashes) {
      const closestHost = getClosestIdByXor(Buffer.from(hash, 'hex'), candidates)
      candidates.splice(candidates.indexOf(Buffer.from(closestHost)), 1)
      closestHosts.push(Buffer.from(closestHost).toString('hex'))
    }

    return closestHosts
  }

  getNeighbors(sourceId: string, validHosts: string[], count?: number): string[] {
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
    const ownId = Buffer.from(sourceId, 'hex');
    const allNodes = validHosts.map(id => {
      return Buffer.from(id, 'hex');
    });

    const candidates: Uint8Array[] = allNodes.slice();
    // We take `log2(numberOfNodes)`, but not less than 4 and not more than total number of nodes available
    let nodesToReturn: number
    if (count) {
      nodesToReturn = count
    } else {
      nodesToReturn = Math.min(
        Math.max(
          4,
          Math.round(
              Math.log2(this.getLength())
          )
        ),
        candidates.length
      );
    }

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

  // simple host mem pool implementation

  // pending join message -> gossip fast, let my neighbors know I want to connect
  // pending rejoin message -> gossip fast, let my neighbors know that I want to connect
  // these could both be the same message, either add or update tracker

  // in the meantime collect signatures from all neighbors
  // once you have all required signatures
  // what if my neighbors change during the transition period?
  // is each node fully validating that these are the correct neighbors?
  // when I join, everyones neighbors will potentially shift
  // is there a grace period for shifting neighbors

  // full join message -> prove neighborhood and add entry to LHT
  // full rejoin message -> prove neighborhood and restart time in LHT

  // leave message -> prove leave and pause timer in LHT
  // failure message -> my neighbors prove that I have left, pauses my time in LHT



  // memDelta methods
  parseUpdate(update: ILeaveObject | IFailureObject | IJoinObject) {
    const array: (string | number)[] = Object.values(update)
    const arrayString: string = array.toString()
    const hash: string = crypto.getHash(arrayString)
    return { array, hash }
  }

  addDelta(update: ILeaveObject | IFailureObject | IJoinObject) {
    // parse object and add to memdelta for gossip to neighbors
    const parsed = this.parseUpdate(update)
    this.memDelta.set(parsed.hash, parsed.array)
  }

  removeDelta(update: ILeaveObject | IFailureObject | IJoinObject) {
    // remove an update from the memdelta by hash
    return this.memDelta.delete(this.parseUpdate(update).hash)
  }

  inMemDelta(update: ILeaveObject | IFailureObject | IJoinObject) {
    // check if an update is in the delta
    return this.memDelta.has(this.parseUpdate(update).hash)
  }

  hasDelta() {
    // check if the delta is empty
    return this.memDelta.size > 0
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
  }

}
