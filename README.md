# Sparky (beta) ✨
Sparky is an ai agent designed to give users a nice chat experience while also being able to perform tasks. It's chill, it's got personality, and yeah it's still in beta so maybe don't rely on it for anything critical lol.
## Official URLs
- [GitHub Repository](https://github.com/voltagestudiosofficial/sparky-worker) (the repo you're probably on rn)
- [Official (stable) Instance](https://t.me/realsparkybot) (holler at @realsparkybot on Telegram)
- [Documentation](https://docs.voltagestudiosofficial.com/sparky) (coming soon™)
- [Bug Tracker](https://github.com/voltagestudiosofficial/sparky-worker/issues) (found a bug? lemme know)
## Contributing
Wanna help? fork it, make your changes, send a PR. we don't bite 🦷 bug fixes, features, better docs, vibes—all welcome. just keep it chill and add tests if you're adding big stuff.
## License
Sparky is licensed under the AGPLv3 License. See the [LICENSE](https://github.com/voltagestudiosofficial/sparky-worker/blob/main/LICENSE) file for more info. (c) 2026 voltage!studios.
## Getting Started
### What you need
- a computer (duh)
- [cloudflare](https://cloudflare.com) account (free!)
- [telegram](https://telegram.org) and a bot token (also free!)
- [openrouter](https://openrouter.ai) api key (tons of free models fr)
- a brain (optional but we recommend it)

## Local Development
### set it up locally
1. Clone the repo:
   ```bash
   git clone https://github.com/voltagestudiosofficial/sparky-worker.git
   cd sparky-worker
   ```

2. Install the goods:
   ```npm
   npm install
   ```

3. Make a Telegram bot:
   - message [@BotFather](https://t.me/BotFather) on Telegram
   - follow the vibes to create one
   - keep that token safe fam

4. Grab an OpenRouter API key:
   - sign up at [openrouter.ai](https://openrouter.ai)
   - steal it from settings
   - don't commit this to git bro

5. Create a `.env` file (already gitignored so ur good):
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   OPENROUTER_API_KEY=your_key_here
   PRIMARY_MODEL=openai/gpt-4-turbo
   SYSTEM_PROMPT=You are Sparky, a helpful AI assistant
   
   # Discord configuration (optional)
   DISCORD_BOT_TOKEN=your_discord_bot_token
   DISCORD_PUBLIC_KEY=your_discord_public_key_hex
   DISCORD_APP_ID=your_discord_application_id
   ```
   
   **Note:** Sparky now **always** uses `openrouter/gpt-oss-20b` (the free :free endpoint) for chat responses.
   The `PRIMARY_MODEL` variable is ignored - we always use the free GPT-OSS 20B.
   
   **For voice messages:** Voice transcription requires `OPENROUTER_API_KEY` and uses OpenRouter's free whisper-1 model.
   
   **For images:** GPT-OSS 20B is text-only and cannot analyze images. For image support, you would need to set up a vision model separately.

6. Run it:
   ```npm
   npm run dev
   ```

## Deployment
### ship it to the cloud ☁️
> **🔐 pro tip:** use `wrangler secret` for production stuff - it's locked down and never stored locally. ur `.env` file is chill cuz it's gitignored, but keep those secrets in wrangler when u deploy.

1. log in to cloudflare:
   ```npm
   npm run wrangler login
   ```

2. add ur secrets (they'll be encrypted no cap):
   ```npm
   npm run wrangler secret put TELEGRAM_BOT_TOKEN
   npm run wrangler secret put OPENROUTER_API_KEY
   ```
   - paste when prompted (it won't show)
   - don't put these as env vars or command args

3. deploy it:
   ```npm
   npm run deploy
   ```

4. set up the telegram webhook:
   - get ur worker URL from the cloudflare dashboard
   - message [@BotFather](https://t.me/BotFather) and do `/setwebhook (worker URL goes here lol)/telegram`
   - check it worked with `/getwebhookinfo`
