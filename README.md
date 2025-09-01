
![Paladin Banner](/images/banner.png)

# Paladin - token-gated community management bot

A telegram bot for creating secure, token-gated communities with built-in governance, analytics and AI assistance with support for Ethereum and Solana networks.

## Features

### - Token Gated Access
- **Normal Verification**: Captcha-protected web verification (like SafeGuard bot)
- **Pay Only**: Simple payment verification for group access
- **Token Holdings**: Verify minimum token amounts in user wallets
- **NFT Holdings**: Verify NFT ownership for exclusive access
- **Combined Methods**: Mix payment + token + NFT requirements
- **Multi-Chain**: Support for Ethereum (ETH) and Solana (SOL)
- **Auto-Monitoring**: Continuous verification of token holdings

### - Governance
- **Secure Polls**: Only verified token holders can participate
- **Real-time Results**: Live poll tracking and vote counting
- **Proposal System**: Community-driven decision making

### - Analytics
- **User Analytics**: Track member activity and engagement metrics
- **Message Analytics**: Group activity insights with detailed statistics
- **Token Analytics**: Real-time token data integration
- **Performance Metrics**: Comprehensive bot usage and group health stats

### - AI Assistance
- **Smart Queries**: AI-powered responses about your token/project
- **Contextual Help**: Answers questions using project-specific data
- **Token Integration**: Combines market data with project information

### - Chart Generation/Price Checking
- **Market Analytics**: Liquidity, market cap, and trading volume data
- **Chart Generation**: Visual analytics and performance charts

## Commands

### Group Commands
- `/new` - Set up group protection and verification
- `/verify` - Start verification process for governance participation
- `/analytics` - View comprehensive group analytics
- `/t_analytics` - Get token-specific analytics and market data
- `/u_analytics` - View user activity and engagement analytics
- `/m_analytics` - Message analytics with chart generation
- `/ask` - Query the AI assistant about your project
- `/new_poll` - Create governance polls for verified members

### Private Commands
- `/start` - Welcome message and setup instructions
- `/new` - Set up protection for groups you administrate

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/alok8bb/paladin.git
cd paladin
```

### 2. Setup environment variables
Create a `.env` file with the following:
```bash
BOT_TOKEN=your_telegram_bot_token
DATABASE_URI=mongodb://localhost:27017/paladin
HELIUS_API_KEY=your_helius_api_key
OPENAI_API_KEY=your_openai_api_key
VERIFY_WEB_URL=https://your-verification-site.com
```

### 3. Setup verification page
Clone and deploy the verification web interface:
```bash
git clone https://github.com/alok8bb/paladin-verify-page
# Follow the setup instructions in that repository
```

### 4. Run the bot
```bash
deno task dev
```

## Technologies Used

- **Runtime**: Deno
- **Framework**: Grammy (Telegram Bot Framework)
- **Database**: MongoDB with Mongoose
- **Blockchain**: Ethers.js (Ethereum), Solana Web3.js (Solana)
- **AI**: OpenAI GPT-4 API
- **APIs**: Helius (Solana), DexScreener (Price Data)
- **Web**: Oak (HTTP Server), Cloudflare (Verification)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Screenshots

*Coming soon - Screenshots of the bot in action*
