use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("PLACEHOLDER_REPLACE_AFTER_DEPLOY");

// Constants for safer math
const DECIMALS: u8 = 9;
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
const TOKEN_MULTIPLIER: u64 = 1_000_000_000; // 10^9 for 9 decimals
const BASIS_POINTS: u64 = 10_000;
const MAX_WALLET_BPS: u16 = 200; // 2% max per wallet

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
        require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);
        require!(uri.len() <= 200, ErrorCode::UriTooLong);
        require!(initial_virtual_sol_reserves > 0, ErrorCode::InvalidReserves);
        require!(initial_virtual_token_reserves > 0, ErrorCode::InvalidReserves);
        
        let protocol = &mut ctx.accounts.protocol;
        let meme = &mut ctx.accounts.meme;
        let clock = Clock::get()?;

        // Total supply: 1 billion tokens (with 9 decimals)
        let total_supply = 1_000_000_000 * TOKEN_MULTIPLIER;

        meme.creator = ctx.accounts.creator.key();
        meme.mint = ctx.accounts.mint.key();
        meme.name = name;
        meme.symbol = symbol.clone();
        meme.uri = uri;
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
        meme.bump = ctx.bumps.meme;
        
        // Bonding curve parameters (Pump.fun style)
        meme.virtual_sol_reserves = initial_virtual_sol_reserves;
        meme.virtual_token_reserves = initial_virtual_token_reserves;
        meme.real_sol_reserves = 0;
        meme.real_token_reserves = total_supply;
        
        // Fair launch - no creator allocation
        meme.creator_allocation = 0;
        meme.creator_fee_bps = 50; // 0.5% creator fee
        meme.creator_fees_earned = 0;
        
        // Anti-bot tracking
        meme.last_trade_timestamp = clock.unix_timestamp;
        meme.trade_count = 0;

        protocol.total_memes_created += 1;

        msg!("Meme token created: {}", symbol);
        msg!("Total supply: {} tokens", total_supply / TOKEN_MULTIPLIER);
        msg!("Virtual reserves: {} SOL / {} tokens", 
             initial_virtual_sol_reserves / LAMPORTS_PER_SOL,
             initial_virtual_token_reserves / TOKEN_MULTIPLIER);

        Ok(())
    }

    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        sol_amount: u64,
        min_tokens_out: u64,
        max_slippage_bps: u16,
    ) -> Result<()> {
        let meme = &mut ctx.accounts.meme;
        let protocol = &ctx.accounts.protocol;
        let clock = Clock::get()?;
        
        require!(!meme.is_graduated, ErrorCode::AlreadyGraduated);
        require!(sol_amount > 0, ErrorCode::InvalidAmount);
        require!(max_slippage_bps <= 5000, ErrorCode::SlippageTooHigh); // Max 50%
        
        // Anti-bot: Rate limiting (1 second between trades)
        require!(
            clock.unix_timestamp - meme.last_trade_timestamp >= 1,
            ErrorCode::TradeTooFast
        );
        
        // Calculate tokens out using constant product formula
        let (tokens_out, protocol_fee_amount, creator_fee_amount) = 
            calculate_buy_amount(meme, protocol, sol_amount)?;
        
        // Slippage protection
        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        
        // Check 2% max wallet limit
        let buyer_balance = ctx.accounts.buyer_token_account.amount;
        let new_balance = buyer_balance.checked_add(tokens_out)
            .ok_or(ErrorCode::Overflow)?;
        let max_wallet_amount = meme.total_supply
            .checked_mul(MAX_WALLET_BPS as u64)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BASIS_POINTS)
            .ok_or(ErrorCode::Overflow)?;
        
        require!(
            new_balance <= max_wallet_amount,
            ErrorCode::MaxWalletExceeded
        );
        
        let net_sol = sol_amount
            .checked_sub(protocol_fee_amount)
            .and_then(|v| v.checked_sub(creator_fee_amount))
            .ok_or(ErrorCode::Overflow)?;
        
        // Transfer SOL to bonding curve vault
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
            ),
            net_sol,
        )?;
        
        // Transfer protocol fee
        if protocol_fee_amount > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.fee_recipient.to_account_info(),
                    },
                ),
                protocol_fee_amount,
            )?;
        }
        
        // Transfer creator fee
        if creator_fee_amount > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.creator.to_account_info(),
                    },
                ),
                creator_fee_amount,
            )?;
        }
        
        // Mint tokens to buyer
        let meme_key = meme.key();
        let seeds = &[
            b"mint".as_ref(),
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
        
        // Update reserves
        meme.real_sol_reserves = meme.real_sol_reserves
            .checked_add(net_sol)
            .ok_or(ErrorCode::Overflow)?;
        meme.real_token_reserves = meme.real_token_reserves
            .checked_sub(tokens_out)
            .ok_or(ErrorCode::Overflow)?;
        meme.circulating_supply = meme.circulating_supply
            .checked_add(tokens_out)
            .ok_or(ErrorCode::Overflow)?;
        meme.bonding_curve_supply = meme.bonding_curve_supply
            .checked_sub(tokens_out)
            .ok_or(ErrorCode::Overflow)?;
        meme.total_volume = meme.total_volume
            .checked_add(sol_amount)
            .ok_or(ErrorCode::Overflow)?;
        meme.creator_fees_earned = meme.creator_fees_earned
            .checked_add(creator_fee_amount)
            .ok_or(ErrorCode::Overflow)?;
        
        // Update anti-bot tracking
        meme.last_trade_timestamp = clock.unix_timestamp;
        meme.trade_count = meme.trade_count.saturating_add(1);
        
        // Check graduation
        if meme.real_sol_reserves >= protocol.graduation_threshold {
            meme.is_graduated = true;
            msg!("🎓 Token graduated! Ready for AMM migration");
        }
        
        msg!("Bought {} tokens for {} SOL", 
             tokens_out / TOKEN_MULTIPLIER,
             sol_amount / LAMPORTS_PER_SOL);
        
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
        
        // Anti-bot: Rate limiting
        require!(
            clock.unix_timestamp - meme.last_trade_timestamp >= 1,
            ErrorCode::TradeTooFast
        );
        
        // Calculate SOL out
        let (sol_out, protocol_fee_amount, creator_fee_amount) = 
            calculate_sell_amount(meme, protocol, token_amount)?;
        
        // Slippage protection
        require!(sol_out >= min_sol_out, ErrorCode::SlippageExceeded);
        
        let net_sol = sol_out
            .checked_sub(protocol_fee_amount)
            .and_then(|v| v.checked_sub(creator_fee_amount))
            .ok_or(ErrorCode::Overflow)?;
        
        // Burn seller's tokens
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
        
        // Transfer SOL to seller
        **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= net_sol;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += net_sol;
        
        // Transfer fees
        if protocol_fee_amount > 0 {
            **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= protocol_fee_amount;
            **ctx.accounts.fee_recipient.to_account_info().try_borrow_mut_lamports()? += protocol_fee_amount;
        }
        
        if creator_fee_amount > 0 {
            **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= creator_fee_amount;
            **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += creator_fee_amount;
        }
        
        // Update reserves
        meme.real_sol_reserves = meme.real_sol_reserves
            .checked_sub(sol_out)
            .ok_or(ErrorCode::Overflow)?;
        meme.real_token_reserves = meme.real_token_reserves
            .checked_add(token_amount)
            .ok_or(ErrorCode::Overflow)?;
        meme.circulating_supply = meme.circulating_supply
            .checked_sub(token_amount)
            .ok_or(ErrorCode::Overflow)?;
        meme.bonding_curve_supply = meme.bonding_curve_supply
            .checked_add(token_amount)
            .ok_or(ErrorCode::Overflow)?;
        meme.total_volume = meme.total_volume
            .checked_add(sol_out)
            .ok_or(ErrorCode::Overflow)?;
        meme.creator_fees_earned = meme.creator_fees_earned
            .checked_add(creator_fee_amount)
            .ok_or(ErrorCode::Overflow)?;
        
        meme.last_trade_timestamp = clock.unix_timestamp;
        meme.trade_count = meme.trade_count.saturating_add(1);
        
        msg!("Sold {} tokens for {} SOL", 
             token_amount / TOKEN_MULTIPLIER,
             sol_out / LAMPORTS_PER_SOL);
        
        Ok(())
    }

    pub fn migrate_to_amm(
        ctx: Context<MigrateToAmm>,
        amm_type: AmmType,
    ) -> Result<()> {
        let meme = &mut ctx.accounts.meme;
        require!(meme.is_graduated, ErrorCode::NotGraduated);
        require!(!meme.amm_migrated, ErrorCode::AlreadyMigrated);
        require!(ctx.accounts.authority.key() == meme.creator, ErrorCode::Unauthorized);
        
        meme.amm_migrated = true;
        meme.amm_type = Some(amm_type);
        
        msg!("Token migrated to {:?}", amm_type);
        Ok(())
    }
}

