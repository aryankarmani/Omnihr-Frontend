importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCU-thKUHhsu2cGbcb43_F523I145OTl5g",
  authDomain: "encalm-hrms-199f8.firebaseapp.com",
  projectId: "encalm-hrms-199f8",
  storageBucket: "encalm-hrms-199f8.firebasestorage.app",
  messagingSenderId: "423937991162",
  appId: "1:423937991162:web:fe5a66217180cdbb13c443",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo.png",
  });
});