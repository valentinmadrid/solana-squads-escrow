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