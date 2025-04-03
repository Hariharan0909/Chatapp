const socket = io('http://10.16.49.151:3000');
const messageContainer = document.getElementById('message-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');

const blackScreen = document.createElement('div');
blackScreen.style.position = 'fixed';
blackScreen.style.top = '0';
blackScreen.style.left = '0';
blackScreen.style.width = '100%';
blackScreen.style.height = '100%';
blackScreen.style.backgroundColor = 'black';
blackScreen.style.color = 'white';
blackScreen.style.display = 'none';
blackScreen.style.zIndex = '1000';
blackScreen.style.textAlign = 'center';
blackScreen.style.paddingTop = '20%';
document.body.appendChild(blackScreen);

const nameBox = document.createElement('div');
nameBox.innerHTML = `
  <div id="name-prompt" class="ext-white font-black md:text-[60px] sm:text-[50px] xs:text-[40px] text-[30px]" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f9f9f9; padding: 20px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
    <label for="name-input" style="display: block; margin-bottom: 10px; font-size: 16px; color: #333;">What is your name?</label>
    <input type="text" id="name-input" style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px;" />
    <button id="name-submit" style="width: 100%; padding: 10px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 30px; color: white; font-weight: 900;">Submit</button>
  </div>
`;

document.body.appendChild(nameBox);

document.getElementById('name-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('name-submit').click();
  }
});

document.getElementById('name-submit').addEventListener('click', () => {
  const name = document.getElementById('name-input').value;
  if (name) {
    document.getElementById('name-prompt').remove();
    appendMessage('You joined');
    socket.emit('new-user', name);
  }
});

socket.on('chat-message', data => {
  appendMessage(`${data.name}: ${data.message}`);
});

socket.on('user-connected', name => {
  appendMessage(`${name} connected`);
});

socket.on('user-disconnected', name => {
  appendMessage(`${name} disconnected`);
});

socket.on('warning', message => {
  alert(message);
});

socket.on('banned', message => {
  alert(message);
  messageInput.disabled = true;
  blackScreen.style.display = 'block';
  blackScreen.innerText = "You are temporarily banned for 2 minutes.";
});

socket.on('unbanned', message => {
  alert(message);
  messageInput.disabled = false;
  blackScreen.style.display = 'none';
});

messageForm.addEventListener('submit', e => {
  e.preventDefault();
  const message = messageInput.value.trim();

  if (message === '') return;

  fetch('http://10.16.49.151:5000/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: message })
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      appendMessage(`Error: ${data.error}`);
    } else {
      const isBully = data.is_bullying;
      socket.emit('send-chat-message', message);
      const displayMessage = isBully ? '*'.repeat(message.length) : message;
      appendMessage(`You: ${displayMessage}`);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    appendMessage('Error analyzing the message');
  });

  messageInput.value = '';
});

function appendMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.innerText = message;
  messageContainer.append(messageElement);
}
