use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, FreezeAccount};
use mpl_token_metadata::instructions::CreateMetadataAccountV3;
use jito_bundle::Bundle;

// Constants for safer math
const DECIMALS: u8 = 6;
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
const TOKEN_MULTIPLIER: u64 = 1_000_000; // 10^6 for 6 decimals
const BASIS_POINTS: u64 = 10_000;

// Anti-Bundler Protection: Progressive wallet limits
const MAX_WALLET_LAUNCH_BPS: u16 = 50;  // 0.5% max during launch (first 15 min)
const MAX_WALLET_NORMAL_BPS: u16 = 200;  // 2% max after launch period
const LAUNCH_PERIOD_SECONDS: i64 = 900;  // 15 minutes

// Anti-Bot Protection: Cooldowns
const TRADE_COOLDOWN_SECONDS: i64 = 1;   // 1 second between trades
const LAUNCH_COOLDOWN_SECONDS: i64 = 60; // 60 second cooldown after token creation

// Anti-Sniping: Metadata reveal delay
const METADATA_REVEAL_DELAY_SECONDS: i64 = 10; // Reveal metadata 10 seconds after creation

// Anti-Sniping: Large buy threshold
const LARGE_BUY_THRESHOLD_BPS: u16 = 1500; // 15% threshold for first block

