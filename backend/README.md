# Web Scraping on Seminuevos.com

This project implements an automated system to post ads on seminuevos.com using Node.js, Express.js, and Puppeteer.

## Prerequisites

- Node.js >= 16.0.0
- pnpm
- A valid seminuevos.com account

## Setup

1. Install pnpm

```bash
npm install -g pnpm
```

2. Install dependencies:
```bash
pnpm install
```

3. Ensure exist the screenshots directory:
```bash
mkdir -p screenshots
```

4. Add three car images to the `images` directory:
- `images/car1.jpg`
- `images/car2.jpg`
- `images/car3.jpg`

5. Update your seminuevos.com credentials by copying the .env.example file to .env and fill the values
```bash
cp .env.example .env
```

## Running the Server

1. Start the development server:
```bash
pnpm dev
```

2. The server will run on http://localhost:3000

## Testing the Endpoint

1. Use curl to test the ad posting endpoint:
```bash
curl -X POST \
  http://localhost:3000/api/post-ad \
  -H 'Content-Type: application/json' \ 
  -d '{
    "price": 250000,
    "description": "Acura ILX 2018 en excelentes condiciones. Único dueño, servicios de agencia."
  }'
```

## Puppeteer Configuration

Use the `slowMo` option in the Puppeteer configuration to slow down the automation process.
```javascript
slowMo = 50;
```

Set `headless` to `false` to see the browser in action, `new` value for production:
```javascript
headless: false
```

## Project Structure

- `src/service.js` - Main server implementation with Puppeteer automation
- `images/` - Directory for car images
- `screenshots/` - Directory where ad screenshots are saved