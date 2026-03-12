export interface Environment {
  production: boolean;
  useEmulators: boolean;
  emulators: {
    authHost: string;
    authPort: number;
    firestoreHost: string;
    firestorePort: number;
    functionsHost: string;
    functionsPort: number;
    storageHost: string;
    storagePort: number;
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
}
