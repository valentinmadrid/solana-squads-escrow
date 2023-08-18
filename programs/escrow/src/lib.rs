use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use squads_v3_sdk::cpi::{create_multisig, Create};
use squads_v3_sdk::SquadsMpl;

declare_id!("H7AwKg8fWkA8DtHu1wza9qS26SXcPEW8gEw8nJqi7CRV");

#[program]
pub mod escrow {
    use super::*;

    pub fn create_escrow(ctx: Context<CreateEsrow>, multisig_id: Pubkey) -> Result<()> {
        let cpi_context = CpiContext::new(
            ctx.accounts.squads_program.to_account_info(),
            Create {
                multisig: ctx.accounts.multisig.to_account_info(),
                creator: ctx.accounts.signer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        );

        create_multisig(
            cpi_context,
            multisig_id,
            2,
            vec![
                ctx.accounts.signer.key(),
                ctx.accounts.counterparty_member.key(),
            ],
            "Squads Escrow".to_string(),
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(multisig_id: Pubkey)]
pub struct CreateEsrow<'info> {
    /// CHECK: Seeds will be checked by the Squads program in CPI
    #[account(mut)]
    pub multisig: UncheckedAccount<'info>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub counterparty_member: SystemAccount<'info>,
    #[account(address = squads_v3_sdk::ID)]
    pub squads_program: Program<'info, SquadsMpl>,
    pub system_program: Program<'info, System>,
}
