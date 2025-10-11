# Daam Deals Frontend

Discover the smartest way to compare prices in Bangladesh with [daam.deals](https://daam.deals), the destination for shoppers who want transparent pricing and timely deal alerts. With [daam.deals](https://daam.deals), you'll never overpay again!

---

## Overview

[daam.deals](https://daam.deals) lets you explore thousands of up-to-date product listings, compare offers from trusted retailers, and spot verified deals before they disappear. Track prices that matter to you, receive guidance on the best offers, and browse curated insights built for Bangladeshi shoppers.

## Capabilities

### Discovery & Navigation
- View the best weekly deals on products from the biggest retailers in Bangladesh.
- Search products based on a number of different filters.
- Simply grab a product link and discover the prices history and offers from other retailers

### Product Catalogue & Filtering
- Browse a dedicated catalogue that lets you filter by category, brand, price range, and more without getting lost.
- Dive into the Configurator to mix and match detailed filters and uncover exactly the products that match your wishlist.
- Explore curated pages for categories, brands, and partner websites to see everything a retailer carries at a glance.

### Product Intelligence
- Open any product to compare offers store by store.
- Review interactive price history charts to spot trends and confirm you’re buying at the right moment.
- Pick the exact variant you care about—specs and charts update instantly so you only see what’s relevant.

### Price Tracking & Accounts
- Sign in securely with a single magic link—no passwords to remember.
- Keep a personal watchlist with target prices and see at a glance which items have already met your goal.
- Update or remove tracked items anytime and refresh the latest prices with a single tap.

### Deals & Promotions
- Visit the deals hub to see the biggest prices drops.
- Fine-tune the list by category or brand and share the filtered link with friends who shop for the same gear.
- Preview each deal with quick-hit badges that reveal highlights like warranty, availability, or payment options as you scroll.

### Quality & Operations Tooling
- Help keep listings clean with built-in tools to flag inaccuracies or suggest fixes when something looks off.
- Benefit from a continually improving experience informed by privacy-conscious analytics and feedback.

## Tech Stack
- [SvelteKit](https://kit.svelte.dev/) with Svelte 5 and TypeScript
- [Vite](https://vitejs.dev/) build tooling
- Tailwind CSS utilities plus custom design tokens
- Chart.js with Day.js adapter for visualisations

## Local Development
1. Install dependencies:
	```bash
	npm install
	```
2. Create an `.env` (or use your preferred environment manager) and set the API endpoint, for example:
	```bash
	API_URL="http://localhost:5000"
    PUBLIC_API_URL="http://localhost:5000"
	```
3. Run the development server:
	```bash
	npm run dev
	```
4. Visit `http://localhost:5173` to browse the app.

### Common Scripts
- `npm run dev` – start the Vite dev server.
- `npm run build` – produce a production build in `build/`.
- `npm run preview` – serve the built output locally.
- `npm run check` – sync SvelteKit types and run `svelte-check`.
- `npm run lint` – lint the codebase with ESLint.

## Deploying With Dokku
1. Add the nginx buildpack (see `.buildpacks`).
2. Touch an empty `.static` file at the repo root.
3. Configure `NGINX_ROOT=dist` for the app.
4. Commit `app.json` so Dokku runs the static build step.
5. Set the `API_URL` config (e.g. `http://my-api.web:5000` when the API app is `my-api`).
6. Create a shared network: `dokku network:create custom-network`.
7. Attach both API and client apps to the network:
	```bash
	dokku network:set <server> attach-post-create custom-network
	dokku network:set <client> attach-post-create custom-network
	```

## Contributing
- Open an issue or pull request for bugs, enhancements, or documentation updates.
- Please include reproduction steps and screenshots/recordings when reporting UI issues.

