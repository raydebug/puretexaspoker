/// <reference types="cypress" />
/// <reference types="mocha" />
/// <reference types="chai" />

// @ts-nocheck

declare namespace Cypress {
  interface Response<T = any> {
    status: number;
    body: T;
    headers: { [key: string]: string };
  }

  interface Chainable {
    request(method: string, url: string, body?: any): Chainable<Response>;
    request(options: { method: string; url: string; body?: any; failOnStatusCode?: boolean }): Chainable<Response>;
  }
}

declare namespace Chai {
  interface Assertion {
    eq(value: any): Assertion;
    property(name: string, value?: any): Assertion;
    deep: {
      include(value: any): Assertion;
    };
    be: {
      a(type: string): Assertion;
      an(type: string): Assertion;
    };
  }
}

interface ApiResponse<T = any> {
  status: number;
  body: T;
  headers: { [key: string]: string };
}

declare const cy: Cypress.Chainable;
declare const expect: Chai.ExpectStatic;

describe('API Tests', () => {
  beforeEach(() => {
    cy.wrap(expect).as('expect');
  });

  it('should handle player registration', () => {
    cy.request('POST', '/api/players').then(({ status }) => {
      cy.get('@expect').invoke('equal', status, 200);
    });
  });

  it('should create a new player', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000
    };

    cy.request('POST', '/api/players', player).then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.exists(body.id);
        expect.equal(body.nickname, player.nickname);
        expect.equal(body.chips, player.chips);
      });
    });
  });

  it('should handle invalid player data', () => {
    const invalidPlayer = {
      nickname: '',
      chips: -100
    };

    cy.request({
      method: 'POST',
      url: '/api/players',
      body: invalidPlayer,
      failOnStatusCode: false
    }).then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 400);
        expect.exists(body.error);
      });
    });
  });

  it('should create a new table', () => {
    const table = {
      name: 'Test Table',
      maxPlayers: 9
    };

    cy.request('POST', '/api/tables', table).then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.exists(body.id);
        expect.equal(body.name, table.name);
        expect.equal(body.maxPlayers, table.maxPlayers);
      });
    });
  });

  it('should list all tables', () => {
    cy.request('GET', '/api/tables').then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.isArray(body);
      });
    });
  });

  it('should handle game actions', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000
    };

    const table = {
      name: 'Test Table',
      maxPlayers: 9
    };

    let playerId: string;
    let tableId: string;
    let gameId: string;

    cy.request('POST', '/api/players', player).then(({ body }) => {
      playerId = body.id;
      return cy.request('POST', '/api/tables', table);
    }).then(({ body }) => {
      tableId = body.id;
      return cy.request('POST', `/api/tables/${tableId}/join`, { playerId });
    }).then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.exists(body.seatNumber);
      });
      gameId = body.gameId;

      return cy.request('POST', `/api/games/${gameId}/actions`, {
        type: 'bet',
        amount: 20,
        playerId
      });
    }).then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.deepEqual(body, {
          type: 'bet',
          amount: 20,
          playerId,
          gameId,
          ...body
        });
      });

      return cy.request('POST', `/api/games/${gameId}/actions`, {
        type: 'fold',
        playerId
      });
    }).then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.deepEqual(body, {
          type: 'fold',
          playerId,
          gameId,
          ...body
        });
      });
    });
  });

  it('should create a new game', () => {
    cy.request('POST', '/api/games').then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.exists(body.id);
        expect.exists(body.deck);
        expect.isString(body.deck);
        expect.equal(body.status, 'active');
      });
    });
  });

  it('should handle chat messages', () => {
    const player = {
      nickname: 'TestPlayer',
      chips: 1000
    };

    let playerId: string;
    let message: { content: string; playerId: string };

    cy.request('POST', '/api/players', player).then(({ body }) => {
      playerId = body.id;
      message = {
        content: 'Hello, everyone!',
        playerId
      };
      return cy.request('POST', '/api/chat', message);
    }).then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.exists(body.id);
        expect.deepEqual(body, {
          content: message.content,
          playerId: message.playerId,
          ...body
        });
      });
    });
  });

  it('should list chat messages', () => {
    cy.request('GET', '/api/chat').then(({ status, body }) => {
      cy.get('@expect').then((expect: any) => {
        expect.equal(status, 200);
        expect.isArray(body);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle joining a non-existent table', () => {
      const player = {
        nickname: 'TestPlayer',
        chips: 1000
      };

      cy.request('POST', '/api/players', player).then(({ body }) => {
        const playerId = body.id;
        cy.request({
          method: 'POST',
          url: '/api/tables/999999/join',
          body: { playerId },
          failOnStatusCode: false
        }).then(({ status, body }) => {
          cy.get('@expect').then((expect: any) => {
            expect.equal(status, 404);
            expect.exists(body.error);
          });
        });
      });
    });

    it('should handle invalid game actions', () => {
      const player = {
        nickname: 'TestPlayer',
        chips: 1000
      };

      let playerId: string;
      let tableId: string;
      let gameId: string;

      cy.request('POST', '/api/players', player).then(({ body }) => {
        playerId = body.id;
        return cy.request('POST', '/api/tables', { name: 'Test Table', maxPlayers: 9 });
      }).then(({ body }) => {
        tableId = body.id;
        return cy.request('POST', `/api/tables/${tableId}/join`, { playerId });
      }).then(({ body }) => {
        gameId = body.gameId;
        return cy.request({
          method: 'POST',
          url: `/api/games/${gameId}/actions`,
          body: {
            type: 'invalid_action',
            playerId
          },
          failOnStatusCode: false
        });
      }).then(({ status, body }) => {
        cy.get('@expect').then((expect: any) => {
          expect.equal(status, 400);
          expect.exists(body.error);
        });
      });
    });

    it('should handle betting more chips than available', () => {
      const player = {
        nickname: 'TestPlayer',
        chips: 100
      };

      let playerId: string;
      let tableId: string;
      let gameId: string;

      cy.request('POST', '/api/players', player).then(({ body }) => {
        playerId = body.id;
        return cy.request('POST', '/api/tables', { name: 'Test Table', maxPlayers: 9 });
      }).then(({ body }) => {
        tableId = body.id;
        return cy.request('POST', `/api/tables/${tableId}/join`, { playerId });
      }).then(({ body }) => {
        gameId = body.gameId;
        return cy.request({
          method: 'POST',
          url: `/api/games/${gameId}/actions`,
          body: {
            type: 'bet',
            amount: 1000,
            playerId
          },
          failOnStatusCode: false
        });
      }).then(({ status, body }) => {
        cy.get('@expect').then((expect: any) => {
          expect.equal(status, 400);
          expect.exists(body.error);
        });
      });
    });
  });

  describe('Game State Transitions', () => {
    it('should handle full game round', () => {
      const players = [
        { nickname: 'Player1', chips: 1000 },
        { nickname: 'Player2', chips: 1000 }
      ];
      
      let playerIds: string[] = [];
      let tableId: string;
      let gameId: string;

      // Create players
      cy.wrap(players).each((player) => {
        cy.request('POST', '/api/players', player).then(({ body }) => {
          playerIds.push(body.id);
        });
      }).then(() => {
        // Create table
        return cy.request('POST', '/api/tables', { name: 'Test Table', maxPlayers: 9 });
      }).then(({ body }) => {
        tableId = body.id;
        // Join players to table
        return cy.wrap(playerIds).each((playerId) => {
          cy.request('POST', `/api/tables/${tableId}/join`, { playerId });
        });
      }).then(() => {
        // Get game ID from first player's join response
        return cy.request('POST', `/api/tables/${tableId}/join`, { playerId: playerIds[0] });
      }).then(({ body }) => {
        gameId = body.gameId;

        // Pre-flop betting
        return cy.wrap(playerIds).each((playerId) => {
          cy.request('POST', `/api/games/${gameId}/actions`, {
            type: 'bet',
            amount: 20,
            playerId
          });
        });
      }).then(() => {
        // Check game state after pre-flop
        return cy.request(`/api/games/${gameId}`);
      }).then(({ body }) => {
        cy.get('@expect').then((expect: any) => {
          expect.equal(body.phase, 'pre-flop');
          expect.exists(body.pot);
          expect.isArray(body.players);
        });

        // Flop betting
        return cy.wrap(playerIds).each((playerId) => {
          cy.request('POST', `/api/games/${gameId}/actions`, {
            type: 'bet',
            amount: 40,
            playerId
          });
        });
      }).then(() => {
        // Check game state after flop
        return cy.request(`/api/games/${gameId}`);
      }).then(({ body }) => {
        cy.get('@expect').then((expect: any) => {
          expect.equal(body.phase, 'flop');
          expect.exists(body.pot);
          expect.isArray(body.communityCards);
          expect.equal(body.communityCards.length, 3);
        });
      });
    });

    it('should handle player timeout', () => {
      const player = {
        nickname: 'TestPlayer',
        chips: 1000
      };

      let playerId: string;
      let tableId: string;
      let gameId: string;

      cy.request('POST', '/api/players', player).then(({ body }) => {
        playerId = body.id;
        return cy.request('POST', '/api/tables', { name: 'Test Table', maxPlayers: 9 });
      }).then(({ body }) => {
        tableId = body.id;
        return cy.request('POST', `/api/tables/${tableId}/join`, { playerId });
      }).then(({ body }) => {
        gameId = body.gameId;
        // Wait for timeout period
        cy.wait(31000); // Assuming 30-second timeout
        return cy.request(`/api/games/${gameId}`);
      }).then(({ body }) => {
        cy.get('@expect').then((expect: any) => {
          expect.equal(body.players[0].status, 'folded');
        });
      });
    });
  });
}); 