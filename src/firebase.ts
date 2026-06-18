import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

/**
 * ✅ Ask permission and get FCM token.
 */
export const requestFcmToken = async () => {
  try {
    const supported = await isSupported();

    if (!supported) {
      console.log("FCM not supported in this browser");
      return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const messaging = getMessaging(app);

    const fcmToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log("FCM TOKEN:", fcmToken);

    return fcmToken;
  } catch (error) {
    console.error("FCM token error:", error);
    return null;
  }
};

/**
 * ✅ Listen notification while app is open.
 */
export const listenToForegroundMessages = async () => {
  const supported = await isSupported();

  if (!supported) return;

  const messaging = getMessaging(app);

  onMessage(messaging, (payload) => {
    console.log("Foreground notification:", payload);

    if (
      Notification.permission === "granted" &&
      payload.notification?.title
    ) {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/logo.png",
      });
    }
  });
};