#[program]
pub mod meme_chain {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        protocol_fee_bps: u16,
        creation_fee_lamports: u64,
        graduation_threshold: u64,
    ) -> Result<()> {
        require!(protocol_fee_bps <= 1000, ErrorCode::FeeTooHigh); // Max 10%
        
        let protocol = &mut ctx.accounts.protocol;
        protocol.authority = ctx.accounts.authority.key();
        protocol.fee_recipient = ctx.accounts.fee_recipient.key();
        protocol.protocol_fee_bps = protocol_fee_bps;
        protocol.creation_fee_lamports = creation_fee_lamports;
        protocol.graduation_threshold = graduation_threshold;
        protocol.total_memes_created = 0;
        protocol.total_volume = 0;
        protocol.bump = ctx.bumps.protocol;
        
        msg!("Protocol initialized with {}% fee", protocol_fee_bps as f64 / 100.0);
        Ok(())
    }

    pub fn create_meme_token(
        ctx: Context<CreateMemeToken>,
        name: String,
        symbol: String,
        uri: String,
        image_hash: [u8; 32],
        initial_virtual_sol_reserves: u64,
        initial_virtual_token_reserves: u64,
    ) -> Result<()> {
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(name.len() >= 1, ErrorCode::NameTooShort);
        require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);
        require!(symbol.len() >= 1, ErrorCode::SymbolTooShort);
        require!(uri.len() <= 200, ErrorCode::UriTooLong);
        require!(initial_virtual_sol_reserves > 0, ErrorCode::InvalidReserves);
        require!(initial_virtual_token_reserves > 0, ErrorCode::InvalidReserves);

        // Anti-PVP: Check image hash is not all zeros (must be unique)
        let is_zero_hash = image_hash.iter().all(|&b| b == 0);
        require!(!is_zero_hash, ErrorCode::InvalidImageHash);
        
        let protocol = &mut ctx.accounts.protocol;
        let meme = &mut ctx.accounts.meme;
        let clock = Clock::get()?;

        // Total supply: 1 billion tokens (with 6 decimals)
        let total_supply = 1_000_000_000 * TOKEN_MULTIPLIER;

        meme.creator = ctx.accounts.creator.key();
        meme.mint = ctx.accounts.mint.key();
        meme.name = name.clone();
        meme.symbol = symbol.clone();
        meme.uri = uri.clone();
        meme.image_hash = image_hash;
        meme.created_at = clock.unix_timestamp;
        meme.reveal_time = clock.unix_timestamp + METADATA_REVEAL_DELAY_SECONDS; // Anti-Sniping: Stealth LP - Delay metadata reveal
        meme.created_slot = clock.slot; // Anti-Sniping: Track creation slot for large buy detection
        meme.total_supply = total_supply;
        meme.circulating_supply = 0;
        meme.bonding_curve_supply = total_supply;
        meme.is_graduated = false;
        meme.amm_migrated = false;
        meme.amm_type = None;
        meme.total_volume = 0;
        meme.holders_count = 0;
        meme.creator_allocation = 0;
        meme.creator_fee_bps = 0;
        meme.creator_fees_earned = 0;
        meme.last_trade_timestamp = clock.unix_timestamp;
        meme.trade_count = 0;
        meme.bump = ctx.bumps.meme;
        
        // Bonding curve parameters (Pump.fun style)
        meme.virtual_sol_reserves = initial_virtual_sol_reserves;
        meme.virtual_token_reserves = initial_virtual_token_reserves;
        meme.real_sol_reserves = 0;
        meme.real_token_reserves = 0;
        
        // Anti-Sniping: Stealth LP - Only emit metadata after reveal delay
        if clock.unix_timestamp >= meme.reveal_time {
            // Use mpl-token-metadata to create metadata
            let metadata_accounts = CreateMetadataAccountV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.mint.to_account_info(),
                payer: ctx.accounts.creator.to_account_info(),
                update_authority: ctx.accounts.creator.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(ctx.accounts.token_metadata_program.to_account_info(), metadata_accounts);
            mpl_token_metadata::instructions::create_metadata_account_v3(
                cpi_ctx,
                name,
                symbol,
                uri,
                None, // Additional metadata
                0, // Seller fee basis points
                true, // Update authority is signer
                true, // Is mutable
            )?;
        }

        protocol.total_memes_created += 1;
        
        msg!("Meme token '{}' created with supply {} tokens", meme.name, total_supply);
        Ok(())
    }

    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        sol_amount: u64,
        min_tokens_out: u64,
        max_slippage_bps: u16,
    ) -> Result<()> {
        let meme = &mut ctx.accounts.meme;
        let protocol = &mut ctx.accounts.protocol;
        let clock = Clock::get()?;
        
        require!(!meme.is_graduated, ErrorCode::AlreadyGraduated);
        require!(sol_amount > 0, ErrorCode::InvalidAmount);
        require!(max_slippage_bps <= 5000, ErrorCode::SlippageTooHigh); // Max 50%
        
        // Anti-Sniping: Jito-Style Bundler Blocks - Check priority fee and verification
        let priority_fee = ctx.accounts.instruction_sysvar.lamports; // Assume priority fee from tx (in lamports)
        if priority_fee > 10_000_000 { // >0.01 SOL
            // Check if buyer is verified (e.g., has stake or KYC PDA)
            let verified_pda = Pubkey::find_program_address(&[b"verified", ctx.accounts.buyer.key().as_ref()], &ctx.program_id).0;
            require!(ctx.accounts.verified_wallet.key() == verified_pda, ErrorCode::UnverifiedWallet);
        }
        
        // Anti-Sniping: Filters & Honeypots - Detect large buys in first block
        if clock.slot == meme.created_slot {
            let tokens_out = calculate_tokens_out(meme, sol_amount)?;
            let buy_percentage = (tokens_out * BASIS_POINTS as u64) / meme.virtual_token_reserves;
            if buy_percentage > LARGE_BUY_THRESHOLD_BPS as u64 {
                // Freeze wallet using spl-token freeze authority
                token::freeze_account(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        FreezeAccount {
                            account: ctx.accounts.buyer_token_account.to_account_info(),
                            mint: ctx.accounts.mint.to_account_info(),
                            authority: ctx.accounts.creator.to_account_info(), // Assume creator has freeze authority
                        },
                    ),
                )?;
                msg!("Large buy detected: {}% of reserves. Wallet frozen.", buy_percentage / BASIS_POINTS as u64);
                return err!(ErrorCode::LargeBuyDetected);
            }
        }
        
        // Calculate bonding curve math
        let k = meme.virtual_sol_reserves * meme.virtual_token_reserves;
        let new_sol_reserves = meme.virtual_sol_reserves + sol_amount;
        let new_token_reserves = k / new_sol_reserves;
        let tokens_out = meme.virtual_token_reserves - new_token_reserves;
        
        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(tokens_out > 0, ErrorCode::InvalidAmount);
        
        // Update reserves
        meme.virtual_sol_reserves = new_sol_reserves;
        meme.virtual_token_reserves = new_token_reserves;
        meme.real_sol_reserves += sol_amount;
        meme.real_token_reserves += tokens_out;
        meme.circulating_supply += tokens_out;
        meme.total_volume += sol_amount;
        meme.holders_count = meme.holders_count.max(1);
        meme.last_trade_timestamp = clock.unix_timestamp;
        meme.trade_count += 1;
        
        // Protocol fee (0.5%)
        let protocol_fee = (sol_amount * protocol.protocol_fee_bps as u64) / BASIS_POINTS as u64;
        let creator_fee = (sol_amount * meme.creator_fee_bps as u64) / BASIS_POINTS as u64;
        let net_sol = sol_amount - protocol_fee - creator_fee;
        
        // Transfer SOL to vault
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= sol_amount;
        **ctx.accounts.bonding_curve_vault.try_borrow_mut_lamports()? += net_sol;
        
        // Transfer protocol fee
        **ctx.accounts.bonding_curve_vault.try_borrow_mut_lamports()? += protocol_fee;
        protocol.total_volume += protocol_fee;
        
        // Transfer creator fee
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += creator_fee;
        meme.creator_fees_earned += creator_fee;
        
        // Mint tokens to buyer
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.mint.to_account_info(),
                },
                &[&[b"mint", meme.key().as_ref(), &[meme.bump]]],
            ),
            tokens_out,
        )?;
        
        msg!("Bought {} tokens for {} lamports", tokens_out, sol_amount);
        Ok(())
    }

    // Anti-Sniping: Dev-Buy Simulation - Buy and burn tokens
    pub fn dev_buy_and_burn(ctx: Context<DevBuyAndBurn>, sol_amount: u64) -> Result<()> {
        let meme = &mut ctx.accounts.meme;
        let clock = Clock::get()?;
        
        // Simulate buy for 5% of virtual tokens
        let dev_tokens = meme.virtual_token_reserves / 20; // 5%
        let k = meme.virtual_sol_reserves * meme.virtual_token_reserves;
        let new_token_reserves = meme.virtual_token_reserves - dev_tokens;
        let new_sol_reserves = k / new_token_reserves;
        let estimated_sol = new_sol_reserves - meme.virtual_sol_reserves;
        
        require!(sol_amount >= estimated_sol, ErrorCode::InsufficientFunds);
        
        // Update reserves
        meme.virtual_sol_reserves = new_sol_reserves;
        meme.virtual_token_reserves = new_token_reserves;
        meme.real_sol_reserves += estimated_sol;
        meme.real_token_reserves += dev_tokens;
        meme.circulating_supply += dev_tokens;
        meme.total_volume += estimated_sol;
        
        // Mint tokens to creator
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.mint.to_account_info(),
                },
                &[&[b"mint", meme.key().as_ref(), &[meme.bump]]],
            ),
            dev_tokens,
        )?;
        
        // Burn tokens transparently
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            dev_tokens,
        )?;
        
        // Emit burn event
        emit!(DevBurnEvent {
            amount_burned: dev_tokens,
            timestamp: clock.unix_timestamp,
        });
        
        msg!("Dev buy and burn: {} tokens burned", dev_tokens);
        Ok(())
    }

    // Other functions (sell_tokens, graduate, etc.) remain similar with updated calculations
}

