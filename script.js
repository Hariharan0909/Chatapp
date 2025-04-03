const socket = io("http://10.16.49.153:3000");

socket.on("connect", () => {
  console.log("Connected to Socket.IO server");
});

socket.on("disconnect", () => {
  console.log("Disconnected from Socket.IO server");
});

const messageContainer = document.getElementById("message-container")
const messageForm = document.getElementById("message-form")
const messageInput = document.getElementById("message-input")
const imageInput = document.getElementById("image-input")
const imagePreview = document.getElementById("image-preview")
const previewImg = document.getElementById("preview-img")
const removeImageBtn = document.getElementById("remove-image")

let selectedImage = null

const blackScreen = document.createElement("div")
blackScreen.style.position = "fixed"
blackScreen.style.top = "0"
blackScreen.style.left = "0"
blackScreen.style.width = "100%"
blackScreen.style.height = "100%"
blackScreen.style.backgroundColor = "black"
blackScreen.style.color = "white"
blackScreen.style.display = "none"
blackScreen.style.zIndex = "1000"
blackScreen.style.textAlign = "center"
blackScreen.style.paddingTop = "20%"
document.body.appendChild(blackScreen)

const nameBox = document.createElement("div")
nameBox.innerHTML = `
  <div id="name-prompt" class="ext-white font-black md:text-[60px] sm:text-[50px] xs:text-[40px] text-[30px]" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f9f9f9; padding: 20px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
    <label for="name-input" style="display: block; margin-bottom: 10px; font-size: 16px; color: #333;">What is your name?</label>
    <input type="text" id="name-input" style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px;" />
    <button id="name-submit" style="width: 100%; padding: 10px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 30px; color: white; font-weight: 900;">Submit</button>
  </div>
`

document.body.appendChild(nameBox)

document.getElementById("name-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault()
    document.getElementById("name-submit").click()
  }
})

document.getElementById("name-submit").addEventListener("click", () => {
  const name = document.getElementById("name-input").value
  if (name) {
    document.getElementById("name-prompt").remove()
    appendSystemMessage("You joined")
    socket.emit("new-user", name)
  }
})

// Handle image selection
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader()
    reader.onload = (event) => {
      selectedImage = {
        data: event.target.result,
        type: file.type,
        name: file.name,
      }

      // Show image preview
      previewImg.src = event.target.result
      imagePreview.style.display = "block"
    }
    reader.readAsDataURL(file)
  }
})

// Remove image preview when clicking the remove button
removeImageBtn.addEventListener("click", () => {
  imagePreview.style.display = "none"
  selectedImage = null
  imageInput.value = ""
})

// Handle Enter key press in message input
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    messageForm.dispatchEvent(new Event("submit"))
  }
})

socket.on("chat-message", (data) => {
  if (data.image) {
    appendMessageWithImage(data.name, data.message, data.image, "received")
  } else {
    appendMessage(data.name, data.message, "received")
  }
})

socket.on("user-connected", (name) => {
  appendSystemMessage(`${name} connected`)
})

socket.on("user-disconnected", (name) => {
  appendSystemMessage(`${name} disconnected`)
})

socket.on("user-count", (count) => {
  document.getElementById("user-count").textContent = count
})

socket.on("warning", (message) => {
  alert(message)
})

socket.on("banned", (message) => {
  alert(message)
  messageInput.disabled = true
  blackScreen.style.display = "block"
  blackScreen.innerText = "You are temporarily banned for 2 minutes."
})

socket.on("unbanned", (message) => {
  alert(message)
  messageInput.disabled = false
  blackScreen.style.display = "none"
})

messageForm.addEventListener("submit", (e) => {
  e.preventDefault()
  const message = messageInput.value.trim()

  if (message === "" && !selectedImage) return

  if (selectedImage) {
    // Send message with image
    socket.emit("send-chat-message", { text: message, image: selectedImage })
    appendMessageWithImage("You", message, selectedImage.data, "sent")
    selectedImage = null
    imageInput.value = ""
    imagePreview.style.display = "none"
  } else {
    // Send text-only message
    fetch("http://10.16.49.153:5000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          appendSystemMessage(`Error: ${data.error}`)
        } else {
          const isBully = data.is_bullying
          socket.emit("send-chat-message", { text: message })
          const displayMessage = isBully ? "*".repeat(message.length) : message
          appendMessage("You", displayMessage, "sent")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        appendSystemMessage("Error analyzing the message")
      })
  }

  messageInput.value = ""
})

function appendMessage(sender, message, type) {
  const messageElement = document.createElement("div")
  messageElement.className = `message ${type}`

  const messageContent = document.createElement("div")
  messageContent.className = "message-content"

  const senderElement = document.createElement("div")
  senderElement.className = "message-sender"
  senderElement.textContent = sender

  const textElement = document.createElement("div")
  textElement.className = "message-text"
  textElement.textContent = message

  messageContent.appendChild(senderElement)
  messageContent.appendChild(textElement)
  messageElement.appendChild(messageContent)

  messageContainer.appendChild(messageElement)
  messageContainer.scrollTop = messageContainer.scrollHeight
}

function appendMessageWithImage(sender, message, imageData, type) {
  const messageElement = document.createElement("div")
  messageElement.className = `message ${type}`

  const messageContent = document.createElement("div")
  messageContent.className = "message-content"

  const senderElement = document.createElement("div")
  senderElement.className = "message-sender"
  senderElement.textContent = sender

  messageContent.appendChild(senderElement)

  if (message) {
    const textElement = document.createElement("div")
    textElement.className = "message-text"
    textElement.textContent = message
    messageContent.appendChild(textElement)
  }

  // Add image
  const imageElement = document.createElement("img")
  imageElement.src = imageData
  imageElement.className = "message-image"
  imageElement.alt = "Shared image"

  // Add click event to open image in full size
  imageElement.addEventListener("click", () => {
    const fullImage = window.open("", "_blank")
    fullImage.document.write(`
      <html>
        <head>
          <title>Image</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; background: #000; height: 100vh; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${imageData}" alt="Full size image">
        </body>
      </html>
    `)
  })

  messageContent.appendChild(imageElement)
  messageElement.appendChild(messageContent)

  messageContainer.appendChild(messageElement)
  messageContainer.scrollTop = messageContainer.scrollHeight
}

function appendSystemMessage(message) {
  const messageElement = document.createElement("div")
  messageElement.className = "system-message"
  messageElement.textContent = message
  messageContainer.appendChild(messageElement)
  messageContainer.scrollTop = messageContainer.scrollHeight
}

// Add a transfer icon animation when sending images
const sendButton = document.getElementById("send-button")
sendButton.addEventListener("mousedown", () => {
  if (selectedImage) {
    sendButton.innerHTML = '<i class="fas fa-share-from-square"></i>'
    setTimeout(() => {
      sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>'
    }, 300)
  }
})


// Handle image selection
imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader()
    reader.onload = (event) => {
      selectedImage = {
        data: event.target.result,
        type: file.type,
        name: file.name,
      }

      // Blur the image
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.filter = 'blur(100px)'
        ctx.drawImage(img, 0, 0)
        selectedImage.data = canvas.toDataURL()
      }

      // Show image preview
      previewImg.src = selectedImage.data
      imagePreview.style.display = "block"
    }
    reader.readAsDataURL(file)
  }
})
