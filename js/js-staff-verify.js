function search() {
    const registerNumber = document.querySelector('.search').value;
  
    fetch('/Search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rg_no: registerNumber })
    })
    .then(response => {
      if (response.ok) {
        window.location.href = `/StaffVerify?rg_no=${registerNumber}`;
      } else {
        throw new Error('Failed to store history');
      }
    });
  }
  


  function toggleMenu() {
    var menu = document.getElementById('side-menu');
    menu.classList.toggle('show');
  }
  
  document.addEventListener('click', function(event) {
    var menu = document.getElementById('side-menu');
    var hamburger = document.querySelector('.hamburger');
    if (!menu.contains(event.target) && !hamburger.contains(event.target)) {
        menu.classList.remove('show');
    }
  });