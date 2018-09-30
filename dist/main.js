"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require('@subspace/crypto');
const events_1 = __importDefault(require("events"));
// TODO
// implement light_host and light_client trackers
// implement pending_join protocol for atomic joins
// implement anti-entropy for periodic comparisons instead of merge
// implement parsec on failure
// devise countermeasure to parrallel farming
class Tracker extends events_1.default {
    constructor(storage) {
        super();
        this.init(storage);
    }
    async init(storage) {
        // decides if to create or load the lht
        let lht = await storage.get('lht');
        if (lht) {
            this.lht = new Map(JSON.parse(lht));
        }
        else {
            this.lht = new Map();
        }
        setInterval(() => {
            const string_lht = JSON.stringify([...this.lht]);
            storage.set('lht', string_lht);
        }, 6000000); // save every hour
        return;
    }
    addEntry(node_id, join) {
        // assumes entry is validated in message
        var entry = {
            hash: null,
            public_key: join.public_key,
            pledge: join.pledge,
            proof_hash: join.proof_hash,
            public_ip: join.public_ip,
            timestamp: join.timestamp,
            status: true,
            balance: 0,
            log: [join]
        };
        entry.hash = crypto.getHash(JSON.stringify(entry));
        this.lht.set(node_id, entry);
        return;
    }
    getEntry(node_id) {
        const entry = this.lht.get(node_id);
        return entry;
    }
    updateEntry(update) {
        let entry = this.getEntry(update.node_id);
        if (update.type === 'leave' || update.type === 'failure') {
            entry.balance += update.timestamp - entry.timestamp;
            entry.status = false;
        }
        else if (update.type === 'rejoin') {
            entry.status = true;
        }
        entry.timestamp = update.timestamp;
        entry.log.push(update);
        entry.hash = crypto.getHash(JSON.stringify(entry));
        this.lht.set(update.node_id, entry);
        return;
    }
    removeEntry(node_id) {
        // if host expires, when?
        this.lht.delete(node_id);
        return;
    }
    hasEntry(node_id) {
        const has = this.lht.has(node_id);
        return has;
    }
    getLength() {
        const length = this.lht.size;
        return length;
    }
    getNodeIds() {
        // returns an array of all node ids in the lht
        const node_ids = [...this.lht.keys()];
        return node_ids;
    }
    getNeighbors(my_node_id) {
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
    }
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
        return;
    }
    removeDelta(update) {
        // remove an update from the memdelta by hash
        const hash = this.parseUpdate(update).hash;
        this.memDelta.delete(hash);
        return;
    }
    inMemDelta(update) {
        // check if an update is in the delta 
        const hash = this.parseUpdate(update).hash;
        return this.memDelta.has(hash);
    }
    hasDelta() {
        // check if the delta is empty 
        if (this.memDelta.size > 0) {
            return true;
        }
        else {
            return false;
        }
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
        return;
    }
}
module.exports = Tracker;
//# sourceMappingURL=main.js.map