# 04 - Solo mining

You are going to mine a block with your own laptop CPU, alone, against your own `bitcoind`. No pool, no coordination with anyone else.

The point of this chapter is to see the raw mining flow:
1. Your miner asks `bitcoind`: "give me a block template."
2. `bitcoind` returns a candidate block minus the nonce.
3. The miner iterates the nonce (and coinbase extranonce) until the block header hash is below the network target.
4. The miner sends the completed block back to `bitcoind` via `submitblock`.
5. `bitcoind` validates it and gossips it to peers.

## Install cpuminer

Real ASIC miners speak stratum; but for a first solo attempt against your own node, `cpuminer` in "getblocktemplate" mode is the shortest path.

**Linux / WSL**:
```bash
sudo apt install -y cpuminer
# or, for the pooler/cpuminer variant with more current SHA256 optimisations:
sudo apt install -y build-essential libcurl4-openssl-dev libjansson-dev libssl-dev libgmp-dev automake
cd ~
git clone https://github.com/pooler/cpuminer.git
cd cpuminer
./autogen.sh
./configure CFLAGS="-O3"
make -j$(nproc)
sudo cp minerd /usr/local/bin/cpuminer
```

**macOS**:
```bash
brew install libtool automake pkg-config gmp
git clone https://github.com/pooler/cpuminer.git
cd cpuminer
./autogen.sh
./configure CFLAGS="-O3"
make -j$(sysctl -n hw.ncpu)
sudo cp minerd /usr/local/bin/cpuminer
```

Verify:
```bash
cpuminer --version
```

## Point cpuminer at your own bitcoind

Get a payout address from Electrum (or `bitcoin-cli -signet getnewaddress`):

```bash
MY_ADDR=$(bitcoin-cli -signet getnewaddress "mining-solo")
echo "Payout address: $MY_ADDR"
```

Then start the miner in "getblocktemplate" mode ("solo mining" mode):

```bash
cpuminer \
  --url=http://127.0.0.1:38332 \
  --userpass=me:CHANGE_ME_TO_A_RANDOM_STRING \
  --coinbase-addr=$MY_ADDR \
  --no-stratum \
  --no-getwork \
  --threads=$(nproc)
```

- `--url` points at your own bitcoind's JSON-RPC.
- `--userpass` matches the RPC creds in `~/.bitcoin/bitcoin.conf`.
- `--coinbase-addr` tells cpuminer which address to put in the coinbase output.
- `--no-stratum --no-getwork` forces `getblocktemplate` (the modern, solo-mining API).

You should see log lines like:
```
[timestamp] Long-polling activated for http://127.0.0.1:38332/
[timestamp] Starting miner threads
[timestamp] CPU #0: 2500 khash/s
```

## Watch for your block

Somewhere between "a few seconds" and "a few minutes" later, depending on the current difficulty and how much competing hashrate is on the network, you will see something like:

```
[timestamp] accepted: 1/1 (100.00%), 2500 khash/s
[timestamp] found block: 000000abcdef...
```

Confirm with:

```bash
bitcoin-cli -signet getbestblockhash
# should match the block hash cpuminer found

bitcoin-cli -signet getblock $(bitcoin-cli -signet getbestblockhash) 2 | jq '.tx[0]'
# the coinbase transaction. Its output should pay MY_ADDR.

bitcoin-cli -signet -rpcwallet=faucet getbalance   # if you set up a wallet
# your matured coinbases will show up in balances after 100 more blocks
```

Also look at your block in the teacher's explorer. It should already be visible; the teacher's `bitcoind` accepted it because your PoW is valid and the signetchallenge (`OP_TRUE`) is trivially satisfied.

## Stop the miner

`Ctrl+C` in the terminal running cpuminer.

## Why solo mining is not what real miners do

Solo mining works fine when the total hashrate on the network is small. In the classroom, it works. On mainnet, a solo miner with a single CPU has a vanishingly small chance of ever finding a block: the network target requires quintillions of hashes on average.

Real miners join **pools**: many miners cooperate to produce shares (partial solutions below a lower "pool target"), and when the pool's aggregate hashrate finds a block, the reward is shared out proportionally. The next chapter shows you the pool side.

Next: [`05-pool-mining-on-teacher.md`](./05-pool-mining-on-teacher.md).
