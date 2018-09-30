# Subspace Tracker Module

## Purpose

The tracker module holds two in memory data structures (LHT and memDelta) and all the methods to mutate them. It solves three problems:

1. For clients, which valid hosts are currently online that I can send put/get requests to?
2. For farmers, how do we reward hosts fairly for uptime (how long have they been online)
3. For hosts, how do we know when another host has failed, to start repairing it's records, and first validate, then gossip it's failure across the network.

The Local Hash Table (LHT) is an ES6 map object that holds the crucial info for all hosts on the network. Mutations originate from signed gossip spread by hosts across the network. Note, a host must have a valid proof of space (storage contract) anchored in the ledger before it can be included in the LHT>

join() -> When a host joins it shares it's info and signs to prove authenticity. This will create a new entry in the LHT, and the join will be saved in the entry log.

leave() -> When a host leaves gracefully it sends a signed leave proof. This update the existing in the LHT, accruing a time uptime and setting the status offline, and the leave will be appended to the log.

failure() -> When neighbors of a host detect a closed socket, they will check with the hosts other neighbors before initiating PARSEC binary agreement and creating the failure proof. This will update an existing record in the LHT, accruing a time uptime and setting the status to offline, and the failure will be appended to the log.

rejoin() -> If the host later reconnects they will gossip a rejoin proof. This will set their status back to online, and they proof will be appended to the log.

Leave(), failure(), and rejoin() can be understood as patches or diffs to the original join entry. These updates are ordered as a hash linked log, with each new update referencing the hash of the last update. This log is maintained for each interval (typially one month) for each host before being reset. The log structure of the LHT allows for simple validation and ordering of updates for any host when syncing trackers.

We know that join(), leave() and rejoin() must be valid, since they requre the host's private key. We also know that failure() consensus is valid as long as 2/3 of the nodes on the network are honest, since neighbors are deterministicaly assigned and represent a uniform sampling of all hosts. The worst a malicious host can do is not spread gossip it receives and provide incomplete trackers to new nodes. As long as each node has at least one honest neighbor, it will eventually receive gossiped updates. As long as it confirms the tracker (by hash) with more than one node on join, or it downloads the tracker from multiple nodes, and periodically syncs its tracker with other nodes, the trackers will be consistent between nodes, even in the presence of a large fraction of malicious nodes. It may also be possible to periodically anchor the tracker in the ledger by it's hash. 

The current implementation of Tracker assumes a network of only full nodes, where each nodes has sufficient memory to store the full tracker with all updates and can validate pledges with a local copy of the ledger. In the next iteration of the tracker a lighter implemention will be created for light hosts (mobile, desktop, bitbot) and a minimal tracker for light browser clients. A delegated trust model could also be implemented, where a client send's put/get requests to a trusted host (maybe it's own Bitbot) or gateway node so that it does not all have to be stored locally for network access. Clients could also download the full tracker from a gateway then validate all of the updates in the log before discarding themm to save space.


```javascript
full_node_entry = {
  key: node_id,
  value: {
    hash: string,
    public_key: string,
    pledge: number, 
    proof_hash: string,
    public_ip: string,
    timestamp: number,
    status: boolean,
    uptime: number
    log: (joinObject | leaveObject | reJoinObject | failureObject)[],
  }
}

light_host_entry = {
  key: node_id,
  value: {
    public_key: string,
    pledge: number,
    public_ip: string,
    timestamp: number,
    status: boolean,
    uptime: number
  }
}

light_client_entry = {
  key: node_id,
  value: [
    pledge: number,
    public_ip: string
  ]
}
```


The Membership Delta (memDelta)

An in-memory object that tracks the changes in membership (memDelta) of the host relay network.  Any join or leave message received via host gossip will be validated and added to the memDelta object.  At a set interval (default 1 second) the memDelta object will be gossiped to all hosts in the local relay.  Each host will then validate joins/leaves locally and adjust their local hash table and memDelta object. New and valid joins and leaves will then propogate through the host relay network in approximately T * log(N)), where T is the memDelta publish interval and N is the number of hosts on the subspace network.



## External Usage

Install this module as a dependency into another project

```
$ yarn add 'https://www.github.com/subspace/tracker.git'
```

Require this module inside a script

```javascript
const tracker = require('subspace-tracker').default
const Storage = require('subspace-storage').default

const storage = new Storage()
const tracker = new Tracker(storage)
```


## Development Usage

Clone and install the repo locally   

```
$ git clone https://www.github.com/subspace/tracker.git
$ cd tracker
$ yarn
```

Build manually.  
 
```
$ tsc -w
```

[Instructions](https://code.visualstudio.com/docs/languages/typescript#_step-2-run-the-typescript-build) to automate with visual studio code.

Run tests

```
$ npx jest
```

