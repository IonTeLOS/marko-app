async function downloadPage() {
        const linkContainer = document.querySelector('.bookmarks-container');
        linkContainer.innerHTML = ''; 
        passCheck();
        const linksContainer = document.querySelector('.bookmarks-container');
        const linksHTML = linksContainer.innerHTML;
        const newName = prompt('You are ready to download your Markos as a complete webpage. Choose a page title:', 'My Markos');
  
        // Set default name if newName is blank or null
        const title = newName ? newName : 'My Markos';
let currentState = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>${title}</title>
    <meta http-equiv="cache-control" content="public">
    <meta http-equiv="expires" content="Thu, 31 Dec 2099 23:59:59 GMT"> 
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M0 0h24v24H0z'/%3E%3Cpath fill='%2300bcd4' d='M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM15 3v2h2.59L8.7 13.89l1.41 1.41L19 6.41V9h2V3h-6z'/%3E%3C/svg%3E" type="image/svg+xml">    
  <script src="https://documentcloud.adobe.com/view-sdk/main.js"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Icons+Outlined" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/notiflix@3/dist/notiflix-aio-3.2.7.min.js"><\/script>
  <link href="https://cdn.jsdelivr.net/npm/notiflix@3/src/notiflix.min.css" rel="stylesheet">
       <style> 
body {
  font-family: Roboto, sans-serif;
  position: relative;
  display: flex;
  min-height: 100vh;
  justify-content: center;
  flex-direction: column;
  max-width: 100%;
  overflow-x: hidden;
  height:auto!important;    
  margin: 8px;
  margin-bottom: 70px;
  padding: 0;
  transition: background-color 0.5s ease-in-out, color;
}

body.light-mode {
  background-color: #e3f2fd;
  color: #333333;
}

body.light-mode .bookmark {
  background-color: #bbdefb;
}
    
body.dark-mode {
  background-color: #292929;
  color: #999999;
}

body.dark-mode .bookmark {
background-color: #1f1b24;
}

/* Hover effect for .bookmark and related elements */
.body.light-mode .bookmark:hover {
  background-color: #acc8e5; /* Lighter background on hover */
}
    
/* System Default (initial state) */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #292929;
    color: #999999;
  }
  .bookmark {
    background-color: #1f1b24;
    transition: background-color 0.2s ease-in-out; /* Smooth transition on background color change */
  }
}

/* Hover effect for .bookmark and related elements */
.body.dark-mode .bookmark:hover {
  background-color: #333; /* Darker background on hover */
}
      
.bookmarks-container {
      flex: 100;
      display: flex;
      flex-direction: column;
    }   
      
 
.bookmark .bookmark-title {
  font-weight: bold;
  text-align: center;
  flex: 1;
  transition: transform 0.2s ease-in-out;
}


.bookmark-title:hover {
  font-weight: bold;
  text-align: center;
  flex: 1;
  transition: transform 0.2s ease-in-out;
  transform: scale(1.20);
}    



      
      .bookmark-wrapper {
        width: 100%;
      }  

    .bookmark .icon-wrapper {
      display: flex;
      align-items: center;
      flex: 1;
    }

    .bookmark .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px; /* Standard width */
      height: 72px; /* Standard height */
      border-radius: 50%;
      transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out;
      margin-right: 16px;
      background-color: #fff; /* Light background */
    }

    .bookmark:hover .icon-container {
      transform: scale(1.1); /* Enlarge container on hover */
    }
    
/* Keyframes for blinking animation */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Bookmark Styling */
.bookmark {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  margin-bottom: 8px;
  border: 4px solid transparent; /* Initial state */
  background-clip: padding-box;
}

.bookmark:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Adjusted shadow color and intensity */
}

