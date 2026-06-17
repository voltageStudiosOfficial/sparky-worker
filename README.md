# Sparky (beta) 
Sparky is an ai agent designed to give users a nice chat experience while also being able to perform tasks. It is currently in beta, so there may be some bugs and issues. If you find any, please report them to the developers.
## Official URLs
- [GitHub Repository](https://github.com/voltagestudiosofficial/sparky-worker) (the repository url you are probably on rn)
- [Official (stable) Instance](https://t.me/realsparkybot) (you can also DM @realsparkybot on Telegram)
- [Documentation](https://docs.voltagestudiosofficial.com/sparky) (not yet available, but will be soon)
- [Bug Tracker](https://github.com/voltagestudiosofficial/sparky-worker/issues) (report any bugs you find here)
## Contributing
Wanna help out? Just fork it, make your changes, and send a PR. we're cool with anything - bug fixes, new stuff, better docs, whatever. just try to keep the code style consistent and add tests if you're adding features or fixing stuff.
## License
Sparky is licensed under the AGPLv3 License. See the [LICENSE](https://github.com/voltagestudiosofficial/sparky-worker/blob/main/LICENSE) file for more information. (c) 2026 voltage!studios.
## Getting Started
### What you need
- a computer (lol)
- [cloudflare](https://cloudflare.com) account (it's free!)
- [telegram](https://telegram.org) and a bot token (also free!)
- [openrouter](https://openrouter.ai) api key (tons of free models there)
- a brain (optional but recommended)

## Local Development
### set it up locally
1. Clone the repo:
   ```bash
   git clone https://github.com/voltagestudiosofficial/sparky-worker.git
   cd sparky-worker
   ```

2. Install stuff:
   ```npm
   npm install
   ```

3. Make a Telegram bot:
   - message [@BotFather](https://t.me/BotFather) on Telegram
   - follow the prompts to create one
   - save your bot token somewhere safe

4. Grab an OpenRouter API key:
   - sign up at [openrouter.ai](https://openrouter.ai)
   - get your api key from settings
   - don't push this to git lol

5. Create a `.env` file (it's already gitignored so you're good):
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   OPENROUTER_API_KEY=your_key_here
   PRIMARY_MODEL=openai/gpt-4-turbo
   SYSTEM_PROMPT=You are Sparky, a helpful AI assistant
   ```

6. Run it locally:
   ```npm
   npm run dev
   ```

## Deployment
### ship it to the cloud
> **🔐 heads up:** use `wrangler secret` for production stuff - it's encrypted and never stored locally. your `.env` file is safe locally cuz it's gitignored, but keep those secrets in wrangler when you deploy.

1. log in to cloudflare:
   ```npm
   npm run wrangler login
   ```

2. add your secrets (they'll be encrypted):
   ```npm
   npm run wrangler secret put TELEGRAM_BOT_TOKEN
   npm run wrangler secret put OPENROUTER_API_KEY
   ```
   - paste when prompted, it won't show on screen
   - don't pass these as env vars or command args

3. deploy it:
   ```npm
   npm run deploy
   ```

4. set up the telegram webhook:
   - grab your worker URL from the cloudflare dashboard
   - message [@BotFather](https://t.me/BotFather) and do `/setwebhook YOUR_WORKER_URL/telegram`
   - check it worked with `/getwebhookinfo`
