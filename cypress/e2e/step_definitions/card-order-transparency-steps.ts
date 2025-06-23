import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const apiUrl = Cypress.env('apiUrl') || 'http://localhost:3001';

// Background steps
Given('the card order transparency system is enabled', () => {
  cy.request('GET', `${apiUrl}/api/test`).should((response) => {
    expect(response.status).to.eq(200);
  });
});

// Game hash generation steps
When('I start a new poker game', () => {
  cy.window().then((win) => {
    const mockSocket = win.mockSocket;
    
    cy.wrap(null).then(() => {
      return new Cypress.Promise((resolve) => {
        mockSocket.on('gameStarted', (data: any) => {
          if (data.cardOrderHash) {
            cy.wrap(data.cardOrderHash).as('gameCardOrderHash');
            resolve(data);
          }
        });
        
        mockSocket.emit('game:start', { gameId: 'test-game-id' });
      });
    });
  });
});

Then('a card order hash should be generated before dealing', () => {
  cy.get('@gameCardOrderHash').should('exist').and('be.a', 'string');
  cy.get('@gameCardOrderHash').should('have.length', 64); // SHA-256 hash length
});

Then('the hash should be displayed to all players', () => {
  cy.get('@gameCardOrderHash').then((hash) => {
    cy.get('[data-testid="card-order-hash"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', hash);
  });
});

Then('the card order should be stored in the database', () => {
  cy.get('@gameCardOrderHash').then((hash) => {
    cy.request('GET', `${apiUrl}/api/card-orders/game/test-game-id`)
      .should((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data.hash).to.eq(hash);
      });
  });
});

Then('the card order should initially be unrevealed', () => {
  cy.request('GET', `${apiUrl}/api/card-orders/game/test-game-id`)
    .should((response) => {
      expect(response.body.data.isRevealed).to.be.false;
      expect(response.body.data.cardOrder).to.be.null;
      expect(response.body.data.seed).to.be.null;
    });
});

// Latest card orders steps
Given('there are multiple completed games with card orders', () => {
  const gameIds = ['game-1', 'game-2', 'game-3'];
  
  gameIds.forEach((gameId, index) => {
    cy.request('POST', `${apiUrl}/api/test/create-card-order`, {
      gameId,
      isRevealed: index < 2,
      testData: true
    });
  });
});

When('I request the latest card orders via API', () => {
  cy.request('GET', `${apiUrl}/api/card-orders/latest`)
    .as('latestCardOrdersResponse');
});

Then('I should receive up to 10 card order records', () => {
  cy.get('@latestCardOrdersResponse').should((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.success).to.be.true;
    expect(response.body.data).to.be.an('array');
    expect(response.body.data.length).to.be.at.most(10);
  });
});

Then('each record should contain game ID, hash, and reveal status', () => {
  cy.get('@latestCardOrdersResponse').should((response) => {
    response.body.data.forEach((record: any) => {
      expect(record).to.have.property('gameId');
      expect(record).to.have.property('hash');
      expect(record).to.have.property('isRevealed');
      expect(record).to.have.property('createdAt');
    });
  });
});

Then('revealed records should include the actual card order', () => {
  cy.get('@latestCardOrdersResponse').should((response) => {
    const revealedRecords = response.body.data.filter((record: any) => record.isRevealed);
    revealedRecords.forEach((record: any) => {
      expect(record.cardOrder).to.not.be.null;
      expect(record.seed).to.not.be.null;
    });
  });
});

Then('unrevealed records should hide the card order details', () => {
  cy.get('@latestCardOrdersResponse').should((response) => {
    const unrevealedRecords = response.body.data.filter((record: any) => !record.isRevealed);
    unrevealedRecords.forEach((record: any) => {
      expect(record.cardOrder).to.be.null;
      expect(record.seed).to.be.null;
    });
  });
});

// Download steps
Given('there are completed games with revealed card orders', () => {
  cy.request('POST', `${apiUrl}/api/test/create-revealed-card-orders`, {
    count: 3,
    testData: true
  });
});

When('I request to download the card order history', () => {
  cy.request({
    method: 'GET',
    url: `${apiUrl}/api/card-orders/download`,
    headers: {
      'Accept': 'text/csv'
    }
  }).as('downloadResponse');
});

