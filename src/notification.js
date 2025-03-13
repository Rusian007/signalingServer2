const admin = require('firebase-admin');
const { validationResult } = require('express-validator');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase/firebase-admin.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const sendNotification = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { token, calleeId, rtcMessage, title, isVideomode , body} = req.body;
  
    const message = {
      notification: {
        title,
        body
      },
      data: {
        calleeId: calleeId,
        rtcMessage: rtcMessage,
        isVideomode: isVideomode ? 'true' : 'false',
      },
      // data: Object.fromEntries(
      //   Object.entries(data || {}).map(([key, value]) => [key, String(value)])
      // ),
      token: token,
      android: {
        priority: 'high',
        notification: {
          channelId: 'high-priority'  
        }
      }
  
    };
  
    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
      res.json({ success: true, message: 'Notification sent successfully' });
    } catch (error) {
  
  
      console.log('Error sending message:', error);
      res.status(500).json({ success: false, error: 'Failed to send notification - ' + error.message});
    }
  };

module.exports = {
    sendNotification
}