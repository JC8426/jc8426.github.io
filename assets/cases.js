(()=>{
  const root=document.documentElement;
  const languageButton=document.querySelector('#language, [data-lang-toggle]');
  const themeButton=document.querySelector('#theme, [data-theme-toggle]');
  const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
  let language=read('jc-lang','en')==='zh'?'zh':'en';
  let theme=read('jc-theme','auto');
  if(!['auto','light','dark'].includes(theme))theme='auto';
  function applyTheme(){
    root.dataset.theme=theme;
    if(themeButton){themeButton.textContent=theme==='auto'?(language==='zh'?'自动':'Auto'):theme==='light'?(language==='zh'?'浅色':'Light'):(language==='zh'?'深色':'Dark');themeButton.setAttribute('aria-label',language==='zh'?'切换色彩主题':'Change color theme')}
  }
  function applyLanguage(){
    root.lang=language==='zh'?'zh-Hans':'en';
    document.querySelectorAll('[data-en][data-zh], [data-lang-en][data-lang-zh]').forEach(el=>{el.textContent=el.getAttribute('data-'+language)??el.getAttribute('data-lang-'+language)});
    document.querySelectorAll('[data-alt-en][data-alt-zh]').forEach(el=>{el.alt=el.getAttribute('data-alt-'+language)});
    if(languageButton){languageButton.textContent=language==='zh'?'EN':'中';languageButton.setAttribute('aria-label',language==='zh'?'Switch to English':'切换到中文')}
    applyTheme();
  }
  languageButton?.addEventListener('click',()=>{language=language==='en'?'zh':'en';write('jc-lang',language);applyLanguage()});
  themeButton?.addEventListener('click',()=>{theme=theme==='auto'?'light':theme==='light'?'dark':'auto';write('jc-theme',theme);applyTheme()});
  window.addEventListener('storage',e=>{if(e.key==='jc-lang'){language=e.newValue==='zh'?'zh':'en';applyLanguage()}if(e.key==='jc-theme'){theme=['auto','light','dark'].includes(e.newValue)?e.newValue:'auto';applyTheme()}});
  window.addEventListener('pageshow',e=>{if(e.persisted){language=read('jc-lang','en')==='zh'?'zh':'en';theme=read('jc-theme','auto');if(!['auto','light','dark'].includes(theme))theme='auto';applyLanguage();}});
  applyLanguage();
})();
