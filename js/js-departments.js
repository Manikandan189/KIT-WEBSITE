function ButtonClick(department) {
    window.location.href = '/Who';
    fetch('/StaffVerify1', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ department: department })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        window.location.href = '/StaffVerify';
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}
