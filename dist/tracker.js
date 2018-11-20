"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("@subspace/crypto"));
const events_1 = __importDefault(require("events"));
const utils_1 = require("@subspace/utils");
const database_1 = require("@subspace/database");
// TODO
// implement light_host and light_client trackers
// implement pending_join protocol for atomic joins
// implement anti-entropy for periodic comparisons instead of merge
// implement parsec on failure
// devise countermeasure to parallel farming
class Tracker extends events_1.default {
    constructor(storage, wallet, ledger) {
        super();
        this.storage = storage;
        this.wallet = wallet;
        this.ledger = ledger;
        this.init();
    }
    async init() {
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
        this.lht = new Map();
        return;
    }
    loadLht(lht) {
        this.lht = new Map(JSON.parse(lht));
    }
    clearLht() {
        this.lht = new Map();
    }
    // host messages and validation
    async isValidNeighborRequest(message) {
        // validate a pending join message received via gossip 
        const pledgeId = message.data;
        const test = {
            valid: false,
            reason: null
        };
        // validate the timestamp 
        if (!crypto.isDateWithinRange(message.timestamp, 600000)) {
            test.reason = 'Invalid neighbor request, timestamp out of range';
            return test;
        }
        // ensure the pledge tx has been published
        let txRecordValue = JSON.parse(await this.storage.get(pledgeId));
        let txRecord = null;
        if (!txRecordValue) {
            txRecordValue = this.ledger.validTxs.get(message.data);
            if (!txRecordValue) {
                test.reason = 'Invalid neighbor request, cannot locate pledge tx';
                return test;
            }
        }
        txRecord = database_1.Record.readPacked(pledgeId, txRecordValue);
        await txRecord.unpack(null);
        // ensure the pledge tx is a pledge tx
        if (!(txRecord.value.content.type === 'pledge')) {
            test.reason = 'Invalid neighbor request, host is not referencing a pledge tx';
        }
        // validate the host matches the pledge tx 
        if (!(txRecord.value.publicKey === message.publicKey)) {
            test.reason = 'Invalid neighbor request, host does not match pledge';
            return test;
        }
        // validate the signature
        if (!await crypto.isValidMessageSignature(message)) {
            test.reason = 'Invalid neighbor request, timestamp out of range';
            return test;
        }
        test.valid = true;
        return test;
    }
    async createJoinMessage(publicIP, isGateway, signatures) {
        const profile = this.wallet.getProfile();
        const pledge = this.wallet.profile.pledge;
        const join = {
            type: 'join',
            nodeId: profile.id,
            publicKey: profile.publicKey,
            pledge: pledge.size,
            proofHash: pledge.proof,
            publicIp: publicIP,
            isGateway: isGateway,
            timestamp: Date.now(),
            signature: null,
            signatures
        };
        join.signature = await crypto.sign(join, profile.privateKeyObject);
        let message = {
            version: 0,
            type: 'host-join',
            sender: profile.id,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            data: join,
            signature: null
        };
        message.signature = await crypto.sign(message, profile.privateKeyObject);
        return message;
    }
    async isValidJoinMessage() {
    }
    async createLeaveMessage() {
        const profile = this.wallet.getProfile();
        const leave = {
            type: 'leave',
            nodeId: profile.id,
            previous: null,
            timestamp: Date.now(),
            signature: null
        };
        leave.signature = await crypto.sign(leave, profile.privateKeyObject);
        let message = {
            version: 0,
            type: 'host-leave',
            sender: profile.id,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            data: leave,
            signature: null
        };
        message.signature = await crypto.sign(message, profile.privateKeyObject);
        return message;
    }
    async isValidLeaveMessage() {
    }
    async createFailureMessage(nodeId) {
        const profile = this.wallet.getProfile();
        const failure = {
            type: 'failure',
            nodeId: nodeId,
            previous: null,
            timestamp: Date.now(),
            signatures: []
        };
        const signatureObject = {
            nodeId: nodeId,
            publicKey: profile.publicKey,
            timestamp: Date.now(),
            signature: await crypto.sign(failure, profile.privateKeyObject)
        };
        failure.signatures.push(signatureObject);
        let message = {
            version: 0,
            type: 'host-failure',
            sender: profile.id,
            data: failure,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            signature: null
        };
        message.signature = await crypto.sign(message, profile.privateKeyObject);
        return message;
    }
    async signFailureMessage(failureMessage) {
        const profile = this.wallet.getProfile();
        const signatureObject = {
            nodeId: failureMessage.nodeId,
            publicKey: profile.publicKey,
            timestamp: Date.now(),
            signature: null
        };
        signatureObject.signature = await crypto.sign(signatureObject, profile.privateKeyObject);
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
        return signatureObject;
    }
    async compileFailureMessage(nodeId, timestamp, signatures) {
        const profile = this.wallet.getProfile();
        const failure = {
            type: 'failure',
            previous: null,
            nodeId,
            timestamp,
            signatures
        };
        let message = {
            version: 0,
            type: 'host-failure',
            sender: profile.id,
            data: failure,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            signature: null
        };
        message.signature = await crypto.sign(message, profile.privateKeyObject);
        return message;
    }
    async isValidFailureMessage() {
    }
    // LHT (tracker proper) methods
    addEntry(txRecord) {
        // add a new host to the LHT on valid pledge tx
        var entry = {
            hash: null,
            publicKey: txRecord.value.content.seed,
            pledgeTx: txRecord.key,
            pledge: txRecord.value.content.spacePledged,
            proofHash: txRecord.value.content.pledgeProof,
            publicIp: null,
            isGateway: null,
            createdAt: txRecord.value.createdAt,
            updatedAt: txRecord.value.createdAt,
            interval: txRecord.value.content.pledgeInterval,
            status: false,
            uptime: 0,
            log: []
        };
        entry.hash = crypto.getHash(JSON.stringify(entry));
        const nodeId = crypto.getHash(txRecord.value.content.seed);
        this.lht.set(nodeId, entry);
    }
    getEntry(node_id) {
        return this.lht.get(node_id);
    }
    updateEntry(update) {
        let entry = this.getEntry(update.nodeId);
        if (update.type === 'leave' || update.type === 'failure') {
            entry.uptime += update.timestamp - entry.updatedAt;
            entry.status = false;
        }
        else if (update.type === 'join') {
            entry.status = true;
        }
        if (update.type === 'join') {
            entry.isGateway = update.isGateway;
            entry.publicIp = update.publicIp;
        }
        entry.updatedAt = update.timestamp;
        entry.log.push(update);
        entry.hash = null;
        entry.hash = crypto.getHash(JSON.stringify(entry));
        this.lht.set(update.nodeId, entry);
    }
    removeEntry(nodeId) {
        // if host expires, when?
        this.lht.delete(nodeId);
    }
    hasEntry(nodeId) {
        return this.lht.has(nodeId);
    }
    getLength() {
        return this.lht.size;
    }
    getAllHosts() {
        // returns an array of all host on the lht
        return [...this.lht.keys()];
    }
    getActiveHosts() {
        // return an array of all active hosts on the lht
        const activeHosts = [];
        for (const [key, value] of this.lht) {
            if (value.status) {
                activeHosts.push(key);
            }
        }
        return activeHosts;
    }
    getNeighbors(sourceId, validHosts) {
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
        const candidates = allNodes.slice();
        // We take `log2(numberOfNodes)`, but not less than 4 and not more than total number of nodes available
        const nodesToReturn = Math.min(Math.max(4, Math.round(Math.log2(this.getLength()))), candidates.length);
        const halfNodesToReturn = Math.floor(nodesToReturn / 2);
        const closestIds = [];
        let hashedId = ownId;
        /**
         * `halfNodesToReturn` closest Ids to my own ID
         */
        for (let i = 0; i < halfNodesToReturn; ++i) {
            hashedId = Buffer.from(crypto.getHash(hashedId.toString('hex')), 'hex');
            const closest = utils_1.getClosestIdByXor(hashedId, candidates);
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
                const closest = utils_1.getClosestIdByXor(hashedCandidate, allNodes);
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
    parseUpdate(update) {
        const array = Object.values(update);
        const arrayString = array.toString();
        const hash = crypto.getHash(arrayString);
        return { array, hash };
    }
    addDelta(update) {
        // parse object and add to memdelta for gossip to neighbors
        const parsed = this.parseUpdate(update);
        this.memDelta.set(parsed.hash, parsed.array);
    }
    removeDelta(update) {
        // remove an update from the memdelta by hash
        return this.memDelta.delete(this.parseUpdate(update).hash);
    }
    inMemDelta(update) {
        // check if an update is in the delta
        return this.memDelta.has(this.parseUpdate(update).hash);
    }
    hasDelta() {
        // check if the delta is empty
        return this.memDelta.size > 0;
    }
    getDelta() {
        // returns all the updates in the delta for gossip as an array
        const deltas = [];
        this.memDelta.forEach((delta, hash) => {
            deltas.push(delta);
        });
        return deltas;
    }
    clearDelta() {
        // emptys the delta
        this.memDelta.clear();
    }
}
exports.Tracker = Tracker;
//# sourceMappingURL=tracker.js.map