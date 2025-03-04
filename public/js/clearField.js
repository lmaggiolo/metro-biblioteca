document.addEventListener('DOMContentLoaded', function() {
    var clearButtons = document.querySelectorAll('.clear-input');
    clearButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            var inputId = this.getAttribute('data-input-id');
            document.getElementById(inputId).value = '';
            if (typeof window.updateCheckoutButtonState === 'function') {
                window.updateCheckoutButtonState();
            }
        });
    });
});
