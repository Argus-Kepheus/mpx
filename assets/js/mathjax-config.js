window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true,
    tags: 'ams',
    // Semantic roles of the notation (src/semantic-roles.json). A macro marks its
    // argument with a role class; the colour of a role is a palette token, so it
    // follows the palette without typesetting again. \fdx keeps its historical
    // name: its role is the first spatial axis, in any method.
    macros: {
      fdx: ['\\class{math-role-axis1}{#1}', 1],
      temporal: ['\\class{math-role-temporal}{#1}', 1],
      sideR: ['\\class{math-role-side-r}{#1}', 1],
      sideS: ['\\class{math-role-side-s}{#1}', 1],
      sideinterface: ['\\class{math-role-interface}{#1}', 1]
    }
  },
  svg: {
    fontCache: 'global'
  },
  options: {
    enableMenu: false,
    enableAssistiveMml: true,
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
  }
};