Then('I should receive a CSV file with card order data', () => {
  cy.get('@downloadResponse').should((response) => {
    expect(response.status).to.eq(200);
    expect(response.headers['content-type']).to.include('text/csv');
    expect(response.headers['content-disposition']).to.include('attachment');
  });
});

Then('the CSV should contain game ID, hash, seed, and card sequence', () => {
  cy.get('@downloadResponse').should((response) => {
    const csvContent = response.body;
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    expect(headers).to.include('Game ID');
    expect(headers).to.include('Hash');
    expect(headers).to.include('Seed');
    expect(headers).to.include('Card Order');
  });
});

Then('only revealed card orders should be included in the download', () => {
  cy.get('@downloadResponse').should((response) => {
    const csvContent = response.body;
    const lines = csvContent.split('\n');
    
    lines.slice(1).forEach((line: string) => {
      if (line.trim()) {
        const columns = line.split(',');
        const revealedColumn = columns[columns.length - 1];
        expect(revealedColumn).to.eq('Yes');
      }
    });
  });
});

// Verification steps
Given('a game has been completed with revealed card order', () => {
  cy.request('POST', `${apiUrl}/api/test/create-completed-game`, {
    gameId: 'completed-game-id',
    isRevealed: true,
    testData: true
  }).as('completedGameData');
});

When('I verify the card order using the original hash', () => {
  cy.get('@completedGameData').then((gameData: any) => {
    cy.request('POST', `${apiUrl}/api/card-orders/verify`, {
      gameId: gameData.body.gameId,
      expectedHash: gameData.body.hash
    }).as('verificationResponse');
  });
});

Then('the verification should confirm the card order is authentic', () => {
  cy.get('@verificationResponse').should((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.success).to.be.true;
    expect(response.body.data.isValid).to.be.true;
  });
});

Then('the computed hash should match the stored hash', () => {
  cy.get('@verificationResponse').should((response) => {
    expect(response.body.data.hashMatches).to.be.true;
    expect(response.body.data.actualHash).to.eq(response.body.data.expectedHash);
  });
});

Then('the card sequence should be verifiable against the seed', () => {
  cy.get('@verificationResponse').should((response) => {
    expect(response.body.data.isValid).to.be.true;
    expect(response.body.data).to.have.property('verifiedAt');
  });
});

// Game completion steps
When('the game starts and progresses to completion', () => {
  cy.window().then((win) => {
    const mockSocket = win.mockSocket;
    
    mockSocket.emit('game:start', { gameId: 'test-game-id' });
    
    cy.wrap(null).then(() => {
      return new Cypress.Promise((resolve) => {
        let gameCompleted = false;
        
        mockSocket.on('gameState', (state: any) => {
          if (state.phase === 'finished' || state.isHandComplete) {
            gameCompleted = true;
            resolve(state);
          }
        });
        
        setTimeout(() => {
          mockSocket.emit('game:fold', { gameId: 'test-game-id', playerId: 'TestPlayer1' });
        }, 1000);
        
        setTimeout(() => {
          if (!gameCompleted) {
            resolve(null);
          }
        }, 10000);
      });
    });
  });
});

Then('the card order should be automatically revealed', () => {
  cy.request('GET', `${apiUrl}/api/card-orders/game/test-game-id`)
    .should((response) => {
      expect(response.body.data.isRevealed).to.be.true;
    });
});

Then('players should be notified of the card order revelation', () => {
  cy.window().then((win) => {
    const mockSocket = win.mockSocket;
    
    cy.wrap(null).then(() => {
      return new Cypress.Promise((resolve) => {
        mockSocket.on('cardOrderRevealed', (data: any) => {
          expect(data.gameId).to.eq('test-game-id');
          expect(data.message).to.include('revealed');
          resolve(data);
        });
        
        setTimeout(() => resolve(null), 5000);
      });
    });
  });
});

Then('the card order should become publicly viewable', () => {
  cy.request('GET', `${apiUrl}/api/card-orders/game/test-game-id`)
    .should((response) => {
      expect(response.body.data.cardOrder).to.not.be.null;
      expect(response.body.data.seed).to.not.be.null;
    });
});

// Tampered data verification steps
When('I attempt to verify with an incorrect hash', () => {
  cy.get('@completedGameData').then((gameData: any) => {
    cy.request('POST', `${apiUrl}/api/card-orders/verify`, {
      gameId: gameData.body.gameId,
      expectedHash: 'incorrect_hash_value_that_should_fail_verification'
    }).as('tamperedVerificationResponse');
  });
});

