var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const crypto = require('subspace-crypto').default;
const profile = require('subspace-profile').default;
const EventEmitter = require('events');
class Tracker extends EventEmitter {
    constructor() {
        super();
    }
    start(storage) {
        return __awaiter(this, void 0, void 0, function* () {
            // decides if to create or load the lht
            let lht = yield storage.get('lht');
            if (lht) {
                this.create_lht();
            }
            else {
                this.load_lht(storage, lht);
            }
            setInterval(() => {
                this.save_lht(storage);
            }, 6000000); // save every hour
            return;
        });
    }
    create_lht() {
        // creates a new lht if one does not exist
        this.lht = new Map();
    }
    load_lht(storage, lht) {
        return __awaiter(this, void 0, void 0, function* () {
            // loads the last lht from disk on restart, allowing host to have better knwoledge of gateway nodes
            this.lht = new Map(lht);
        });
    }
    save_lht(storage) {
        return __awaiter(this, void 0, void 0, function* () {
            // persists lht to disk 
            const lht = Tracker.get_records();
            yield storage.set('lht', lht);
            return;
        });
    }
    merge_lhts(lht) {
        // merges a persisted lht with an lht received from a gateway node
        const myMap = Tracker.lht;
        const gatewayMap = new Map(lht);
        Tracker.lht = new Map([...myMap, ...gatewayMap]);
    }
    set_member(nodeId, value) {
        // add a new member record to the lht on valid join
        if (nodeId !== profile.hexId) {
            this.lht.set(nodeId, value);
            console.log('Added a new member to the LHT');
        }
    }
    get_member(nodeId) {
        // retrieve an existing member record from the LHT by node id
        const record = this.lht.get(nodeId);
        return record;
    }
    delete_member(nodeId) {
        // remove an existing member record from the LHT by node id on valid leave or failure
        this.lht.delete(nodeId);
    }
    has_member(nodeId) {
        // checks if a member is in the lht 
        const has = this.lht.has(nodeId);
        return has;
    }
    get_length() {
        // returns the number of records in the LHT
        const length = this.lht.size;
        return length;
    }
    get_ids() {
        // returns an array of all node ids in the lht
        const ids = [...Tracker.lht.keys()];
        return ids;
    }
    get_records() {
        // returns an array of all member records in the lht
        const records = [...Tracker.lht.entries()];
    }
    compute_neighbors() {
        // generate an array of node_ids based on the current membership set
    }
}
module.exports = Tracker;
//# sourceMappingURL=main.js.map