let MARKOURL = 'hhtps://marko-app.netlify.app';
let MARKO_IFRAME_URL = 'https://marko-app.netlify.app';
let MARKOFRAME_CAN_NAV = true; 
const frameScriptTag = document.querySelector('script[src="https://marko-app.netlify.app/marko-customtab.js"]');

const altIframeUrlValue = frameScriptTag.getAttribute('data-alt-iframe-url');
if (altIframeUrlValue) {
    MARKO_IFRAME_URL = altIframeUrlValue;	
    console.log(`extra iframe url added by webmaster: ${altIframeUrlValue}`);
}

const altCanNav = frameScriptTag.getAttribute('data-alt-can-nav');
if (altCanNav === 'false') {
    MARKOFRAME_CAN_NAV = false;	
}

    // Add viewport meta tag dynamically for mobile optimization
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(viewportMeta);

    // Add Material Icons stylesheet to the head dynamically
    const materialIconsLink = document.createElement('link');
    materialIconsLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    materialIconsLink.rel = 'stylesheet';
    document.head.appendChild(materialIconsLink);

    // Create the dock container
    const dock = document.createElement('div');
    dock.id = 'customDock';
    dock.className = 'custom-dock';

    // Create the resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'custom-resize-handle';

    // Create close icon
    const closeIcon = document.createElement('i');
    closeIcon.className = 'material-icons custom-close-icon';
    closeIcon.id = 'customCloseIcon';
    closeIcon.textContent = 'close';
    resizeHandle.appendChild(closeIcon);

    // Create the handle center
    const handleCenter = document.createElement('div');
    handleCenter.className = 'custom-handle-center';
    handleCenter.id = 'customHandleCenter';
    resizeHandle.appendChild(handleCenter);

	// Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.className = 'overlay';
    overlay.style.display = 'none';
    dock.appendChild(overlay);
    // Create URL input
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.id = 'urlInput';
    urlInput.className = 'url-input';
    urlInput.placeholder = 'Enter URL and press Enter';
    urlInput.style.display = 'none';
    resizeHandle.appendChild(urlInput);
    
    // Create the move and size icons container
    const iconContainer = document.createElement('div');

    const moveIcon = document.createElement('i');
    moveIcon.className = 'material-icons custom-move-icon';
    moveIcon.id = 'customMoveIcon';
    moveIcon.style.display = 'none';
    moveIcon.textContent = 'swap_vert';
    iconContainer.appendChild(moveIcon);

    const expandIcon = document.createElement('i');
    expandIcon.className = 'material-icons custom-expand-icon';
    expandIcon.id = 'customExpandIcon';
    expandIcon.textContent = 'fullscreen';
    iconContainer.appendChild(expandIcon);

    const shrinkIcon = document.createElement('i');
    shrinkIcon.className = 'material-icons custom-shrink-icon';
    shrinkIcon.id = 'customShrinkIcon';
    shrinkIcon.style.display = 'none';
    shrinkIcon.textContent = 'fullscreen_exit';
    iconContainer.appendChild(shrinkIcon);

    resizeHandle.appendChild(iconContainer);

    // Create dock content
    const dockContent = document.createElement('div');
    dockContent.className = 'custom-dock-content';

    // Create iframe
    const dockIframe = document.createElement('iframe');
    dockIframe.id = 'customDockIframe';
    dockIframe.src = MARKO_IFRAME_URL; // Change this to your desired URL
    dockIframe.style.width = '100%';
    dockIframe.style.height = '100%';
    dockIframe.style.border = 'none';
    dockContent.appendChild(dockIframe);

    dock.appendChild(resizeHandle);
    dock.appendChild(dockContent);

    document.body.appendChild(dock);

    // Add CSS styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .custom-dock {
            position: fixed;
            z-index: 11000;
            display: flex;
            flex-direction: column;
            background-color: #ffffff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
            transition: top 0.3s ease, bottom 0.3s ease;
            overflow: hidden;
        }
        .custom-resize-handle {
            height: 50px;
            width: 100%;
            background-color: #1E88E5;
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
        }
        .custom-handle-center {
            width: 60px;
            height: 6px;
            background-color: white;
            border-radius: 3px;
            cursor: pointer;
        }
        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none; /* Hidden by default */
        }
        .custom-dock-content {
            flex: 1;
            overflow: hidden;
            position: relative; /* To position overlay correctly */
        }
        .custom-dock iframe {
            width: 100%;
            height: 100%;
            border: none;
            transition: all 0.3s ease;
        }
        .material-icons {
            color: white;
            cursor: pointer;
            padding: 0 15px;
            font-size: 24px;
        }
        .custom-expand-icon, .custom-shrink-icon {
            transition: transform 0.2s ease;
        }
        .custom-expand-icon:hover, .custom-shrink-icon:hover {
            transform: scale(1.1);
        }

        /* Mobile-specific styles */
        @media (max-width: 768px) {
            .custom-dock {
                width: 100%;
                height: 50%;
                left: 0;
                right: 0;
                top: auto;
                bottom: 0;
            }
            .custom-resize-handle {
                height: 50px;
                width: 100%;
                margin: 0;
            }
            .custom-handle-center {
                width: 80px;
                height: 8px;
            }
            .material-icons {
                padding: 0 20px;
                font-size: 28px;
            }
        }

        /* Mobile landscape-specific styles */
        @media (max-width: 768px) and (orientation: landscape) {
            .custom-dock {
                height: 100%;
                right: 0;
                left: auto;
                bottom: 0;
                top: 0;
                transition: top 0.3s ease, bottom 0.3s ease;
            }
        }
        @media (max-width: 768px) and (orientation: portrait) {
            .custom-dock {
                height: 50%;
                left: 0;
                bottom: 0;
                transition: top 0.3s ease, bottom 0.3s ease;
            }
        }
