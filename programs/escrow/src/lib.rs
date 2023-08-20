use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use squads_v3_sdk::cpi::{create_multisig, Create};

use anchor_spl::token::Transfer;
use squads_v3_sdk::state::IncomingInstruction;
use squads_v3_sdk::SquadsMpl;
use squads_v3_sdk::{
    cpi::{AddInstruction, CreateTransaction},
    state::MsAccountMeta,
};

declare_id!("8LtLDaAfaP5i9ViR4TwCr9gLREVSfW56hidCB2KPb8PR");

#[program]
pub mod escrow {

    use anchor_spl::token::transfer;
    use squads_v3_sdk::cpi::VoteTransaction;

    use super::*;

    pub fn create_escrow(
        ctx: Context<CreateEsrow>,
        multisig_id: Pubkey,
        send_amount: u64,
    ) -> Result<()> {
        // Create a Squads multisig.
        let cpi_context = CpiContext::new(
            ctx.accounts.squads_program.to_account_info(),
            Create {
                multisig: ctx.accounts.multisig.to_account_info(),
                creator: ctx.accounts.creator.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        );

        create_multisig(
            cpi_context,
            multisig_id,
            2,
            vec![
                ctx.accounts.creator.key(),
                ctx.accounts.counterparty_member.key(),
                ctx.accounts.escrow_account.key(),
            ],
            "Squads Escrow".to_string(),
        )?;

        // Create Squads Transaction proposal.
        let cpi_context = CpiContext::new(
            ctx.accounts.squads_program.to_account_info(),
            CreateTransaction {
                multisig: ctx.accounts.multisig.to_account_info(),
                transaction: ctx.accounts.transaction_account.to_account_info(),
                creator: ctx.accounts.creator.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        );

        squads_v3_sdk::cpi::create_transaction(cpi_context, 1)?;

        // Add the first instruction to the transaction.

        let cpi_context = CpiContext::new(
            ctx.accounts.squads_program.to_account_info(),
            AddInstruction {
                multisig: ctx.accounts.multisig.to_account_info(),
                transaction: ctx.accounts.transaction_account.to_account_info(),
                instruction: ctx.accounts.first_instruction_account.to_account_info(),
                creator: ctx.accounts.creator.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        );

        let accounts = vec![
            MsAccountMeta {
                pubkey: ctx.accounts.multisig_token_account.key(),
                is_signer: false,
                is_writable: true,
            }, // Source token account (must be a signer)
            MsAccountMeta {
                pubkey: ctx.accounts.counterparty_creator_nft_token_account.key(),
                is_signer: false,
                is_writable: true,
            }, // Destination token account
            MsAccountMeta {
                pubkey: ctx.accounts.multisig.key(),
                is_signer: true,
                is_writable: false,
            }, // Authority (must be a signer)
        ];

        let data = create_transfer_data(send_amount);

        squads_v3_sdk::cpi::add_instruction(
            cpi_context,
            IncomingInstruction {
                program_id: anchor_spl::token::ID,
                keys: accounts,
                data: data,
            },
        )?;

        let transfer_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx
                    .accounts
                    .creator_creator_nft_token_account
                    .to_account_info(),
                to: ctx.accounts.multisig_token_account.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        );

        transfer(transfer_context, send_amount)?;

        ctx.accounts.escrow_account.creator = ctx.accounts.creator.key();
        ctx.accounts.escrow_account.counterparty = ctx.accounts.counterparty_member.key();
        ctx.accounts.escrow_account.creator_token_account =
            ctx.accounts.creator_creator_nft_token_account.key();
        ctx.accounts.escrow_account.counterparty_token_account =
            ctx.accounts.counterparty_creator_nft_token_account.key();
        ctx.accounts.escrow_account.multisig = ctx.accounts.multisig.key();

        Ok(())
    }

    pub fn create_escrow_response_and_execute(
        ctx: Context<CreateEscrowResponseAndExecute>,
        send_amount: u64,
    ) -> Result<()> {
        let vote_cpi_conext = CpiContext::new(
            ctx.accounts.squads_program.to_account_info(),
            VoteTransaction {
                multisig: ctx.accounts.multisig.to_account_info(),
                transaction: ctx.accounts.transaction_account.to_account_info(),
                member: ctx.accounts.escrow_counterparty.to_account_info(),
            },
        );

        squads_v3_sdk::cpi::approve_transaction(vote_cpi_conext)?;

        let execute_cpi_context = CpiContext::new(
            ctx.accounts.squads_program.to_account_info(),
            squads_v3_sdk::cpi::ExecuteTransaction {
                multisig: ctx.accounts.multisig.to_account_info(),
                transaction: ctx.accounts.transaction_account.to_account_info(),
                member: ctx.accounts.escrow_counterparty.to_account_info(),
            },
        );
        let pubkeys = vec![
            ctx.accounts.escrow_account.multisig,
            ctx.accounts.escrow_account.creator,
            ctx.accounts.escrow_account.counterparty,
            ctx.accounts.escrow_account.creator_token_account,
            ctx.accounts.counterparty_token_account.key(),
            anchor_spl::token::ID,
            ctx.accounts.system_program.key(),
        ];

        let serialized_pubkeys = pubkeys_to_vec(&pubkeys);
        squads_v3_sdk::cpi::execute_transaction(execute_cpi_context, serialized_pubkeys)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(multisig_id: Pubkey)]
pub struct CreateEsrow<'info> {
    // This is the account of the Multisig that will get created
    /// CHECK: Seeds will be checked by the Squads program in CPI.
    #[account(mut)]
    pub multisig: UncheckedAccount<'info>,

    // This is the escrow account that will allow you from retracting funds if the other party does not agree to the trade.
    #[account(init, payer = creator, space = 8 + 8 + 32 + 32 + 32 + 32 + 32, seeds = [b"escrow".as_ref(), multisig.key().as_ref()], bump)]
    pub escrow_account: Account<'info, EsrowAccount>,

    // This is the signers account.
    #[account(mut)]
    pub creator: Signer<'info>,

    // This is the account of the counterparty member.
    #[account(mut)]
    pub counterparty_member: SystemAccount<'info>,

    // This is the token account of the token the creator wants to trade.
    #[account(mut)]
    pub creator_creator_nft_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Account is not initialized yet.
    #[account(mut)]
    pub counterparty_creator_nft_token_account: AccountInfo<'info>,

    // // This is the token account of the token the creator wants to trade.
    // #[account(mut)]
    // pub creator_counterparty_nft_token_account: Box<Account<'info, TokenAccount>>,

    // /// CHECK: Account is not initialized yet.
    // #[account(mut)]
    // pub counterparty_counterparty_nft_token_account: AccountInfo<'info>,

    // The squads program which will be used in CPI.
    #[account(address = squads_v3_sdk::ID)]
    pub squads_program: Program<'info, SquadsMpl>,

    // The transactions account that is being created.
    /// CHECK: The squads program will check this.
    #[account(mut)]
    pub transaction_account: UncheckedAccount<'info>,

    #[account(init, payer = creator, associated_token::authority = multisig, associated_token::mint = creator_token_mint)]
    pub multisig_token_account: Account<'info, TokenAccount>,

    #[account(mut, mint::decimals = 0)]
    pub creator_token_mint: Account<'info, Mint>,

    /// CHECK: Seeds will get checked by the Squads program in CPI.
    #[account(mut)]
    pub first_instruction_account: UncheckedAccount<'info>,

    // The system program.
    pub system_program: Program<'info, System>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateEscrowResponseAndExecute<'info> {
    // This is the account of the Multisig that we will add our counter party to the escrow.
    /// CHECK: Seeds will get checked by the Squads program in CPI.
    #[account(mut)]
    pub multisig: UncheckedAccount<'info>,

    // This is the account of the escrow.
    #[account(mut, seeds = [b"escrow".as_ref(), multisig.key().as_ref()], bump)]
    pub escrow_account: Account<'info, EsrowAccount>,

    #[account(mut)]
    pub escrow_counterparty: Signer<'info>,

    #[account(mut)]
    pub counterparty_token_account: Account<'info, TokenAccount>,

    /// CHECK: Account is not initialized yet.
    #[account(mut)]
    pub creator_token_account: AccountInfo<'info>,

    // The transactions account that is being created.
    /// CHECK: The squads program will check this.
    #[account(mut)]
    pub transaction_account: UncheckedAccount<'info>,

    #[account(init, payer = escrow_counterparty, associated_token::authority = multisig, associated_token::mint = counterparty_token_mint)]
    pub multisig_token_account: Account<'info, TokenAccount>,

    #[account(mut, mint::decimals = 0)]
    pub counterparty_token_mint: Account<'info, Mint>,

    /// CHECK: Seeds will get checked by the Squads program in CPI.
    #[account(mut)]
    pub first_instruction_account: UncheckedAccount<'info>,

    // The squads program which will be used in CPI.
    #[account(address = squads_v3_sdk::ID)]
    pub squads_program: Program<'info, SquadsMpl>,

    pub system_program: Program<'info, System>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EsrowAccount {
    pub multisig: Pubkey,
    pub creator: Pubkey,
    pub counterparty: Pubkey,
    pub creator_token_account: Pubkey,
    pub counterparty_token_account: Pubkey,
}

fn create_transfer_data(amount: u64) -> Vec<u8> {
    let mut data = vec![2]; // The command byte for Transfer in the SPL Token program
    data.extend_from_slice(&amount.to_le_bytes()); // append the amount in little-endian format
    data
}

fn pubkeys_to_vec(pubkeys: &[Pubkey]) -> Vec<u8> {
    let mut bytes = vec![];
    for pubkey in pubkeys {
        bytes.extend_from_slice(&pubkey.to_bytes());
    }
    bytes
}
