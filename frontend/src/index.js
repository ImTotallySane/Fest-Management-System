import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';

// first file that runs

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode> {/* runs extra checks on unsafe code */}
    <ChakraProvider> { /* chakra initializing */ }
      <BrowserRouter> { /* Enables routing */ }
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);