.url-input {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    padding: 12px 16px;
    font-size: 16px;
    border: 1px solid #2196F3; /* Blue border */
    border-radius: 4px;
    background-color: #FFFFFF; /* White background */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Soft shadow for lift effect */
    transition: box-shadow 0.3s ease, border-color 0.3s ease; /* Smooth transition for interactions */
    z-index: 10001;
}

.url-input:focus {
    outline: none; /* Remove default outline */
    border-color: #1976D2; /* Darker blue on focus */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); /* Enhanced shadow on focus */
}

.url-input::placeholder {
    color: #B0BEC5; /* Light grey placeholder text */
}

    `;
    document.head.appendChild(style);

    // JavaScript event handling for the dock
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    // Function to determine if the device is mobile based on user agent
    function isMobile() {
    	return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	}

	// Function to determine if the device is in landscape orientation
	function isLandscape() {
    	return window.innerWidth > window.innerHeight;
	}

	function setPosition() {
    if (isMobile()) { // Call isMobile function
        if (isLandscape()) { // Call isLandscape function
            dock.style.width = '50%';
            dock.style.height = '100%';
            dock.style.left = '0';
            dock.style.top = '0';
            dock.style.bottom = 'auto';
            resizeHandle.style.display = 'none'; // Hide resize handle for landscape mode
            moveIcon.style.display = 'none'; // Hide move icon
            expandIcon.style.display = 'none'; // Hide expand icon
            shrinkIcon.style.display = 'none'; // Hide shrink icon
        } else {
            dock.style.width = '100%';
            dock.style.height = '50%';
            dock.style.left = '0';
            dock.style.bottom = '0';
            dock.style.top = 'auto';
            resizeHandle.style.display = 'flex'; // Show resize handle for portrait mode
            moveIcon.style.display = 'inline'; // Show move icon
            expandIcon.style.display = 'none'; // Hide expand icon
            shrinkIcon.style.display = 'none'; // Hide shrink icon
        }
        resizeHandle.style.cursor = 'default'; // Default cursor for mobile
    } else {
        dock.style.height = '58vh';
        dock.style.width = dock.style.height;
        dock.style.top = '21vh';
        dock.style.right = '0';
        dock.style.left = 'auto';
        dock.style.bottom = 'auto';
        resizeHandle.style.cursor = 'move'; // Move cursor for desktop
        expandIcon.style.display = 'inline'; // Show expand icon
        moveIcon.style.display = 'none'; // Hide move icon
        shrinkIcon.style.display = 'none'; // Hide shrink icon
    }
    snapDockIntoView();
}

    function onStart(e) {
        if (window.innerWidth < window.innerHeight) return; // Prevent dragging on mobile
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = dock.offsetLeft;
        startTop = dock.offsetTop;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('keydown', onKeyDown);
    }

    function onMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        dock.style.left = `${startLeft + dx}px`;
        dock.style.top = `${startTop + dy}px`;
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('keydown', onKeyDown);

        const rect = dock.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const dockWidth = rect.width;
        const dockHeight = rect.height;
        const dockVisibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
        const dockVisibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

        const isPartiallyVisible = (
            dockVisibleWidth > 0 &&
            dockVisibleHeight > 0
        );

        if (!isPartiallyVisible || (dockVisibleWidth < dockWidth / 2 || dockVisibleHeight < dockHeight / 2)) {
            dock.style.display = 'none';
        } else {
            snapDockIntoView();
        }
    }

    function snapDockIntoView() {
        const rect = dock.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.left < 0) dock.style.left = '0px';
        if (rect.top < 0) dock.style.top = '0px';
        if (rect.right > viewportWidth) dock.style.left = `${viewportWidth - rect.width}px`;
        if (rect.bottom > viewportHeight) dock.style.top = `${viewportHeight - rect.height}px`;
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            if (isDragging) {
                onEnd();
            }
        }
    }

    function toggleSize() {
        if (dock.style.width === '50vw') {
            dock.style.height = '58vh';
            dock.style.width = dock.style.height;
            dock.style.top = '21vh';
            expandIcon.style.display = 'inline';
            shrinkIcon.style.display = 'none';
        } else {
            dock.style.width = '50vw';
            dock.style.height = '100vh';
            dock.style.top = '0';
            expandIcon.style.display = 'none';
            shrinkIcon.style.display = 'inline';
        }
        setTimeout(snapDockIntoView, 300);
    }

    function togglePosition() {
        requestAnimationFrame(() => {
          
                if (dock.style.bottom === '0px' || dock.style.bottom === '0') {
                    dock.style.bottom = ''; // Clear bottom
                    dock.style.top = '0';   // Set top to 0
                } else {
                    dock.style.top = '';    // Clear top
                    dock.style.bottom = '0'; // Set bottom to 0
                }
            });
        setTimeout(snapDockIntoView, 300);
    }


    function handleCenterClick() {
      if (MARKOFRAME_CAN_NAV) {
        overlay.style.display = 'block'; // Show overlay
        urlInput.style.display = 'block';
        urlInput.focus(); // Focus input field
        resizeHandle.style.cursor = 'auto'; // Set cursor to default
      } else {
        console.log('webmaster disabled iframe navigation');
        window.open(MARKOURL, '_blank');      
        }
    }

    function handleInputKeydown(e) {
        if (e.key === 'Enter') {
            let newUrl = urlInput.value;
            if (!newUrl.startsWith('http')) {
                newUrl = 'https://' + urlInput.value;
            }
            if (newUrl) {
                dockIframe.src = newUrl;
                overlay.style.display = 'none';
                urlInput.style.display = 'none'; // Hide input after entering URL
                resizeHandle.style.cursor = 'move'; // Restore cursor
            }
        }
    }

    function handleCloseButtonClick() {
        urlInput.style.display = 'none'; // Hide input
        overlay.style.display = 'none';
        resizeHandle.style.cursor = 'move'; // Restore cursor
    }
    
    urlInput.addEventListener('keydown', handleInputKeydown);
    handleCenter.addEventListener('click', handleCenterClick);


    // Event listeners
    resizeHandle.addEventListener('mousedown', onStart);
    

    
    expandIcon.addEventListener('click', toggleSize);
    shrinkIcon.addEventListener('click', toggleSize);
    moveIcon.addEventListener('click', togglePosition);

    closeIcon.addEventListener('click', () => {
        dock.style.display = 'none';
    });
    
    
            // Close the URL input when the overlay is clicked
        overlay.addEventListener('click', function() {
            urlInput.style.display = 'none';
            overlay.style.display = 'none';
        });
    // Responsive handling
    window.addEventListener('resize', setPosition);

    // Initialize position
    setPosition();
 
