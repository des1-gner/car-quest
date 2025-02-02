import React from 'react';
import { createRoot } from 'react-dom/client'; // Import createRoot from react-dom/client
import CarQuest from './App';

// Get the root element
const container = document.getElementById('root');

// Create a root
const root = createRoot(container);

// Render the app
root.render(
  <React.StrictMode>
    <CarQuest />
  </React.StrictMode>
);