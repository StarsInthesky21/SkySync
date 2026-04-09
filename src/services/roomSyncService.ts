import Constants from "expo-constants";

const useFirebase = Constants.expoConfig?.extra?.firebaseEnabled === true;

// Dynamic import based on config flag
// When firebaseEnabled is true, use real Firestore backend
// When false, use in-memory mock for development/testing
export const roomSyncService = useFirebase
  ? require("./firebase/roomSyncService").roomSyncService
  : require("./mock/roomSyncService").roomSyncService;

export const isFirebaseEnabled = useFirebase;
