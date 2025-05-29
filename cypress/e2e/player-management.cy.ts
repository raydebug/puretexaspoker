describe('Player Management', () => {
  beforeEach(() => {
    cy.visit('/profile');
  });

  it('should allow uploading an avatar', () => {
    cy.fixture('avatar.png').then(fileContent => {
      cy.get('[data-testid="avatar-upload"]').attachFile({
        fileContent,
        fileName: 'avatar.png',
        mimeType: 'image/png'
      });
    });
    // ... rest of the test
  });

  // ... rest of the tests ...
}); 