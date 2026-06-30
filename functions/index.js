const { onRequest } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()
const messaging = admin.messaging()

async function sendDueRemindersImpl() {
  const now = admin.firestore.Timestamp.now()
  const snapshot = await db
    .collectionGroup('reminders')
    .where('status', '==', 'pending')
    .where('enabled', '==', true)
    .where('notifyAtUtc', '<=', now)
    .limit(100)
    .get()

  if (snapshot.empty) {
    logger.info('No due reminders')
    return
  }

  await Promise.all(snapshot.docs.map(async reminderDoc => {
    const reminder = reminderDoc.data()
    const userRef = reminderDoc.ref.parent.parent

    if (!userRef) {
      await reminderDoc.ref.set({
        status: 'error',
        error: 'Missing user parent document',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      return
    }

    const settingsSnap = await userRef.collection('settings').doc('notifications').get()
    const settings = settingsSnap.exists ? settingsSnap.data() : {}
    const tokens = Array.from(new Set([
      ...(settings.fcmTokens || []),
      ...(settings.fcmToken ? [settings.fcmToken] : []),
    ].filter(Boolean)))

    if (!tokens.length) {
      await reminderDoc.ref.set({
        status: 'no_token',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      return
    }

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: 'Holo',
        body: reminder.title || 'Reminder',
      },
      data: {
        type: 'custom_reminder',
        reminderId: reminderDoc.id,
        title: reminder.title || '',
        notifyAtLocal: reminder.notifyAtLocal || reminder.notifyAt || '',
        timezone: reminder.timezone || '',
      },
      webpush: {
        fcmOptions: {
          link: '/trip/notifications',
        },
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
      },
    })

    const invalidTokens = []
    response.responses.forEach((result, index) => {
      const code = result.error?.code || ''
      if (
        code === 'messaging/invalid-registration-token'
        || code === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(tokens[index])
      }
    })

    const nextStatus = response.successCount > 0 ? 'sent' : 'error'
    await reminderDoc.ref.set({
      status: nextStatus,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      delivery: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokenCount: invalidTokens.length,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })

    if (invalidTokens.length) {
      await settingsSnap.ref.set({
        invalidFcmTokens: admin.firestore.FieldValue.arrayUnion(...invalidTokens),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
    }
  }))
}

exports.sendDueReminders = onRequest(
  { region: 'asia-east1', secrets: ['CRON_SECRET'] },
  async (req, res) => {
    if (req.query.key !== process.env.CRON_SECRET) {
      res.status(403).send('Forbidden')
      return
    }
    try {
      await sendDueRemindersImpl()
      res.status(200).send('OK')
    } catch (err) {
      logger.error('sendDueReminders failed', err)
      res.status(500).send('Error')
    }
  }
)
