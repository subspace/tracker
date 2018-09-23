# Tracker Module Design

## Contract

```javascript

let tx = {
  id: contract_id, // hash of contract public key
  key: public_key, // 32 byte compressed contract public key, private key kept by owner
  owner: node_id, // hash of public key
  shards: [], // array of shard ids
  space: integer, // the amount of space alloted in bytes
  replication: integer, // the number of nodes which records will be replicated on 
  cost: float, // the amount of subspace credits used to fund this contract
  to: address, // the nexus contract address
}

```

## Purpose

The tracker solves three problems:
  a) Which valid hosts are currently online that I can send put requests to?
  b) How do we reward hosts fairly for uptime (how long have they been online)
  c) How do we know when a host has failed, to start repairing it's records -- would this matter to all nodes on the network or just the neighboring nodes?
    -- if neighboring nodes they would need to know what keys the node has
    -- if all nodes then they would have to know for each key they store, what other nodes have those keys (who their record neighbors are)

  What would the repair workflow even look like?
    - Node A joins the network and connects to nodes B, C, D
    - Node A writes a record as coordinator
    - Nodes E, F, G also write a copy of the record (with a relay message)
    - Node A fails
    - Nodes A's neighbors come to conesnsus on the failure
    - Some Node must be selected to repair Node A's records
      - from neighbors -> simplest 
        - first need to know what keys the node was storing 
        - second need to know other nodes have those keys
        - third one of each of those nodes must be contacted to write the new data, and send a valid response
        - this has high communications overhead
      - from keyholders 


Mechanics of Gossip

Gateways (relays)
  - have a public IP address (essentially a server)
  - have a persistent and unique node ID based on the hash of that IP address
  - track uptime of all hosts
  - maintain the latest proof for each active host (join, leave, or failure)
  - act as gateway/bootstrap servers for new network connections

Farmers
  - maintain a copy of the blockchain
  - listen for and validate new transactions and contracts
  - gossip and validate new blocks

Hosts
  - answer put and get requests
  - form a link in the relay network

Clients
  - send put and get requests
  - form the edges of the relay network

Node Roles
  - hosts store data
  - farmers secure the chain
  - clients write data
  - gateways route requests


Who needs to know this information?
  a) Hosts: a and c
  b) Farmers: b
  c) a (at least a subset)
  d) none

Do hosts need to reference a valid proof of space to join? Could you use a compact proof of space and gossip this with the join proof?

What is the data structure?

Need to lay out the concept of optimistic aggregation.

Have to track
  - the node id
  - how long each node has been online
  - current state (online or offline)
  - a signature, why?

How do we know the timestamps are accurate? Can go off when the data is received or use a block hash

```javascript
const initial_join = {
  public_key: binary, // 32 byte compressed ECDSA public key,
  timeStamp: binary, // 4 byte unix timestamp
  proof: binary, // compact proof of space, or hash of a larger proof on SSDB
  signature: binary // stripped openpgp detached signature,
}

// receving node will insert the node ID and timestamp into their LHT

const leave = {
  public_key: binary, // 32 byte compressed ECDSA public key,
  timeStamp: binary, // 4 byte unix timestamp
  signature: binary // stripped openpgp detached signature,
  // should this be validated by a minimum number of neighbors?
  // again using something like parsec?
}

// receiving node will increment the time balance and remove the timestamp
// how do we know when to expire the record if we remove the timestamp
// maybe as payments are published to the chain
// would payments be published for hosts who have gone offline?

const rejoin = {
  public_key: binary, // 32 byte compressed ECDSA public key,
  timeStamp: binary, // 4 byte unix timestamp
  signature: binary // stripped openpgp detached signature,
}

// receving node will add a new timestamp to the entry

const failure = {

}

// receiving node will increment the time balance and remove the timestamp

const record = {
  key: hash(node_id),
  value: {
    balance: binary, // time accrued prior to the last event, will be 0 if node has not churned
    timeStamp: binary, // 4 byte unix timestamp of last event
  }
}
```
How do we one node is not using two private keys or two identities on the same device? Either as a sybil attack (// hosting) or if another node outsources authority to them.

Node would have to connect over two differnt ports, since IP address would almost certainly be the same, unless they are using a VPN for one connection and regular connection for the other.

When node comes online a timestamp is inserted
If node goes offline the time between now and timestamp is computed and added to balance, timestamp will be set to 0
If node comes back online then new timestamp will be added
So we don't need a status variable, just two integers
Need an expirty to remove stale nodes (like 30 days if timestamp is 0)
If timestamp and balance is 0, the node is online
If timestamp and active balance, the node is online

The message data will be different from the stored data.

How is data stored locally and how big can it get

Proofs of Join, Leave, and Failure

Join Event: When a valid host joins the network for the first time it should gossip a message proving it's identity and referencing a valid proof of space that has been added to the blockchain. How does a host pay the transaction cost of the proof? If there is no transaction cost how do you prevent the sybil attack. The proof of space itself should prevent the sybil attack. Those are the resources it has commited. Why does this need to be included in the chain? So that farmers can validate and aggregate proofs to determine the cost of storage. So a host proof of storage should only be valid if has been included in the ledger.

The goal of the subspace protocol is to allow clients to upload and dissapaper, while the protocol ensures that the data will persist in the face of host churn, with low communications complexity.

Subspace can provide a trusted blockchain hosting service for light clients or other nodes who do not wish to store the entire blockchain. 

Membership Delta vs the Tracker Data Structure





## MemDelta Protocol Sketch

An in-memory object that tracks the changes in membership (memDelta) of the host relay network.  Any join or leave message received via host gossip will be validated and added to the memDelta object.  At a set interval (default 1 second) the memDelta object will be gossiped to all hosts in the local relay.  Each host will then validate joins/leaves locally and adjust their local hash table and memDelta object. New and valid joins and leaves will then propogate through the host relay network in approximately T * log(N)), where T is the memDelta publish interval and N is the number of hosts on the subspace network.


