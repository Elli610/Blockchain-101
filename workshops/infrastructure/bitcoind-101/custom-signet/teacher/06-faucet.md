# 06 - Faucet

A tiny script that sends BTC to any student address on request. Two flavours: a CLI script students can invoke over SSH (simple), or a small HTTP form (nicer UX). The CLI is enough for a classroom.

## CLI faucet

Create `/usr/local/bin/faucet`:

```bash
sudo tee /usr/local/bin/faucet <<'EOF'
#!/usr/bin/env bash
# Usage: faucet <bech32-address> [<amount-btc>]
# Default amount: 1 BTC. Max amount per call: 5 BTC.
set -euo pipefail

ADDR="${1:-}"
AMOUNT="${2:-1}"

if [[ -z "$ADDR" ]]; then
  echo "Usage: faucet <address> [<amount>]" >&2
  exit 1
fi

AMOUNT_NUM=$(printf '%.8f' "$AMOUNT")
if (( $(echo "$AMOUNT_NUM > 5" | bc -l) )); then
  echo "Amount capped at 5 BTC per call." >&2
  exit 1
fi

TXID=$(bitcoin-cli -signet -rpcwallet=faucet sendtoaddress "$ADDR" "$AMOUNT_NUM")
echo "$TXID"
EOF
sudo chmod +x /usr/local/bin/faucet
sudo apt install -y bc
```

Test:
```bash
faucet bcrt1qexampleaddress 1
```

You should get a txid back. Confirm in the mempool.space explorer.

## Give students access

Two options:

### Option A: shared read-only SSH shell (simplest)

Create a `student` user with a shared password and a `.bashrc` that only lets them run `faucet`:

```bash
sudo adduser --disabled-password --shell /bin/rbash student
sudo mkdir -p /home/student/bin
sudo ln -s /usr/local/bin/faucet /home/student/bin/faucet
sudo tee /home/student/.bash_profile <<'EOF'
PATH=/home/student/bin
export PATH
EOF
sudo chown -R student:student /home/student
sudo chmod 555 /home/student/.bash_profile
```

Set a password once:
```bash
sudo passwd student
```

Share the password. Students then:
```bash
ssh student@teacher.example.com faucet bcrt1q...
```

### Option B: HTTP form

If you prefer no SSH for students, run a tiny web endpoint. Example with `flask`:

```python
# /home/bitcoin/faucet/app.py
from flask import Flask, request, jsonify
import subprocess, re

app = Flask(__name__)
ADDR_RE = re.compile(r'^(bc1|bcrt1|tb1)[a-z0-9]{20,90}$')

@app.route("/faucet", methods=["POST"])
def faucet():
    data = request.get_json(force=True)
    addr = data.get("address", "")
    amount = float(data.get("amount", 1))
    if not ADDR_RE.match(addr):
        return jsonify(error="invalid address"), 400
    if amount > 5:
        return jsonify(error="amount capped at 5"), 400
    out = subprocess.check_output(["/usr/local/bin/faucet", addr, str(amount)])
    return jsonify(txid=out.decode().strip())

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
```

Run behind caddy or nginx. Rate-limit per source IP.

## Cool-down and abuse protection

For a small classroom, an honour system is fine. For a public workshop:
- Add a `faucet` cooldown (touch a per-address timestamp file, reject if newer than 1h ago).
- Cap amount to 0.1 BTC per call.
- Log every faucet request.

## Verify balance keeps up

The faucet wallet is funded from your bootstrap-mining coinbases. If you run out mid-workshop, mine another 50 blocks with `contrib/signet/miner` or just wait for students to mine (their blocks will go to their addresses, not yours). Alternatively, keep mining in the background at a very low rate:

```bash
# In a tmux session:
python3 ~/bitcoin-source/contrib/signet/miner \
  --cli="bitcoin-cli -signet" generate \
  --address $(bitcoin-cli -signet -rpcwallet=faucet getnewaddress) \
  --grind-cmd="bitcoin-util grind" --nbits=1e00ffff \
  --set-block-time=$(date +%s) --max-blocks=999999 --min-nbits
```

Cap this so you do not overwhelm students' mining exercises.

---

That is the teacher setup done. Hand out the info card from [`README.md`](./README.md) to students and point them at [`../student/README.md`](../student/README.md).
