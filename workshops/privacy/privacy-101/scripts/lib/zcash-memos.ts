// Parsing of the memo export consumed by scripts/grader-zcash.ts.

export interface ReceivedMemo {
  txid: string;
  memo: string;
}

const ADDRESS = /0x[0-9a-fA-F]{40}/;

/// Accepts either a JSON array of { txid, memo } objects, or plain text with
/// one "<txid> <memo>" per line. Whatever wallet the instructor uses, its
/// list of received transactions can be reduced to one of these.
export function parseMemoExport(content: string): ReceivedMemo[] {
  const trimmed = content.trim();
  if (trimmed.startsWith("[")) {
    return (JSON.parse(trimmed) as ReceivedMemo[]).map(({ txid, memo }) => ({ txid: String(txid), memo: String(memo) }));
  }
  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const separator = line.search(/\s/);
      return separator === -1
        ? { txid: line, memo: "" }
        : { txid: line.slice(0, separator), memo: line.slice(separator + 1).trim() };
    });
}

/// The student address written in a memo, if any.
export function studentAddressIn(memo: string): string | null {
  const match = memo.match(ADDRESS);
  return match ? match[0] : null;
}
