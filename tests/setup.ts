// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
  },
  runtime: {
    openOptionsPage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  notifications: {
    create: jest.fn(),
  },
} as any;

// Mock fetch globally
global.fetch = jest.fn();