// Constant product formula: x * y = k
fn calculate_buy_amount(
    meme: &MemeToken,
    protocol: &Protocol,
    sol_in: u64,
) -> Result<(u64, u64, u64)> {
    let total_sol_reserves = meme.virtual_sol_reserves
        .checked_add(meme.real_sol_reserves)
        .ok_or(ErrorCode::Overflow)?;
    let total_token_reserves = meme.virtual_token_reserves
        .checked_add(meme.real_token_reserves)
        .ok_or(ErrorCode::Overflow)?;
    
    // Use u128 to prevent overflow
    let numerator = (total_token_reserves as u128)
        .checked_mul(sol_in as u128)
        .ok_or(ErrorCode::Overflow)?;
    let denominator = (total_sol_reserves as u128)
        .checked_add(sol_in as u128)
        .ok_or(ErrorCode::Overflow)?;
    
    let tokens_out = (numerator / denominator) as u64;
    
    // Calculate fees
    let protocol_fee = sol_in
        .checked_mul(protocol.protocol_fee_bps as u64)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(BASIS_POINTS)
        .ok_or(ErrorCode::Overflow)?;
    
    let creator_fee = sol_in
        .checked_mul(meme.creator_fee_bps as u64)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(BASIS_POINTS)
        .ok_or(ErrorCode::Overflow)?;
    
    Ok((tokens_out, protocol_fee, creator_fee))
}

