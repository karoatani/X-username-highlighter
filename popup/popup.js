let isContentScriptReady = false;

// Listen for content script ready message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "contentScriptReady") {
    isContentScriptReady = true;
  }
});

// Helper function to ensure content script is ready
function ensureContentScript() {
  return new Promise((resolve) => {
    if (isContentScriptReady) {
      resolve();
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          // Check if the URL is injectable
          const url = tabs[0].url || "";
          if (
            url.startsWith("chrome://") ||
            url.startsWith("edge://") ||
            url.startsWith("about:")
          ) {
            console.log("Cannot inject script into this page");
            resolve(); // Resolve without injection
            return;
          }

          // Inject the content script if not ready
          chrome.scripting
            .executeScript({
              target: { tabId: tabs[0].id },
              files: ["content/content.js"],
            })
            .then(() => {
              // Wait for content script ready message
              const timeout = setTimeout(() => {
                console.log("Content script ready timeout");
                resolve();
              }, 2000);

              const messageListener = (request) => {
                if (request.action === "contentScriptReady") {
                  clearTimeout(timeout);
                  chrome.runtime.onMessage.removeListener(messageListener);
                  resolve();
                }
              };
              chrome.runtime.onMessage.addListener(messageListener);
            })
            .catch((err) => {
              console.error("Script injection failed:", err);
              resolve();
            });
        }
      });
    }
  });
}

async function sendMessageToContentScript(message) {
  await ensureContentScript();
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const url = tabs[0].url || "";
      if (
        url.startsWith("chrome://") ||
        url.startsWith("edge://") ||
        url.startsWith("about:")
      ) {
        console.log("Cannot send messages to this page");
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const usernameInput = document.getElementById("username");
  const colorInput = document.getElementById("color");
  const addButton = document.getElementById("add");
  const usernameList = document.getElementById("usernameList");

  // Load saved usernames
  loadUsernames();

  addButton.addEventListener("click", function () {
    const username = usernameInput.value.trim().toLowerCase();
    const color = colorInput.value;

    if (username) {
      addUsername(username, color);
      usernameInput.value = "";
    }
  });

  function addUsername(username, color) {
    chrome.storage.sync.get(["highlightedUsers"], function (result) {
      const users = result.highlightedUsers || {};
      users[username] = color;

      chrome.storage.sync.set({ highlightedUsers: users }, function () {
        loadUsernames();
        // Notify content script
        sendMessageToContentScript({
          action: "updateHighlights",
          users: users,
        });
      });
    });
  }

  function loadUsernames() {
    chrome.storage.sync.get(["highlightedUsers"], function (result) {
      const users = result.highlightedUsers || {};
      usernameList.innerHTML = "";

      Object.entries(users).forEach(([username, color]) => {
        const item = document.createElement("div");
        item.className = "username-item";
        item.style.backgroundColor = color + "40";

        const colorPreview = document.createElement("div");
        colorPreview.className = "color-preview";
        colorPreview.style.backgroundColor = color;

        const text = document.createElement("span");
        text.textContent = "@" + username;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "X";
        deleteBtn.onclick = () => deleteUsername(username);

        item.appendChild(colorPreview);
        item.appendChild(text);
        item.appendChild(deleteBtn);
        usernameList.appendChild(item);
      });
    });
  }

  function deleteUsername(username) {
    chrome.storage.sync.get(["highlightedUsers"], function (result) {
      const users = result.highlightedUsers || {};
      delete users[username];

      chrome.storage.sync.set({ highlightedUsers: users }, function () {
        loadUsernames();
        // Notify content script
        sendMessageToContentScript({
          action: "updateHighlights",
          users: users,
        });
      });
    });
  }
});
