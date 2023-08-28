import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Escrow } from "../target/types/escrow";
import { createNft, mintNft } from "./utils/nfts";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import Squads, { Wallet } from "@sqds/sdk";

export function createKeypairFromFile(path: string): anchor.web3.Keypair {
  return anchor.web3.Keypair.fromSecretKey(
    Buffer.from(JSON.parse(require("fs").readFileSync(path, "utf-8")))
  );
}

describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Escrow as Program<Escrow>;

  const randomKeypair = anchor.web3.Keypair.generate();

  const multisigAddress = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("squad"),
      randomKeypair.publicKey.toBuffer(),
      Buffer.from("multisig"),
    ],
    new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")
  )[0];

  const multisigVaultAddress = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("squad"),
      multisigAddress.toBuffer(),
      new anchor.BN(1).toArrayLike(Buffer, "le", 4),
      Buffer.from("authority"),
    ],
    new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")
  )[0];

  const signer = createKeypairFromFile(
    require("os").homedir() + "/.config/solana/id.json"
  );

  const counterpartySigner = anchor.web3.Keypair.generate();

  const escrowAccount = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), multisigAddress.toBuffer()],
    program.programId
  )[0];

  let creatorNFT: anchor.web3.Keypair;
  let creatorTokenAccount;
  let counterPartyNFT: anchor.web3.Keypair;
  let counterPartyTokenAccount;

  const transactionID = new anchor.BN(1);
  const transactionAccount = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("squad"),
      multisigAddress.toBuffer(),
      transactionID.toArrayLike(Buffer, "le", 4),
      Buffer.from("transaction"),
    ],
    new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")
  )[0];

  it("Create Escrow!", async () => {
    const signature = await program.provider.connection.requestAirdrop(
      counterpartySigner.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );

    await program.provider.connection.confirmTransaction(signature);
    console.log("Airdrop confirmed!");

    creatorNFT = await createNft(
      anchor.web3.Keypair.generate(),
      signer,
      "COLN",
      "CFT",
      "https://hello.com"
    );

    console.log("new mint: ", creatorNFT.publicKey.toBase58());

    creatorTokenAccount = await mintNft(
      creatorNFT.publicKey,
      signer,
      signer,
      signer.publicKey
    );

    counterPartyNFT = await createNft(
      anchor.web3.Keypair.generate(),
      counterpartySigner,
      "NOIC",
      "NOI",
      "https://hello.com"
    );

    counterPartyTokenAccount = await mintNft(
      counterPartyNFT.publicKey,
      counterpartySigner,
      counterpartySigner,
      counterpartySigner.publicKey
    );

    const multisigCreatorATA = anchor.web3.PublicKey.findProgramAddressSync(
      [
        multisigVaultAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        creatorNFT.publicKey.toBuffer(),
      ],
      ASSOCIATED_PROGRAM_ID
    )[0];

    const multisigCounterpartyATA =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          multisigVaultAddress.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          counterPartyNFT.publicKey.toBuffer(),
        ],
        ASSOCIATED_PROGRAM_ID
      )[0];

    const instructionIndex1 = new anchor.BN(1);

    const firstInstruction = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("squad"),
        transactionAccount.toBuffer(),
        instructionIndex1.toArrayLike(Buffer, "le", 1),
        Buffer.from("instruction"),
      ],
      new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")
    )[0];

    const instructionIndex2 = new anchor.BN(2);

    const secondInstruction = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("squad"),
        transactionAccount.toBuffer(),
        instructionIndex2.toArrayLike(Buffer, "le", 1),
        Buffer.from("instruction"),
      ],
      new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")
    )[0];

    const counterpartyCreatorATA = anchor.web3.PublicKey.findProgramAddressSync(
      [
        counterpartySigner.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        creatorNFT.publicKey.toBuffer(),
      ],
      ASSOCIATED_PROGRAM_ID
    )[0];

    const creatorCounterpartyTokenAccount =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          signer.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          counterPartyNFT.publicKey.toBuffer(),
        ],
        ASSOCIATED_PROGRAM_ID
      )[0];

    console.log("executing this now");

    console.log("CREATOR TOKEN ACCOUNT", creatorTokenAccount.toBase58());

    const tx = await program.methods
      .createEscrow(randomKeypair.publicKey, new anchor.BN(1))
      .accounts({
        multisig: multisigAddress,
        escrowAccount: escrowAccount,
        creator: signer.publicKey,
        counterpartyMember: counterpartySigner.publicKey,
        creatorCreatorNftTokenAccount: creatorTokenAccount,
        counterpartyCreatorNftTokenAccount: counterpartyCreatorATA,
        counterpartyCounterpartyNftTokenAccount: counterPartyTokenAccount,
        squadsProgram: new anchor.web3.PublicKey(
          "SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu"
        ),
        creatorCounterpartyNftTokenAccount: creatorCounterpartyTokenAccount,
        transactionAccount: transactionAccount,
        multisigCreatorTokenAccount: multisigCreatorATA,
        creatorTokenMint: creatorNFT.publicKey,
        firstInstructionAccount: firstInstruction,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        counterpartyTokenMint: counterPartyNFT.publicKey,
        multisigCounterpartyTokenAccount: multisigCounterpartyATA,
        secondInstructionAccount: secondInstruction,
        multisigVault: multisigVaultAddress,
      })
      .signers([signer])
      .instruction();

    const transaction = new anchor.web3.Transaction();
    const modifyComputeUnits =
      anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000,
      });

    const addPriorityFee = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice(
      {
        microLamports: 1,
      }
    );
    transaction.add(modifyComputeUnits);
    transaction.add(addPriorityFee);
    transaction.add(tx);
    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      transaction,
      [signer],
      {
        skipPreflight: true,
      }
    );
    console.log("Your transaction signature", sig);
  });

  it("Add instruction!", async () => {
    const signature = await program.provider.connection.requestAirdrop(
      counterpartySigner.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );

    await program.provider.connection.confirmTransaction(signature);
    console.log("Airdrop confirmed!");

    const multisigCounterpartyATA =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          multisigVaultAddress.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          counterPartyNFT.publicKey.toBuffer(),
        ],
        ASSOCIATED_PROGRAM_ID
      )[0];

    const multisigCreatoryATA = anchor.web3.PublicKey.findProgramAddressSync(
      [
        multisigVaultAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        creatorNFT.publicKey.toBuffer(),
      ],
      ASSOCIATED_PROGRAM_ID
    )[0];

    const instructionIndex = new anchor.BN(2);

    const secondInstruction = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("squad"),
        transactionAccount.toBuffer(),
        instructionIndex.toArrayLike(Buffer, "le", 1),
        Buffer.from("instruction"),
      ],
      new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")
    )[0];

    console.log("executing this now");

    const creatorATA = anchor.web3.PublicKey.findProgramAddressSync(
      [
        signer.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        counterPartyNFT.publicKey.toBuffer(),
      ],
      ASSOCIATED_PROGRAM_ID
    )[0];
    const instructionIndex1 = new anchor.BN(1);
    const firstInstruction = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("squad"),
        transactionAccount.toBuffer(),
        instructionIndex1.toArrayLike(Buffer, "le", 4),
        Buffer.from("instruction"),
      ],
      new anchor.web3.PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")
    )[0];

    const counterpartyCreatorATA = anchor.web3.PublicKey.findProgramAddressSync(
      [
        counterpartySigner.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        creatorNFT.publicKey.toBuffer(),
      ],
      ASSOCIATED_PROGRAM_ID
    )[0];

    console.log("MULTISIG is", multisigVaultAddress);

    const squads = Squads.localnet(new Wallet(signer));
    const d = await squads.buildExecuteTransaction(transactionAccount);

    console.log("GG JH ", d);

    const tx = await program.methods
      .createEscrowResponseAndExecute(randomKeypair.publicKey)
      .accounts({
        multisig: multisigAddress,
        escrowAccount: escrowAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        squadsProgram: new anchor.web3.PublicKey(
          "SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu"
        ),
        escrowCounterparty: counterpartySigner.publicKey,
        counterpartyTokenAccount: counterPartyTokenAccount,
        creatorTokenAccount: creatorATA,
        multisigCreatorTokenAccount: multisigCreatoryATA,
        firstInstructionAccount: firstInstruction,
        transactionAccount: transactionAccount,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        counterpartyTokenMint: counterPartyNFT.publicKey,
        secondInstructionAccount: secondInstruction,
        counterpartyCreatorNftTokenAccount: counterpartyCreatorATA,
        multisigCounterpartyTokenAccount: multisigCounterpartyATA,
        creatorTokenMint: creatorNFT.publicKey,
        multisigVault: multisigVaultAddress,
      })
      .signers([counterpartySigner])
      .rpc({ skipPreflight: true });

    const execute = await squads.buildExecuteTransaction(transactionAccount);

    const txa = new anchor.web3.Transaction();
    txa.add(execute);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      txa,
      [signer],
      {
        skipPreflight: true,
      }
    );

    console.log("ff", sig);

    console.log("Your transaction signature", tx);
  });
});
