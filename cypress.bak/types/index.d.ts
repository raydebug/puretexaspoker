/// <reference types="cypress" />
/// <reference types="@types/chai" />
/// <reference types="@types/chai-jquery" />

declare namespace Cypress {
  interface Chainable<Subject = any> {
    // 游戏相关命令
    joinGame(nickname?: string): Chainable<void>;
    joinTable(tableId: number, buyIn?: number): Chainable<void>;
    verifyChips(playerName: string, minChips: number, maxChips?: number): Chainable<void>;
    waitForGameAction(action?: string): Chainable<void>;
    openNewWindow(): Chainable<Window>;
    
    // 网络模拟命令
    simulateSlowNetwork(delay: number): Chainable<void>;
    
    // 文件相关命令
    attachFile(fileOrOptions: string | { fileContent: any; fileName: string; mimeType: string }): Chainable<void>;
  }

  interface Window {
    open(url: string, target?: string, features?: string): Window | null;
  }
} 