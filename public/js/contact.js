/**
 * Contact form handler.
 * Sends messages to the local backend so validation and email delivery stay
 * server-side. Contact messages are not stored locally or in Google Sheets.
 */
(function() {
  'use strict';

  var CONTACT_ENDPOINT = '/api/contact';
  var CONTACT_FORM = null;
  var SUBMIT_BTN = null;
  var FORM_MESSAGE = null;

  var VALIDATION_RULES = {
    prenom: {
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZÀ-ÿ\s'-]+$/,
      messages: {
        required: 'Le prénom est requis',
        minLength: 'Le prénom doit contenir au moins 2 caractères',
        maxLength: 'Le prénom ne peut pas dépasser 50 caractères',
        pattern: 'Le prénom ne peut contenir que des lettres'
      }
    },
    nom: {
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZÀ-ÿ\s'-]+$/,
      messages: {
        required: 'Le nom est requis',
        minLength: 'Le nom doit contenir au moins 2 caractères',
        maxLength: 'Le nom ne peut pas dépasser 50 caractères',
        pattern: 'Le nom ne peut contenir que des lettres'
      }
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      messages: {
        required: "L'email est requis",
        pattern: 'Veuillez entrer une adresse email valide'
      }
    },
    telephone: {
      maxLength: 20,
      pattern: /^[0-9\s+-]*$/,
      messages: {
        maxLength: 'Le téléphone ne peut pas dépasser 20 caractères',
        pattern: 'Le format du téléphone est invalide'
      }
    },
    sujet: {
      minLength: 5,
      maxLength: 100,
      messages: {
        required: 'Le sujet est requis',
        minLength: 'Le sujet doit contenir au moins 5 caractères',
        maxLength: 'Le sujet ne peut pas dépasser 100 caractères'
      }
    },
    message: {
      minLength: 20,
      maxLength: 2000,
      messages: {
        required: 'Le message est requis',
        minLength: 'Le message doit contenir au moins 20 caractères',
        maxLength: 'Le message ne peut pas dépasser 2000 caractères'
      }
    }
  };

  function validateField(field) {
    var rules = VALIDATION_RULES[field.name];
    var value = String(field.value || '').trim();

    if (!rules) return null;

    if (field.hasAttribute('required') && !value) {
      return rules.messages.required || 'Ce champ est requis';
    }

    if (!value && !field.hasAttribute('required')) {
      return null;
    }

    if (rules.minLength && value.length < rules.minLength) {
      return rules.messages.minLength;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.messages.maxLength;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.messages.pattern;
    }

    return null;
  }

  function validateForm() {
    var fields = CONTACT_FORM.querySelectorAll('input, textarea');
    var errors = [];

    Array.prototype.forEach.call(fields, function(field) {
      var error = validateField(field);
      field.setAttribute('aria-invalid', error ? 'true' : 'false');
      field.style.borderColor = error ? 'var(--color-error, #c62828)' : '';

      if (error) {
        errors.push(error);
      }
    });

    return errors;
  }

  function showMessage(message, type) {
    if (!FORM_MESSAGE) return;
    FORM_MESSAGE.textContent = message;
    FORM_MESSAGE.className = 'form-message ' + (type || 'error');
    FORM_MESSAGE.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearMessage() {
    if (!FORM_MESSAGE) return;
    FORM_MESSAGE.textContent = '';
    FORM_MESSAGE.className = 'form-message';
  }

  function setLoading(isLoading) {
    SUBMIT_BTN.disabled = isLoading;
    SUBMIT_BTN.classList.toggle('loading', isLoading);
    SUBMIT_BTN.textContent = isLoading ? 'Envoi en cours...' : 'Envoyer le message';
  }

  function getFormData() {
    var formData = new FormData(CONTACT_FORM);

    return {
      prenom: String(formData.get('prenom') || '').trim(),
      nom: String(formData.get('nom') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      telephone: String(formData.get('telephone') || '').trim(),
      sujet: String(formData.get('sujet') || '').trim(),
      message: String(formData.get('message') || '').trim()
    };
  }

  function submitContactForm(event) {
    event.preventDefault();
    clearMessage();

    var errors = validateForm();
    if (errors.length > 0) {
      showMessage('Veuillez corriger: ' + errors[0], 'error');
      return;
    }

    setLoading(true);

    fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getFormData())
    })
      .then(function(response) {
        return response.json().catch(function() {
          return {};
        }).then(function(data) {
          if (!response.ok) {
            throw new Error(data.details || data.error || 'Message refusé par le serveur');
          }
          return data;
        });
      })
      .then(function() {
        showMessage('Merci. Votre message a été envoyé avec succès.', 'success');
        CONTACT_FORM.reset();

        if (window.gtag) {
          window.gtag('event', 'contact_form_submission');
        }
      })
      .catch(function(error) {
        console.error("Erreur lors de l'envoi du formulaire:", error);
        showMessage(
          "Impossible d'envoyer le message: " + (error.message || 'erreur inconnue') + ". Contactez-nous par email: flambeaushop@gmail.com",
          'error'
        );
      })
      .finally(function() {
        setLoading(false);
      });
  }

  function setupRealtimeValidation() {
    var fields = CONTACT_FORM.querySelectorAll('input, textarea');

    Array.prototype.forEach.call(fields, function(field) {
      field.addEventListener('blur', function() {
        var error = validateField(field);
        field.setAttribute('aria-invalid', error ? 'true' : 'false');
        field.style.borderColor = error ? 'var(--color-error, #c62828)' : '';
      });

      field.addEventListener('input', function() {
        if (field.getAttribute('aria-invalid') === 'true') {
          field.style.borderColor = '';
        }
      });
    });
  }

  function initContactForm() {
    CONTACT_FORM = document.getElementById('contact-form');
    SUBMIT_BTN = document.getElementById('submit-btn');
    FORM_MESSAGE = document.getElementById('form-message');

    if (!CONTACT_FORM || !SUBMIT_BTN) return;

    CONTACT_FORM.addEventListener('submit', submitContactForm);
    setupRealtimeValidation();
  }

  document.addEventListener('DOMContentLoaded', initContactForm);
  window.initContactForm = initContactForm;
})();