.bookmark.active {
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

/* Default ::before pseudo-element styling */
.bookmark::before {
  content: '';
  position: absolute;
  top: -4px;
  right: -4px;
  bottom: -4px;
  left: -4px;
  z-index: -1;
  border-radius: inherit;
  border: 4px solid transparent;
  background: transparent;
  transition: background 0.3s ease, border 0.3s ease;
}

/* Apply blinking animation on active state */
.bookmark.active::before {
  background: blue;
  animation: blink 2s infinite; /* Ensure duration and iteration are set */
}

/* Hover effect (if needed, but make sure it doesn’t override swipe states) */
.bookmark:hover::before {
  background: blue;
  animation: blink 2s infinite; /* Ensure duration and iteration are set */
}

/* Swipe states override hover effect */
.bookmark.swipe-left::before,
.bookmark.swipe-right::before {
  background: transparent !important; /* Ensure swipe background is visible */
  border: none !important; /* Optionally hide the border */
}

/* Swiped left state */
.bookmark.swipe-left::before {
  background: linear-gradient(to right, #FF0000, rgba(255, 0, 0, 0.1)) !important;
}

/* Swiped right state */
.bookmark.swipe-right::before {
  background: linear-gradient(to left, #00FF00, rgba(0, 255, 0, 0.1)) !important;
}

.icon-container {
            width: 72px; /* Adjust as needed */
            height: 72px; /* Adjust as needed */
            position: relative;
            overflow: hidden;
        }
.icon-container::before {
            content: '';
            position: absolute;
            width: 62px; /* 72px (size of container) - 5px (border) * 2 */
            height: 62px; /* Same calculation as width */
            border-radius: 50%; /* Makes the ring circular */
            border: 5px solid var(--ring-color, #2ecc71); /* Thickness and color of the ring TODO change default color */
            box-sizing: border-box; /* Ensures the border is included in the size */
        }  
.bookmark-icon {
  font-size: 36px;
  object-fit: contain; /* Adjust to 'contain' if you prefer the image to be fully visible */
  display: block;    
  transition: color 0.2s ease-in-out, transform 0.2s ease-in-out;
}

.bookmark:hover .bookmark-icon {
  color: #0d47a1;
}

/* System Default (initial state) */
@media (prefers-color-scheme: light) {
  body {
    background-color: #e3f2fd; /* Align with .body.light-mode */
    color: #333333; /* Align with .body.light-mode */
  }
  .bookmark {
    background-color: #bbdefb; /* Align with .body.light-mode .bookmark */
    transition: background-color 0.2s ease-in-out; /* Smooth transition on background color change */
  }
}

/* Hover effect for .bookmark and related elements */
.body.light-mode .bookmark:hover {
  background-color: #acc8e5; /* Lighter background on hover */
}
    
/* System Default (initial state) */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #292929;
    color: #999999;
  }
  .bookmark {
    background-color: #1f1b24;
    transition: background-color 0.2s ease-in-out; /* Smooth transition on background color change */
  }
}

/* Hover effect for .bookmark and related elements */
.body.dark-mode .bookmark:hover {
  background-color: #333; /* Darker background on hover */
}

.tooltip {
    position: fixed;
    bottom: 15px; /* Adjust as needed */
    left: 10px; /* Adjust as needed */
    width: 16rem; /* 256px (w-64 in tailwindcss) */
    background-color: #ffffff; /* White background */
    border: 1px solid #cccccc; /* Gray border */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Shadow effect */
    padding: 5px 10px;
    border-radius: 4px;
    display: none;
    z-index: 1003; /* Set z-index to 1003 */
    font-size: 0.875rem; /* 14px (text-sm in tailwindcss) */
    color: #0d47a1; /* Blue text color */
    white-space: nowrap; /* Prevent line breaks */
    overflow: hidden; /* Hide overflowing content */
}

.tooltip-content {
    display: inline-block;
    white-space: nowrap;
    position: relative;
}

@keyframes scroll-text {
    0% {
        transform: translateX(100%);
    }
    15% {
        transform: translateX(0); /* Immediately show text */
    }
    90% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(-100%); /* Restart */
    }
}

.tooltip-scrolling {
    animation: scroll-text 10s linear infinite;
}

    .delete-icon {
      color: #f44336; 
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%); /* Center icon vertically */
      opacity: 0; /* Initially hide the delete icon */
      transition: opacity 0.2s ease-in-out, color 0.2s ease-in-out, transform 0.2s ease-in-out; /* Add transitions */
      font-size: 24px; /* Smaller than main icons */
    }

    .bookmark:hover .delete-icon,
    .bookmark.long-press .delete-icon {
      opacity: 1; /* Show delete icon on hover or long press */
      transform: translateY(-50%) scale(1.1); /* Scale up while maintaining vertical center */
    }

    .delete-icon:hover {
      color: #d32f2f; /* Darker red on hover */
      cursor: pointer; /* Change cursor to indicate clickability */
      transform: translateY(-50%) scale(1.2); /* Scale up more on direct hover */
    }

    .lightbox {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      justify-content: center;
      align-items: center;
      z-index: 1002;
    }
    .lightbox.active {
      display: flex;
    }
    .lightbox-content {
      position: relative;
      width: 90%;
      height: 90%;
      max-width: 100%;
      max-height: 100%;
      background-color: white;
      border-radius: 10px;
    }
    .lightbox-content .content-container {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      position: relative;
    }
    /* Option 1: Iframe with absolute positioning */
    .lightbox-content iframe {
      width: 100%;
      height: 100%;
      border: none;
      position: absolute;
      overflow-x: hidden;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 10px; /* Rounded corners for iframe */
    }
 /* Closing Button (outside lightbox) */
    .close-btn {
      position: fixed; /* Make the element absolutely positioned */
      bottom: 5px; /* Position the element at the bottom */
      left: 50%; /* Position the element horizontally at 50% */
      transform: translateX(-50%); /* Center the element horizontally */
      background-color: #3f51b5; /* Material Blue */
      color: white;
      border: none;
      width: 38px;
      height: 38px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 1002; /* Ensure button is on top of lightbox */
      font-size: 24px; /* Adjust font size for desired icon size */
      border-radius: 50%;
      box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2); /* Material shadow effect */
    }
    .close-btn:hover {
      background-color: #384890
      }  
      #player-container {
      width: 100%;
      max-width: 640px;
      aspect-ratio: 16 / 9;
      margin-top: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    @media (max-width: 768px) {
      #player-container {
        width: 95%;
      }
    }
    @media (orientation: landscape) and (max-width: 900px) {
      #player-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        max-width: none;
        margin: 0;
        z-index: 9999;
      }
    }
        #youtube-lightbox {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1001;        }
        #youtube-lightbox.active {
            display: flex;
        }
        #player {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        #close-yt {
            position: absolute;
            top: 90px;
            right: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.5);
            border: 2px solid #ffffff;
            color: #ffffff;
            cursor: pointer;
            font-size: 24px;
            opacity: 1;
            transition: opacity 0.3s;
            z-index: 9999;
        }
        #close-yt.hidden {
            opacity: 0;
            pointer-events: none;
        }

