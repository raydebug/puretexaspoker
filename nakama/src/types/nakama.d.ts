declare namespace nkruntime {
  interface Context {
    env: { [key: string]: string };
    node: string;
    queryParams: { [key: string]: string[] };
    userId?: string;
    username?: string;
    vars: { [key: string]: string };
    sessionId?: string;
    lang?: string;
    expiry?: number;
  }

  interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }

  interface Session {
    user_id: string;
    username: string;
    expires_at: number;
    refresh_expires_at: number;
    token: string;
    refresh_token: string;
    created: boolean;
  }

  interface AuthenticateDeviceRequest {
    account?: {
      id: string;
    };
  }

  interface AuthenticateEmailRequest {
    account?: {
      email: string;
    };
  }

  interface AuthenticateCustomRequest {
    account?: {
      id: string;
    };
  }

  interface StorageData {
    collection: string;
    key: string;
    userId?: string;
    value: any;
    version?: string;
    permissionRead?: number;
    permissionWrite?: number;
    createTime?: number;
    updateTime?: number;
  }

  interface StorageWrite {
    collection: string;
    key: string;
    userId?: string;
    value: any;
    version?: string;
    permissionRead?: number;
    permissionWrite?: number;
  }

  interface StorageRead {
    collection: string;
    key: string;
    userId?: string;
  }

  interface Match {
    matchId: string;
    node: string;
    size: number;
    fast: boolean;
    label?: string;
  }

  interface MatchState {
    presences: Presence[];
    tick: number;
    state: any;
  }

  interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    reason?: number;
  }

  interface MatchMessage {
    sender?: Presence;
    opCode: number;
    data: any;
    reliable: boolean;
    receiveTime: number;
  }

  interface MatchPresenceEvent {
    joins: Presence[];
    leaves: Presence[];
  }

  interface Nakama {
    storageWrite(objects: StorageWrite[]): StorageData[];
    storageRead(objects: StorageRead[]): StorageData[];
    storageDelete(objects: StorageRead[]): void;
    
    matchCreate(module: string, params?: { [key: string]: any }): string;
    matchGet(id: string): Match | null;
    matchList(limit?: number, authoritative?: boolean, label?: string, minSize?: number, maxSize?: number, query?: string): Match[];
    
    notificationSend(userId: string, subject: string, content: { [key: string]: any }, code: number, sender?: string, persistent?: boolean): void;
    notificationsSend(notifications: Array<{
      userId: string;
      subject: string;
      content: { [key: string]: any };
      code: number;
      sender?: string;
      persistent?: boolean;
    }>): void;

    leaderboardCreate(id: string, authoritative: boolean, sortOrder: string, operator: string, resetSchedule?: string, metadata?: { [key: string]: any }): void;
    leaderboardDelete(id: string): void;
    leaderboardRecordWrite(id: string, ownerId: string, username?: string, score?: number, subscore?: number, metadata?: { [key: string]: any }): void;
    
    groupCreate(userId: string, name: string, creatorId?: string, langTag?: string, description?: string, avatarUrl?: string, open?: boolean, metadata?: { [key: string]: any }, maxCount?: number): Group;
  }

  interface Group {
    id: string;
    creatorId: string;
    name: string;
    description: string;
    langTag: string;
    metadata: { [key: string]: any };
    avatarUrl: string;
    open: boolean;
    maxCount: number;
    edgeCount: number;
    createTime: number;
    updateTime: number;
  }

  interface Initializer {
    registerRpc(id: string, fn: RpcFunction): void;
    registerMatch(name: string, handlers: MatchHandler): void;
    registerMatchmakerMatched(fn: MatchmakerMatchedFunction): void;
    registerTournamentEnd(fn: TournamentEndFunction): void;
    registerTournamentReset(fn: TournamentResetFunction): void;
    registerLeaderboardReset(fn: LeaderboardResetFunction): void;
    registerPurchaseNotificationApple(fn: PurchaseNotificationAppleFunction): void;
    registerPurchaseNotificationGoogle(fn: PurchaseNotificationGoogleFunction): void;
    registerSubscriptionNotificationApple(fn: SubscriptionNotificationAppleFunction): void;
    registerSubscriptionNotificationGoogle(fn: SubscriptionNotificationGoogleFunction): void;
    registerStorageIndex(name: string, collection: string, key: string, fields: string[], maxEntries: number): void;
    registerStorageIndexFilter(name: string, fn: StorageIndexFilterFunction): void;
    registerBeforeAuthenticateApple(fn: BeforeHookFunction<AuthenticateAppleRequest>): void;
    registerBeforeAuthenticateCustom(fn: BeforeHookFunction<AuthenticateCustomRequest>): void;
    registerBeforeAuthenticateDevice(fn: BeforeHookFunction<AuthenticateDeviceRequest>): void;
    registerBeforeAuthenticateEmail(fn: BeforeHookFunction<AuthenticateEmailRequest>): void;
    registerAfterAuthenticateApple(fn: AfterHookFunction<Session, AuthenticateAppleRequest>): void;
    registerAfterAuthenticateCustom(fn: AfterHookFunction<Session, AuthenticateCustomRequest>): void;
    registerAfterAuthenticateDevice(fn: AfterHookFunction<Session, AuthenticateDeviceRequest>): void;
    registerAfterAuthenticateEmail(fn: AfterHookFunction<Session, AuthenticateEmailRequest>): void;
  }

  type RpcFunction = (ctx: Context, logger: Logger, nk: Nakama, payload: string) => string | void;
  
  interface MatchHandler {
    matchInit: MatchInitFunction;
    matchJoinAttempt: MatchJoinAttemptFunction;
    matchJoin: MatchJoinFunction;
    matchLeave: MatchLeaveFunction;
    matchLoop: MatchLoopFunction;
    matchSignal: MatchSignalFunction;
    matchTerminate: MatchTerminateFunction;
  }

  type MatchInitFunction = (ctx: Context, logger: Logger, nk: Nakama, params: { [key: string]: any }) => { state: any; tickRate: number; label: string };
  type MatchJoinAttemptFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, presence: Presence, metadata: { [key: string]: any }) => { state: any; accept: boolean; rejectMessage?: string } | null;
  type MatchJoinFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, presences: Presence[]) => { state: any } | null;
  type MatchLeaveFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, presences: Presence[]) => { state: any } | null;
  type MatchLoopFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, messages: MatchMessage[]) => { state: any } | null;
  type MatchSignalFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, data: string) => { state: any; data?: string } | null;
  type MatchTerminateFunction = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: any, graceSeconds: number) => { state: any } | null;

  interface MatchDispatcher {
    broadcastMessage(opCode: number, data: any, presences?: Presence[], sender?: Presence, reliable?: boolean): void;
    broadcastMessageDeferred(opCode: number, data: any, presences?: Presence[], sender?: Presence, reliable?: boolean): void;
    matchKick(presences: Presence[]): void;
    matchLabelUpdate(label: string): void;
  }

  type BeforeHookFunction<T> = (ctx: Context, logger: Logger, nk: Nakama, data: T) => T;
  type AfterHookFunction<T, U> = (ctx: Context, logger: Logger, nk: Nakama, out: T, in_: U) => void;
  type MatchmakerMatchedFunction = (ctx: Context, logger: Logger, nk: Nakama, entries: MatchmakerEntry[]) => string | null;
  type TournamentEndFunction = (ctx: Context, logger: Logger, nk: Nakama, tournament: Tournament, end: number, reset: number) => void;
  type TournamentResetFunction = (ctx: Context, logger: Logger, nk: Nakama, tournament: Tournament, end: number, reset: number) => void;
  type LeaderboardResetFunction = (ctx: Context, logger: Logger, nk: Nakama, leaderboard: Leaderboard, reset: number) => void;
  type PurchaseNotificationAppleFunction = (ctx: Context, logger: Logger, nk: Nakama, receipt: PurchaseReceiptApple, providerPayload: string) => void;
  type PurchaseNotificationGoogleFunction = (ctx: Context, logger: Logger, nk: Nakama, receipt: PurchaseReceiptGoogle, providerPayload: string) => void;
  type SubscriptionNotificationAppleFunction = (ctx: Context, logger: Logger, nk: Nakama, receipt: SubscriptionReceiptApple, providerPayload: string) => void;
  type SubscriptionNotificationGoogleFunction = (ctx: Context, logger: Logger, nk: Nakama, receipt: SubscriptionReceiptGoogle, providerPayload: string) => void;
  type StorageIndexFilterFunction = (ctx: Context, logger: Logger, nk: Nakama, storageIndex: StorageIndex, objects: StorageData[]) => StorageData[];

  interface MatchmakerEntry {
    ticket: string;
    presence: Presence;
    properties: { [key: string]: any };
  }

  interface Tournament {
    id: string;
    title: string;
    description: string;
    category: number;
    sortOrder: number;
    size: number;
    maxSize: number;
    maxNumScore: number;
    canEnter: boolean;
    endActive: number;
    nextReset: number;
    metadata: { [key: string]: any };
    createTime: number;
    startTime: number;
    endTime: number;
    duration: number;
    startActive: number;
    prevReset: number;
  }

  interface Leaderboard {
    id: string;
    authoritative: boolean;
    sortOrder: string;
    operator: string;
    prevReset: number;
    nextReset: number;
    metadata: { [key: string]: any };
    createTime: number;
  }

  interface PurchaseReceiptApple {
    productId: string;
    transactionId: string;
    rawReceipt: string;
    receiptData: { [key: string]: any };
    signature: string;
  }

  interface PurchaseReceiptGoogle {
    productId: string;
    purchaseToken: string;
    receiptData: { [key: string]: any };
    signature: string;
  }

  interface SubscriptionReceiptApple {
    productId: string;
    originalTransactionId: string;
    receiptData: { [key: string]: any };
    rawReceipt: string;
  }

  interface SubscriptionReceiptGoogle {
    productId: string;
    purchaseToken: string;
    receiptData: { [key: string]: any };
  }

  interface StorageIndex {
    name: string;
    collection: string;
    key: string;
    userId?: string;
    value: any;
    version: string;
    read: number;
    write: number;
    createTime: number;
    updateTime: number;
  }

  interface AuthenticateAppleRequest {
    account?: {
      token: string;
    };
  }
} 