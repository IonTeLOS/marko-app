<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client-Side Script Execution</title>
</head>
<body>
  <script>
    async function loadAndRunScript() {
      try {
        const scriptUrl = '/.netlify/functions/script-provider'; // URL to your Edge Function
        const response = await fetch(scriptUrl);
        const scriptContent = await response.text();
        eval(scriptContent); // Executes the script content
      } catch (error) {
        console.error('Error loading and executing script:', error);
      }
    }

    // Load and execute the script from the Edge Function
    loadAndRunScript();
  </script>
</body>
</html>
