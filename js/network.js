// Related tools for the Ontario Commission Tax Calculator footer
// Injected by network.js — single source of truth for related tools
(function() {
  var tools = [
    { name: 'Ontario Income Tax Calculator', url: 'https://ontarioincometaxcalc.ca/', desc: 'Full Ontario + federal income tax breakdown' },
    { name: 'Ontario Take-Home Pay Calculator', url: 'https://ontariotakehomecalc.ca/', desc: 'Net pay after all deductions' },
    { name: 'Ontario Raise Calculator', url: 'https://ontarioraisecalc.ca/', desc: 'Tax impact of a salary increase' },
    { name: 'Marginal Tax Calculator', url: 'https://marginaltaxcalc.ca/', desc: 'Marginal vs effective rate comparison' },
    { name: 'CPP Calculator', url: 'https://cppcalc.ca/', desc: 'CPP1 + CPP2 contribution breakdown' },
    { name: 'EI Calculator', url: 'https://eicalc.ca/', desc: 'EI premium calculation' },
    { name: 'Bonus Tax Calculator', url: 'https://bonustaxcalc.ca/', desc: 'Tax on bonus/lump-sum payments' },
    { name: 'Freelance Income Calculator', url: 'https://freelanceincomecalc.ca/', desc: 'Self-employment tax estimates' }
  ];

  var container = document.getElementById('related-tools');
  if (!container) return;

  var html = '';
  for (var i = 0; i < tools.length; i++) {
    html += '<a href="' + tools[i].url + '" rel="noopener">' + tools[i].name + '</a>';
  }
  container.innerHTML = html;
})();
