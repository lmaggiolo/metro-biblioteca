document.addEventListener('DOMContentLoaded', function () {
    // Inizializza i tooltip per tutti gli elementi con la classe 'has-tooltip'
    var tooltipTriggerList = [].slice.call(
        document.querySelectorAll('.has-tooltip')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: 'hover'
        });
    });
});
