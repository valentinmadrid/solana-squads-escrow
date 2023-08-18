import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Escrow } from "../target/types/escrow";

export function createKeypairFromFile(path: string): anchor.web3.Keypair {
	return anchor.web3.Keypair.fromSecretKey(
		Buffer.from(JSON.parse(require("fs").readFileSync(path, "utf-8"))),
	);
}


describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Escrow as Program<Escrow>;

  const randomKeypair = anchor.web3.Keypair.generate();

  const multisigAddress = anchor.web3.PublicKey.findProgramAddressSync([
    Buffer.from("squad"),
    randomKeypair.publicKey.toBuffer(),
    Buffer.from("multisig"),
  ], new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu"))[0];

  const counterpartyKeypair = anchor.web3.Keypair.generate();

  const signer = createKeypairFromFile(
		require("os").homedir() + "/.config/solana/id.json",
	);

  
  it("Create Escrow!", async () => {
    // Add your test here.
    const tx = await program.methods.createEscrow(
      randomKeypair.publicKey
      )
    .accounts({
      multisig: multisigAddress,
      signer: signer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      squadsProgram: new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu"),
     counterpartyMember: counterpartyKeypair.publicKey,
    })
    .signers([signer])
    .rpc();
    console.log("Your transaction signature", tx);
  });
});
