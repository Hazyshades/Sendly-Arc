# Sendly

**Dispatch funds by nickname on any social network.**

Live on: [sendly.digital](https://www.sendly.digital)

Backend repo: https://github.com/Hazyshades/Sendly-backend-agent

---

<img width="1325" height="506" alt="Screenshot_18" src="https://github.com/user-attachments/assets/7a4f9339-fd66-4792-ba4b-03a81392b6e1" />


## What is Sendly?

Sendly makes it easy to unlock stablecoins for any person, even if they don't have a critical wallet yet. 

The main idea is to send tokens via the username of the most popular social networks: X, Telegram, Instagram, Tiktok, etc.

The agent part of the platform is based on the orchestration of Langraph and Telegram bot. It is possible to send funds using voice commands, create a flexible moneyflow, and plan your expenses through the planner.

## Features
- NFT gift cards with custom messages, time locks, passwords, and AI-generated artwork.
- Voice Payment Agent that converts spoken commands into on-chain action using **ElevenLabs** and **AIML API**.
- Social recipients via dedicated vaults for Twitter, Twitch, Telegram, TikTok, Instagram, or direct wallet addresses.
- Internal wallet management backed by **Circle SDK**.
- Contact manager that syncs personal and **Privy**-sourced social contacts, favorites, and wallet metadata.
- Transaction analytics with sent/received history, cache layer.
- **Circle BridgeKit** integration to move funds between Arc Testnet and other configured chains.

## Tech Stack
- React 18, TypeScript, Vite, TailwindCSS, shadcn/ui components.
- wagmi, viem, and RainbowKit for wallet connectivity.
- Privy for social OAuth (Twitter, Twitch, Telegram, etc.) and account management.
- Supabase for db daya, contacts, and developer wallet metadata.
- Circle BridgeKit and Developer-Controlled Wallet SDKs.
- ElevenLabs speech-to-text, AIML API command parsing, Pinata IPFS uploads, custom image generator.

## Key Modules
- `components/` – UI and logic for gift card creation, spending, history, voice agent, developer wallet, bridge dialog, and contact management.
- `pages/` – Route-level containers for agent, create, my cards, spend, history, terms, privacy, and bridge flows.
- `utils/` – Service layer for web3, Circle APIs, bridge config, Supabase, social integrations, and media handling.

## Required Services
- Circle Developer-Controlled Wallets API for wallet lifecycle and testnet USDC/EURC.
- Circle BridgeKit for cross-chain transfers.
- Supabase project with the SQL schema from `supabase/migrations`.
- ElevenLabs (speech), AIML API (command parsing), Pinata (IPFS) credentials.
- Privy application configured for the desired social providers.

## Status
The application targets Arc Testnet and Circle-supported testnets. For possible integrations, I am open to suggestions and will be happy to work with you. Contact on X: Leonissx
