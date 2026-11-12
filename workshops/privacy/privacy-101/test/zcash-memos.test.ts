import { expect } from "chai";
import { parseMemoExport, studentAddressIn } from "../scripts/lib/zcash-memos";

describe("Part 3: memo export parsing", function () {
  const ADDRESS = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

  it("reads a JSON export", function () {
    const memos = parseMemoExport(JSON.stringify([{ txid: "aa11", memo: ADDRESS }]));
    expect(memos).to.deep.equal([{ txid: "aa11", memo: ADDRESS }]);
  });

  it("reads a text export, one transaction per line", function () {
    const memos = parseMemoExport(`aa11 ${ADDRESS}\n\n  bb22   hello from zcash \ncc33\n`);
    expect(memos).to.deep.equal([
      { txid: "aa11", memo: ADDRESS },
      { txid: "bb22", memo: "hello from zcash" },
      { txid: "cc33", memo: "" },
    ]);
  });

  it("finds the student address inside a memo", function () {
    expect(studentAddressIn(`my address is ${ADDRESS}, thanks`)).to.equal(ADDRESS);
    expect(studentAddressIn("no address here")).to.equal(null);
    expect(studentAddressIn("0x1234")).to.equal(null);
  });
});
