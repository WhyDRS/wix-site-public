import wixWindowFrontend from "wix-window-frontend";
import wixWindow from 'wix-window';

$w("#pdfViewer1").

// export async function image131_click(event) {
//     // Retrieve the html/text from the element with the ID of 'text301'
//     const htmlContent = $w('#text301').html;
//     const textContent = $w('#text301').text;

//     debugger;
    
//     console.log('ClipboardItem', typeof ClipboardItem)

//     wixWindow.Clip

//     if (typeof ClipboardItem !== "undefined") {
//         const html = new Blob([htmlContent], { type: "text/html" });
//         const text = new Blob([textContent], { type: "text/plain" });
//         const data = new ClipboardItem({ "text/html": html, "text/plain": text });
//         await navigator.clipboard.write([data]);
//     } else {
//         // Fallback
//         // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API#browser_compatibility
//         // https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand#browser_compatibility
//         const cb = e => {
//             e.clipboardData.setData("text/html", htmlContent);
//             e.clipboardData.setData("text/plain", textContent);
//             e.preventDefault();
//         };
//         document.addEventListener("copy", cb);
//         document.execCommand("copy");
//         document.removeEventListener("copy", cb);
//     }

//     // Use the Wix copyToClipboard function to copy the text
//     // wixWindowFrontend.copyToClipboard(textToCopy)
//     //     .then(() => {
//     //         console.log("Text copied successfully!");
//     //         // Optionally, add any notifications or actions to indicate success
//     //     })
//     //     .catch((err) => {
//     //         console.error("Failed to copy text: ", err);
//     //         // Optionally, handle errors, e.g., show an error message to the user
//     //     });
// }