// public/sdk.js

window.GameAdda = {
    // Ye function mobile se aane wale button press ko catch karega
    onCommand: function(callback) {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'CONTROLLER_COMMAND') {
                callback(event.data.command); // e.g., 'UP', 'DOWN', 'A', 'B'
            }
        });
    },

    // Agar game ko mobile par koi signal wapas bhejna ho (jaise score update)
    sendToMobile: function(data) {
        window.parent.postMessage({ type: 'TO_MOBILE', payload: data }, '*');
    }
};

console.log("🔥 GameAdda SDK Loaded Successfully!");