
/**
 * Copyright (c) Microblink Ltd. All rights reserved.
 */

/**
 * BlinkID In-browser SDK demo app which demonstrates how to:
 *
 * - Change default SDK settings
 * - Scan front side of the identity document from image
 * - Provide visual feedback to the end-user during the scan
 */

// General UI helpers
const initialMessageEl = document.getElementById("msg");
const progressEl = document.getElementById("load-progress");
const scanImageElement = document.getElementById("target-image");
const inputImageFile = document.getElementById("image-file");

/**
 * Check browser support, customize settings and load WASM SDK.
 */
function main()
{
  // Check if browser has proper support for WebAssembly
  if (!BlinkIDSDK.isBrowserSupported())
  {
    initialMessageEl.innerText = "This browser is not supported!";
    return;
  }

  // 1. It's possible to obtain a free trial license key on microblink.com
  let licenseKey = "sRwAAAYJbG9jYWxob3N0r/lOPk4/w35CpJlWLWUUweeP2fIMitv5PphtuZyeiPwKB6jScTcUZQoVF+5DGToUMyMaWe7jdsWpfSmv3YmNyT/arBpdO5OVUSO34/s3/1LMGRk7KOiYme8hMhUJA+/Kwh0EWL0LDP3zVTeNfM0nxAYpivYS2njJRkmjDNZ74Q9dK9EGa3z90gV+JpiFE2uK860Ako668gXdLeP0e5g8iHxBqqHcYCY2hy8naP+7inkqd+aQmNmfk0j6BYlA/ODb5OnT8x+EkiDX9K780uxPgLO5hn6+4ChrC069cFwUTHGIMdEUrQuVs/7xR3yFXC5KIFjLGLo1EJw5nUfyVdj3RjQ=";

  if (window.location.hostname === "blinkid.github.io")
  {
    licenseKey = "sRwAAAYRYmxpbmtpZC5naXRodWIuaW+qBF9hPYYlTvZbRmaCaKxH7P97EqEe0d0v1VvzeeIFZJnN1x2sKdQbCqrI5Dxt8USvlnhvvnZ3GT1JtuNkwpA28EU1RVYAylxLgSTphu7Z3rIOG7JquucnlP6eEm05rw+ZNPrsGR3zHEXuWKU/OhLmrdb2m7CXFo3cPaEuktKOHe4H323fRsSYLnGzwr8Rc3CAt42CSezYf1uQLk+guzlT9Wtjz77M3gqaFPGHPvxFMLeiwh5t1y1Z+71lYxwuaAU0eZ+pt2u+nvI0PxwxLey/NAFvaaOi0DfiJe8O+oOdYMUeJPSpjTTQHSDldy3YazeeHy8ei4Rh1ggwZuvm7tAesw==";
  }

  // 2. Create instance of SDK load settings with your license key
  const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);

  // [OPTIONAL] Change default settings

  // Show or hide hello message in browser console when WASM is successfully loaded
  loadSettings.allowHelloMessage = true;

  // In order to provide better UX, display progress bar while loading the SDK
  loadSettings.loadProgressCallback = (progress) => progressEl.value = progress;

  // Set absolute location of the engine, i.e. WASM and support JS files
  loadSettings.engineLocation = "https://blinkid.github.io/blinkid-in-browser/resources";

  // 3. Load SDK
  BlinkIDSDK.loadWasmModule(loadSettings).then(

  (sdk) =>
  {
    document.getElementById("screen-initial")?.classList.add("hidden");
    document.getElementById("screen-start")?.classList.remove("hidden");
    document.getElementById("image-file")?.addEventListener("change", (ev) =>
    {
      ev.preventDefault();
      startScan(sdk, ev.target.files);
    });
  },
  (error) =>
  {
    initialMessageEl.innerText = "Failed to load SDK!";
    console.error("Failed to load SDK!", error);
  });

}

/**
 * Scan single side of identity document with web camera.
 */
async function startScan(sdk, fileList)
{
  document.getElementById("screen-start")?.classList.add("hidden");
  document.getElementById("screen-scanning")?.classList.remove("hidden");

  // 1. Create a recognizer objects which will be used to recognize single image or stream of images.
  //
  // Generic ID Recognizer - scan various ID documents
  const genericIDRecognizer = await BlinkIDSDK.createBlinkIdRecognizer(sdk);

  // 2. Create a RecognizerRunner object which orchestrates the recognition with one or more
  //    recognizer objects.
  const recognizerRunner = await BlinkIDSDK.createRecognizerRunner(

  // SDK instance to use
  sdk,
  // List of recognizer objects that will be associated with created RecognizerRunner object
  [genericIDRecognizer],
  // [OPTIONAL] Should recognition pipeline stop as soon as first recognizer in chain finished recognition
  false);


  // 3. Prepare image for scan action - keep in mind that SDK can only process images represented in
  //    internal CapturedFrame data structure. Therefore, auxiliary method "captureFrame" is provided.

  // Make sure that image file is provided
  let file = null;
  const imageRegex = RegExp(/^image\//);
  for (let i = 0; i < fileList.length; ++i)
  {
    if (imageRegex.exec(fileList[i].type))
    {
      file = fileList[i];
    }
  }
  if (!file)
  {
    alert("No image files provided!");
    // Release memory on WebAssembly heap used by the RecognizerRunner
    recognizerRunner?.delete();

    // Release memory on WebAssembly heap used by the recognizer
    genericIDRecognizer?.delete();
    inputImageFile.value = "";
    return;
  }

  scanImageElement.src = URL.createObjectURL(file);
  await scanImageElement.decode();
  const imageFrame = BlinkIDSDK.captureFrame(scanImageElement);

  // 4. Start the recognition and await for the results
  const processResult = await recognizerRunner.processImage(imageFrame);

  // 5. If recognition was successful, obtain the result and display it
  if (processResult !== BlinkIDSDK.RecognizerResultState.Empty)
  {
    const genericIDResults = await genericIDRecognizer.getResult();
    if (genericIDResults.state !== BlinkIDSDK.RecognizerResultState.Empty)
    {
      console.log("BlinkIDGeneric results", genericIDResults);

      const firstName = genericIDResults.firstName || genericIDResults.mrz.secondaryID;
      const lastName = genericIDResults.lastName || genericIDResults.mrz.primaryID;
      const dateOfBirth = {
        year: genericIDResults.dateOfBirth.year || genericIDResults.mrz.dateOfBirth.year,
        month: genericIDResults.dateOfBirth.month || genericIDResults.mrz.dateOfBirth.month,
        day: genericIDResults.dateOfBirth.day || genericIDResults.mrz.dateOfBirth.day };


      alert(

      `Hello, ${firstName} ${lastName}!\n You were born on ${dateOfBirth.year}-${dateOfBirth.month}-${dateOfBirth.day}.`);

    }
  } else

  {
    alert("Could not extract information!");
  }

  // 7. Release all resources allocated on the WebAssembly heap and associated with camera stream

  // Release memory on WebAssembly heap used by the RecognizerRunner
  recognizerRunner?.delete();

  // Release memory on WebAssembly heap used by the recognizer
  genericIDRecognizer?.delete();

  // Hide scanning screen and show scan button again
  inputImageFile.value = "";
  scanImageElement.src = "";
  document.getElementById("screen-start")?.classList.remove("hidden");
  document.getElementById("screen-scanning")?.classList.add("hidden");
}

// Run
main();
