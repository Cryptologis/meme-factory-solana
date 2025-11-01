use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};
use anchor_spl::associated_token::AssociatedToken;

// IMPORTANT: Update this with your actual deployed program ID
declare_id!("CRJDPpTp3aayKYZCaLEYntnpP3xvwbeTDYMdu18RtHwh");

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
        
        // Anti-Bot: Trade cooldown check
        let time_since_last_trade = clock.unix_timestamp - meme.last_trade_timestamp;
        require!(
            time_since_last_trade >= TRADE_COOLDOWN_SECONDS,
            ErrorCode::TradeTooFast
        );
        
        // Anti-Bot: Launch cooldown check (60 seconds after creation)
        let time_since_creation = clock.unix_timestamp - meme.created_at;
        require!(
            time_since_creation >= LAUNCH_COOLDOWN_SECONDS,
            ErrorCode::LaunchCooldownActive
        );
        
        // Calculate bonding curve math (constant product formula)
        let k = meme.virtual_sol_reserves
            .checked_mul(meme.virtual_token_reserves)
            .ok_or(ErrorCode::Overflow)?;
        
        let new_sol_reserves = meme.virtual_sol_reserves
            .checked_add(sol_amount)
            .ok_or(ErrorCode::Overflow)?;
        
        let new_token_reserves = k
            .checked_div(new_sol_reserves)
            .ok_or(ErrorCode::InvalidAmount)?;
        
        let tokens_out = meme.virtual_token_reserves
            .checked_sub(new_token_reserves)
            .ok_or(ErrorCode::InvalidAmount)?;
        
        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(tokens_out > 0, ErrorCode::InvalidAmount);
        
        // Anti-Bundler: Check wallet limit
        let buyer_new_balance = ctx.accounts.buyer_token_account.amount
            .checked_add(tokens_out)
            .ok_or(ErrorCode::Overflow)?;
        
        let max_wallet_bps = if time_since_creation < LAUNCH_PERIOD_SECONDS {
            MAX_WALLET_LAUNCH_BPS
        } else {
            MAX_WALLET_NORMAL_BPS
        };
        
        let max_wallet_amount = (meme.total_supply as u128)
            .checked_mul(max_wallet_bps as u128)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BASIS_POINTS as u128)
            .ok_or(ErrorCode::Overflow)? as u64;
        
        require!(
            buyer_new_balance <= max_wallet_amount,
            ErrorCode::MaxWalletExceeded
        );
        
        // Update reserves
        meme.virtual_sol_reserves = new_sol_reserves;
        meme.virtual_token_reserves = new_token_reserves;
        meme.real_sol_reserves = meme.real_sol_reserves
            .checked_add(sol_amount)
            .ok_or(ErrorCode::Overflow)?;
        meme.real_token_reserves = meme.real_token_reserves
            .checked_add(tokens_out)
            .ok_or(ErrorCode::Overflow)?;
        meme.circulating_supply = meme.circulating_supply
            .checked_add(tokens_out)
            .ok_or(ErrorCode::Overflow)?;
        meme.total_volume = meme.total_volume
            .checked_add(sol_amount)
            .ok_or(ErrorCode::Overflow)?;
        meme.holders_count = meme.holders_count.max(1);
        meme.last_trade_timestamp = clock.unix_timestamp;
        meme.trade_count = meme.trade_count
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        
        // Calculate fees
        let protocol_fee = sol_amount
            .checked_mul(protocol.protocol_fee_bps as u64)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BASIS_POINTS)
            .ok_or(ErrorCode::InvalidAmount)?;
        
        let creator_fee = sol_amount
            .checked_mul(meme.creator_fee_bps as u64)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BASIS_POINTS)
            .ok_or(ErrorCode::InvalidAmount)?;
        
        let net_sol = sol_amount
            .checked_sub(protocol_fee)
            .ok_or(ErrorCode::InsufficientFunds)?
            .checked_sub(creator_fee)
            .ok_or(ErrorCode::InsufficientFunds)?;
        
        // Transfer SOL from buyer to vault
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.bonding_curve_vault.key(),
            net_sol,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.bonding_curve_vault.to_account_info(),
            ],
        )?;
        
        // Transfer protocol fee
        if protocol_fee > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.fee_recipient.key(),
                protocol_fee,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.fee_recipient.to_account_info(),
                ],
            )?;
            protocol.total_volume = protocol.total_volume
                .checked_add(protocol_fee)
                .ok_or(ErrorCode::Overflow)?;
        }
        
        // Transfer creator fee
        if creator_fee > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.creator.key(),
                creator_fee,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.creator.to_account_info(),
                ],
            )?;
            meme.creator_fees_earned = meme.creator_fees_earned
                .checked_add(creator_fee)
                .ok_or(ErrorCode::Overflow)?;
        }
        
        // Mint tokens to buyer
        let meme_key = meme.key();
        let seeds = &[
            b"mint",
            meme_key.as_ref(),
            &[ctx.bumps.mint],
        ];
        let signer = &[&seeds[..]];
        
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.mint.to_account_info(),
                },
                signer,
            ),
            tokens_out,
        )?;
        
        msg!("Buy: {} SOL -> {} tokens", sol_amount, tokens_out);
        Ok(())
    }

    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        token_amount: u64,
        min_sol_out: u64,
        max_slippage_bps: u16,
    ) -> Result<()> {
        let meme = &mut ctx.accounts.meme;
        let protocol = &ctx.accounts.protocol;
        let clock = Clock::get()?;
        
        require!(!meme.is_graduated, ErrorCode::AlreadyGraduated);
        require!(token_amount > 0, ErrorCode::InvalidAmount);
        require!(max_slippage_bps <= 5000, ErrorCode::SlippageTooHigh);
        
        // Anti-Bot: Trade cooldown check
        let time_since_last_trade = clock.unix_timestamp - meme.last_trade_timestamp;
        require!(
            time_since_last_trade >= TRADE_COOLDOWN_SECONDS,
            ErrorCode::TradeTooFast
        );
        
        // Calculate bonding curve math (constant product formula)
        let k = meme.virtual_sol_reserves
            .checked_mul(meme.virtual_token_reserves)
            .ok_or(ErrorCode::Overflow)?;
        
        let new_token_reserves = meme.virtual_token_reserves
            .checked_add(token_amount)
            .ok_or(ErrorCode::Overflow)?;
        
        let new_sol_reserves = k
            .checked_div(new_token_reserves)
            .ok_or(ErrorCode::InvalidAmount)?;
        
        let sol_out = meme.virtual_sol_reserves
            .checked_sub(new_sol_reserves)
            .ok_or(ErrorCode::InvalidAmount)?;
        
        require!(sol_out >= min_sol_out, ErrorCode::SlippageExceeded);
        require!(sol_out > 0, ErrorCode::InvalidAmount);
        
        // Calculate fees
        let protocol_fee = sol_out
            .checked_mul(protocol.protocol_fee_bps as u64)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BASIS_POINTS)
            .ok_or(ErrorCode::InvalidAmount)?;
        
        let creator_fee = sol_out
            .checked_mul(meme.creator_fee_bps as u64)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BASIS_POINTS)
            .ok_or(ErrorCode::InvalidAmount)?;
        
        let net_sol = sol_out
            .checked_sub(protocol_fee)
            .ok_or(ErrorCode::InsufficientFunds)?
            .checked_sub(creator_fee)
            .ok_or(ErrorCode::InsufficientFunds)?;
        
        // Update reserves
        meme.virtual_sol_reserves = new_sol_reserves;
        meme.virtual_token_reserves = new_token_reserves;
        meme.real_sol_reserves = meme.real_sol_reserves
            .checked_sub(sol_out)
            .ok_or(ErrorCode::InsufficientFunds)?;
        meme.real_token_reserves = meme.real_token_reserves
            .checked_sub(token_amount)
            .ok_or(ErrorCode::InsufficientFunds)?;
        meme.circulating_supply = meme.circulating_supply
            .checked_sub(token_amount)
            .ok_or(ErrorCode::InsufficientFunds)?;
        meme.total_volume = meme.total_volume
            .checked_add(sol_out)
            .ok_or(ErrorCode::Overflow)?;
        meme.last_trade_timestamp = clock.unix_timestamp;
        meme.trade_count = meme.trade_count
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        
        // Burn tokens from seller
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            token_amount,
        )?;
        
        // Transfer SOL from vault to seller
        **ctx.accounts.bonding_curve_vault.try_borrow_mut_lamports()? -= net_sol;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += net_sol;
        
        // Transfer protocol fee
        if protocol_fee > 0 {
            **ctx.accounts.bonding_curve_vault.try_borrow_mut_lamports()? -= protocol_fee;
            **ctx.accounts.fee_recipient.try_borrow_mut_lamports()? += protocol_fee;
        }
        
        // Transfer creator fee
        if creator_fee > 0 {
            **ctx.accounts.bonding_curve_vault.try_borrow_mut_lamports()? -= creator_fee;
            **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += creator_fee;
        }
        
        msg!("Sell: {} tokens -> {} SOL", token_amount, sol_out);
        Ok(())
    }
}

