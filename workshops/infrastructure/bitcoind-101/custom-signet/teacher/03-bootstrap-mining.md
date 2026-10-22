# 03 - Bootstrap the chain

Your `bitcoind` is running at block 0 with no peers. To make the network useful for students, mine the initial supply now: 101 blocks minimum (so the first coinbase matures and is spendable), plus a comfortable buffer so you can fund the faucet.

## Choose a mining approach

There are two ways to produce PoW blocks on our custom signet:

1. **`contrib/signet/miner` (Python, official)** - the tool Bitcoin Core ships for signet mining. Handles block templates and nonce grinding via `bitcoin-util grind`. Easiest to script.
2. **`cpuminer` against `getblocktemplate`** - what real miners use. You will teach students to do exactly this in [`04-ckpool.md`](./04-ckpool.md). For bootstrap it is heavier than needed.

Use `contrib/signet/miner` for bootstrap.

## Fetch the miner script

The `bitcoin-core` source repo ships the miner in `contrib/signet/miner`:

```bash
cd ~
git clone --depth 1 --branch v28.0 https://github.com/bitcoin/bitcoin.git bitcoin-source
cd bitcoin-source/contrib/signet
```

Verify:
```bash
python3 miner --help
```

## Create a wallet and an address

```bash
bitcoin-cli -signet createwallet "faucet"
FAUCET_ADDR=$(bitcoin-cli -signet -rpcwallet=faucet getnewaddress "genesis-mining")
echo $FAUCET_ADDR
```

Save this address; the initial coinbase will pay it.

## Mine the first blocks

Mine 200 blocks (any value >= 101 works). At difficulty 1 on a modest VPS this takes seconds per block:

```bash
python3 miner \
  --cli="bitcoin-cli -signet" \
  generate \
  --address $FAUCET_ADDR \
  --grind-cmd="bitcoin-util grind" \
  --nbits=1e00ffff \
  --set-block-time=$(date +%s) \
  --max-blocks=200
```

Note on the parameters:
- `--nbits=1e00ffff` sets the starting difficulty to the signet minimum. Real difficulty retargeting kicks in automatically after 2016 blocks.
- `--set-block-time` seeds the initial block timestamp; subsequent blocks will progress from there.
- `--max-blocks=200` caps this run; you can call the miner again later.

## Sanity check

```bash
bitcoin-cli -signet getblockchaininfo | jq '.blocks, .difficulty'
bitcoin-cli -signet -rpcwallet=faucet getbalance
```

You should see `200` blocks. Balance shows the sum of matured coinbases (blocks 1 through 100 are mature, blocks 101 through 200 are not yet).

At 50 BTC per block for the first 210,000 blocks, that is 100 * 50 = 5000 BTC available immediately, with more maturing on every subsequent block. Plenty to run the faucet from.

## Leave headroom for students

Do NOT keep mining forever from the teacher's node. The point of the workshop is that students mine their own blocks. Stop after roughly 200 to 500 blocks, then let the class produce the rest.

Next: [`04-ckpool.md`](./04-ckpool.md).
