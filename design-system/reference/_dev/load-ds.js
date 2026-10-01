(function(){
if (window.NPHairExpressDesignSystem_ba69cf && window.NPHairExpressDesignSystem_ba69cf.ThemeToggle) return;
var base = document.currentScript.src.replace(/_dev\/load-ds\.js.*$/, '');
var files = ['core/Icon.jsx','core/ThemeToggle.jsx','core/Badge.jsx','core/Button.jsx','core/Input.jsx','core/UploadButton.jsx','surfaces/GlassCard.jsx','surfaces/LineChart.jsx','surfaces/CalendarCard.jsx','navigation/GlassSidebar.jsx','navigation/NavTabs.jsx','navigation/TopBar.jsx','auth/LoginSlider.jsx','domain/format.js','domain/QueueTicketCard.jsx','domain/CheckoutCard.jsx','domain/CashCard.jsx','domain/PendingCard.jsx'];
var names = [], code = '';
files.forEach(function(f){
  var x = new XMLHttpRequest(); x.open('GET', base + 'components/' + f, false); x.send();
  var src = x.responseText.replace(/^import .*$/gm, '');
  src = src.replace(/export (function|const) (\w+)/g, function(_, k, n){ if (/^[A-Z]/.test(n)) names.push(n); return k + ' ' + n; });
  code += '\n' + src;
});
code += '\nwindow.NPHairExpressDesignSystem_ba69cf={' + names.join(',') + '};';
var out = Babel.transform(code, { presets: ['react'] }).code;
(new Function(out))();
})();
