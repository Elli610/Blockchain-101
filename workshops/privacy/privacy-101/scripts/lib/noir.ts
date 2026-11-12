// Compiling Noir circuits and proving with Barretenberg from Node.js.
// `nargo` and `bb` do the same from the command line; this wrapper only
// needs the npm dependencies of the workshop.
import * as path from "path";
import { ethers } from "ethers";

// These packages are ES modules. A real dynamic import is needed because
// TypeScript would otherwise turn `import()` into `require()`.
const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;

export interface CompiledCircuit {
  bytecode: string;
  abi: unknown;
}

export interface EvmProof {
  /// Proof bytes, as expected by the Solidity verifier.
  proof: string;
  /// Public inputs, in circuit order, as 32-byte hex strings.
  publicInputs: string[];
}

/// Compiles the Nargo package at `circuitDir` (dependencies are fetched
/// from their git repositories, as nargo does).
export async function compileCircuit(circuitDir: string): Promise<CompiledCircuit> {
  const { compile, createFileManager } = await dynamicImport("@noir-lang/noir_wasm");
  const compiled = await compile(createFileManager(path.resolve(circuitDir)));
  return compiled.program;
}

export class Prover {
  private constructor(
    private readonly noir: any,
    private readonly backend: any,
    private readonly api: any,
  ) {}

  static async create(circuit: CompiledCircuit): Promise<Prover> {
    const { Noir } = await dynamicImport("@noir-lang/noir_js");
    const { Barretenberg, UltraHonkBackend } = await dynamicImport("@aztec/bb.js");
    const api = await Barretenberg.new();
    return new Prover(new Noir(circuit), new UltraHonkBackend(circuit.bytecode, api), api);
  }

  /// Solidity source of the verifier contract for this circuit.
  async solidityVerifier(): Promise<string> {
    const vk = await this.backend.getVerificationKey({ verifierTarget: "evm" });
    return this.backend.getSolidityVerifier(vk, { verifierTarget: "evm" });
  }

  async prove(inputs: Record<string, unknown>): Promise<EvmProof> {
    const { witness } = await this.noir.execute(inputs);
    const { proof, publicInputs } = await this.backend.generateProof(witness, { verifierTarget: "evm" });
    return {
      proof: ethers.hexlify(proof),
      publicInputs: publicInputs.map((input: string) => ethers.zeroPadValue(input, 32)),
    };
  }

  async destroy(): Promise<void> {
    await this.api.destroy();
  }
}
