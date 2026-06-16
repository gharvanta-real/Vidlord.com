/**
 * Helper to download files using Service Worker ReadableStreams
 */
export function createDownloadStream(filename) {
  const id = Date.now() + "_" + Math.floor(Math.random() * 1000);
  
  // 1. Create message channel for communication
  const channel = new MessageChannel();
  
  // 2. Register this download stream with the Service Worker
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'REGISTER_DOWNLOAD',
      id: id
    }, [channel.port2]);
  } else {
    throw new Error("Service Worker is not active. StreamSaver requires an active Service Worker.");
  }
  
  // 3. Create hidden iframe to trigger browser download prompt
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = `/sw-download?id=${id}&filename=${encodeURIComponent(filename)}`;
  document.body.appendChild(iframe);
  
  // Listen for cancel messages from the Service Worker (e.g. if user cancels native download dialog)
  let onCancelCallback = null;
  channel.port1.onmessage = (event) => {
    if (event.data && event.data.type === 'CANCELLED') {
      if (onCancelCallback) onCancelCallback();
    }
  };
  
  return {
    write(chunk) {
      channel.port1.postMessage({ type: 'CHUNK', chunk });
    },
    close() {
      channel.port1.postMessage({ type: 'DONE' });
      // Remove the iframe after a short delay to ensure browser downloads it
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    },
    error(err) {
      channel.port1.postMessage({ type: 'ERROR', error: err.message || err });
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    },
    onCancel(callback) {
      onCancelCallback = callback;
    }
  };
}
