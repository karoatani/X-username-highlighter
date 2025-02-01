// Only declare if not already defined
if (typeof highlightedUsers === "undefined") {
  let highlightedUsers = {};

  // Initialize highlightedUsers from storage
  chrome.storage.sync.get(["highlightedUsers"], function (result) {
    highlightedUsers = result.highlightedUsers || {};
    highlightUsernames();
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === "updateHighlights") {
      highlightedUsers = request.users;
      highlightUsernames();
    }
  });

  // Function to highlight usernames
  function highlightUsernames() {
    // Remove existing highlights
    console.log(document.querySelectorAll(".twitter-highlight"));
    document.querySelectorAll(".twitter-highlight").forEach((el) => {
      el.style.backgroundColor = "";
      el.classList.remove("twitter-highlight");
    });

    // Find and highlight usernames
    const usernameElements = document.querySelectorAll('a[href^="/"]');
    usernameElements.forEach((element) => {
      const username = element.href.split("/")[3]?.toLowerCase();
      if (username && highlightedUsers[username]) {
        element.style.backgroundColor = highlightedUsers[username] + "40";
        element.classList.add("twitter-highlight");
      }
    });
  }

  // Observer to handle dynamic content loading
  const observer = new MutationObserver(function (mutations) {
    highlightUsernames();
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Send ready message when content script initializes
  chrome.runtime.sendMessage({ action: "contentScriptReady" });
}