#main-bookmark {
    position: -webkit-sticky; /* For Safari */
    position: sticky;         /* Standard syntax */
    top: 0;
    z-index: 1000;
}


/* Apply no-select to everything */
* {
  user-select: none;
}


        .offline-banner {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background-color: #ffcc00; /* Adjust color as needed */
            color: #333; /* Adjust text color as needed */
            text-align: center;
            padding: 10px;
            box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.2);
            z-index: 998; /* Ensure it appears above other elements */
            transition: transform 0.3s ease-in-out; /* Smooth transition for sliding effect */
            transform: translateY(100%); /* Initially hidden off the bottom of the viewport */
            visibility: hidden; /* Initially hidden */
        }

        /* Show the banner */
        .offline-banner.show {
            transform: translateY(0); /* Move to its normal position */
            visibility: visible; /* Make it visible */
        }

         iframe {
            aspect-ratio: 16/9;
            width: 100%;
        }
.container {
  transition: margin-bottom 0.3s ease;
  margin-bottom: 40px;    
}   
      
.material-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  transition: color 0.2s ease-in-out, transform 0.2s ease-in-out, background 0.2s ease-in-out;
  height: 72px;
  width: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin: 0 10px;
}

.material-btn:hover {
  color: #333333;
  transform: scale(1.1);
}

.material-btn .material-icon {
  font-size: 42px; /* Change the icon size to 48x48 */
}
  
.material-btn:focus {
  outline: none;
  background-color: rgba(255, 255, 255, 0.3); /* Darker background on focus */
}

.material-btn:focus-visible {
  outline: none;
  background-color: rgba(255, 255, 255, 0.3); /* Darker background on focus */
}
 #powered-by-marko {
      position: absolute;
      bottom: -40px;
      right: 30px;
      font-size: 18px;
      cursor: pointer;
      color: #0d47a1; /* To make the text stand out */
      padding: 0; /* Add some padding around the text */
      border-radius: 5px; /* Make the edges rounded */
      transition: transform 0.3s ease, color 0.3s ease; /* Smooth transition for transform and color */
      display: flex;
      align-items: center; /* Center items vertically */
      gap: 12px; /* Space between SVG and text */
    }
    #powered-by-marko img {
      vertical-align: middle; /* Center SVG vertically */
      width: 36px; /* Set the width of the SVG */
      height: 36px; /* Set the height of the SVG */
    }

    #powered-by-marko:hover {
      color: #f44336;
      transform: scale(1.1);
    }

    @media screen and (max-width: 600px) {
      #powered-by-marko {
        left: 50%;
        bottom: -30px;
        right: auto;
        transform: translateX(-50%);
        font-size: 16px;
      }
    }

  </style>
</head>
<body>

    <!-- Lightbox with iframe and YouTube player -->
  <div class="lightbox" id="lightbox">
    <div class="lightbox-content">
      <div id="content-container">
<iframe id="lightbox-iframe" class="lightbox-iframe" src="" allowfullscreen allow="autoplay"></iframe>
          <button id="close-btn" class="close-btn">
        <i class="material-icons">close</i>
      </button>
      </div>
    </div>
  </div>
<div class="youtube-lightbox" id="youtube-lightbox">
    <button id="close-yt">&times;</button>
    <div id="player"></div>
</div>

    <!-- Placeholder div for Adobe PDF Embed API -->
    <div id="adobe-dc-view"></div>
    <div>