// ============================================================================
// Account Structs
// ============================================================================

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Protocol::INIT_SPACE,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Fee recipient can be any account
    pub fee_recipient: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String)]
pub struct CreateMemeToken<'info> {
    #[account(mut)]
    pub protocol: Account<'info, Protocol>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + MemeToken::INIT_SPACE,
        seeds = [b"meme", symbol.as_bytes()],
        bump
    )]
    pub meme: Account<'info, MemeToken>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = DECIMALS,
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
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
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
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    /// CHECK: Creator receives fees
    pub creator: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: Fee recipient
    pub fee_recipient: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
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
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", meme.key().as_ref()],
        bump
    )]
    /// CHECK: Bonding curve vault
    pub bonding_curve_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(mut)]
    /// CHECK: Creator receives fees
    pub creator: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: Fee recipient
    pub fee_recipient: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// Data Structs
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct Protocol {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub protocol_fee_bps: u16,
    pub creation_fee_lamports: u64,
    pub graduation_threshold: u64,
    pub total_memes_created: u64,
    pub total_volume: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MemeToken {
    pub creator: Pubkey,
    pub mint: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    #[max_len(200)]
    pub uri: String,
    pub image_hash: [u8; 32],
    pub created_at: i64,
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub bonding_curve_supply: u64,
    pub is_graduated: bool,
    pub amm_migrated: bool,
    pub amm_type: Option<AmmType>,
    pub total_volume: u64,
    pub holders_count: u32, // Changed from u64 to u32 to match IDL
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub creator_allocation: u64,
    pub creator_fee_bps: u16,
    pub creator_fees_earned: u64,
    pub last_trade_timestamp: i64,
    pub trade_count: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AmmType {
    Raydium,
    Orca,
}

// ============================================================================
// Error Codes
// ============================================================================

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
    #[msg("Already graduated")]
    AlreadyGraduated,
    #[msg("Not graduated")]
    NotGraduated,
    #[msg("Already migrated")]
    AlreadyMigrated,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Duplicate meme")]
    DuplicateMeme,
    #[msg("Invalid reserves")]
    InvalidReserves,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Overflow")]
    Overflow,
    #[msg("Fee too high")]
    FeeTooHigh,
    #[msg("Slippage tolerance too high")]
    SlippageTooHigh,
    #[msg("Max wallet limit exceeded")]
    MaxWalletExceeded,
    #[msg("Trade too fast - wait 1 second")]
    TradeTooFast,
    #[msg("Launch cooldown active - wait 60 seconds after token creation")]
    LaunchCooldownActive,
    #[msg("Invalid image hash")]
    InvalidImageHash,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}
