(function () {
  'use strict';

  var INITIAL_MESSAGE = 'Bonjour ✨ Je suis l’assistant Flambeau. Comment puis-je vous aider ?';
  var LOADING_MESSAGE = 'Réponse en cours...';
  var ERROR_MESSAGE = 'Erreur de connexion avec l’assistant IA.';

  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (typeof text === 'string') {
      element.textContent = text;
    }
    return element;
  }

  function appendMessage(container, text, type) {
    var message = createElement('div', 'ai-message ai-message-' + type, text);
    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
    return message;
  }

  function setChatOpen(button, box, isOpen) {
    box.classList.toggle('ai-chat-box--open', isOpen);
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
      var input = box.querySelector('.ai-chat-input');
      if (input) {
        setTimeout(function () {
          input.focus();
        }, 80);
      }
    }
  }

  function initAiChat() {
    if (document.querySelector('.ai-chat-button') || document.querySelector('.ai-chat-box')) {
      return;
    }

    var button = createElement('button', 'ai-chat-button', 'Assistant IA');
    button.type = 'button';
    button.setAttribute('aria-label', 'Ouvrir l’assistant IA Flambeau');
    button.setAttribute('aria-expanded', 'false');

    var box = createElement('section', 'ai-chat-box');
    box.setAttribute('aria-label', 'Assistant IA Flambeau');

    var header = createElement('div', 'ai-chat-header');
    var title = createElement('span', '', 'Assistant Flambeau');
    var closeButton = createElement('button', 'ai-chat-close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Fermer l’assistant IA');
    header.appendChild(title);
    header.appendChild(closeButton);

    var messages = createElement('div', 'ai-chat-messages');
    appendMessage(messages, INITIAL_MESSAGE, 'bot');

    var form = createElement('form', 'ai-chat-form');
    var input = createElement('input', 'ai-chat-input');
    input.type = 'text';
    input.name = 'message';
    input.placeholder = 'Posez votre question...';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Votre message pour l’assistant IA');

    var submitButton = createElement('button', '', 'Envoyer');
    submitButton.type = 'submit';

    form.appendChild(input);
    form.appendChild(submitButton);
    box.appendChild(header);
    box.appendChild(messages);
    box.appendChild(form);

    document.body.appendChild(button);
    document.body.appendChild(box);

    button.addEventListener('click', function () {
      setChatOpen(button, box, !box.classList.contains('ai-chat-box--open'));
    });

    closeButton.addEventListener('click', function () {
      setChatOpen(button, box, false);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var message = input.value.trim();
      if (!message) {
        return;
      }

      input.value = '';
      input.disabled = true;
      submitButton.disabled = true;

      appendMessage(messages, message, 'user');
      var loadingMessage = appendMessage(messages, LOADING_MESSAGE, 'bot');

      fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              throw new Error(data && data.error ? data.error : ERROR_MESSAGE);
            }
            return data;
          });
        })
        .then(function (data) {
          loadingMessage.textContent = data && data.reply ? data.reply : ERROR_MESSAGE;
        })
        .catch(function () {
          loadingMessage.textContent = ERROR_MESSAGE;
        })
        .finally(function () {
          input.disabled = false;
          submitButton.disabled = false;
          input.focus();
          messages.scrollTop = messages.scrollHeight;
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiChat);
  } else {
    initAiChat();
  }
}());
