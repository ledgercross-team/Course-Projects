import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Simple check", function () {
  it("should have viem available from network.create()", async function () {
    const { viem } = await network.create();
    console.log("viem in test:", viem ? "defined" : "undefined");
    if (!viem) {
      throw new Error("viem is undefined");
    }
  });
});
