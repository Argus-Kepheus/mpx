window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true,
    tags: 'ams',
    macros: {
      fdx: ['\\textcolor[RGB]{210,40,40}{#1}', 1],
      sideR: ['\\textcolor[RGB]{0,145,75}{#1}', 1],
      sideS: ['\\textcolor[RGB]{155,60,185}{#1}', 1],
      sideinterface: ['\\textcolor[RGB]{0,125,145}{#1}', 1]
    }
  },
  svg: {
    fontCache: 'local'
  },
  options: {
    enableMenu: false,
    enableAssistiveMml: true,
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
  }
};
