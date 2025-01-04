window.addEventListener('DOMContentLoaded', (event) => {
    const form = document.getElementById('registerForm');
    form.addEventListener('submit', handleRegister);
  });
  
  async function handleRegister(event) {
    event.preventDefault();  // Prevent the default form submission behavior
  
    try {
      // Get the form data
      const formData = new FormData(event.target);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
  
      const response = await fetch('/Register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
  
      const result = await response.json();
  
      if (result.message) {
        alert(result.message);
      }
  
      if (result.success) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    }
  }
  
  
  function statusMessage() {
    const registerNumber = document.querySelector('.search').value;
  
    fetch('/Status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ register_number: registerNumber })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(`Outpass status: ${data.message}`);
        } else if (data.message === " ") {
            alert('Outpass status: Empty');
        } else {
            alert('Outpass status: Rejected');
        }
    })
    .catch(error => {
        console.error('Error checking database:', error);
        alert('Please Try Again');
    });
  }
  
  function historyview(event) {
    event.preventDefault();
    const registerNumber = document.querySelector('.history').value;
  
    fetch('/History', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ register_number: registerNumber })
    })
    .then(response => {
      if (response.ok) {
        window.location.href = "/History";
      } else {
        throw new Error('Failed to store history');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Please Try Again');
    });
  }
  
  function w3_open() {
    document.getElementById("mySidebar").style.display = "block";
  }
  
  function w3_close() {
    document.getElementById("mySidebar").style.display = "none";
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
  
  