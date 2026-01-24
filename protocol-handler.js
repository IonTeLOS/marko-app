// Protocol Handler - Listens for custom protocol open requests from service worker
// Add this script to any page that should handle custom protocol notifications

if ('serviceWorker' in navigator) {
  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OPEN_CUSTOM_PROTOCOL') {
      const url = event.data.url;
      console.log('Opening custom protocol from message:', url);
      
      // Open the custom protocol URL
      // This will trigger the OS/browser to handle it (mail app, phone dialer, etc.)
      window.location.href = url;
    }
  });
  
  // Check if we were opened with a ?protocol= parameter
  // This happens when notification is clicked and no windows were open
  const urlParams = new URLSearchParams(window.location.search);
  const protocolUrl = urlParams.get('protocol');
  
  if (protocolUrl) {
    console.log('Opening custom protocol from URL parameter:', protocolUrl);
    
    // Remove the parameter from URL to avoid re-triggering
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('protocol');
    window.history.replaceState({}, '', newUrl);
    
    // Open the custom protocol
    window.location.href = protocolUrl;
  }
  
  console.log('Protocol handler registered');
}
