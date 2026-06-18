import api from "../utils/api";
import { requestFcmToken } from "../firebase";

export const registerFcmToken = async () => {
  const token = await requestFcmToken();

  if (!token) return;

  await api.post("/push-notification/save-token", {
    fcmToken: token,
  });

  console.log("FCM token saved");
};

export const sendTestPushNotification = async () => {
  await api.post("/push-notification/test");
};