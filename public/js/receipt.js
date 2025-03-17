document.addEventListener('DOMContentLoaded', function () {
  const receiptItems = document.getElementById('receipt-items');
  const totalPriceElement = document.getElementById('total-price');
  const receipt = document.getElementById('receipt');
  const toggleReceiptBtn = document.getElementById('toggle-receipt-btn');
  const closeReceiptBtn = document.getElementById('close-receipt-btn');
  const clearReceiptBtn = document.getElementById('clear-receipt-btn');
  const mainContent = document.getElementById('main-content');
  const checkoutBtn = document.getElementById('checkout-btn');
  const customerNameInput = document.getElementById('customer-name');

  const metaTag = document.querySelector('meta[name="current-user-name"]');
  const currentUserName = metaTag ? metaTag.getAttribute('content') : 'guest';

  // La chiave per sessionStorage (conserva tutti gli item aggiunti)
  function getReceiptKey() {
    return 'receiptItems-' + currentUserName;
  }

  // Recupera l'array già presente oppure un array vuoto
  function getStoredItems() {
    const items = JSON.parse(sessionStorage.getItem(getReceiptKey())) || [];
    const itemsSorted = items.sort((a, b) => a.addedAt - b.addedAt);
    return itemsSorted;
  }

  // Aggiunge (oppure aggiorna) un nuovo item nell'array salvato in sessionStorage
  function addItemToSessionStorage(newItem) {
    let storedItems = getStoredItems();
    const index = storedItems.findIndex(item => item.itemId === newItem.itemId && item.type === newItem.type);
    // Se l'item esiste già, aggiorna solo la quantità
    if (index !== -1) {
      storedItems[index].quantity = newItem.quantity;
    } else {
      // Imposta il timestamp in millisecondi solo per i nuovi elementi
      newItem.addedAt = new Date().toISOString();
      storedItems.push(newItem);
    }
    sessionStorage.setItem(getReceiptKey(), JSON.stringify(storedItems));
  }

  // Rimuove l'item dal session storage in base a itemId e type
  function removeItemFromSessionStorage(itemId, type) {
    let storedItems = getStoredItems();
    storedItems = storedItems.filter(item => !(item.itemId === itemId && item.type === type));
    sessionStorage.setItem(getReceiptKey(), JSON.stringify(storedItems));
  }

  function updateTotalPrice() {
    let total = 0;
    receiptItems.querySelectorAll('.receipt-item').forEach(item => {
      const price = parseFloat(item.getAttribute('data-item-price'));
      const quantity = parseInt(item.querySelector('.quantity').value);
      total += price * quantity;
    });
    totalPriceElement.textContent = total.toFixed(2);
  }

  function updateCheckoutButtonState() {
    const itemsExist = receiptItems.childElementCount > 0;
    const nicknameEntered = customerNameInput.value.trim() !== '';
    clearReceiptBtn.disabled = !(itemsExist || nicknameEntered);
    checkoutBtn.disabled = !(itemsExist && nicknameEntered);
  }

  // Rendi updateCheckoutButtonState globale
  window.updateCheckoutButtonState = updateCheckoutButtonState;
    // Funzione per recuperare i dati dal backend tramite chiamata REST in base a itemId e type.
    function fetchItemData(itemId, type) {
      let endpoint;
      if (type === 'book') {
        endpoint = `/libri/${itemId}`;
      } else if (type === 'backpack') {
        endpoint = `/zaini/${itemId}`;
      } else if (type === 'suit') {
        endpoint = `/abiti/${itemId}`;
      } else if (type === 'stationery') {
        endpoint = `/cancelleria/${itemId}`;
      } else if (type === 'barItem') {
        endpoint = `/bar/${itemId}`;
      } else if (type === 'publication') {
        endpoint = `/pubblicazioni/${itemId}`;
      } else if (type === 'promotion') {
        endpoint = `/promozioni/${itemId}`;
      }
      return fetch(endpoint).then(response => response.json());
    }

    // Crea l'elemento dello scontrino usando i dati restituiti dal backend.
    function createReceiptElement(data, quantity = 1) {
      const li = document.createElement('li');
      li.className = 'list-group-item receipt-item';
      li.setAttribute('data-item-id', data.id);
      li.setAttribute('data-item-type', data.type);
      li.setAttribute('data-item-price', data.price);
      let iconClass = 'fas fa-box fs-5';

      if (data.type === 'book') {
        iconClass = 'fas fa-book fs-5';
      } else if (data.type === 'backpack') {
        iconClass = 'bi bi-backpack3-fill fs-5';
      } else if (data.type === 'suit') {
        iconClass = 'fas fa-tshirt fs-5';
      } else if (data.type === 'stationery') {
        iconClass = 'fas fa-paperclip fs-5';
      } else if (data.type === 'barItem') {
        if (data.itemType === 'Cibo') {
          iconClass = 'fas fa-utensils fs-5';
        } else {
          iconClass = 'fas fa-coffee fs-5';
        }
      } else if (data.type === 'publication') {
        iconClass = 'fas fa-book-open fs-5';
      } else if (data.type === 'promotion') {
        iconClass = 'fas fa-tags fs-5';
      }
      li.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="${iconClass}"></i>
          <div class="item-details ms-3">
            <span class="item-name">${data.name}</span><br>
            <small>${parseFloat(data.price).toFixed(2)} €</small>
          </div>
        </div>
        <div class="d-flex align-items-end">
          <input type="number" class="quantity form-control form-control-sm mt-0" value="${quantity}" min="0">
          <button class="remove-item btn btn-link ms-2">
            <i class="fas fa-trash-can fs-5"></i>
          </button>
        </div>`;
      li.querySelector('.quantity').addEventListener('input', function () {
        if (this.value < 1) this.value = 1;
        updateTotalPrice();
        // Aggiorna la quantità in sessione per questo item
        addItemToSessionStorage({
          itemId: data.id,
          type: data.type,
          quantity: parseInt(this.value)
        });
        updateCheckoutButtonState();
      });
      li.querySelector('.remove-item').addEventListener('click', function () {
        li.remove();
        updateTotalPrice();
        removeItemFromSessionStorage(data.id, data.type);
        updateCheckoutButtonState();
      });
      return li;
    }

    // Carica gli item salvati in sessione effettuando le chiamate al backend e ricostruendo il DOM.
    function loadReceiptFromSessionStorage() {
      const storedItems = getStoredItems();
      // Per ogni item creiamo una promise che restituisce anche il valore quantity e addedAt
      const fetchPromises = storedItems.map(item =>
        fetchItemData(item.itemId, item.type)
          .then(data => ({
            data,
            quantity: item.quantity,
            addedAt: item.addedAt
          }))
      );

      Promise.all(fetchPromises)
        .then(results => {
          // Ordina i risultati in base a addedAt (che abbiamo memorizzato in millisecondi)
          results.sort((a, b) => a.addedAt - b.addedAt);
          results.forEach(result => {
            // Evitiamo duplicati nel DOM
            if (!receiptItems.querySelector(`.receipt-item[data-item-id="${result.data.id}"][data-item-type="${result.data.type}"]`)) {
              const li = createReceiptElement(result.data, result.quantity);
              receiptItems.appendChild(li);
            }
          });
          updateTotalPrice();
          if (receiptItems.childElementCount > 0 && window.innerWidth >= 1300 && !receipt.classList.contains('show-receipt')) {
            openReceipt();
          }
          updateCheckoutButtonState();
        })
        .catch(err => console.error(err));
    }

    loadReceiptFromSessionStorage();

    // Gestione evento "Aggiungi allo scontrino" per tutti i tipi
    document.querySelectorAll('.add-to-receipt').forEach(button => {
      button.addEventListener('click', function () {
        const row = this.closest('tr');
        let type, itemId;
        if (row.hasAttribute('data-book-id')) {
          type = 'book';
          itemId = row.getAttribute('data-book-id');
        } else if (row.hasAttribute('data-backpack-id')) {
          type = 'backpack';
          itemId = row.getAttribute('data-backpack-id');
        } else if (row.hasAttribute('data-suit-id')) {
          type = 'suit';
          itemId = row.getAttribute('data-suit-id');
        } else if (row.hasAttribute('data-stationery-id')) {
          type = 'stationery';
          itemId = row.getAttribute('data-stationery-id');
        } else if (row.hasAttribute('data-barItem-id')) {
          type = 'barItem';
          itemId = row.getAttribute('data-barItem-id');
        } else if (row.hasAttribute('data-publication-id')) {
          type = 'publication';
          itemId = row.getAttribute('data-publication-id');
        } else if (row.hasAttribute('data-promotion-id')) {
          type = 'promotion';
          itemId = row.getAttribute('data-promotion-id');
        }
        if (!itemId) return;
        const selector = `.receipt-item[data-item-id="${itemId}"][data-item-type="${type}"]`;
        const existing = receiptItems.querySelector(selector);
      if (existing) {
        const itemName = existing.querySelector('.item-name').textContent;
        const qtyInput = existing.querySelector('.quantity');
        qtyInput.value = parseInt(qtyInput.value) + 1;
        updateTotalPrice();
        addItemToSessionStorage({
          itemId: parseInt(itemId),
          type: type,
          quantity: parseInt(qtyInput.value)
        });
        updateCheckoutButtonState();
        showReceiptAlert(`Prodotto "${itemName}" incrementato alla quantità (${qtyInput.value}) con successo`);
        if (window.innerWidth >= 1300 && !receipt.classList.contains('show-receipt')) {
          openReceipt();
        }
        return;
      }
      fetchItemData(itemId, type)
        .then(data => {
          const li = createReceiptElement(data);
          receiptItems.appendChild(li);
          updateTotalPrice();
          addItemToSessionStorage({
            itemId: data.id,
            type: type,
            quantity: 1
          });
          updateCheckoutButtonState();
          showReceiptAlert(`Prodotto "${data.name}" aggiunto allo scontrino con successo`);
          if (window.innerWidth >= 1300 && !receipt.classList.contains('show-receipt')) {
            openReceipt();
          }
        })
        .catch(err => console.error('Errore:', err));
    });
  });

  function showReceiptAlert(message) {
    // Crea (o recupera) l'overlay
    let overlayDiv = document.getElementById('overlay');
    if (!overlayDiv) {
      overlayDiv = document.createElement('div');
      overlayDiv.id = 'overlay';
      document.body.appendChild(overlayDiv);
    }
    // Attiva l'overlay (lo stile CSS #overlay.active deve gestire display o opacity)
    overlayDiv.classList.add('active');

    // Crea l'alert
    const alertDiv = document.createElement('div');
    alertDiv.classList.add(
      'receipt-alert',
      'receipt-alert-success',
      'd-flex',
      'align-items-center',
      'justify-content-between',
      'p-3'
    );
    alertDiv.innerHTML = `
        <i class="fas fa-check"></i>
        <span class="mx-3">${message}</span>
        <button type="button" id="dismiss-alert" class="btn-close btn-close-white"></button>
      `;
    document.body.appendChild(alertDiv);

    // Chiusura manuale tramite click sul pulsante
    alertDiv.querySelector('#dismiss-alert').addEventListener('click', () => {
      alertDiv.classList.add('fade-out');
      overlayDiv.classList.remove('active');
      overlayDiv.remove();
      alertDiv.remove();
    });

    // Dopo 3 secondi, avvia il fade-out
    setTimeout(() => {
      alertDiv.classList.add('fade-out');
      setTimeout(() => {
        overlayDiv.classList.remove('active');
        overlayDiv.remove();
        alertDiv.remove();
      }, 500);
    }, 1000);
  }

  function openReceipt() {
    receipt.classList.add('show-receipt');
    mainContent.classList.add('receipt-open');
  }

  function closeReceipt() {
    receipt.classList.remove('show-receipt');
    mainContent.classList.remove('receipt-open');
  }

  toggleReceiptBtn.addEventListener('click', function () {
    if (receipt.classList.contains('show-receipt')) {
      closeReceipt();
    } else {
      openReceipt();
    }
  });

  customerNameInput.addEventListener('input', updateCheckoutButtonState);

  closeReceiptBtn.addEventListener('click', function () {
    closeReceipt();
  });

  clearReceiptBtn.addEventListener('click', function () {
    sessionStorage.removeItem(getReceiptKey());
    receiptItems.innerHTML = '';
    updateTotalPrice();
    customerNameInput.value = '';
    updateCheckoutButtonState();
    showReceiptAlert(`Scontrino svuotato con successo`);
  });

  checkoutBtn.addEventListener('click', function () {
    const storedItems = getStoredItems();
    const customerName = customerNameInput.value.trim();
    if (!storedItems.length || !customerName) return;

    fetch('/scontrini/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerName,
        items: storedItems
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.receipt) {
        showReceiptAlert(`Scontrino #${data.receipt.id} effettuato con successo al cliente ${data.receipt.customerName} per un totale di ${data.receipt.totalPrice}€`);
        sessionStorage.removeItem(getReceiptKey());
        receiptItems.innerHTML = '';
        updateTotalPrice();
        customerNameInput.value = '';
        closeReceipt();
        updateCheckoutButtonState();
      } else {
        alert('Errore durante la creazione dello scontrino.');
      }
    })
    .catch(err => console.error('Errore:', err));
  });
});