// Helper function
fn calculate_tokens_out(meme: &MemeToken, sol_amount: u64) -> Result<u64> {
    let k = meme.virtual_sol_reserves * meme.virtual_token_reserves;
    let new_sol_reserves = meme.virtual_sol_reserves + sol_amount;
    let new_token_reserves = k / new_sol_reserves;
    Ok(meme.virtual_token_reserves - new_token_reserves)
}

// Accounts
#[derive(Accounts)]
#[instruction(name: String, symbol: String)]
pub struct CreateMemeToken<'info> {
    #[account(mut)]
    pub protocol: Account<'info, Protocol>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + MemeToken::SIZE,
        seeds = [b"meme", creator.key().as_ref(), symbol.as_bytes()],
        bump
    )]
    pub meme: Account<'info, MemeToken>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = 6,  // Updated to 6 decimals
        mint::authority = mint,
        seeds = [b"mint", meme.key().as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [b"vault", meme.key().as_ref()],
        bump
    )]
    /// CHECK: Bonding curve vault to hold SOL
    pub bonding_curve_vault: AccountInfo<'info>,
    
    /// CHECK: Metadata account for mpl-token-metadata
    pub metadata: AccountInfo<'info>,
    
    /// CHECK: Token metadata program
    pub token_metadata_program: AccountInfo<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub protocol: Account<'info, Protocol>,
    
    #[account(mut)]
    pub meme: Account<'info, MemeToken>,
    
    #[account(
        mut,
        seeds = [b"mint", meme.key().as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", meme.key().as_ref()],
        bump
    )]
    /// CHECK: Bonding curve vault
    pub bonding_curve_vault: AccountInfo<'info>,
    
    /// CHECK: Verified wallet PDA
    pub verified_wallet: AccountInfo<'info>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    
    /// CHECK: Fee recipient
    pub fee_recipient: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    
    /// CHECK: Instruction sysvar for priority fee check
    pub instruction_sysvar: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DevBuyAndBurn<'info> {
    #[account(mut)]
    pub meme: Account<'info, MemeToken>,
    
    #[account(
        mut,
        seeds = [b"mint", meme.key().as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// Other accounts (SellTokens, etc.) remain similar

// Events
#[event]
pub struct DevBurnEvent {
    pub amount_burned: u64,
    pub timestamp: i64,
}

// Error handling
#[error_code]
pub enum ErrorCode {
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Name too short")]
    NameTooShort,
    #[msg("Symbol too long")]
    SymbolTooLong,
    #[msg("Symbol too short")]
    SymbolTooShort,
    #[msg("URI too long")]
    UriTooLong,
    #[msg("Invalid reserves")]
    InvalidReserves,
    #[msg("Invalid image hash")]
    InvalidImageHash,
    #[msg("Already graduated")]
    AlreadyGraduated,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Fee too high")]
    FeeTooHigh,
    #[msg("Unverified wallet for high-priority transaction")]
    UnverifiedWallet,
    #[msg("Large buy detected in first block")]
    LargeBuyDetected,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}

// MemeToken struct with added fields
#[account]
pub struct MemeToken {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub image_hash: [u8; 32],
    pub created_at: i64,
    pub reveal_time: i64,  // Anti-Sniping: Stealth LP
    pub created_slot: u64, // Anti-Sniping: Large buy detection
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub bonding_curve_supply: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub is_graduated: bool,
    pub amm_migrated: bool,
    pub amm_type: Option<AmmType>,
    pub total_volume: u64,
    pub holders_count: u64,
    pub creator_allocation: u64,
    pub creator_fee_bps: u16,
    pub creator_fees_earned: u64,
    pub last_trade_timestamp: i64,
    pub trade_count: u64,
    pub bump: u8,
}