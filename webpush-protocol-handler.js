// Protocol Handler - Listens for custom protocol open requests from service worker
// Add this script to any page that should handle custom protocol notifications

if ('serviceWorker' in navigator) {
  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Received SW message:', event.data);
    
    if (event.data && event.data.type === 'OPEN_CUSTOM_PROTOCOL') {
      const url = event.data.url;
      console.log('✅ Opening custom protocol:', url);
      
      // Open the custom protocol URL
      // This will trigger the OS/browser to handle it (mail app, phone dialer, etc.)
      window.location.href = url;
    }
  });
  
  console.log('✅ Protocol handler registered');
} else {
  console.warn('⚠️ Service worker not supported');
}