Then('the verification should fail', () => {
  cy.get('@tamperedVerificationResponse').should((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.data.isValid).to.be.false;
  });
});

Then('the system should indicate hash mismatch', () => {
  cy.get('@tamperedVerificationResponse').should((response) => {
    expect(response.body.data.hashMatches).to.be.false;
  });
});

Then('the actual vs expected hashes should be shown', () => {
  cy.get('@tamperedVerificationResponse').should((response) => {
    expect(response.body.data.actualHash).to.not.eq(response.body.data.expectedHash);
    expect(response.body.data.actualHash).to.be.a('string');
    expect(response.body.data.expectedHash).to.eq('incorrect_hash_value_that_should_fail_verification');
  });
});

// Deterministic shuffle steps
Given('a specific seed is used for card shuffling', () => {
  cy.wrap('test_seed_12345').as('testSeed');
});

When('the same seed is used to regenerate the deck', () => {
  cy.get('@testSeed').then((seed) => {
    cy.request('POST', `${apiUrl}/api/test/generate-deterministic-deck`, {
      seed,
      gameId: 'deterministic-test'
    }).as('firstDeckGeneration');
    
    cy.request('POST', `${apiUrl}/api/test/generate-deterministic-deck`, {
      seed,
      gameId: 'deterministic-test-2'
    }).as('secondDeckGeneration');
  });
});

Then('the card order should be identical', () => {
  cy.get('@firstDeckGeneration').then((first: any) => {
    cy.get('@secondDeckGeneration').then((second: any) => {
      expect(JSON.stringify(first.body.cardOrder)).to.eq(JSON.stringify(second.body.cardOrder));
    });
  });
});

Then('the hash should match the original', () => {
  cy.get('@firstDeckGeneration').then((first: any) => {
    cy.get('@secondDeckGeneration').then((second: any) => {
      expect(first.body.hash).to.eq(second.body.hash);
    });
  });
});

Then('the shuffle should be reproducible', () => {
  cy.get('@firstDeckGeneration').should((response) => {
    expect(response.body.cardOrder).to.be.an('array');
    expect(response.body.cardOrder).to.have.length(52);
    expect(response.body.hash).to.be.a('string');
  });
});

// API endpoints steps
Given('the poker system is running', () => {
  cy.request('GET', `${apiUrl}/api/test`).should((response) => {
    expect(response.status).to.eq(200);
  });
});

When('I access the card order transparency endpoints', () => {
  cy.request('GET', `${apiUrl}/api/card-orders/latest`).as('latestEndpoint');
  cy.request({
    method: 'GET',
    url: `${apiUrl}/api/card-orders/game/test-game-id`,
    failOnStatusCode: false
  }).as('gameEndpoint');
  cy.request({
    method: 'GET',
    url: `${apiUrl}/api/card-orders/download`,
    failOnStatusCode: false
  }).as('downloadEndpoint');
});

Then('I should be able to get latest card orders', () => {
  cy.get('@latestEndpoint').should((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('success');
  });
});

Then('I should be able to get card orders by game ID', () => {
  cy.get('@gameEndpoint').should((response) => {
    expect([200, 404]).to.include(response.status);
    expect(response.body).to.have.property('success');
  });
});

Then('I should be able to download card order history', () => {
  cy.get('@downloadEndpoint').should((response) => {
    expect(response.status).to.eq(200);
  });
});

Then('I should be able to verify card order hashes', () => {
  cy.request({
    method: 'POST',
    url: `${apiUrl}/api/card-orders/verify`,
    body: {
      gameId: 'test-game-id',
      expectedHash: 'test_hash'
    },
    failOnStatusCode: false
  }).should((response) => {
    expect([200, 400, 404]).to.include(response.status);
    expect(response.body).to.have.property('success');
  });
});

Then('all endpoints should return proper error handling', () => {
  cy.request({
    method: 'GET',
    url: `${apiUrl}/api/card-orders/game/invalid-game-id`,
    failOnStatusCode: false
  }).should((response) => {
    expect(response.status).to.eq(404);
    expect(response.body.success).to.be.false;
    expect(response.body).to.have.property('error');
  });
}); 