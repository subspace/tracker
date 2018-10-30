"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("@subspace/crypto"));
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
        let lht = await this.storage.get('lht');
        if (lht) {
            this.loadLht(lht);
        }
        else {
            this.lht = new Map();
        }
        setInterval(() => {
            this.storage.put('lht', JSON.stringify([...this.lht]));
        }, 6000000); // save every hour
        return;
    }
    loadLht(lht) {
        this.lht = new Map(JSON.parse(lht));
    }
    // host messages and validation
    async createPendingJoinMessage() {
        const profile = this.wallet.getProfile();
        const pledgeTxId = this.wallet.profile.pledge.pledgeTx;
        let message = {
            version: 0,
            type: 'host-join',
            sender: profile.id,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            data: pledgeTxId,
            signature: null
        };
        message.signature = await crypto_1.default.sign(message, profile.privateKeyObject);
        return message;
    }
    async isValidPendingJoinMessage(message) {
        // validate a pending join message received via gossip 
        const pledgeId = message.data;
        const test = {
            valid: false,
            reason: null
        };
        // validate the timestamp 
        if (!crypto_1.default.isDateWithinRange(message.timestamp, 600000)) {
            test.reason = 'Invalid pending join, timestamp out of range';
            return test;
        }
        // ensure the pledge tx has been published
        let txRecordValue = JSON.parse(await this.storage.get(pledgeId));
        let txRecord = null;
        if (!txRecordValue) {
            txRecordValue = this.ledger.validTxs.get(message.data);
            if (!txRecordValue) {
                test.reason = 'Invalid pending join, cannot locate pledge tx';
                return test;
            }
        }
        txRecord = database_1.Record.readPacked(pledgeId, txRecordValue);
        await txRecord.unpack(null);
        // ensure the pledge tx is a pledge tx
        if (!(txRecord.value.content.type === 'pledge')) {
            test.reason = 'Invalid pending join, host is not referencing a pledge tx';
        }
        // validate the host matches the pledge tx 
        if (!(txRecord.value.publicKey === message.publicKey)) {
            test.reason = 'Invalid pending join, host does not match pledge';
            return test;
        }
        // validate the signature
        if (!await crypto_1.default.isValidMessageSignature(message)) {
            test.reason = 'Invalid pending join, timestamp out of range';
            return test;
        }
        test.valid = true;
        return true;
    }
    async createInitialJoinMessage(publicIP, isGateway) {
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
            signature: null
        };
        join.signature = await crypto_1.default.sign(join, profile.privateKeyObject);
        let message = {
            version: 0,
            type: 'host-full-join',
            sender: profile.id,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            data: join,
            signature: null
        };
        message.signature = await crypto_1.default.sign(message, profile.privateKeyObject);
        return message;
    }
    async isValidInitialJoinMessage() {
    }
    async createRejoinMessage() {
        const profile = this.wallet.getProfile();
        const rejoin = {
            type: 'rejoin',
            nodeId: profile.id,
            previous: null,
            timestamp: Date.now(),
            signature: null
        };
        rejoin.signature = await crypto_1.default.sign(rejoin, profile.privateKeyObject);
        let message = {
            version: 0,
            type: 'host-full-join',
            sender: profile.id,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            data: rejoin,
            signature: null
        };
        message.signature = await crypto_1.default.sign(message, profile.privateKeyObject);
        return message;
    }
    async isValidRejoinMessage() {
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
        leave.signature = await crypto_1.default.sign(leave, profile.privateKeyObject);
        let message = {
            version: 0,
            type: 'host-leave',
            sender: profile.id,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            data: leave,
            signature: null
        };
        message.signature = await crypto_1.default.sign(message, profile.privateKeyObject);
        return message;
    }
    async isValidLeaveMessage() {
    }
    async createFailureMessage() {
        const profile = this.wallet.getProfile();
        const failure = {
            type: 'failure',
            nodeId: profile.id,
            previous: null,
            timestamp: Date.now(),
            signatures: []
        };
        const signatureObject = {
            nodeId: profile.id,
            timestamp: Date.now(),
            signature: await crypto_1.default.sign(failure, profile.privateKeyObject)
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
        message.signature = await crypto_1.default.sign(message, profile.privateKeyObject);
        return message;
    }
    async signFailureMessage(failureMessage) {
        const profile = this.wallet.getProfile();
        const signatureObject = {
            nodeId: profile.id,
            timestamp: Date.now(),
            signature: await crypto_1.default.sign(failureMessage, profile.privateKeyObject)
        };
        failureMessage.signatures.push(signatureObject);
        let message = {
            version: 0,
            type: 'host-failure',
            sender: profile.id,
            data: failureMessage,
            timestamp: Date.now(),
            publicKey: profile.publicKey,
            signature: null
        };
        message.signature = await crypto_1.default.sign(message, profile.privateKeyObject);
        return message;
    }
    async isValidFailureMessage() {
    }
    async isValidHostMessage(message) {
        const unsignedMessage = Object.assign({}, message);
        unsignedMessage.signature = null;
        return await crypto_1.default.isValidSignature(unsignedMessage, message.signature, message.publicKey);
    }
    // LHT (tracker proper) methods
    addEntry(node_id, join) {
        // assumes entry is validated in message
        var entry = {
            hash: null,
            publicKey: join.publicKey,
            pledge: join.pledge,
            proofHash: join.proofHash,
            publicIp: join.publicIp,
            isGateway: join.isGateway,
            timestamp: join.timestamp,
            status: true,
            uptime: 0,
            log: [join]
        };
        entry.hash = crypto_1.default.getHash(JSON.stringify(entry));
        this.lht.set(node_id, entry);
    }
    getEntry(node_id) {
        return this.lht.get(node_id);
    }
    updateEntry(update) {
        let entry = this.getEntry(update.nodeId);
        if (update.type === 'leave' || update.type === 'failure') {
            entry.uptime += update.timestamp - entry.timestamp;
            entry.status = false;
        }
        else if (update.type === 'rejoin') {
            entry.status = true;
        }
        entry.timestamp = update.timestamp;
        entry.log.push(update);
        entry.hash = null;
        entry.hash = crypto_1.default.getHash(JSON.stringify(entry));
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
    getNodeIds() {
        // returns an array of all node ids in the lht
        return [...this.lht.keys()];
    }
    getNeighbors(myNodeIds) {
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
        const ownId = Buffer.from(myNodeIds, 'hex');
        const allNodes = this.getNodeIds().map(id => {
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
            hashedId = Buffer.from(crypto_1.default.getHash(hashedId.toString('hex')), 'hex');
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
                return Buffer.from(crypto_1.default.getHash(Buffer.from(candidate).toString('hex')), 'hex');
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
    // memDelta methods
    parseUpdate(update) {
        const array = Object.values(update);
        const arrayString = array.toString();
        const hash = crypto_1.default.getHash(arrayString);
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