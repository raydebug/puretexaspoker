/// <reference types="cypress" />

const API_BASE_URL = Cypress.env('apiBaseUrl') || 'http://localhost:3001';

interface Player {
  nickname: string;
  chips: number;
  id?: string;
}

interface GameAction {
  type: 'bet' | 'fold' | 'check' | 'raise';
  amount?: number;
  playerId: string;
}

interface ChatMessage {
  content: string;
  playerId: string;
}

interface GameState {
  pot: number;
  currentGameId: string;
  players: Array<{
    id: string;
    status: string;
  }>;
}

/**
 * Performance and Concurrency Test Suite
 * Tests the system's ability to handle multiple simultaneous operations
 * and maintain performance under load.
 */
describe('Performance and Concurrency Tests', () => {
  describe('Concurrency Tests', () => {
    /**
     * Tests multiple players joining a table simultaneously
     * Verifies that concurrent join operations are handled correctly
     */
    it('should handle multiple players joining simultaneously', () => {
      const numPlayers = 5;
      const players: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
        nickname: `Player${i + 1}`,
        chips: 1000
      }));

      // Create all players simultaneously
      const playerPromises = players.map(player =>
        cy.request<Player>('POST', `${API_BASE_URL}/api/players`, player)
      );

      // Wait for all players to be created
      cy.wrap(Promise.all(playerPromises)).then((responses: any[]) => {
        const playerIds = responses.map(response => response.body.id);

        // Create a table
        cy.request('POST', `${API_BASE_URL}/api/tables`, {
          name: 'Concurrent Table',
          maxPlayers: 9
        }).then(({ body: table }) => {
          // Have all players join simultaneously
          const joinPromises = playerIds.map(playerId =>
            cy.request('POST', `${API_BASE_URL}/api/tables/${table.id}/join`, { playerId, buyIn: 500 })
          );

          // Verify all players joined successfully
          cy.wrap(Promise.all(joinPromises)).then((joinResponses: any[]) => {
            joinResponses.forEach((response) => {
              expect(response.status).to.equal(200);
              expect(response.body).to.have.property('seatNumber');
            });
          });
        });
      });
    });

    /**
     * Tests concurrent betting actions from multiple players
     * Verifies that the game state remains consistent under concurrent operations
     */
    it('should handle concurrent betting actions', () => {
      let tableId: string;
      let gameId: string;
      const players: Player[] = Array.from({ length: 3 }, (_, i) => ({
        nickname: `BettingPlayer${i + 1}`,
        chips: 1000
      }));
      const playerIds: string[] = [];

      // Setup: Create players and table
      cy.wrap(players).each((player) => {
        cy.request<Player>('POST', `${API_BASE_URL}/api/players`, player).then(({ body }) => {
          playerIds.push(body.id as string);
        });
      }).then(() => {
        cy.request('POST', `${API_BASE_URL}/api/tables`, {
          name: 'Betting Table',
          maxPlayers: 9
        }).then(({ body: table }) => {
          tableId = table.id;
          
          // Join all players
          return cy.wrap(playerIds).each((playerId) => {
            cy.request('POST', `${API_BASE_URL}/api/tables/${tableId}/join`, { playerId, buyIn: 500 });
          });
        }).then(() => {
          // Get game ID
          cy.request<GameState>(`${API_BASE_URL}/api/tables/${tableId}`).then(({ body }) => {
            gameId = body.currentGameId;

            // Simulate concurrent betting
            const betPromises = playerIds.map(playerId =>
              cy.request<GameAction>('POST', `${API_BASE_URL}/api/games/${gameId}/actions`, {
                type: 'bet',
                amount: 20,
                playerId
              })
            );

            // Verify all bets were processed correctly
            cy.wrap(Promise.all(betPromises)).then((betResponses: any[]) => {
              betResponses.forEach((response) => {
                expect(response.status).to.equal(200);
                expect(response.body).to.have.property('type', 'bet');
              });

              // Verify game state after concurrent bets
              cy.request<GameState>(`${API_BASE_URL}/api/games/${gameId}`).then(({ body: gameState }) => {
                expect(gameState.pot).to.be.greaterThan(59); // 3 players * 20 chips
              });
            });
          });
        });
      });
    });
  });

  describe('Performance Tests', () => {
    /**
     * Tests the system's ability to handle rapid consecutive actions
     * Verifies that actions are processed within acceptable time limits
     */
    it('should handle rapid consecutive actions', () => {
      const player: Player = {
        nickname: 'SpeedPlayer',
        chips: 1000
      };
      let playerId: string;
      let tableId: string;
      let gameId: string;
      const startTime = Date.now();

      cy.request<Player>('POST', `${API_BASE_URL}/api/players`, player).then(({ body }) => {
        playerId = body.id as string;
        return cy.request('POST', `${API_BASE_URL}/api/tables`, {
          name: 'Speed Table',
          maxPlayers: 9
        });
      }).then(({ body: table }) => {
        tableId = table.id;
        return cy.request('POST', `${API_BASE_URL}/api/tables/${tableId}/join`, { playerId, buyIn: 500 });
      }).then(({ body }) => {
        gameId = body.gameId;

        // Perform 10 rapid consecutive actions
        const actions: GameAction[] = Array.from({ length: 10 }, () => ({
          type: 'bet',
          amount: 10,
          playerId
        }));

        return cy.wrap(actions).each((action) => {
          cy.request('POST', `${API_BASE_URL}/api/games/${gameId}/actions`, action);
        });
      }).then(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Assert that all actions were completed within reasonable time
        expect(duration).to.be.lessThan(5000); // 5 seconds max
      });
    });

    /**
     * Tests the system's ability to handle a large volume of chat messages
     * Verifies that message processing remains performant under load
     */
    it('should handle large number of chat messages', () => {
      const numMessages = 50;
      const player: Player = {
        nickname: 'ChatTester',
        chips: 1000
      };

      cy.request<Player>('POST', `${API_BASE_URL}/api/players`, player).then(({ body }) => {
        const playerId = body.id as string;
        const startTime = Date.now();

        // Send multiple chat messages rapidly
        const messages: ChatMessage[] = Array.from({ length: numMessages }, (_, i) => ({
          content: `Test message ${i + 1}`,
          playerId
        }));

        const messagePromises = messages.map(message =>
          cy.request('POST', `${API_BASE_URL}/api/chat/messages`, message)
        );

        // Verify all messages were processed
        cy.wrap(Promise.all(messagePromises)).then((responses: any[]) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Verify response status and timing
          responses.forEach((response) => {
            expect(response.status).to.equal(200);
          });
          expect(duration).to.be.lessThan(10000); // 10 seconds max

          // Verify messages can be retrieved
          cy.request('GET', `${API_BASE_URL}/api/chat/messages`).then(({ body: chatHistory }) => {
            expect(chatHistory).to.have.length.of.at.least(numMessages);
          });
        });
      });
    });

    /**
     * Tests the system's performance with multiple spectators
     * Verifies that the system remains responsive with many observers
     */
    it('should maintain performance with multiple spectators', () => {
      const numSpectators = 20;
      const table = {
        name: 'Spectator Table',
        maxPlayers: 9
      };

      cy.request('POST', `${API_BASE_URL}/api/tables`, table).then(({ body: table }) => {
        const tableId = table.id;
        const startTime = Date.now();

        // Create multiple spectators and have them watch the table
        const spectatorPromises = Array.from({ length: numSpectators }, (_, i) =>
          cy.request<Player>('POST', `${API_BASE_URL}/api/players`, {
            nickname: `Spectator${i + 1}`,
            chips: 0
          }).then(({ body: spectator }) =>
            cy.request('POST', `${API_BASE_URL}/api/tables/${tableId}/spectate`, {
              playerId: spectator.id
            })
          )
        );

        // Verify all spectators can watch without performance degradation
        cy.wrap(Promise.all(spectatorPromises)).then((responses: any[]) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          responses.forEach((response) => {
            expect(response.status).to.equal(200);
          });
          expect(duration).to.be.lessThan(15000); // 15 seconds max
        });
      });
    });
  });
}); 