(function(){
  function ensureTopic(){
    const list=document.getElementById('trafficSeedList');
    if(window.renderTrafficSeed && list && list.children.length<1) window.renderTrafficSeed();
  }
  window.addEventListener('load',()=>setTimeout(ensureTopic,80));
  document.addEventListener('click',e=>{
    const target=e.target;
    if(target && String(target.textContent||'').includes('查看')) setTimeout(ensureTopic,50);
  });
})();
