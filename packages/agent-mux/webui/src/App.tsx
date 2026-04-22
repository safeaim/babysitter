import React from 'react';
import { BrowserRouter } from 'react-router-dom-v6';

import { GatewayProvider } from './providers/GatewayProvider.js';
import { NotificationProvider } from './providers/NotificationProvider.js';
import { ThemeProvider } from './providers/ThemeProvider.js';
import { AppRouter } from './router.js';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <GatewayProvider>
          <NotificationProvider>
            <AppRouter />
          </NotificationProvider>
        </GatewayProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
