// Copy this file to the target environment file and fill in the values:
//   environment.ts          — local development (emulators ON)
//   environment.prod.ts     — production build (emulators OFF, production: true)
//   environment.staging.ts  — staging build   (emulators OFF, production: false)
//
// All of the above are gitignored. Only this example is committed to source control.

import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useEmulators: true,
  emulators: {
    authHost: '127.0.0.1',
    authPort: 9099,
    firestoreHost: '127.0.0.1',
    firestorePort: 8080,
    functionsHost: '127.0.0.1',
    functionsPort: 5001,
    storageHost: '127.0.0.1',
    storagePort: 9199,
  },
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.firebasestorage.app',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_MEASUREMENT_ID',
  },
};