<div id="tooltip" class="tooltip">
    <div class="tooltip-content" id="tooltip-content"></div>
</div>
    
  <div class="offline-banner" id="offline-banner">
        <span class="material-icons">wifi_off</span>
    </div>



        
    </div>
        <div id="marko-container" class="bookmarks-container" no-select>${linksHTML}</div>
        
    <div id="powered-by-marko" onclick="goToApp()">
    <img src="https://raw.githubusercontent.com/IonTeLOS/marko/main/triskelion.svg" alt="Logo">
    <span>Powered by Marko©</span>
    </div>
    
    <script>      
        // Call the function on page load
        window.onload = checkIfLocalAndConfirm;

Notiflix.Notify.init({
            position: 'center-top',
            timeout: '7000',
            clickToClose: 'true',
            zindex: 4003,
            cssAnimationStyle: 'from-top',
            fontFamily: 'Roboto, sans-serif', // Set font family
            });
   Notiflix.Confirm.init({
    className: 'notiflix-prompt-custom',
    position: 'center', // Position in the upper half of the screen in the middle
    width: '360px', // Maximum width
    borderRadius: '8px', // Border radius
    useGoogleFont: true, // Disable Google Fonts to use custom font
    fontFamily: 'Roboto, sans-serif', // Set font family
    cssAnimationStyle: 'zoom', // Animation style
    backOverlay: true,
    plainText: true,
    okButtonBackground: '#0D47A1',
    titleColor: '#000000',
    titleFontSize: '20px',
    messageFontSize: '18px',
    zindex: 4000, 
});
function sharePage() {
if (navigator.share) {
  window.focus();
  navigator.share({
    title: document.title,
    url: window.location.href
  })
  .then(() => {
    console.log('Shared successfully');
    const nav = \`https://marko-app.netlify.app?type=friend&friendlink=\${window.location.href}&friendname=\${document.title}&createMarko=true\`;
    window.location.href = nav;
  })
  .catch((error) => console.error('Error in sharing:', error));
  const nav = \`https://marko-app.netlify.app?type=friend&friendlink=\${window.location.href}&friendname=\${document.title}&createMarko=true\`;
   setTimeout(() => {
      window.location.href = nav;
    }, 4000);
} else {
  // Fallback for browsers that do not support Web Share API
  const url = window.location.href;
  const tempInput = document.createElement('input');
  tempInput.style.position = 'absolute';
  tempInput.style.left = '-9999px';
  tempInput.value = url;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  Notiflix.Notify.success('Link copied to clipboard');
  const nav = \`https://marko-app.netlify.app?type=friend&friendlink=\${window.location.href}&friendname=\${document.title}&createMarko=true\`;
  setTimeout(() => {
      window.location.href = nav;
    }, 4000);
}
}


       function toggleTheme() {
      const body = document.body;
      if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
      } else if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
      } else {
        body.classList.add('dark-mode');
      }
    }

function goToApp() {
       window.open('https://marko-app.netlify.app', '_blank');
        }
        
// Function to open bookmark links in a new tab with separate behavior for friends' links
function openLink(url) {
        window.open(url, '_blank');
}
        // function to open bookmark links in new tab. separate behavior for friends' links
        function openMarko(action, data, extras) {
            if (action === loadVideo) {
               loadVideo(data);
            } else if (action === showWindow) {
                showWindow(data);
            } else if (action === showPDFLightbox) {
                showPDFLightbox(data, extras);
            } else if (action === downloadFile) {
                downloadFile(data, extras);
            } else if (action === showPost) {
                showPost(data);
            } else if (action === showShareNote) {
                showShareNote(data, extras);
            } else {
                openLink(data);
            }
}


        function showNoteForm() {
            const noteText = prompt("Enter your note:");
            if (noteText) {
                const iconUrl = noteIcon;
                const iconColor = getRandomColor();
                links.push({ text: noteText, iconUrl, iconColor });
                passCheck();
                saveLinks();
            }
        }
// Function to handle click on home icon

        // Function to handle click on share icon
        function handleHomeClick() {
            const param = 'friendname=${title}&friendlink=${window.location.origin}${window.location.pathname}';
            if (param.includes("file://") || param.includes("content://")) {
                    confirm('Upload this file on a server so that everyone can access it?');
                    if (confirm) {
                    openLink("https://tiiny.host");
                    }
                    return;
            }
            openLink("https://marko-app.netlify.app?" + param);
        }
        
        document.getElementById('home-icon').addEventListener('click', handleHomeClick);

        function checkIfLocalAndConfirm() {
            if (window.location.protocol === 'file:' || window.location.protocol === 'content:') {
                // Show confirmation dialog
                var userConfirmed = confirm('Do you want to create your own site? Upload current file ${title}.html on tiiny.host!');
                if (userConfirmed) {
                    // Open the link if the user confirms
                    window.location.href = 'https://tiiny.host';
                }
            }
        }
function detectTheme() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = localStorage.getItem("theme");

    // Apply the theme based on user preference or system theme
    if (theme) {
        if (theme === "dark") {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            console.log("Following user choice: Dark");
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            console.log("Following user choice: Light");
        }
    } else {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            console.log("Following system theme: Dark");
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            console.log("Following system theme: Light");
        }
    }
}


// detect if run on mobile or on desktop based on screen width. TODO use this function to make it more mobile friendly
function isMobileDevice() {
  return 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0 ||
         window.matchMedia('(max-width: 768px)').matches;
}

if (isMobileDevice()) {
  console.log("Marko seems to be running on mobile");
} else {
  console.log("Marko seems to be running on desktop");
}   

    // show an offline notice in the form of a banner if offline, autohide it when back online
    function checkConnection() {

        const offlineBanner = document.getElementById('offline-banner');
        if (!navigator.onLine) {
            document.getElementById('offline-banner').classList.add('show');
        }
        window.addEventListener('online', () => {
            document.getElementById('offline-banner').classList.remove('show');
        });
        window.addEventListener('offline', () => {
            document.getElementById('offline-banner').classList.add('show');
        });
    }

        

function clearFrame() {
    document.getElementById("lightbox-iframe").srcdoc = "";
}  

function showShareNote(title, text) {
if (confirm("Do you want to share the note with your friends or other apps?")) {
    shareNote(title, text);
    return;
}
else {    
      var iframe = document.getElementById('lightbox-iframe');
iframe.srcdoc =\`
<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: lightgrey; text-align: center; font-family: 'Roboto', sans-serif;">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    </style>
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div style="font-weight: bold; font-size: 24px;">\${title}</div>
        <div style="font-weight: normal; font-size: 18px;">\${text}</div>
    </div>
</div>\`;
// Display the lightbox
document.getElementById('lightbox').style.display = 'flex';
// Set a timeout to hide the lightbox after 20 seconds     
setTimeout(function() {
    document.getElementById('lightbox').style.display = 'none';
}, 20000);
}
}

function shareNote(title, text) {
    if (navigator.share) {
    window.focus();
    navigator.share({
      title: title,
      text: text
    })
    .then(() => {
      console.log('Successfully shared');
    })
    .catch((error) => {
      console.error('Error sharing:', error);
    });
  } else if (navigator.clipboard) {
    window.focus();
    navigator.clipboard.writeText(title + ": " + text)
      .then(() => {
        //alert('Note text has been copied to the clipboard.');
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        // alert('Failed to copy text to clipboard.');
      });
  } 
}

// Function to check if an element is partially visible at the top, considering the main-bookmark
        function isPartiallyVisibleAtTop(el, offset) {
            const rect = el.getBoundingClientRect();
            return rect.top < offset && rect.bottom > offset;
        }

        // Function to scroll the element into view
        function adjustScroll() {
            const mainBookmark = document.getElementById('main-bookmark');
            const mainBookmarkHeight = mainBookmark.getBoundingClientRect().height;
            const paddingOffset = 10; // Adjust this value to match your bookmark padding
            const bookmarks = document.querySelectorAll('.bookmark');
            bookmarks.forEach(bookmark => {
                const rect = bookmark.getBoundingClientRect();
                if (isPartiallyVisibleAtTop(bookmark, mainBookmarkHeight + paddingOffset)) {
                    const scrollOffset = rect.top - (mainBookmarkHeight + paddingOffset);
                    window.scrollBy({
                        top: scrollOffset,
                        behavior: 'smooth'
                    });
                }
            });
        }

        // Debounce function to limit the rate at which the adjustScroll function is called
        function debounce(func, wait) {
            let timeout;
            return function (...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Add scroll event listener with debounce
        window.addEventListener('scroll', debounce(adjustScroll, 100));


// detect if run on mobile or on desktop based on screen width. TODO use this function to make it more mobile friendly
    
function showTooltip(link) {
    currentLink = link;
    const isGoodForStatus = () => {
        return 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0 ||
               window.matchMedia('(max-width: 768px)').matches;
    };

    if (!isGoodForStatus ()) {
        const tooltip = document.getElementById('tooltip');
        const tooltipContent = document.getElementById('tooltip-content');

        if (tooltip && tooltipContent) {
            tooltipContent.textContent = link;
            tooltip.style.display = 'block';

            const tooltipWidth = tooltip.offsetWidth;
            const textWidth = tooltipContent.scrollWidth;

            // If the text overflows the tooltip, apply the scrolling animation
            if (textWidth > tooltipWidth) {
                tooltipContent.style.animation = 'scroll-text 10s linear infinite';
            } else {
                tooltipContent.style.animation = 'none';
            }
        }
    }
}


    function hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
        

        function showPost(htmlContent) {
            var iframe = document.getElementById('lightbox-iframe');
iframe.srcdoc = \`
<div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: lightcyan; text-align: center; flex-direction: column; overflow-x: hidden; font-family: 'Roboto', sans-serif;">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        img {
            max-width: 100%;
            height: auto;
        }
        body {
            margin: 0;
            font-family: 'Roboto', sans-serif;
        }
    </style>
    \${htmlContent}
</div>\`;
            document.getElementById('lightbox').style.display = 'flex';
}
        
// Function to download a file after user confirmation
function downloadFile(url, title) {
    if (confirm(\`Do you want to download \${title} - \${url}?\`)) {
        openLink(url);
    }
      }




    
// open a lightbox to show an iFrame    
function openLight(link) {
    const lightboxIframe = document.getElementById("lightbox-iframe");

    
    lightboxIframe.src = link;
        const lightboxContainer = document.getElementById("lightbox");

    lightboxContainer.classList.add("active");
}    
  function showWindow(link) {
    if (!link) {
      alert("Please enter a valid link.");
      return;
    }

    //const isYouTubeLink = link.includes("youtube.com") || link.includes("youtu.be");
    const lightboxContainer = document.getElementById("lightbox");
    const lightboxIframe = document.getElementById("lightbox-iframe");
    lightboxContainer.style.display = 'flex';
    lightboxIframe.src = link;
  }
    
// load a YouTube link in the iFrame
function loadVideo(link) {
    const init = () => {
        const ytlightboxContainer = document.getElementById("youtube-lightbox");

        ytlightboxContainer.classList.add("active");

        const videoId = link;

        const playerContainer = document.getElementById("player");
        playerContainer.innerHTML = ''; // Clear any existing iframe

        const iframe = document.createElement('iframe');
        iframe.src = \`https://www.youtube-nocookie.com/embed/\${videoId}\`;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.title = 'YouTube video player';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        playerContainer.appendChild(iframe);

    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
  
function updateSwipeClasses(wrapper, deltaX) {
    const bookmark = wrapper.closest('.bookmark');
    bookmark.classList.remove('swipe-left', 'swipe-right');
    if (deltaX < 0) {
        bookmark.classList.add('swipe-left');
    } else if (deltaX > 0) {
        bookmark.classList.add('swipe-right');
    }
}

function initSwipeDetection() {
    document.querySelectorAll('.bookmark-wrapper').forEach(wrapper => {
        let touchstartX = 0;
        let touchstartY = 0;
        let touchstartTime = 0;
        let isSwipeInProgress = false;
        const bookmarkId = wrapper.closest('.bookmark').getAttribute('data-index');
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        const handleSwipeStart = (e) => {
            if (isSwipeInProgress) return;
            isSwipeInProgress = true;
            touchstartTime = Date.now();
            if (isTouchDevice) {
                touchstartX = e.touches[0].clientX;
                touchstartY = e.touches[0].clientY;
            } else {
                touchstartX = e.clientX;
                touchstartY = e.clientY;
            }
        };

        const handleSwipeMove = (e) => {
            if (!isSwipeInProgress) return;
            
            let currentX, currentY;
            if (isTouchDevice) {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }
            handleSwipe(wrapper, bookmarkId, touchstartX, currentX, touchstartY, currentY);
        };

        const handleSwipeEnd = (e) => {
            isSwipeInProgress = false;
            const touchendTime = Date.now();
            const elapsedTime = touchendTime - touchstartTime;

            // Check if the movement is below the threshold for click detection
            const threshold = 30;
            let currentX, currentY;
            if (isTouchDevice) {
                currentX = e.changedTouches[0].clientX;
                currentY = e.changedTouches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }

            const deltaX = Math.abs(currentX - touchstartX);
            const deltaY = Math.abs(currentY - touchstartY);

            if (deltaX < threshold && deltaY < threshold && elapsedTime < 200) {
                // It's a click, not a swipe
                return;
            }

            updateSwipeClasses(wrapper, 0); // Reset classes
        };

        if (isTouchDevice) {
            wrapper.addEventListener('touchstart', handleSwipeStart, { passive: true });
            wrapper.addEventListener('touchmove', handleSwipeMove, { passive: true });
            wrapper.addEventListener('touchend', handleSwipeEnd);
        } else {
            wrapper.addEventListener('mousedown', handleSwipeStart);
            wrapper.addEventListener('mousemove', handleSwipeMove);
            wrapper.addEventListener('mouseup', handleSwipeEnd);
            wrapper.addEventListener('mouseleave', handleSwipeEnd); // Add this line
        }

        // Prevent click event if a swipe is detected
        wrapper.addEventListener('click', (e) => {
            if (isSwipeInProgress) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });
    });
}

let isSwipeActionInProgress = false;
let lastSwipeTime = 0;
const swipeCooldown = 1000; // 1 second cooldown between swipes

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedHandleSwipe = debounce((wrapper, bookmarkId, startX, currentX, startY, currentY) => {
    const now = Date.now();
    if (isSwipeActionInProgress || now - lastSwipeTime < swipeCooldown) {
        return;
    }

    const threshold = 30;
    const verticalThreshold = 50;
    const deltaX = currentX - startX;
    const deltaY = Math.abs(currentY - startY);

    if (deltaY > verticalThreshold) return;

    if (Math.abs(deltaX) > threshold) {
        if (!bookmarkId) {
        console.log('no bookmark id, this is probably main-bookmark being swiped, nothing to do');
          return;
        }
        isSwipeActionInProgress = true;

          if (deltaX < 0) {
            // Left swipe
            Notiflix.Confirm.show(
                'Please confirm',
                'Do you really want to remove this Marko?',
                'Yes',
                'No',
                () => {
                    try {
                        removeMarko(bookmarkId);
                    } catch (error) {
                        console.error('Error clearing link:', error);
                    }
                },
                () => {
                    // No action needed if 'No' is clicked
                    isSwipeActionInProgress = false;
                }
            );
        } else {
            // Right swipe
            try {
                shareMarko(bookmarkId);
            } catch (error) {
                console.error('Error constructing link:', error);
            }
        }

        lastSwipeTime = now;
        setTimeout(() => {
            isSwipeActionInProgress = false;
        }, 500); // Reset the flag after 500ms
    }
}, 250); // Debounce for 250ms

function handleSwipe(wrapper, bookmarkId, startX, currentX, startY, currentY) {
    const deltaX = currentX - startX;
    const deltaY = Math.abs(currentY - startY);
    const verticalThreshold = 50;

    if (deltaY > verticalThreshold) {
        updateSwipeClasses(wrapper, 0); // Reset classes if vertical swipe
        return;
    }

    updateSwipeClasses(wrapper, deltaX);

    debouncedHandleSwipe(wrapper, bookmarkId, startX, currentX, startY, currentY);
}

// Check if the DOM is already loaded for swipe detection initialization
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSwipeDetection);
} else {
    initSwipeDetection();
}



function hideDeleted() {
    // Retrieve the array from localStorage and parse it
let hidden = JSON.parse(localStorage.getItem('hide-these')) || [];

// Perform a function on each item in the array
hidden.forEach(item => {
    // Your function here
    console.log(item); 
    const deletedMarko = document.getElementById(item);
    deletedMarko.remove();
});
}

// Function to remove the bookmark element from DOM
function removeMarko(index) {
            // Handle delete icon click with haptic feedback
          const bookmarkToDelete = document.getElementById(\`bookmark-\${index}\`);
          const hideIndex = \`bookmark-\${index}\`;
    
    if (bookmarkToDelete) {
        bookmarkToDelete.remove();
        let hidden = JSON.parse(localStorage.getItem('hide-these')) || [];
        hidden.push(hideIndex);
        localStorage.setItem('hide-these', JSON.stringify(hidden));
    }
     else {
        console.error(\`Element with ID bookmark-\${index} not found.\`);
    }  
      }
      
document.addEventListener('DOMContentLoaded', () => {
    hideDeleted();
    detectTheme();
    checkConnection();
    
    const ytlightboxContainer = document.getElementById("youtube-lightbox");
    const playerContainer = document.getElementById("player");
    let inactivityTimer;

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(hideCloseButton, 3000); // Hide after 3 seconds of inactivity
    }

    function hideCloseButton() {
        const closeBtn = document.getElementById("close-yt");
        if (closeBtn) {
            closeBtn.classList.add('hidden');
        }
    }

    function showCloseButton() {
        const closeBtn = document.getElementById("close-yt");
        if (closeBtn) {
            closeBtn.classList.remove('hidden');
            resetInactivityTimer();
        }
    }

    // Event listeners based on user interaction
    if (ytlightboxContainer) {
        // For desktop and tablets
        ytlightboxContainer.addEventListener('mousemove', showCloseButton);
        // For mobile devices
        ytlightboxContainer.addEventListener('touchstart', showCloseButton);
    } else {
        console.error("YouTube lightbox container not found");
    }

    // Optional: Click event listener for close button
    const closeBtn = document.getElementById("close-yt");
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ytlightboxContainer.classList.remove("active");
            ytlightboxContainer.style.display = 'none'; // Optional: Hide the lightbox
            playerContainer.innerHTML = ''; // Clear the iframe
            location.reload(true);
        });
    } else {
        console.error("Close button not found");
    }
});



document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById("close-btn");

    function closeMainLightbox() {
    location.reload();
    // TODO dont reload page, find a way to clear srcdoc 
    // const lightboxContainer = document.getElementById("lightbox");
    // document.getElementById("lightbox-iframe").src = "";
    // lightboxContainer.style.display = 'none';
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMainLightbox);
    } else {
        console.error("Close button not found");
    }
});


        function showPDFLightbox(pdfUrl, title) {
            const adobeDCView = new AdobeDC.View({
                clientId: "3676715924ab4f4792090061fa24153d",
                divId: "adobe-dc-view",
            });

            const pdfContainer = document.getElementById("adobe-dc-view");
            pdfContainer.style.position = "fixed";
            pdfContainer.style.top = "0";
            pdfContainer.style.left = "0";
            pdfContainer.style.width = "100%";
            pdfContainer.style.height = "100%";
            pdfContainer.style.backgroundColor = "rgba(0, 0, 0, 0)";
            pdfContainer.style.zIndex = "9999";
            pdfContainer.style.display = "flex";
            pdfContainer.style.justifyContent = "center";
            pdfContainer.style.alignItems = "center";

            adobeDCView.previewFile({
                content: {
                    location: {
                        url: pdfUrl,
                    },
                },
                metaData: {
                    fileName: title,
                },
            }, {
                embedMode: "LIGHT_BOX",
                defaultViewMode: "FIT_WIDTH",
            });

            pdfContainer.addEventListener("click", (event) => {
                if (event.target === pdfContainer) {
                    pdfContainer.style.display = "none";
                }
            });
        }

function getLinkFromValue(onclickString) {
    // Regular expression to match the pattern of the onclick attribute
    const regex = /openMarko\\(([^,]+),\\s*'([^']*)'(?:,\\s*'([^']*)')?\\)/;

    // Execute the regex on the onclick string
    const match = onclickString.match(regex);

    // If there's a match, extract the arguments
    if (match) {
        const functionName = match[1].trim();
        const firstArgument = match[2].trim();
        const secondArgument = match[3] ? match[3].trim() : null;

        // Return the arguments as an object without quotes
        return firstArgument.replace(/^'|'$/g, "");
    }

    // If no match, return null
    return null;
}


// this is actually a shareLink function, kept the name for convenience

function deleteLink(index) {
    shareMarko(index);
}


function shareMarko(index) {
    const bookmark = document.querySelector(\`.bookmark[data-index="\${index}"]\`);
    console.log('Selected Marko to share: ', bookmark);
    if (!bookmark) {
        console.log(\`No bookmark found with index \${index}\`);
        return null;
    }

    const bookmarkWrapper = bookmark.querySelector('.bookmark-wrapper');
    const iconContainer = bookmarkWrapper.querySelector('.icon-container');
    const bookmarkTitle = bookmarkWrapper.querySelector('.bookmark-title');
    const bookmarkIcon = iconContainer.querySelector('img');

    // Extract the required values
    const onclickValue = bookmarkWrapper.getAttribute('onclick');
    const actionMatch = getLinkFromValue(onclickValue);
    console.log('actionMatch');
    //const actionLink = actionMatch ? actionMatch[1].replace(/'/g, '') : ''; // Extracted and stripped of single quotes
    const type = bookmarkWrapper.getAttribute('data-type') || '';
    const title = bookmarkTitle ? bookmarkTitle.textContent.trim() : '';
    const icon = bookmarkIcon ? bookmarkIcon.getAttribute('src') : '';
    const color = iconContainer ? getComputedStyle(iconContainer).getPropertyValue('--ring-color').trim() : '';

    // Construct the URL for the shareable link
    const url = new URL('https://marko-app.netlify.app');
    url.searchParams.append('type', type);
    url.searchParams.append('link', actionMatch);
    url.searchParams.append('title', title);
    url.searchParams.append('icon', icon);
    url.searchParams.append('color', color);
    url.searchParams.append('createMarko', 'true');

    const navLink = url.toString();

    window.location.href = navLink;
        
    return navLink;
}

    <\/script>
</body>
</html>`;

        // create the html document and auto download it. This creates a document with an exact copy of all visible user-made bookmarks.
        // Replace >delete< with >share<
        currentState = currentState.replace(/>delete</g, '>add_circle<');
        const oldTitle = 'id="main-title" class="bookmark-title">Marko<';
        const newTitle = `id="main-title" class="bookmark-title">${title}<`;
        currentState = currentState.replace(oldTitle, newTitle);
        const blob = new Blob([currentState], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        const url = URL.createObjectURL(blob);
        window.open(url);
        // also create a shareable link that, when loaded, can add the friend with his links
        if (confirm('Do you also want to create a shareable direct link?')) {
          createShareableLink(title);
        }
    }
