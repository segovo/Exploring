this.addEventListener('location-found', function (e) {
    
  
    this.postMessage({
      done: true,
      currentI: i,
      caller: e.data.caller
    });
  });