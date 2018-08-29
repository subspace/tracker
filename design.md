#MemDelta Protocol Sketch

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