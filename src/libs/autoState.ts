// Shared state cho auto process
let isAutoRunning = false;
let autoLikeInterval: NodeJS.Timeout | null = null;
let autoLikeCatalogInterval: NodeJS.Timeout | null = null;
let autoMessageInterval: NodeJS.Timeout | null = null;
let sentMessages: Set<string> = new Set(); // Track các match đã gửi tin nhắn
let currentDistanceFilter = 0; // Khoảng cách hiện tại khi auto-expand

export const autoState = {
    get isAutoRunning() {
        return isAutoRunning;
    },
    set isAutoRunning(value: boolean) {
        isAutoRunning = value;
        if (!value) {
            // Reset sent messages khi dừng
            sentMessages.clear();
        }
    },
    get autoLikeInterval() {
        return autoLikeInterval;
    },
    set autoLikeInterval(value: NodeJS.Timeout | null) {
        autoLikeInterval = value;
    },
    get autoLikeCatalogInterval() {
        return autoLikeCatalogInterval;
    },
    set autoLikeCatalogInterval(value: NodeJS.Timeout | null) {
        autoLikeCatalogInterval = value;
    },
    get autoMessageInterval() {
        return autoMessageInterval;
    },
    set autoMessageInterval(value: NodeJS.Timeout | null) {
        autoMessageInterval = value;
    },
    hasSentMessage(matchId: string): boolean {
        return sentMessages.has(matchId);
    },
    markMessageSent(matchId: string) {
        sentMessages.add(matchId);
    },
    get currentDistanceFilter() {
        return currentDistanceFilter;
    },
    set currentDistanceFilter(value: number) {
        currentDistanceFilter = value;
    },
    stopAll() {
        isAutoRunning = false;
        sentMessages.clear();
        currentDistanceFilter = 0;
        if (autoLikeInterval) {
            clearInterval(autoLikeInterval);
            autoLikeInterval = null;
        }
        if (autoLikeCatalogInterval) {
            clearInterval(autoLikeCatalogInterval);
            autoLikeCatalogInterval = null;
        }
        if (autoMessageInterval) {
            clearInterval(autoMessageInterval);
            autoMessageInterval = null;
        }
    }
};
