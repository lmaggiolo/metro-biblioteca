document.addEventListener('DOMContentLoaded', function () {

    // Gestisce modali sia di modifica che di inserimento
    var modals = document.querySelectorAll('.modal[id^="editModal"], .modal#addModal');
    modals.forEach(function (modalElement) {
        modalElement.addEventListener('shown.bs.modal', function () {
            var form = modalElement.querySelector('form');
            if (!form) return;

            var saveButton = form.querySelector('button[type="submit"]');
            var inputs = form.querySelectorAll('input, select, textarea');

            // Salva i valori iniziali quando il modal viene aperto
            var initialValues = {};
            inputs.forEach(function (input) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    initialValues[input.name] = input.checked;
                } else {
                    initialValues[input.name] = input.value;
                }
            });

            // Disabilita il pulsante inizialmente
            saveButton.disabled = true;

            // Aggiunge event listener per rilevare modifiche
            inputs.forEach(function (input) {
                var eventType = (input.type === 'checkbox' || input.type === 'radio') ? 'change' : 'input';
                input.addEventListener(eventType, function () {
                    var changed = false;
                    inputs.forEach(function (input) {
                        var currentValue;
                        var initialValue = initialValues[input.name];

                        if (input.type === 'checkbox' || input.type === 'radio') {
                            currentValue = input.checked;
                        } else {
                            currentValue = input.value;
                        }

                        if (currentValue !== initialValue) {
                            changed = true;
                        }
                    });
                    // Abilita/disabilita il pulsante basandosi sulle modifiche
                    saveButton.disabled = !changed;
                });
            });

            // Quando il modal viene chiuso, rimuovi gli event listener per evitare duplicati
            modalElement.addEventListener('hidden.bs.modal', function () {
                inputs.forEach(function (input) {
                    var newInput = input.cloneNode(true);
                    input.parentNode.replaceChild(newInput, input);
                });
                saveButton.disabled = true;
            });
        });
    });
});