fn calculate_sell_amount(
    meme: &MemeToken,
    protocol: &Protocol,
    tokens_in: u64,
) -> Result<(u64, u64, u64)> {
    let total_sol_reserves = meme.virtual_sol_reserves
        .checked_add(meme.real_sol_reserves)
        .ok_or(ErrorCode::Overflow)?;
    let total_token_reserves = meme.virtual_token_reserves
        .checked_add(meme.real_token_reserves)
        .ok_or(ErrorCode::Overflow)?;
    
    // Use u128 to prevent overflow
    let numerator = (total_sol_reserves as u128)
        .checked_mul(tokens_in as u128)
        .ok_or(ErrorCode::Overflow)?;
    let denominator = (total_token_reserves as u128)
        .checked_add(tokens_in as u128)
        .ok_or(ErrorCode::Overflow)?;
    
    let sol_out = (numerator / denominator) as u64;
    
    // Calculate fees
    let protocol_fee = sol_out
        .checked_mul(protocol.protocol_fee_bps as u64)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(BASIS_POINTS)
        .ok_or(ErrorCode::Overflow)?;
    
    let creator_fee = sol_out
        .checked_mul(meme.creator_fee_bps as u64)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(BASIS_POINTS)
        .ok_or(ErrorCode::Overflow)?;
    
    Ok((sol_out, protocol_fee, creator_fee))
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Protocol::SIZE,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Fee recipient
    pub fee_recipient: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String)]
pub struct CreateMemeToken<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
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
    /// CHECK: Bonding curve vault
    pub bonding_curve_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(
        mut,
        seeds = [b"meme", meme.creator.as_ref(), meme.symbol.as_bytes()],
        bump = meme.bump
    )]
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
    /// CHECK: Vault
    pub bonding_curve_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    /// CHECK: Creator
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
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(
        mut,
        seeds = [b"meme", meme.creator.as_ref(), meme.symbol.as_bytes()],
        bump = meme.bump
    )]
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
    /// CHECK: Vault
    pub bonding_curve_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(mut)]
    /// CHECK: Creator
    pub creator: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: Fee recipient
    pub fee_recipient: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MigrateToAmm<'info> {
    #[account(mut)]
    pub meme: Account<'info, MemeToken>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
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

impl Protocol {
    pub const SIZE: usize = 32 + 32 + 2 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct MemeToken {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
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
    pub holders_count: u32,
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

impl MemeToken {
    pub const SIZE: usize = 32 + 32 + (4 + 32) + (4 + 10) + (4 + 200) + 32 + 8 + 8 + 8 + 8 + 1 + 1 + (1 + 1) + 8 + 4 + 8 + 8 + 8 + 8 + 8 + 2 + 8 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AmmType {
    Raydium,
    Orca,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Symbol too long")]
    SymbolTooLong,
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
    #[msg("Max wallet limit exceeded (2% max)")]
    MaxWalletExceeded,
    #[msg("Trade too fast - wait 1 second")]
    TradeTooFast,
    #[msg("Unauthorized")]
    Unauthorized,
}
