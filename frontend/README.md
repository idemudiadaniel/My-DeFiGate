# DeFi Gate Frontend

A modern React application for DeFi operations in Africa, built with Vite and featuring a clean component architecture.

## Architecture

### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── Dashboard.jsx   # Main dashboard with stats and quick actions
│   ├── Wallet.jsx      # Wallet creation and management
│   ├── Ramp.jsx        # On/off ramp functionality
│   ├── Send.jsx        # Token transfer interface
│   └── index.js        # Component exports
├── hooks/              # Custom React hooks
│   ├── useToast.js     # Toast notification management
│   └── useBackendStatus.js # Backend connectivity monitoring
├── App.jsx             # Main application component
├── App.css             # Global styles
└── main.jsx            # Application entry point
```

### Key Features
- **Modern UI**: Clean, light-themed design inspired by modern fintech apps
- **Component Architecture**: Modular, maintainable component structure
- **Custom Hooks**: Reusable logic for toast notifications and backend status
- **Responsive Design**: Mobile-first approach with modern CSS
- **Real-time Updates**: Live backend status monitoring

### Styling
- CSS custom properties for consistent theming
- Modern design with subtle shadows and hover effects
- Gradient buttons and smooth transitions
- Clean typography with Inter font family

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Component API

### Dashboard
```jsx
<Dashboard
  currentUser={user}
  currentWallet={wallet}
  navigateTo={navigationFunction}
/>
```

### Wallet
```jsx
<Wallet
  currentUser={user}
  currentWallet={wallet}
  createWallet={createWalletFunction}
/>
```

### Ramp
```jsx
<Ramp
  currentUser={user}
  createOnramp={onrampFunction}
  createOfframp={offrampFunction}
/>
```

### Send
```jsx
<Send
  currentUser={user}
  currentWallet={wallet}
  sendTokens={sendTokensFunction}
/>
```

## Custom Hooks

### useToast
```jsx
const { toasts, toast } = useToast();

// Show notification
toast("Message", "success"); // types: info, success, error, warning
```

### useBackendStatus
```jsx
const backendStatus = useBackendStatus();
// Returns: 'online', 'offline', or 'checking'
```