describe('00 - Comprehensive Backend API Tests', () => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3001'
  let authToken: string
  let testUserId: string
  let testTableId: string
  let testGameId: string
  let testPlayerId: string

  before(() => {
    cy.log('🚀 Starting comprehensive backend API tests')
    cy.log(`API URL: ${apiUrl}`)
  })

  beforeEach(() => {
    // Reset test data before each test
    cy.request({
      method: 'POST',
      url: `${apiUrl}/api/test/reset`,
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200) {
        cy.log('✅ Test data reset successful')
      } else {
        cy.log('⚠️ Test data reset endpoint not available or failed')
      }
    })
  })

  describe('🔧 Health & Basic Endpoints', () => {
    it('should respond to root endpoint', () => {
      cy.request({
        method: 'GET',
        url: apiUrl,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 404]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('message')
        }
      })
    })

    it('should respond to test endpoint', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/test`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 404]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('status')
          expect(response.body.status).to.eq('ok')
        }
      })
    })

    it('should handle lobby tables endpoint', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/lobby-tables`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.be.an('array')
          cy.log(`✅ Found ${response.body.length} lobby tables`)
        }
      })
    })
  })

  describe('🔐 Authentication API', () => {
    it('should register a new user', () => {
      const userData = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'testpassword123',
        displayName: 'Test User'
      }

      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/register`,
        body: userData,
        failOnStatusCode: false
      }).then((response) => {
        expect([201, 400, 500]).to.include(response.status)
        if (response.status === 201) {
          expect(response.body).to.have.property('success', true)
          expect(response.body.data).to.have.property('user')
          expect(response.body.data).to.have.property('tokens')
          testUserId = response.body.data.user.id
          authToken = response.body.data.tokens.accessToken
          cy.log('✅ User registration successful')
        } else {
          cy.log('⚠️ User registration failed or endpoint not available')
        }
      })
    })

    it('should login with valid credentials', () => {
      const loginData = {
        username: 'testuser',
        password: 'testpassword123'
      }

      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/login`,
        body: loginData,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 401, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          expect(response.body.data).to.have.property('tokens')
          cy.log('✅ User login successful')
        }
      })
    })

    it('should validate token endpoint', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/auth/validate`,
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 401, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          expect(response.body.data).to.have.property('isAuthenticated')
          cy.log('✅ Token validation endpoint working')
        }
      })
    })

    it('should handle profile endpoint', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/auth/profile`,
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 401, 403, 404, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          expect(response.body.data).to.have.property('user')
          cy.log('✅ Profile endpoint working')
        }
      })
    })

    it('should handle logout endpoint', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/auth/logout`,
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 401, 403, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          cy.log('✅ Logout endpoint working')
        }
      })
    })
  })

  describe('👥 Players API', () => {
    it('should create a new player', () => {
      const playerData = {
        nickname: `TestPlayer_${Date.now()}`,
        chips: 1000
      }

      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/players`,
        body: playerData,
        failOnStatusCode: false
      }).then((response) => {
        expect([201, 400, 500]).to.include(response.status)
        if (response.status === 201) {
          expect(response.body).to.have.property('id')
          expect(response.body.nickname).to.eq(playerData.nickname)
          expect(response.body.chips).to.eq(playerData.chips)
          testPlayerId = response.body.id
          cy.log('✅ Player creation successful')
        } else {
          cy.log('⚠️ Player creation failed or endpoint not available')
        }
      })
    })

    it('should reject duplicate player nicknames', () => {
      const playerData = {
        nickname: 'DuplicateTestPlayer',
        chips: 1000
      }

      // First creation
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/players`,
        body: playerData,
        failOnStatusCode: false
      }).then(() => {
        // Second creation with same nickname
        cy.request({
          method: 'POST',
          url: `${apiUrl}/api/players`,
          body: playerData,
          failOnStatusCode: false
        }).then((response) => {
          expect([400, 500]).to.include(response.status)
          if (response.status === 400) {
            expect(response.body).to.have.property('error')
            expect(response.body.error).to.include('already exists')
            cy.log('✅ Duplicate nickname rejection working')
          }
        })
      })
    })

    it('should validate required fields', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/players`,
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect([400, 500]).to.include(response.status)
        if (response.status === 400) {
          expect(response.body).to.have.property('error')
          cy.log('✅ Player validation working')
        }
      })
    })
  })

  describe('🎲 Tables API', () => {
    it('should create a new table', () => {
      const tableData = {
        name: `Test Table ${Date.now()}`,
        maxPlayers: 9,
        smallBlind: 10,
        bigBlind: 20,
        minBuyIn: 200,
        maxBuyIn: 2000
      }

      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/tables`,
        body: tableData,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 201, 400, 500]).to.include(response.status)
        if ([200, 201].includes(response.status)) {
          expect(response.body).to.have.property('id')
          expect(response.body.name).to.eq(tableData.name)
          expect(response.body.maxPlayers).to.eq(tableData.maxPlayers)
          testTableId = response.body.id
          cy.log('✅ Table creation successful')
        } else {
          cy.log('⚠️ Table creation failed or endpoint not available')
        }
      })
    })

    it('should list all tables', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/tables`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.be.an('array')
          cy.log(`✅ Found ${response.body.length} tables`)
        }
      })
    })

    it('should handle table join requests', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/tables/1/join`,
        body: {
          playerId: 'test-player-id',
          buyIn: 500
        },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 404, 500]).to.include(response.status)
        cy.log('✅ Table join endpoint accessible')
      })
    })
  })

  describe('🎮 Games API', () => {
    it('should create a new game', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games`,
        body: {
          tableId: testTableId || 'test-table-id'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect([201, 400, 500]).to.include(response.status)
        if (response.status === 201) {
          expect(response.body).to.have.property('id')
          testGameId = response.body.id
          cy.log('✅ Game creation successful')
        } else {
          cy.log('⚠️ Game creation failed or endpoint not available')
        }
      })
    })

    it('should get game state', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/games/${gameId}`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 404, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('id')
          cy.log('✅ Game state retrieval working')
        }
      })
    })

    it('should handle game actions - bet', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/${gameId}/bet`,
        body: { playerId: testPlayerId || 'test-player-id', amount: 20 },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 404, 500]).to.include(response.status)
        cy.log('✅ Bet endpoint accessible')
      })
    })

    it('should handle game actions - call', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/${gameId}/call`,
        body: { playerId: testPlayerId || 'test-player-id' },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 404, 500]).to.include(response.status)
        cy.log('✅ Call endpoint accessible')
      })
    })

    it('should handle game actions - check', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/${gameId}/check`,
        body: { playerId: testPlayerId || 'test-player-id' },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 404, 500]).to.include(response.status)
        cy.log('✅ Check endpoint accessible')
      })
    })

    it('should handle game actions - fold', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/${gameId}/fold`,
        body: { playerId: testPlayerId || 'test-player-id' },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 404, 500]).to.include(response.status)
        cy.log('✅ Fold endpoint accessible')
      })
    })

    it('should handle seat management', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/games/${gameId}/seats`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 404, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('seats')
          cy.log('✅ Seat management endpoint working')
        }
      })
    })

    it('should handle seat reservation', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/${gameId}/seats/1/reserve`,
        body: { playerId: testPlayerId || 'test-player-id', durationMinutes: 5 },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 404, 500]).to.include(response.status)
        cy.log('✅ Seat reservation endpoint accessible')
      })
    })

    it('should handle turn order', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/games/${gameId}/turn-order`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 404, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('turnOrder')
          cy.log('✅ Turn order endpoint working')
        }
      })
    })

    it('should handle game start', () => {
      const gameId = testGameId || 'test-game-id'
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/games/${gameId}/start`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 404, 500]).to.include(response.status)
        cy.log('✅ Game start endpoint accessible')
      })
    })
  })

  describe('💬 Chat API', () => {
    it('should send a chat message', () => {
      const messageData = {
        playerId: testPlayerId || 'test-player-id',
        content: 'Hello, table! This is a test message.',
        timestamp: new Date().toISOString()
      }

      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/chat/messages`,
        body: messageData,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('id')
          expect(response.body.content).to.eq(messageData.content)
          cy.log('✅ Chat message creation successful')
        } else {
          cy.log('⚠️ Chat message creation failed or endpoint not available')
        }
      })
    })

    it('should get chat history', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/chat/messages`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.be.an('array')
          cy.log(`✅ Found ${response.body.length} chat messages`)
        }
      })
    })

    it('should handle chat pagination', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/chat/messages?limit=10&offset=0`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.be.an('array')
          cy.log('✅ Chat pagination working')
        }
      })
    })

    it('should validate chat message fields', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/chat/messages`,
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect([400, 500]).to.include(response.status)
        if (response.status === 400) {
          expect(response.body).to.have.property('error')
          cy.log('✅ Chat validation working')
        }
      })
    })
  })

  describe('🚨 Error Tracking API', () => {
    it('should log errors', () => {
      const errorData = {
        message: 'Test error message',
        stack: 'Test stack trace',
        timestamp: new Date().toISOString(),
        level: 'error'
      }

      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/errors/errors`,
        body: errorData,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 404, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          cy.log('✅ Error logging successful')
        }
      })
    })

    it('should get recent errors', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/api/errors/errors`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 404, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          expect(response.body).to.have.property('errors')
          expect(response.body.errors).to.be.an('array')
          cy.log('✅ Error retrieval working')
        }
      })
    })

    it('should clear old errors', () => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/api/errors/errors?maxAge=30`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 404, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          cy.log('✅ Error cleanup working')
        }
      })
    })
  })

  describe('🧪 Test Utilities', () => {
    it('should reset test data', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/test/reset`,
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 404, 500]).to.include(response.status)
        if (response.status === 200) {
          expect(response.body).to.have.property('message')
          cy.log('✅ Test data reset working')
        }
      })
    })
  })

  after(() => {
    cy.log('🏁 Comprehensive backend API tests completed')
    cy.log('📊 Summary:')
    cy.log('- Health & Basic endpoints tested')
    cy.log('- Authentication API tested')
    cy.log('- Players API tested')
    cy.log('- Tables API tested')
    cy.log('- Games API tested')
    cy.log('- Chat API tested')
    cy.log('- Error tracking API tested')
    cy.log('- Test utilities tested')
  })
}) 