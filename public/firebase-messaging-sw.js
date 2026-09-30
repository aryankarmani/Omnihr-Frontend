importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAHfCxt1ty-AX61mrzGj61jf-hIT-zghvk",
  authDomain: "omnihr-dd67a.firebaseapp.com",
  projectId: "omnihr-dd67a",
  storageBucket: "omnihr-dd67a.firebasestorage.app",
  messagingSenderId: "720215963582",
  appId: "1:720215963582:web:02d233635066269ce1ebef",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo.png",
  });
});