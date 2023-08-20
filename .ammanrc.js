module.exports = {
  validator: {
    killRunningValidators: true,
    programs: [],
    accounts: [
      {
        label: "Squads v3",
        accountId: "SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu",
        executable: true,
        cluster: "https://api.mainnet-beta.solana.com",
      },
      {
        label: "Token Metadata",
        accountId: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
        executable: true,
        cluster: "https://api.mainnet-beta.solana.com",
      },
      {
        label: "Associated Token",
        accountId: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        executable: true,
        cluster: "https://api.mainnet-beta.solana.com",
      },
      {
        label: "Token Program",
        accountId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        executable: true,
        cluster: "https://api.mainnet-beta.solana.com",
      },
    ],
    jsonRpcUrl: "127.0.0.1",
    websocketUrl: "",
    commitment: "confirmed",
    ledgerDir: "./test-ledger",
    resetLedger: true,
    verifyFees: false,
    detached: false,
  },
  relay: {
    enabled: true,
    killlRunningRelay: true,
  },
  storage: {
    enabled: true,
    storageId: "mock-storage",
    clearOnStart: true,
  },
};
