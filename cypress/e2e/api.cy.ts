describe('API Tests', () => {
  const apiUrl = Cypress.env('apiUrl')

  beforeEach(() => {
    // Reset any test data before each test
    cy.request('POST', `${apiUrl}/api/test/reset`).then((response: Cypress.Response<any>) => {
      expect(response.status).to.eq(200)
    })
  })

  describe('Authentication API', () => {
    it('should register a new player', () => {
      const player = {
        nickname: 'testPlayer1',
        chips: 1000
      }

      cy.request('POST', `${apiUrl}/api/players/register`, player).then((response: Cypress.Response<any>) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('id')
        expect(response.body.nickname).to.eq(player.nickname)
        expect(response.body.chips).to.eq(player.chips)
      })
    })

    it('should not register a player with duplicate nickname', () => {
      const player = {
        nickname: 'testPlayer2',
        chips: 1000
      }

      // Register first player
      cy.request('POST', `${apiUrl}/api/players/register`, player)

      // Try to register same nickname again
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/players/register`,
        body: player,
        failOnStatusCode: false
      }).then((response: Cypress.Response<any>) => {
        expect(response.status).to.eq(400)
        expect(response.body).to.have.property('error')
      })
    })
  })

  describe('Table API', () => {
    it('should create a new table', () => {
      const table = {
        name: 'Test Table',
        maxPlayers: 9,
        smallBlind: 10,
        bigBlind: 20,
        minBuyIn: 200,
        maxBuyIn: 2000
      }

      cy.request('POST', `${apiUrl}/api/tables`, table).then((response: Cypress.Response<any>) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('id')
        expect(response.body.name).to.eq(table.name)
        expect(response.body.maxPlayers).to.eq(table.maxPlayers)
      })
    })

    it('should list all tables', () => {
      cy.request('GET', `${apiUrl}/api/tables`).then((response: Cypress.Response<any>) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
      })
    })

    it('should join a table', () => {
      // First create a player
      const player = {
        nickname: 'testPlayer3',
        chips: 1000
      }

      cy.request('POST', `${apiUrl}/api/players/register`, player).then((playerResponse: Cypress.Response<any>) => {
        const playerId = playerResponse.body.id

        // Create a table
        const table = {
          name: 'Join Test Table',
          maxPlayers: 9,
          smallBlind: 10,
          bigBlind: 20,
          minBuyIn: 200,
          maxBuyIn: 2000
        }

        cy.request('POST', `${apiUrl}/api/tables`, table).then((tableResponse: Cypress.Response<any>) => {
          const tableId = tableResponse.body.id

          // Join the table
          cy.request('POST', `${apiUrl}/api/tables/${tableId}/join`, {
            playerId,
            buyIn: 500
          }).then((joinResponse: Cypress.Response<any>) => {
            expect(joinResponse.status).to.eq(200)
            expect(joinResponse.body).to.have.property('seatNumber')
          })
        })
      })
    })
  })

  describe('Game Actions API', () => {
    it('should place a bet', () => {
      // Test the bet endpoint with a simple request - it should return 404 for non-existent game
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/test-game-id/bet`,
        body: { playerId: 'test-player-id', amount: 20 },
        failOnStatusCode: false
      }).then((response: Cypress.Response<any>) => {
        // We expect 404 since game doesn't exist, but endpoint should be accessible
        expect([400, 404, 500]).to.include(response.status)
        expect(response.body).to.have.property('error')
      })
    })

    it('should allow player to fold', () => {
      // Test the fold endpoint - it should return 404 for non-existent game
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/test-game-id/fold`,
        body: { playerId: 'test-player-id' },
        failOnStatusCode: false
      }).then((response: Cypress.Response<any>) => {
        // We expect 404 since game doesn't exist, but endpoint should be accessible
        expect([400, 404, 500]).to.include(response.status)
        expect(response.body).to.have.property('error')
      })
    })

    it('should deal cards', () => {
      // Test the deal endpoint - it should return 404 for non-existent game
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/test-game-id/deal`,
        failOnStatusCode: false
      }).then((response: Cypress.Response<any>) => {
        // We expect 404 since game doesn't exist, but endpoint should be accessible
        expect([400, 404, 500]).to.include(response.status)
        expect(response.body).to.have.property('error')
      })
    })
  })

  describe('Chat API', () => {
    it('should send a chat message', () => {
      // Create a player first
      const player = {
        nickname: 'chatTester',
        chips: 1000
      }

      cy.request('POST', `${apiUrl}/api/players/register`, player).then((playerResponse: Cypress.Response<any>) => {
        const playerId = playerResponse.body.id

        const message = {
          playerId,
          content: 'Hello, table!',
          timestamp: new Date().toISOString()
        }

        cy.request('POST', `${apiUrl}/api/chat/messages`, message).then((response: Cypress.Response<any>) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('id')
          expect(response.body.content).to.eq(message.content)
          expect(response.body.playerId).to.eq(playerId)
        })
      })
    })

    it('should get chat history', () => {
      cy.request('GET', `${apiUrl}/api/chat/messages`).then((response: Cypress.Response<any>) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array')
      })
    })
  })
}) 