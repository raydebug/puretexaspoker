import { defineConfig } from 'cypress'

export default function setupPlugins(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  let sessionId = 1;

  on('task', {
    async setupTestGame() {
      // Create two players
      const player1Response = await fetch(`${config.env.apiUrl}/api/players/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: 'testPlayer1', chips: 1000 })
      })
      const player1 = await player1Response.json()

      const player2Response = await fetch(`${config.env.apiUrl}/api/players/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: 'testPlayer2', chips: 1000 })
      })
      const player2 = await player2Response.json()

      // Create a table
      const tableResponse = await fetch(`${config.env.apiUrl}/api/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Game Table',
          maxPlayers: 9,
          smallBlind: 10,
          bigBlind: 20,
          minBuyIn: 200,
          maxBuyIn: 2000
        })
      })
      const table = await tableResponse.json()

      // Join both players to the table
      await fetch(`${config.env.apiUrl}/api/tables/${table.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player1.id, buyIn: 500 })
      })

      await fetch(`${config.env.apiUrl}/api/tables/${table.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player2.id, buyIn: 500 })
      })

      // Start the game
      const gameResponse = await fetch(`${config.env.apiUrl}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: table.id })
      })
      const game = await gameResponse.json()

      return {
        gameId: game.id,
        playerId: player1.id,
        player2Id: player2.id,
        tableId: table.id
      }
    },

    getSessionId() {
      return sessionId++;
    }
  })

  return config
} 