self.addEventListener('push', (event) => {
  console.log('Received push event:', event);

  // Try to parse the incoming data
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('Error parsing push event data:', e);
    }
  }

  const title = data.title || 'Notification';
  const options = {
    body: data.message || 'You have a new message.',
    icon: data.icon || '/default-icon.png',
    data: {
      url: data.url || '/' // Default URL to open on notification click
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