## Joins

When a new host joins the network by connecting to a gateway host, they send a 96 byte join object which includes:

1. HostID -> sha256 hash of public key (32 bytes)
2. PublicKey -> compressed ECDSA 128 bit public key (32 bytes)
3. Timestamp -> current time as a unix timestamp  (4 bytes)
4. Signature -> signature of the above data with ECDSA private key (24 bytes)

The gateway host will validate the join by checking to ensure

1. The host ID is the hash of the public key
2. The timestamp is within a given range (usually 10 mintues)
3. The signature matches the public key

This way only the host who has this private key can claim this Host ID and join the network, and any other host can validate this claim before adjusting their local hash table.  Once the data has been validated by the gateway host they will add the join to their memDelta and broadcast to their relay group at the next interval.

## Leaves

When an existing host leaves the network gracefully they will broadcast a 64 byte leave object to all hosts in their local relay which includes:

1. HostID
2. Timestamp
3. Signature

Any host who cares about the leave will already have the public key for the leaving host in their local hash table.  Each host who receives the message will validate:

1. The Host ID hash matches the corresponding public key in their LHT for this id.
2. The timestamp is within a given range (usually 10 mintues)
3. The signature matches the public key

This way only the host who holds the private key for a given host ID can broadcast the departure of said host. This prevents rumors (false gossip) from spreading across the network.  For example, a malicious host could start broadcasting that all of the hosts they know about half left the network.

## Drops

Of course, this assumes the host is able to actually broadcast that they they have left the network, which will not always be possible due to hardware or internet connection failures.  Since each host is always directly connected via WebRTC channels to up to K other hosts (where K is the size of the K-bucket), any failure will be detected immediately.  Once a host detects a failure it will:

1. Wait for a random period of time within a set range (default 10 to 30 seconds) for the host to reconnect or a failure message from another host in the local relay network.
2. If neither occurs within the period, send a failure message to all other hosts in the local relay network.
3. On receivng a failure message, check to see if you are still connected to the host.
    a. Still Connected: Either a network failure, or bad actor
      i. Ping the supposedely failed host with the failure message, they can challenge the message by adding their signature to the message, which they will then broadcast to all hosts in the group.
      ii. If a network failure was the cause then the host/s who detected the failure will not receive this message, so the failure message will have a TTL of 2, which will then be rebroadcast by each receiving host to all hosts in the group and decrement the TTL by 1.  At this point, all hosts in the local peer relay should receive the message an all honest nodes will comply.  Since the TTL is now 0, no hosts will rebroadcast the message
      iii. If th

    b. If not connected then add your signature to the message and return to the host who dectected the failure.  Once all hosts in the k-bucket have signed the message they will add the failure to their memDelta

A failure message will include:

1. HostID: public key hash of the host who deteted the failure
2. FailureID: public key hash of the host who failed
3. Timestamp: the time at which the failure was detected
4. Signature: signature of the host who detected the failure

With this method, only hosts in the same local peer relay may broadcast valid failures.  Since public keys and ids are generated at random, it would be very costly to censor any particluar host.  The attacker would have to generate keypairs until they found a pair close enough in the bit-space of the key to be assigned to the same k-bucket as the node being attacked.  Furthermore, if at least one node in the network is honest the attack will be thwarted and the attacker's id will be blacklisted.

Attempt to send a message to the host over the peer relay network, if it fails then this is a vaild failure.  That implies a lot of overhead

This procedure would be ocurring in parralel between all K hosts in the local relay network


## Example MemDelta Object

```javascript

memDelta = {
  joins: {
    'node-id': [      // node who has joined
      'public-key',   // public key of this node
      'timestamp',    // time node has joined
      'signature'     // signature of node joining
    ],
    ...
  },
  pending: {
    'node-id': [    // node that is leaving / may have left
      'host-id',    // node that has reported the failure
      'timestamp',  // time failure is reported
      'signature'   // signature of node reporting the failure
    ],
    ...
  },
  leaves: {
    'node-id': [    // node that has left
      'host-id',    // node reporting the leave
      'timestamp',  // time leave was announced
      'signature'   // signature of node that reported leave
    ],
    ...
  }
}

```

*/