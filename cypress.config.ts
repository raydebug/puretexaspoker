import { defineConfig } from 'cypress'
import { resolve } from 'path'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: resolve(__dirname, './frontend/cypress/support/commands.ts'),
    specPattern: resolve(__dirname, './frontend/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'),
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 720,
    retries: {
      runMode: 2,
      openMode: 0
    },
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        table(message) {
          console.table(message)
          return null
        },
        getSessionId() {
          return Math.random().toString(36).substring(7)
        },
        failed() {
          return null
        },
        async setupTestGame() {
          // Create two test players
          const player1 = {
            nickname: 'testPlayer1',
            chips: 1000
          }
          const player2 = {
            nickname: 'testPlayer2',
            chips: 1000
          }

          // Register players
          const apiUrl = config.env.apiUrl
          const [p1Response, p2Response] = await Promise.all([
            fetch(`${apiUrl}/api/players/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(player1)
            }).then(res => res.json()),
            fetch(`${apiUrl}/api/players/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(player2)
            }).then(res => res.json())
          ])

          // Create a test table
          const table = {
            name: 'Test Game Table',
            maxPlayers: 9,
            smallBlind: 10,
            bigBlind: 20,
            minBuyIn: 200,
            maxBuyIn: 2000
          }

          const tableResponse = await fetch(`${apiUrl}/api/tables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(table)
          }).then(res => res.json())

          // Join both players to the table
          await Promise.all([
            fetch(`${apiUrl}/api/tables/${tableResponse.id}/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerId: p1Response.id,
                buyIn: 500
              })
            }),
            fetch(`${apiUrl}/api/tables/${tableResponse.id}/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerId: p2Response.id,
                buyIn: 500
              })
            })
          ])

          // Start the game
          const gameResponse = await fetch(`${apiUrl}/api/games`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableId: tableResponse.id
            })
          }).then(res => res.json())

          return {
            gameId: gameResponse.id,
            playerId: p1Response.id,
            player2Id: p2Response.id,
            tableId: tableResponse.id
          }
        }
      })
      return config
    }
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    },
    supportFile: resolve(__dirname, './frontend/cypress/support/component.ts'),
    specPattern: resolve(__dirname, './frontend/cypress/component/**/*.cy.ts')
  },
  env: {
    apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:3001',
    coverage: false
  },
  chromeWebSecurity: false
}) 